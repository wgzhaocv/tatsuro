# 05 · Service Worker 与离线栈

> 审计对象:`app/sw.ts`、`app/sw/audio-cache.ts`、`lib/offline/*`、`lib/downloads/*`、`lib/cache/*`、`components/more/*`、`cache-dot`、serwist 路由(含 `@serwist/turbopack` 实现源码)。

## 概述

整体架构是健康的:拦截热路径无 IndexedDB 依赖、测量已改走 IDB 元数据、reconciler 有并发上限且让位播放、跨 tab 有 Web Lock、广播有 400ms debounce。真正的问题集中在三处:**Range 命中路径每个请求全量物化缓存体**(移动 Safari 内存峰值的头号风险)、**SW 后台下载用了不必要的 `response.clone()`**(tee 缓冲让整个文件多驻留一份内存)、以及**首播最多三重下载**(passthrough + SW 后台 + reconciler 互不知晓)。

## 健康项(逐项验证过)

1. **拦截热路径干净**(`audio-cache.ts:54-99`):首字节前只有 2×`caches.open` + 1-2×`cache.match`,无 IndexedDB await、无 budget 计算;`setAccessTime` 不 await;后台下载不阻塞 `originalResponse` 返回。passthrough 增加的起播延迟约个位毫秒。
2. **测量路径无全量 body 读**:`manage.ts` 的 `runMeasure` 走 `getAllEntries()`(IDB 元数据)+ `cache.keys()`,只有未记录 entry 做 6 并发 backfill 且 `body.cancel()`;OOM 修复到位,无遗留 `cache.match()` 全体读;测量单飞 + 排队重测,防广播风暴期并发扫描。
3. **cache-dot 是共享订阅**(`audio-cache-status.ts:28-31`):模块级 Set + 一次性 seed + 单例 BroadcastChannel;每行只做同步 Set 查。
4. **reconciler 触发与成本合理**:mount 一次 + 500ms debounce + 3 分钟间隔且仅页面可见时;Web Locks 跨 tab 单 pass;一个 pass 零网络 HEAD、零每专辑接口调用;下载池播放时 cap=1、空闲 cap=2;un-pin 即 abort;指数退避+抖动、404/410 永久、quota 阻塞直到释放。
5. **广播无逐字节事件**:长生命 BroadcastChannel,播放期间消息量 = 每首缓存完成 1 条。
6. **no-store 范围恰当**:audio 三处都必要(SW 桶是音频唯一客户端缓存层);cover 桶未陪葬,保留 HTTP 缓存语义。
7. **SW 路由生产不重打包**:`createSerwistRoute` 是 `force-static` + 构建期预渲染,esbuild 只在模块级 map 为空时跑一次,`rebuildOnChange` 仅 dev。
8. **清除与 reconciler 正确串行**:所有 clear 走 `withReconcileLock`,先 tombstone intent 再删(防 pinned 专辑清了又被重下);More 页 `pending` 防双击。

## 发现

### S1 · Range 命中:每个 ranged 请求把整个缓存体读成 Blob —— 高

**证据**:`lib/offline/range-response.ts:18` `const blob = await full.blob();`——注释声称 "the full body is never materialized" 只对了一半:`blob.slice()` 确实零拷贝,但 **`full.blob()` 本身要把整个 body 从 Cache Storage 消费完**。且 `audio-cache.ts:73-77` 每个 ranged 请求都重新 `match` + 重新 `buildRangeResponse`,Blob 无跨请求复用。

**影响**:Safari(桌面+iOS)对 `<audio>` 一律发 Range 请求(首次 `bytes=0-`、探测、每次 seek 各一次)——一首缓存歌曲的正常播放触发多次全量 body 读。WebKit 的 `Response.blob()` 会把 body 缓冲进内存,100MB+ 的 live 长曲目在 iOS 上就是每次 seek 一个 ~100MB 瞬时内存尖峰——SW 被杀 / 页面 OOM-reload 的直接诱因;普通 ~10MB 曲目也是 seek 密集时重复的全量磁盘读(耗电)。

**建议修法**(二选一):
- SW 内存按 canonical URL memoize Blob(`Map<string, Blob>`,SW 被杀自动释放,Blob 建一次后 slice 零成本);
- 或改真流式:拿 `hit.body` reader,丢弃 `start` 前字节、到 `end` 截断,用 `ReadableStream` 构造 206——峰值内存降到一个 chunk。

**顺带的正确性 bug**(同文件 :19-20):`Number.parseInt(rangeMatch[2], 10) || blob.size - 1`——`bytes=0-0` 因 `||` 回落成整文件;后缀范围 `bytes=-500` 被解析成 `start=0, end=500`(语义应为"最后 500 字节")。需 `rangeMatch[2] === "" ? blob.size - 1 : parseInt(...)` 并单独处理后缀式。

### S2 · `downloadAndCache` 的 `response.clone()`:整个文件在 tee 缓冲里多驻留一份 —— 高

**证据**:`app/sw/audio-cache.ts:111-113`:

```ts
await cache.put(url, response.clone());
await setAccessTime(url, Date.now());
await putEntry({ url, bucket: "auto", bytes: sizeOf(response) });
```

`clone()` tee body;`cache.put` 消费 clone 分支,而原 response 分支从头到尾没人读——tee 语义是未读分支数据全部积压在队列里直到 GC。而 clone 的唯一目的 `sizeOf(response)` 只读 `Content-Length` header,根本不需要 body。

**影响**:每首歌后台缓存都让整个文件在 SW 内存额外驻留一份,叠加 S3 的无并发上限,快速切歌时 SW 内存 = N 首全文件之和,移动端 SW 极易被系统杀掉(缓存写入随之失败)。

**建议修法**:一行——先 `const bytes = sizeOf(response);` 再 `await cache.put(url, response);`(不 clone)。reconciler 的 `downloadOne`(`reconciler.ts:197`)就是这么写的,正确。

### S3 · 首播最多三重下载;SW 后台下载无并发上限、不让位播放 —— 中

**证据**:
- 双倍带宽(设计使然):未命中时 `audio-cache.ts:90` passthrough + `:109` `downloadAndCache` 再全量 fetch = 首播下载 ~2 倍。
- 三重竞态:pin 专辑后立刻播其中一首 → passthrough(1)+ SW 后台 auto 下载(2,`downloadingUrls` 只在 SW 内部去重)+ reconciler 的 marked 下载(3,`inFlight` 只在页面侧)。reconcile pass 拍的 `autoUrls` 快照里还没有这首 → 同一文件两个全量下载并行,外加 passthrough。
- 无上限:`downloadingUrls` 是 per-URL 去重 Set,快速切歌 N 首 = N 个并发全量后台下载;SW 侧没有 reconciler 那样的 `isPlaying ? 1 : 2` cap。

**影响**:首播 2-3 倍蜂窝流量;弱网上多个后台全量下载挤占正在播放的 passthrough 流,造成卡顿;电量。

**建议修法**:SW 侧加小型下载队列(并发 1-2);reconciler 的 `downloadOne` 在 fetch 前先 `auto.match` 一次(事前查,避免整个重复下载);更进一步让 reconciler 在 SW 正在下载同 URL 时退避到下一个 pass。

### S4 · 每次首播触发全桶 `cache.match` 扫描(budget + evict)—— 中

**证据**:`downloadAndCache` 第一步(`audio-cache.ts:106`)→ `getAutoCacheBudget()`(`auto-evict.ts:71-81`)→ `getDownloadBytes()`(:56-64)对 download 桶全部 keys 逐个 `cache.match` + body cancel;`evictAutoLru`(:100-101)再对 auto 桶做同样的事。而 `manage.ts:105-148` 已示范正确做法——从 IndexedDB `entries` 读 bytes,只对未记录 entry backfill。

**影响**:不阻塞首字节,但 300 首的 pinned 库意味着每次首播后台先做 ~300+ 次 match/cancel,与正在起播的音频流争 IO/CPU,移动端耗电。reconciler 的 quota 恢复路径同样走它。

**建议修法**:`getDownloadBytes` / `evictAutoLru` 改从 `getAllEntries()` 汇总(一次 IDB `getAll`),`cache.match` 只留单 entry 缺记录时的 backfill。

### S5 · 整桶清除时逐 entry 广播 —— 低

**证据**:`manage.ts:271` `for (const k of keys) postCacheEvent(...)`——清 200 首的桶 = 200 条 BroadcastChannel 消息;`audio-cache-status.ts:55-66` 每条一次 Set 变更 + `emit()` 唤醒全部订阅 track row。

**建议修法**:新增不带 URL 的 `*-cleared` 事件,收到后整桶 `urls.clear()` + 一次 emit。

### S6 · 命中 auto 桶时每个 Range 请求一次 IDB 写 —— 低

**证据**:`audio-cache.ts:71` `if (fromAuto) setAccessTime(canonical, Date.now())`——Safari 一首歌多个 range 请求,每命中开一个独立 readwrite 事务。LRU 精度不需要秒级。

**建议修法**:按 URL 节流(同 URL 60s 内不重写)。

### S7 · 逐条 await 的 IDB 写循环 —— 低

**证据**:`auto-evict.ts:123-125` 每条被逐 entry 三个顺序 await;`manage.ts:137-140` backfill 逐条 `await putEntry`;`manage.ts:204` prune 逐条。大规模逐出/首次 backfill 线性放大(后台,无用户可感知阻塞)。

**建议修法**:lru-db 增加批量 API(单事务多 put/delete)。

### S8 · `sizeOf` 依赖 `Content-Length`,缺失记 0 —— 低(备注)

**证据**:`auto-evict.ts:22-24`。若后端某响应缺 `Content-Length`(或未来上压缩传输),entry 记 0 字节 → budget 低估、More 页统计低估、LRU 逐出"免费"。当前后端(R2 直出)成立,改动后端时记得这条隐式契约。

## 建议修复优先级

S1(Range blob 物化)与 S2(clone tee)都是移动 Safari 内存,且 S2 是**一行修复**;然后 S3(SW 下载队列 + reconciler 事前查)省真实流量;S4(auto-evict 改读 IDB)统一大小口径顺便消掉每首播的全桶扫描;S5-S7 顺手即可。

# Tatsuro Player 全站性能审计(2026-07-18)

> 方法:6 个维度并行深查(每个维度独立通读相关源码 + 实测验证)+ 生产构建产物分析。所有发现都对着真实代码/构建产物/线上响应头核实过,标注 `file:line`。
> 分册:[01 渲染与缓存](./01-rendering-caching.md) · [02 客户端运行时](./02-client-runtime.md) · [03 CSS/合成](./03-css-compositing.md) · [04 图片媒体](./04-images-media.md) · [05 SW/离线](./05-service-worker-offline.md) · [06 数据网络](./06-data-network.md) · [07 Bundle/字体](./07-bundle-fonts.md)

## 总体结论

**这套代码库的性能纪律远高于平均水平**,六个维度都各自给出了"健康项多于问题"的结论:静态预渲染覆盖完整、timeupdate 隔离、合成器友好动画、LCP 通路免 hydration、SW 热路径无 IDB、TanStack 无重复请求。**没有发现"架构性"的性能问题**——所有发现都是定点修复,大多数改动在几行以内。

问题聚类后有三个主题:
1. **移动端内存/发热**(SW Range 全量物化、clone tee、滚动每帧重跑 backdrop-filter)——最影响真实体验;
2. **白费的字节**(SW 预缓存 3.1MB 无用原图、取色/锁屏拉 1MB 原图、双份 RSC 序列化、首播三重下载)——移动流量;
3. **白费的请求**(歌词绕过边缘缓存烧 Worker 配额、多余的 sync push、15 分钟档 ISR)——配额与电量。

## 修复优先级(按影响/成本比排序)

### 第一梯队:高影响,建议尽快做

| # | 发现 | 分册 | 影响 | 成本 |
|---|---|---|---|---|
| 1 | **S2** `downloadAndCache` 的 `response.clone()` tee 让整个音频文件多驻留一份 SW 内存 | [05](./05-service-worker-offline.md) | 移动 Safari SW 被杀/OOM | **一行** |
| 2 | **S1** Range 命中每个请求 `full.blob()` 全量物化(Safari 每次 seek 一个全文件内存尖峰;附带 `bytes=0-0`/`bytes=-500` 解析 bug) | [05](./05-service-worker-offline.md) | iOS 大文件 OOM 头号风险 | 中(memoize 或流式) |
| 3 | **C1** 视口级 GlassPanel 浮在 fixed 照片上,滚动每帧重跑 backdrop-filter(网格页/专辑页主滚动面) | [03](./03-css-compositing.md) | 移动端滚动掉帧/发热的最大单一来源 | 中(预模糊副本方案) |
| 4 | **I1** 取色 hook 每张新封面拉 ~1MB 原图(实测 1.07MB;页面用的是几 KB 的优化变体) | [04](./04-images-media.md) | 每换专辑 1MB 流量;离线取色失败 | 一行(改拉 `/_next/image?w=96`) |
| 5 | **B1** SW 预缓存 4.8MB,其中 ~3.1MB hero 照片原图页面永远不会请求 | [07](./07-bundle-fonts.md) | 每个新访客白下载 3MB+ | 小(manifest 排除 jpg) |
| 6 | **D1** 歌词是唯一绕过 CF 边缘缓存的 JSON(`no-cache`),每看一首歌词 = 1 次 Worker 调用 | [06](./06-data-network.md) | 唯一随听歌量线性烧 Worker 免费配额的路径 | 后端改响应头 |

### 第二梯队:值得做,顺手即可

| # | 发现 | 分册 | 说明 |
|---|---|---|---|
| 7 | **S3** 首播最多三重下载(passthrough + SW 后台 + reconciler 互不知晓),SW 后台下载无并发上限 | [05](./05-service-worker-offline.md) | 弱网卡顿 + 2-3 倍蜂窝流量 |
| 8 | **I2** MediaSession artwork 指向 1MB 原图(与 #4 同根,一起修) | [04](./04-images-media.md) | 锁屏封面流量 + 离线缺失 |
| 9 | **N1** `getMessagesFor` 缺 `cacheLife("max")`,178 条路由 ISR 被钉在 15 分钟档 | [01](./01-rendering-caching.md) | 一行修复 |
| 10 | **R1** playlists store persist 无防抖:每次点赞同步 `JSON.stringify` 整库 ×2 | [02](./02-client-runtime.md) | 复用 player store 现成的防抖包装 |
| 11 | **R2** `hydrateSongs`/rehydrate 误触发 auto-sync,每次开 app 多 1-2 个全库 POST | [02](./02-client-runtime.md) | 触发器改比较 `updatedAt` |
| 12 | **S4** 每次首播触发全桶 `cache.match` 扫描(budget/evict 未改用 IDB 元数据) | [05](./05-service-worker-offline.md) | 与 More 页同一口径,照抄 `manage.ts` 做法 |
| 13 | **C3** 三个 nav 圆钮 `blur-xl`(24px 半径比 44px 钮还大)统一降 `blur-xs` | [03](./03-css-compositing.md) | 一行 × 3,顺带统一玻璃材质 |
| 14 | **N2** 专辑页曲目列表 RSC payload 双份序列化(百轨合集多 20-40KB) | [01](./01-rendering-caching.md) | TrackRow 收敛到单一数据源 |
| 15 | **D2** 搜索索引急切加载(从不搜索的会话也付 17KB) | [06](./06-data-network.md) | `enabled` 门控 |
| 16 | **I3** ambient 模糊背景 `sizes="384px"` 被 DPR 放大到 828-1200px 变体 | [04](./04-images-media.md) | 改 `"128px"` |

### 第三梯队:低优先级 / 记录在案

- **B2** 按需拆分 cmdk 搜索、全屏播放器(每页 403KB gzip JS,~60-90KB 可迟付)— [07](./07-bundle-fonts.md)
- **C2/C8** mini bar `blur-xl`→`blur-md`;MiniProgress `width`→`scaleX`(播放期唯一每帧 layout,02/03 双份独立命中)— [03](./03-css-compositing.md)
- **D3/N6** disc→release 反查的 35 连发形态收敛(最好后端直接带 `releaseId`)— [06](./06-data-network.md)
- **N3** `optimizePackageImports` 加 phosphor(dev 编译提速)— [01](./01-rendering-caching.md)
- **N5** More 页 `cachedAlbums` server action 离线必挂(语义 > 性能)— [01](./01-rendering-caching.md)
- **I4** 开 AVIF(再省 20-30% 图片字节,transform 配额可承受)— [04](./04-images-media.md)
- **I5** 首页 7 个 fetchPriority=high 稀释 LCP — [04](./04-images-media.md)
- **D4** /me/sync 全量快照(库大后做增量)— [06](./06-data-network.md)
- **S5-S8 / R3-R8 / C4-C10 / N4/N7 / B3/B4 / D5-D7 / I6-I10**:各分册内的低严重度项与备注

## 可以顺手归档的事

- **ROADMAP 阶段 3 的「性能」「日文字体加载策略」**:字体策略实际已解决(日文系统栈 + latin next/font,03 报告 C7 有完整评估),可勾掉并注明决定;本次审计即是 `/impeccable optimize` 想要的那次系统性 pass 的输入。
- **两处注释纠偏**:OG "prerendered at build" 实为首请求渲染(N4);`range-response.ts` "never materialized" 注释与事实相反(S1)。

## 各维度健康度速览

| 维度 | 评价 |
|---|---|
| 渲染/缓存 | ★★★★★ 预渲染纪律极好,动态 API 零泄漏,PPR 洞粒度范本级 |
| 客户端运行时 | ★★★★★ timeupdate 隔离、窄 selector、无高危;剩余是低成本小税 |
| CSS/合成 | ★★★★☆ 动画/层提升素养高;唯一大项是玻璃面板滚动重滤(C1) |
| 图片媒体 | ★★★★☆ sizes/priority/CLS 全对;漏洞集中在"绕过优化器的原图 URL" |
| SW/离线 | ★★★☆☆ 架构对、热路径干净;但 Range 物化 + clone tee 是移动内存实弹 |
| 数据网络 | ★★★★☆ 无热路径浪费;歌词烧配额是唯一线性增长项 |
| Bundle/字体 | ★★★★☆ 依赖干净、字体最优;预缓存清单和零拆分是两个欠账 |

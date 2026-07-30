# 06 · 数据获取与网络效率

> 审计对象:`lib/api/`、`lib/queries/`、TanStack Query 配置、账号同步引擎、预取策略、proxy 中间件。
> 含对生产后端(ys-tr.withyakul.me)响应头的实测。

## 概述

数据层整体设计相当克制:服务端 `lib/api/` 全部 `'use cache' + cacheLife('max') + cacheTag`,后端所有目录类 JSON 均带 `cache-control: public, max-age=2592000, immutable` 且 CF 边缘命中(实测 `cf-cache-status: HIT`),TanStack Query 全局 `staleTime: Infinity` 消灭了会话内重复请求。实测负载都很小(releases 列表 6.3KB、单 release 详情 1.3KB、单曲 217B、搜索索引压缩后 ~17KB)。没有发现请求风暴或热循环。真正值得动手的问题集中在:**歌词接口是全站唯一不吃边缘缓存的 JSON(每次都打 Worker)**、**搜索索引在从未搜索时也会被急切拉取**、**findReleaseByDisc 的 34 连发全目录扫描在冷缓存/非 en 语言下的一次性放大**、以及 **/me/sync 每次全量快照上传**。

## 健康项

- **专辑页零 fan-out**:release 详情内嵌全部 edition/disc/track(`lib/api/types.ts:43-52`),`album/[id]/page.tsx:39` 单次 `getAlbum` 出整页;`getDiscSongs` 已无调用方。每个专辑页 = 1 个构建期预渲染的后端请求。
- **SSG 覆盖全目录**:`generateStaticParams` 把 34 个 release 全部构建期预渲染,运行时用户浏览不打 Worker。
- **TanStack 配置正确**(`components/query-provider.tsx:10-13`):`staleTime: Infinity`;queryKey 全是字符串数组,无对象键失稳;`retry: 2` 且 lyrics 404 返回 `[]` 不抛错,无重试风暴。浏览器端 QueryClient 单例,sync 的 `fetchQuery` 与 `useSong` 共享缓存、真正去重(`lib/account/sync.ts:167-183`)。
- **useSong 有门控**(`full-player.tsx:73-76`):只有展开全屏播放器才拉 `/music/{id}`(217B,边缘 HIT);迷你条零请求。
- **流媒体 URL 稳定无 token**(`lib/api/urls.ts:15-17`):无时变参数,SW 缓存键稳定;`?offline=1` 标记入缓存前被 `canonicalStreamUrl` 归一。gate 的 `?argot` token 只在分享页面 URL 上,不进 API URL。
- **hover 延迟预取按设计工作**(`hover-prefetch-link.tsx:32`):视口内不预取,hover/focus/touchstart 才 arm,网格页预取风暴已堵住。
- **sync 触发面干净**:`startAutoSync` 只在 layout 挂载一次(不受 Activity 页面缓存影响),effect 有 unsubscribe;`applyingRemote` 旗标防回声推送;`syncing`+`queued` 把并发压成"最多再跑一次";无轮询,`/me` 24h 才刷一次。
- **下载 reconciler 网络行为稳健**:指数退避+抖动(`reconciler.ts:71-80`)、404/410 永久失败、配额失败挂起、**播放时并发降为 1**(`reconciler.ts:249`)、Web Locks 跨标签页单实例、离线跳过 fetch。
- **Analytics/SpeedInsights**:组件形式 hydration 后注入,不阻塞首屏;off-Vercel 自动 no-op。
- **playlist 瘦身补全有并发上限**(`playlists/hydration.tsx:12`,`BACKFILL_POOL = 6`),已满数据的库 0 请求。
- **proxy.ts 零外呼**:纯 cookie + WebCrypto HMAC,无 per-request fetch;常见无参路径跳过 HMAC。

## 发现

### D1 · 歌词是唯一绕过边缘缓存的 JSON——每次请求都打 Worker —— 高

**证据**:实测 `GET /lyrics/{id}` 返回 `cache-control: no-cache` + `cf-cache-status: REVALIDATED`(有词),404 无词时 `MISS` 且无 cache-control。对比其他所有目录接口都是 `max-age=2592000, immutable` + `HIT`。前端 `lib/api/lyrics.ts:25` 是裸 `fetch`,`lib/queries/lyrics.ts` 靠 `staleTime: Infinity` 只做会话内去重。

**影响**:每个会话、每首在歌词面板看过的歌 = 1 次必达 Worker 的请求(REVALIDATED/MISS 都调起 origin,烧免费额度);跨 reload 不吃浏览器 HTTP 缓存。桌面端歌词面板常驻时,听一张 12 曲专辑 = 12 次 Worker 调用。这是目前唯一随听歌量线性烧 Worker 配额的 JSON 路径。

**建议修法**:后端(`../yamashita-api`)改响应头——歌词确实会变(lyrics_state 五态编辑中),可改 `max-age=0, s-maxage=86400`(边缘缓一天,studio 保存时 purge 该 URL 或换 etag),至少给 404 加短 s-maxage。前端不用改。

### D2 · 搜索索引急切加载——从不搜索的会话也付一次请求 —— 中

**证据**:`components/home/command-search.tsx:46` 组件体顶层无条件 `useSearchIndex()`,无 `enabled: open` 门控;CommandSearch 挂在 album/mv/playlists/more 四个 browser 导航里,首个页面 mount 即发请求(`["search-index"]` 键去重为一次)。

**影响**:每个新会话首屏 +1 请求、压缩后 ~17KB(实测 br 16,943B;裸 103KB)。边缘 HIT + immutable 30 天,老访客走磁盘缓存、Worker 不受伤——主要代价是首访者的首屏带宽/并发占用。

**建议修法**:`useSearchIndex` 加 `enabled` 参数,CommandSearch 传 `open || armed`(按钮 hover/focus 或首次 ⌘K 时 arm)——与 HoverPrefetchLink 同一"意图触发"哲学;17KB 在 palette 打开动画期间就能到,首帧命中率几乎不损失。

### D3 · `findReleaseByDisc` / `songReleaseIndex` = 1+34 全目录扫描,且按 lang 翻倍 —— 中

**证据**:`lib/api/albums.ts:107-108` 与 :75-76 都是 `getAlbums()` + `Promise.all(albums.map(a => getAlbum(a.id, lang)))`——34 个 release 全量并发拉取来反查一个 disc。调用链:播放器"查看专辑"/分享(`lib/share.ts:19`、`track-actions.tsx:84`、`full-player.tsx:104`)和 More 页缓存分组(`more/actions.ts:24`)。

**影响**:三层都 `'use cache'+max` 且并行,稳态零后端请求。放大发生在:① 每次前端重新部署后 Vercel 数据缓存清空,第一个点"查看专辑"的用户触发 35 个后端请求(边缘 HIT 不烧 Worker,但 35 个出站 fetch + 冷态尾延迟几百 ms);② `lang` 进了缓存键,ja 用户首次再来一遍 35 连发。

**建议修法**:最省事是后端在 `/music/{songId}` 或 release 详情里直接带 `releaseId`(disc→release 后端一行 JOIN),前端 `getAlbumHref` 退化成单请求;次选让 `findReleaseByDisc` 复用 `songReleaseIndex`(索引已含 `albumId`+`editionId`),收敛到一份 en 索引。

### D4 · /me/sync 每次上传全量快照,库大以后随编辑线性放大 —— 中(现在低)

**证据**:`lib/account/sync.ts:68-88`——每次 `syncNow` 把全部 playlists(含每首 songId/position/addedAt)+ pins + download intents 序列化 POST;响应又是合并后全集。3s debounce(:130-136)正确,连续点赞合并为一次。

**影响**:按 500 首 Liked 估算,单次 POST ~30-50KB、响应同量级;整理歌单的活跃时段可能每 3 秒一发,每发 = 1 次 Worker 请求 + D1 全量 LWW 合并。另外**失败无重试/退避**:catch 只 `setStatus("error")`(:118-119),下一次推送要等下一次用户编辑或下次开 app——无热循环风险,但编辑会滞留在 error 态。

**建议修法**:近期可不动。库变大后:① 请求体只带 `updatedAt > lastSyncedAt` 的行(墓碑模型本就支持增量);② 失败时加一次 30s 延迟重试,避免"编辑→断网→回网后一直不同步"。

### D5 · 触屏设备上卡片实际无预取,首跳吃全额导航延迟 —— 低

**证据**:`hover-prefetch-link.tsx:40-44` 只在 `onTouchStart` 才 arm,touchstart 与 click 间隔 ~100-300ms,RSC 预取来不及完成。

**影响**:手机点专辑卡 = 完整 RSC 请求延迟(静态页,边缘,通常 100-300ms),换来网格页零预取请求。方向正确,只是要知道移动端没有"click 秒开"。

**建议修法**:可选——移动端对视口内前 N 张(如首屏 6 张)保留 `prefetch={null}`;或维持现状(合理)。

**已处理(歌单)**:歌单卡改回普通 `Link`(进视口即预取)——列表只有个位数条目,预取代价可忽略,实测点击→绘制 199ms → 22ms。专辑(上百张)/MV 网格仍走 `HoverPrefetchLink`,上面这条建议对它们依然成立。同时 `/playlists/[id]` 不再读服务端 `params`(fallback 参数会让 `await params` 悬挂,把整页推成运行时洞),shell 现在完全预渲染。

### D6 · MediaSession 封面绕过 SW 封面缓存 —— 低

**证据**:`audio-engine.tsx:244-246` artwork 用裸 `coverUrl()` 后端直链,而 SW 封面缓存只匹配 `/_next/image?url=…/stream/img/…`(`app/sw.ts:46-49`)。

**影响**:锁屏封面首次是一次全尺寸原图请求(边缘 HIT + 30 天 immutable,量极小);离线时锁屏封面缺失(页面内封面仍在)。

**建议修法**:MediaSession artwork 改指 `/_next/image` 变体(与页面同 URL 复用 SW 缓存),顺带获得离线锁屏封面。优先级很低。

### D7 · 反查索引只有粗粒度 cacheTag —— 低(记录在案)

**证据**:`albums.ts:73`、:105——`songReleaseIndex`/`findReleaseByDisc` 内容派生自全部 34 个 `getAlbum`,但只 tag `albums`/`disc:*`;若将来只 `revalidateTag("album:X")` 不打 `albums`,反查索引会继续供旧映射。

**影响**:当前运维流程总会打全量 `albums` tag,无实际影响;防将来细粒度失效踩坑。

**建议修法**:保持现状;在 `discography/imports/README.md` 刷新流程里注明反查索引依赖 `albums` 全量 tag。

---

**结论**:没有高频热路径浪费;最值得做的一件事是**后端给 `/lyrics/*` 加边缘缓存头**(唯一随听歌量线性烧 Worker 配额的路径),其次是搜索索引 `enabled` 门控、`/music/{id}` 带 `releaseId` 消掉 35 连发反查。

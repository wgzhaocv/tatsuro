# 02 · 客户端 JS 运行时

> 审计对象:player/progress store、音频引擎、频谱、歌词面板、曲目行、搜索、各 hydration mount、reconciler 触发面、persist 序列化。

## 概述

**这套播放器的运行时性能纪律非常好**。高频进度(timeupdate)被刻意隔离在独立的 transient store,所有 zustand 订阅都是窄 selector,歌词/曲目行的重渲染面收敛到 O(1~2) 个组件,rAF 循环有播放态/断点/reduced-motion 三重门控。没有发现任何"一次 timeupdate 重渲染整棵树"级别的高危问题。发现集中在:playlists store 的 persist 无防抖、hydrateSongs 触发多余 auto-sync、以及若干低成本常驻小开销。**无高危发现。**

## 健康项(已核实,值得保持)

1. **进度隔离架构**(`lib/player/store.ts:433-452`):`useProgressStore` 独立于持久化 store,timeupdate(~4Hz)全仓订阅者仅三处且树极小——`MiniProgress`(一个 3px div)、`SeekBar`(仅全屏打开时挂载)、`SyncedLyrics` 的 selector 返回**行索引而非时间**(`lyrics-panel.tsx:85-87`),tick 只在行边界产生重渲染。未泄漏进大树。
2. **player store 持久化防抖**(`store.ts:122-142`):trailing 300ms + pagehide flush,音量拖拽不会逐帧写 localStorage。
3. **TrackRow selector 折叠**(`track-row.tsx:48-53`):`isCurrent`/`isPlaying && current.id===id` 折叠成布尔——50 行的三碟专辑里切歌只有旧/新两行重渲染。
4. **CacheDot 不逐行查 IndexedDB**(`audio-cache-status.ts:28-94`):模块级 Set + 一次 `cache.keys()` seed + BroadcastChannel 增量,行内 `useSyncExternalStore` 查字符串 snapshot。
5. **Spectrum 三重门控**(`spectrum.tsx:38-39`):`isPlaying && isDesktop && !prefersReducedMotion`;canvas 按 clientWidth×dpr(封顶 2);gradient/binRanges 只建一次;只活在 Dialog 内,关闭即卸载。
6. **LyricRow memo + 行边界重渲染**;`scrollTo` 只在行索引变化的 effect 里发生,不随 tick;用户滚动 3s 抑制窗有 cleanup。
7. **scrubber draft→commit→catch-up**(`full-player.tsx:364-415`):拖动只动本地 state,提交后 pin 到真实进度追上(±0.35s)或 2s 超时。教科书式实现。
8. **AudioEngine 监听器卫生**:keydown/visibilitychange/BroadcastChannel 单例注册 + cleanup;MediaSession `setPositionState` 节流到 1Hz;handler 内一律 `getState()` 读,不制造闭包依赖。
9. **hydration mount 全部轻量**:三个 hydration 组件只做一次 `persist.rehydrate()`;reconciler 重活 async + Web Locks 单 tab + 500ms 防抖 + 后台挂起 interval;thin-entry 回填并发封顶 6。
10. **useDominantColor**:模块级缓存、48×48 读像素、`createImageBitmap` 离线解码。(但其 fetch 的 URL 有问题,见 04 报告 I1。)
11. **AlbumAmbient 刻意去动画**(`album-ambient.tsx:41-44`):注释记录了曾因 12s 呼吸动画迫使上层 backdrop-blur 逐帧重模糊导致手机发热,已改静止层;FullPlayer 打开动画祖先只 fade、内层 slide,避开 transform 模糊层祖先的重栅格化。
12. **主题切换 / toast 不重渲染全世界**:next-themes 换 class,只有 `ThemeToggle`/`Toaster` 自身用 `useTheme`,CSS 变量接管其余。
13. **selector 纪律全面达标**:全仓无 `usePlayerStore()` 无 selector 订阅;数组 hooks 都套 `useShallow`。

## 发现

### R1 · playlists store 持久化无防抖:每次变更同步序列化整个库 —— 中

**证据**:`lib/playlists/store.ts:310-317` 裸 `createJSONStorage(() => localStorage)`。而 player store 在 `store.ts:122-139` 专门写了防抖包装并注释了理由——作者清楚这个成本,但 playlists store 没有复用。每个 entry 存完整 denormalize 的 Song 对象;`toggleLike` 一次点击实际触发两次 set(`ensureLiked` 可能 +1,`addSong`/`removeSong` 各一次,:222-228),每次 set 都同步 `JSON.stringify` 全部 playlists + `localStorage.setItem`。

**影响**:Liked 500 首 ≈ 100KB+ JSON,单次点赞在低端手机是数毫秒~十几毫秒的主线程同步工作 × 2;拖拽排序每次落下同样全量。随库增长线性恶化。`downloads`/`pins` store 同样裸写(数据小,可忽略)。

**建议修法**:把 player store 的 `debouncedLocalStorage`(含 pagehide flush)提取成共享工具,playlists store 换用;长期可迁 IndexedDB(异步写)。

### R2 · 回填 hydrateSongs 未标记"远端写入",打开应用触发多余 sync push —— 中

**证据**:`lib/account/sync.ts:147-149` 的 auto-sync 以 `state.playlists !== prev.playlists` 为"用户编辑"信号,sync 自己的写入用 `withRemoteApplied` 豁免;但 `playlists/hydration.tsx:55` 的 `hydrateSongs(fetched)` 没有豁免——替换所有 playlist 引用必然触发 `scheduleSync`。冷启动 `persist.rehydrate()` 本身也把 `playlists` 从 `[]` 换成加载值再触发一次,叠加 `account-bootstrap.tsx:62` 的显式 `syncNow()`,一次打开最多 2~3 个 POST /me/sync。

**影响**:每次带 token 打开应用有 1~2 个多余的全库上传;移动端电量/流量浪费,服务器空转 LWW merge。无数据正确性风险(hydrateSongs 不 bump updatedAt)。

**建议修法**:导出 `withRemoteApplied`(或 `hydrateSongsQuiet`)给 hydration.tsx;auto-sync 触发器改比较 `updatedAt` 最大值(只有用户编辑 bump 它),同时消掉 rehydrate 误触发。

### R3 · MiniProgress 用 width + transition:播放期间常驻 layout —— 低

**证据**:`mini-player.tsx:197-202` `transition-[width] duration-300` + `style={{width: percent%}}`,~4Hz 更新目标值,300ms 过渡意味着播放时这条 3px 线基本持续处于 width 过渡中——width 是 layout 属性。

**影响**:绘制面积极小,但它在所有页面、整个播放期间常驻,是播放期唯一每帧跑 layout 的东西。手机长时间播放的电量税。

**建议修法**:改 `transform: scaleX()` + `transform-origin: left` + `transition-transform`,纯 compositor 动画。(与 03 报告 C8 同一发现,两个 agent 独立命中。)

### R4 · Spectrum 在 analyser 永不可用时 rAF 空转轮询 —— 低

**证据**:`spectrum.tsx:55-62` `draw()` 先 `requestAnimationFrame(draw)` 再 `getAnalyser()`;若 `ensureAnalyser` 永久失败(`analyser.ts:30-33` Web Audio 被禁/CORS 建图失败返回 null),循环在"桌面+播放中+全屏打开"期间 60fps 空转到永远。

**建议修法**:轮询加截止(5s 没等到就 `cancelAnimationFrame`),或 `ensureAnalyser` 失败置模块级 `unavailable` 旗标供 draw 自杀。

### R5 · 搜索每键全量重折叠目录,无预计算 —— 低

**证据**:`lib/api/search.ts:43-53` `filterIndex` 对每 album `normalize(a.name)`、每首歌最多 3 次 `normalize`(toLowerCase + 片假名正则,`lib/text.ts:15-19`);`command-search.tsx:47` 每键同步 `useMemo` 过滤,无 debounce/`useDeferredValue`。~550 行目录 ≈ 每键 ~2000 次正则调用。

**影响**:估计 <1~3ms/键,当前规模不构成可感知卡顿——列为改进项。目录扩大一个数量级才咬手。

**建议修法**:fetch 后一次性预折叠(每行存 `_folded` haystack),`filterIndex` 只做 `includes`;查询值套 `useDeferredValue`。

### R6 · 任意 playlists 变更(含每次点赞)都触发 reconciler 全量 pass —— 低

**证据**:`reconciler.ts:391-393` 只比较 `playlists` 引用就 `requestReconcile()`;一个 pass = `caches.open`×2 + 两桶 `cache.keys()` 全量枚举 + 重算 desired 集。点一次赞(与离线无关)→ 500ms 后一次完整 pass。

**影响**:全 async 不阻塞渲染;缓存几百首时 `keys()` 有实际 I/O + 结构化克隆成本,但频率是点击级。可省的功,不是 jank。

**建议修法**:订阅回调先廉价预筛——仅当存在未删除的 playlist 类型 intent 时才 `requestReconcile`。

### R7 · whenHydrated 的订阅在永不 hydrate 时不清理 —— 低

**证据**:`account-bootstrap.tsx:96-109` `store.subscribe` 只在 `hasHydrated` 变 true 时 unsub;某 store rehydrate 抛错则泄漏,effect cleanup 不取消这些订阅。泄漏体是空谓词,仅异常路径。

**建议修法**:`whenHydrated` 接受 AbortSignal 或返回 cancel,在 effect cleanup 调用。

### R8 · PlaylistDetail 行列表无 memo:任何 playlist 变更全列表重渲染 —— 低

**证据**:`playlist-detail.tsx:44` `usePlaylist(id)` 返回对象引用,本表任何增删/重排/hydrateSongs 产生新引用 → 整个 detail 重渲染,:174-198 的 50 个 `TrackRow`(非 memo,`onRemove` 内联闭包)全部重跑。专辑页无此问题(disc-section 是服务端组件)。

**影响**:50 行 × 单次 ~1-3ms,只发生在显式操作后——目前无感;"remove + undo toast + restore"连续 3 次全列表渲染,列表到几百行开始可感。

**建议修法**:`memo(TrackRow)` + `onRemove` 改稳定 useCallback。

## 核查过、不成立的怀疑点

- "timeupdate 泄漏进大树" — 不成立(健康项 1)
- "spectrum 暂停/隐藏/手机空转" — 不成立(三重门控;仅 R4 边缘例外)
- "lyrics 每 tick scrollTo" — 不成立(只随行索引)
- "cache-dot 逐行查库" — 不成立(共享 Set + 广播)
- "切歌全部行重渲染" — 不成立(布尔折叠限定 2 行)
- "reconciler 启动主线程重活" — 不成立(全 async + 防抖 + 单 tab 锁)
- "键盘/BroadcastChannel/MediaSession 泄漏" — 未发现
- "theme/toast/dialog 重渲染全局" — 未发现

# Tatsuro 重做路线图

> **跟着这个文件做。** 每完成一项勾掉;有新决定就更新本文件,让它始终是唯一的进度真相。
>
> - 产品定位:[PRODUCT.md](./PRODUCT.md)
> - 设计规范:[DESIGN.md](./DESIGN.md)(The Noon Postcard)
> - 活体演示:`/demo`(改了设计系统后打开核对)
> - API 契约:旧仓库 `yamashita_tatsuro/design/00-api-contract.md`(后端 `ys-tr.withyakul.me`)
> - 旧 UI 的坑:旧仓库 `design/01-ui-audit.md`(重做时别再犯)

## 阶段 0 — 地基 ✅

- [x] PRODUCT.md(register/用户/双主题范围/语言策略/可达性基线)
- [x] DESIGN.md + `.impeccable/design.json`(色板、深水律、暖影律、玻璃纪律、混排律)
- [x] Token 落地 `app/globals.css`:正午/黄昏双主题、品牌色+深水伴生色、暖影、渐变、动效词汇(breathe/glint/shimmer)、reduced-motion 开关
- [x] 字体:Quicksand(展示)/ Inter(正文)/ Zen Maru Gothic(日文,`lang="ja"` 自动生效)/ Geist Mono
- [x] `/demo` 设计系统演示页(长期保留,含主题切换)
- [x] shadcn base-maia 底座:`button`、`input`(default 变体自动 = 深水青,AA 达标)
- [x] 对比度全量验算(浅色 6 处问题已修,黄昏全过)

## 阶段 1 — 数据层(先于所有屏,或与 Gate 并行)

- [x] `lib/api/`:集中 API client——`albums.ts`(`getAlbums`/`getAlbum`/`findReleaseByDisc`)+ `songs.ts`(`getDiscSongs`/`getSong`)+ `urls.ts`(封面/流媒体/MV 直链)+ `lyrics.ts`(`fetchLyrics`/`isTimed`/`currentLineIndex`,`GET /lyrics/{id}`)+ `mv.ts`(`getMvs`→`/mv/list`)+ `types.ts`(wire→domain 映射)+ `client.ts`(`fetchSong`,TanStack Query 侧)全部落地。缓存策略统一到 Next 16 Cache Components:`next.config.ts` 开 `cacheComponents: true`,每个 client 函数 `'use cache'` + `cacheLife('max')` + `cacheTag`(`albums`/`songs`/`mv` + 细粒度 `album:{id}`/`song:{id}`/`lyrics` 等),将来 `revalidateTag('albums'|'songs')` 一键刷新
- [x] 领域模型 `lib/api/types.ts`——**演进为「Release → Edition → Disc」(后端建模,见 `../yamashita-api`)**:`Album`(发行)/ `Edition`(版本)/ `Disc`(碟)+ 曲目 `Song{id,name,trackNumber,…}`(`name` 已剥 "01 - " 前缀)。既消除了旧站 `AlbumSong` / `SongType` 双套字段,又顺带解决多碟被拆成多专辑、无年份、无 studio/live 的问题(JOY 1.5 归为 Ray of Hope 第 2 碟等)
- [x] `.env`:`NEXT_PUBLIC_API_URL` / `ARGOT` / `AUTH_SECRET`(已从旧仓库拷贝)
- [x] `next.config.ts` remotePatterns 加后端图片域(`/stream/img/**`、`/mv/thumbnail/**`,host 由 `NEXT_PUBLIC_API_URL` 推导)
- [x] 播放器内核:`lib/player/store.ts`——旧站 4 个互相 `getState()` 的 store(player/control/volume/fullPlayOpen)合并为**一个持久化 `usePlayerStore`**(context/order/position 队列状态机 + userQueue/history + shuffle 索引层 + repeat + 音量 + expanded),外加瞬态 `useProgressStore`(timeupdate 高频进度,不进 localStorage)。`seekFn` 注入换成 nonce 化 `seekRequest` 由引擎消费;`order` 也持久化(修旧站 shuffle 刷新丢序 bug);`skipHydration` + 挂载后 rehydrate 免 SSR 水合错配,恢复的会话永远落在暂停态。`components/player/audio-engine.tsx` = 唯一碰 `<audio>` 的地方:src/播放/音量跟随 store、repeat-one 用 `loop`、MediaSession(元数据/锁屏控制/positionState)、Space/←→ 键、BroadcastChannel 跨 tab 互斥、**iOS 音频焦点裁决整套移植**(锁屏抢回 vs 让位 + 400ms 挂起裁决 + 3s 幽灵恢复守卫)
- [x] Gate 鉴权逻辑移植(`proxy.ts` + `lib/auth.ts` + `lib/constants.ts`;去掉了 UA 设备分支,重定向目标限同源)
- [x] Service Worker 音频缓存移植:旧站同款 **`@serwist/turbopack`**(Turbopack 没有 webpack 插件,SW 由 `app/serwist/[path]/route.ts` 用 esbuild 打包、serve 在 `/serwist/sw.js` 带 `Service-Worker-Allowed: /`);`app/sw.ts` 只拦 `/stream/new_play`,`app/sw/audio-cache.ts` = 未命中先透传秒播 + 后台下完整文件,命中后手写 206 Range 切片(已实测 `bytes 100-199/8104176`),LRU 按 IndexedDB 访问时间淘汰(quota 一半,300MB 保底),`audio-cache-events` 广播;注册在 `components/sw-provider.tsx`(dev 禁用、`reloadOnOnline=false` 防打断播放)。TanStack Query 同步接入(`components/query-provider.tsx` + `lib/api/client.ts`/`lib/queries/song.ts`,固定曲库 staleTime ∞)

## 阶段 2 — 逐屏重做(每屏 = 一次 `/impeccable craft`)

顺序:定调 → **先有内容可浏览(专辑/歌曲)** → 再做播放器 → 外围。
> 播放器改到网格/详情之后:播放器需要真实歌曲喂养 + 一个点歌入口才能验透队列/播放流程;首页网格 + 专辑详情正好把数据层(albums/songs API + 统一 Song 模型)跑通。孤立地拿假数据做播放器验不透。

- [x] **1. Gate 登录页** — 真实海景照片 + 磨砂玻璃表单;第一屏定调。字标 + 密码表单居中锁版(**去掉了黑胶唱片**——空转的唱片=假 affordance,违反动效传达状态的原则)。双主题各用一张真实照片(正午=航拍青绿海+白沙+单棵棕榈 Unsplash,本身在海蓝系,不调色、`object-[50%_30%]`;黄昏=暮色紫红棕榈剪影 Unsplash);白字标后加浅 navy 椭圆遮罩(`at 50% 44%`)防止压在高光/glow 上。无障碍:登录框自动聚焦 + 输错后重新聚焦、`aria-describedby` 关联错误提示
- [x] **2. 首页专辑网格** — 沉浸式:整屏固定海景照片(正午/黄昏各一张,本地 `app/_assets`,深水律 scrim)+ 磨砂玻璃网格面板浮起在照片上;25 张 release 明信片卡(`getAlbums()`→`/music/releases`),封面 `auto-fill minmax(190px)`(手机 2 列、宽屏 6 列、恒定 ~210px),**All · Studio · Live · Compilations** 筛选(chips 靠右同标题行)+ 顶栏通用搜索;`2 CD`/`3 CD`/`2 versions` 徽标、`· Live`(coral-ink)/`· Compilation` 标签;按年代排;双主题成立、移动无溢出、44px、`w-screen` 固定照片消除滚动条抖动。**后端数据模型重塑**:多碟(Opus/Joy/Rarities/Poppin'/Softly)与再版(Ride on Time/Pocket Music)合并为「release→edition→disc」,JOY 1.5 归为 Ray of Hope 第 2 碟(live);详见 `../yamashita-api` migrations + 新接口 `/music/releases`、`/music/release/:id`(旧接口不变)。页面已收进 `app/(main)/` 路由组;over-photo 的 glass chrome(nav/chips/搜索)做成了 `Button`/`Input` 的 `glass`/`glass-active` variant(暗色走 dusk-navy 暮蓝玻璃)
- [x] **3. 专辑详情**(2026-07 重做一版)— **封面环境光·正午亮洗**:每张专辑自己的封面模糊放大铺满视口做环境色,再**溶进白光**(黄昏=暮蓝,渐变 scrim 收在浅罩律内),文字全程墨色/前景 token——不再压深色蒙版。桌面 = **左侧粘性身份栏**(封面无白边、圆角+postcard 投影;专辑名日文自动 Zen Maru;meta 行:年份·category·曲数·碟数·总时长;Play;Edition chips)+ 右侧磨砂 sheet 曲目列表(bg-card/80,一层玻璃),Opus 三碟长列表滚动时封面常驻;移动 = 居中竖排,390px 无溢出。**版本 = 路由**(不做客户端切换):默认(最新)版住 `/album/:id`,再版住 `/album/:id/:year`(如 `/1986`,slug 用 `editionSlug`=年份、缺年份回退 edition id);chips 是 `Link`(`aria-current`),选中 = 深水渐变+白字,新→旧排;URL 可分享、可后退。公共 chrome(返回 pill + 主题切换)在 `app/(main)/album/layout.tsx`;组件拆为 `edition-view`(服务端组合)/`album-ambient`/`edition-switch`/`disc-section`/`track-row`,唯一客户端叶子 = `fade-image`(服务端组件的 phosphor 图标走 `dist/ssr` 入口)。**多碟分组**:碟头 = 碟own封面缩略 + 标题(无标题则 Disc N,副行不重复)+ Live 标(coral-ink)+ 曲数/时长副行 + 细线;单碟无碟头。曲目行:序号 hover 换播放glyph(接口位留给 #4)、歌名 truncate、时长 mono tabular,行高 ≥44px。**静态化**:`generateStaticParams` 预渲染 25 张默认版 + 全部再版年份路由(自底向上给出 `{id, edition}`),坏 id/坏 edition → `getAlbum().catch(notFound())`/`findEdition` 失败 → `album/not-found.tsx`(渲染在 layout 里);ambient 模糊层不 priority(hero 封面才是 LCP)。Play 仍是 `aria-disabled` + tooltip 诚实占位。双主题成立、reduced-motion 走全局开关、生产构建通过。**入场自动定位**(2026-07):进入含当前播放曲的专辑,自动把该行滚到视口居中——`lib/player/use-scroll-to-current.ts`,护栏:只在进入后 1.5s 窗口内触发(浏览中切歌绝不拽页面)、行已在舒适视野(上下留 96px)不滚、reduced-motion 走瞬时;**注意 Next 16 用 React `<Activity>` 缓存已访问页面**——返回时组件不重挂、ref 全保留,「入场」的唯一可靠信号是空依赖 effect 在 re-show 时的重连(靠它记 enteredAt,别用一次性 ref 标记),滚动要 setTimeout ~150ms 晚于路由自己的置顶。
- [x] **4. 全屏播放器**(桌面 + 移动)+ **迷你播放条**(永远实色)(2026-07)— 播放器 chrome 收在 `app/(main)/layout.tsx`(`PlayerDock` + `AudioEngine`,gate/demo 不带)。**迷你条** `components/player/mini-player.tsx`:不透明 `bg-card`(正午白/黄昏 Dusk Deep),顶边 3px 深水渐变已播线,44px 封面 + 歌名/专辑(日文自动 Zen Maru)+ prev(≥sm)/播放/next,点歌名区展开全屏;无队列时下滑隐藏 + `inert`,`PlayerDock` 的占位 spacer 防止盖住页尾。**全屏播放器** `components/player/full-player.tsx`:base-ui Dialog(焦点圈 + Escape),封面模糊放大做环境光溶进白光/暮蓝(同专辑页材质),签名 **Scrubber**(`components/player/scrubber.tsx`:Sky 4px 轨道/深水渐变已播/白拖点+lift-ocean,seek 用 draft→commit→追齐防回跳),transport(shuffle/prev/大 Play/next/repeat 三态)+ 音量(≥sm,手机走硬件键)。**接线**:曲目行=整行播放按钮(hover 序号换 glyph、当前行深水高亮 pause/play、`aria-current`),rail Play=同 edition 智能 toggle;`EditionPlaybackProvider` 服务端把 edition 扁平成队列(封面/专辑名反规范化进 Song)喂给行组件。双主题/390px 无溢出/44px/reduced-motion 走全局开关,浏览器实测:播放、自动切歌从 0 开始、seek、Escape、刷新恢复(暂停态)、MediaSession 元数据、SW 缓存 206 全过
- [x] **5. 歌单**(2026-07-14,本地优先 + sync-ready)— Likes + 歌单纯前端落地:`lib/playlists/`(`types` sync-ready 形状 = 将来 D1 超集,`store` 镜像 player store 的 zustand persist:key `tatsuro-playlists`/skipHydration/UUID id/`updatedAt`+`deletedAt` 墓碑,`migrate` 一次性读老站 `music-playlist-storage`)。**Liked = 保留歌单**(`id:"liked"`,不可删/改名,heart 独占)。UI 全按 DESIGN.md 重做,复用 `SectionHero`(新抽,home/mv/playlists 共用)/`BrowseGrid`/base-ui `Dialog`:列表(`/playlists`,Liked 置顶)、详情(`/playlists/[id]`,PPR 动态洞 + Suspense)、新建/重命名(`PlaylistNameDialog`,即时无假动画)、加入歌单(切换成员 + inline 建单)、每行独立移除(修老站坑)。**队列播放泛化**:`components/track/`(`playback-context`+`track-row`+`track-actions`)取代 album 的 `edition-playback`,album/playlist 共用同一 TrackRow + Play 按钮;队列身份用稳定 `contextId`(edition.id/playlist.id)而非显示名。Like/加入歌单接到专辑行 + 全屏播放器 + 迷你条。底栏/顶栏 playlists 占位翻活。三语 i18n 补齐。**账号云同步 = Backlog #1,待做**(数据格式已冻结好,届时哑上传瘦投影)。build/lint/tsc 全过,simplify×4 已修
- [x] **4.5 数据跟进:`single` 类目**(2026-07-13)— 后端 2026-07 导入后 **32 releases**(+114 首,见 `discography/README.md`),4 张 `category: "single"`。已落地:`AlbumCategory` 加 `single`、卡片 `· Single` 标签、首页加 **Singles** chip、专辑页 meta 行同步认识。浏览器实测 32 张全露出、Singles 筛出 4 张。生产上后端再改数据仍需 `revalidateTag('albums')` 或重部署刷新
- [x] **6. 歌词**(2026-07)— 住在全屏播放器里(header 右 Quotes 钮封面⇄歌词翻面,不跳路由),浮在封面环境光上不加卡。**数据**:`lib/api/lyrics.ts`(`GET /lyrics/{id}`,结构化 JSON:`startTime` 秒 + `lyrics.{origin,ja,en}`,404=无词→空数组;`isTimed`=全部行 `startTime>0`,与旧站约定一致)+ `lib/queries/lyrics.ts`(`["lyrics", id]`)。**同步**:`components/player/lyrics-panel.tsx`——currentTime 线性扫描当前行,当前行 Coral Ink(黄昏=浅水珊瑚 6.6:1),已过行 muted;滚动跟随 `list.scrollTo` 居中(list 加 `relative` 保证 offsetTop 参照,只滚列表不带动 dialog),用户 wheel/touch 后暂停跟随 3s,reduced-motion 走 `behavior:auto`;点行 seek+播放(整行 button,`aria-current`);上下 mask 渐隐。**降级**:无时间轴→纯文本静排;无词→"No lyrics for this song yet.";加载→pulse 骨架(`<output>`)。翻译 ja/en 有则小字对照(当前数据多为 null)。浏览器实测:同步高亮/居中跟随/点行跳播(51.4s ✓)/双主题/390px 全过。编辑器(POST+password 打轴工具)未移植——站主需要时再说。**2026-07 站主反馈迭代**:①歌词占屏太少 → 歌词模式重排:大封面收成 48px 缩略 + 歌名一行,歌词吃掉 header 与 scrubber 之间全部空间(列表 `flex-1 min-h-0`;居中 padding 从 `py-[38%]` 改固定 `py-14/16`——百分比 padding 不可压缩会把音量条挤出视口);②圆体歌词发腻 → 歌词正文改 `--font-jp-gothic` 标准黑体(混排律已更新:圆体只给标题性内容);③引号图标看不懂 → 换 `MicrophoneStage`(麦克风=歌词/跟唱,旧站同款惯例);④歌词列表 `no-scrollbar`(渐隐 mask 会把原生滚动条拦腰切断)+ 全局 `color-scheme` 跟主题;⑤**桌面(lg+)两种模式都不是拉宽的手机**——舞台格局:控制条(频谱·进度·transport·音量)永远横贯底部,与 header 同一条 6xl 轨道等宽;上方封面态=大封面+歌名居中,歌词态=左封面右歌词(grid `[minmax(0,22rem)_1fr]×[1fr_auto]`,控制条 `col-span-full`)。⑥**频谱组件** `components/player/spectrum.tsx`:Web Audio AnalyserNode(`lib/player/analyser.ts` 单例,onPlay 用户手势内建图,`<audio>` 加 `crossOrigin="anonymous"` 否则跨域媒体读出全静音)+ canvas 圆头频柱,浅水 ocean→turquoise 渐变(纯装饰,深水律成立),暂停淡出、reduced-motion 不动画、仅 lg+ 显示;对数分 bin + 跳过恒热低 bin + gamma 1.6 + 逐柱快起慢落阻尼——**注意 analyser 在 onPlay 手势里才建,组件必须在 rAF 里轮询 getAnalyser()**(拿一次 null 就放弃的话,生产环境无 StrictMode 双跑会永久空白)。⑦**memo 迭代**(2026-07):桌面(lg+)播放页**合一**——恒为左封面右歌词单一视图,封面⇄歌词切换只属于手机(`lg:hidden`);shuffle/repeat active = 浅底+圆点;歌词滚动:首次居中瞬时、手动滚动 3.2s 后自动回中;**TypeScript 7**(原生编译器):Next 16.2 不支持其 JS API,`build` 脚本自跑 `tsc --noEmit` + Next 侧 `ignoreBuildErrors`(类型仍强制)。**双主题照片改单张渲染** `components/theme-image.tsx`:旧的 CSS `dark:hidden` 双 `<Image>` 方案会让 Chrome 把两张全屏图都下载(display:none 的 lazy 图不做懒加载判定)、且隐藏那张触发 next/image 尺寸警告;现在挂载后按 `resolvedTheme` 只渲染一张(首拍由渐变底顶住,gate/home 已换用),实测单主题只下载一张
- [ ] **7. 播放队列 / 历史**(抽屉或侧栏)
- [x] **8. MV 页**(2026-07-13)— 视频卡片网格(缩略图/名称/时长/文件大小/下载)。**只下载、不做站内流播**(站主拍板:`<video>` 流播的 Range 请求会大量消耗 Worker 免费额度);下载与旧站同约定——`<a target="_blank">` 新 tab 把 GET 交给浏览器,后端 `content-disposition: attachment` 直接落盘。数据:`lib/api/mv.ts`(`/mv/list`,`'use cache'` + `cacheTag('mv')`)+ `types.ts` 的 `Mv` 域模型。界面复用首页浏览面签名:同一张海景照片 + 浅罩 + `GlassPanel`,16:9 缩略图 postcard 卡、时长白丸徽标、`· MB` 副行、44px `secondary` 圆形下载钮(icon-only,`aria-label` 带片名),日文片名 `lang="ja"`;顶栏 `HomeNav` 泛化(`current` prop,MV 成真链接,Songs/Playlists 仍占位)+ 通用搜索过滤 + 副标题「N videos · 总大小」。双主题/390 无溢出/生产构建全过。移动端入口依赖 #10 底部标签栏(现阶段手机只能直接进 /mv)
- [x] **9. 404 / 空状态**(2026-07-13)— 站主拍板:私享站不需要 404 落地页,全局未匹配路由 `app/not-found.tsx` 直接 `redirect("/")`(实测 /does-not-exist → /)。已知路由的语义化 miss 保留自己的页面(`album/not-found.tsx`);列表空状态已在各屏内置(首页/MV 的 No results)
- [x] **10. 导航/信息架构定稿**(2026-07)— 桌面居中 pill 导航(`components/home/home-nav.tsx`,`current` prop)+ **手机/平板底部标签栏** `components/bottom-nav.tsx`(Spotify 式,`lg:hidden`)。四段 Albums / Discover / MV / Playlists,镜像桌面 pill:有 href = 活屏(`Link`,locale-aware),无 href(Discover)= 占位不可点(`aria-disabled` + comingSoon tooltip)。当前段判定按路由(`/album/*`→Albums、`/mv/*`→MV,`usePathname` 已去 locale 前缀),active = 前景色 + `fill` 图标(深水律,无浅水色文字)。磨砂玻璃(暗色 dusk-navy)+ hairline 顶边,fixed 到视觉视口(collapsing 地址栏不埋)、`env(safe-area-inset-bottom)` 避刘海、flow spacer 占位防盖页尾;视频舞台(`videoStage`)隐藏,与 mini 条错层堆叠(不重叠)。三语 i18n。这补齐了 #8 MV 页遗留的移动端入口。

## 阶段 3 — 主题与打磨

- [x] next-themes 接入(`ThemeProvider` in `app/layout.tsx`,`attribute="class"` / `defaultTheme="system"` / `enableSystem` / `storageKey="tatsuro-theme"`——首访跟随系统深色,手动切换后记住;`components/theme-toggle.tsx` 磨砂玻璃日月切换钮,图标随 `.dark` 纯 CSS 交叉淡入,套 shadcn(base-ui)`tooltip` 做 a11y——聚焦/悬停出上下文文案「Switch to noon/dusk」,tooltip 用 `bg-foreground/text-background` 天然 AA;`/demo` 已从手写 localStorage 升级到共享 `useTheme`)
- [ ] 动效统一 pass(`/impeccable animate`):氛围光斑、页面过渡,慵懒丝滑 400–600ms
- [ ] a11y pass(`/impeccable audit`):键盘可达、44px 触控、input 边界对比、reduced-motion 全覆盖
- [ ] 响应式 pass(`/impeccable adapt`):`100dvh`、CSS 断点(不依赖 UA 分支)
- [ ] 性能:封面懒加载、日文字体加载策略、`/impeccable optimize`
- [ ] (探索,可不做)金色日出第三主题

## Backlog — 站主想法(2026-07-13 记,未排期)

1. **账号登录 + 云端歌单(2026-07 已落地 ✅ — Google OAuth,非自托管)** — 保存歌单/Liked 跨设备(#5 歌单的云同步)。**最终选了 Google OAuth**(不是原倾向的自托管账号):登录本就是可选、独立于 Gate 密码的加分项,Google 零后端密码管理成本;大陆直连问题接受(熟人小站、翻墙用户 + 海外用户覆盖够)。落地:
   - **前端**:`lib/account/store.ts`(zustand persist,token + user + syncStatus)、`components/account/account-button.tsx`(浏览页顶栏磨砂圆钮,cloud-up 未连 / cloud-check 已同步,dialog 提供 Google 登录或显示已连账号 + 断开)、`account-bootstrap.tsx`(挂载时消费 OAuth 回跳的 `#token`、`fetchMe`、启动 `startAutoSync`)、`google-icon.tsx`。
   - **同步引擎** `lib/account/sync.ts`:桥接本地优先歌单 store 与后端 `POST /me/sync`(**整歌单 LWW 合并,只增不覆盖** — 见 8608efe 文案)。zustand 仍是真相源:本地快照 push → 采纳服务端权威 merge → 合并拉来的异设备曲目走同一 TanStack Query 缓存补水(不重复 fetch)。无轮询,只在连接/开 app/(debounced 3s)用户增删改时触发;`applyingRemote` 守卫防止 adopt/hydrate 被当成用户编辑回弹。
   - **后端**:Worker `/auth/google/login`(带 `redirect` 302 回带 `#token`)+ `/me` + `/me/sync`;数据落 D1(见 `../yamashita-api`)。登录态是 httpOnly cookie 之外的 bearer token(账号同步用),与 Gate 密码 cookie 独立。
   - 调研备忘(为什么没选别的):微信个人主体不可行、短信无免费档、自托管账号要自管密码/找回流程 → Google 最省。将来想叠自托管或其他社交登录仍可加。
2. **歌名双语(英↔日)(2026-07-13 前端已落地 ✅,数据待补齐)** — 后端 song-name 接口已带 `?lang=en|ja`(默认 en),返回 `name_{lang}`(保留 `NN - ` 轨号前缀)。前端串通:`lib/api/types.ts` 加 `NameLang` + `nameLang(locale)`(ja→ja,en/zh→en,**中文用英文名**);`getAlbum(id, lang)`(lang 进 `'use cache'` 键,`cacheTag` 保持 lang 无关,一次 revalidate 刷两语);`fetchSong`/`useSong` 带 lang(query key 含之,en↔zh 稳定、只 ja↔en 重取);播放器由 `useLocale()` 取 lang;专辑页 `getAlbum(id, nameLang(locale))`,版本枚举 lang-neutral(按年份 slug)。**SSG 实测**:43 专辑 × 3 语全预渲染完整歌单,`/ja` 出日文曲名、`/en`+`/zh` 出英文名(提交 `9da23d4`)。**数据已大体就位**:后端 `name_ja` 520 全有、`name_en` 487/520(33 首纯日文 live 版空);纯英文曲名如 DOWN TOWN 三语一致是数据本身如此。剩余补译/校订随歌词 studio 工具同一入口。专辑名双语暂未纳入(接口未提供),需要时再说
3. **UI 多语言(i18n),中日英三语(2026-07-13 已落地 ✅)** — UI chrome 三语(en/ja/zh),**内容(专辑名/歌名/歌词)保持日文**(内容中英化是 #2,后端活,另算)。**用 `next-intl` v4**(不是手搓——`spike` 验证 next-intl + `cacheComponents` 静态化零冲突后,加上「demo 待删 + gate 也本地化 → 整站入 `[locale]`」,主流框架更划算)。已落地:
   - **结构**:`app/(main)` 与 `app/gate` 都迁进 `app/[locale]/`(gate 也本地化);`app/demo` 暂留根、不译(待删);根 `app/layout.tsx` 保留 `<html>`+provider,`[locale]/layout.tsx` 挂 `NextIntlClientProvider`+`setRequestLocale`+`HtmlLang`(客户端 effect 修 `<html lang>`)。
   - **地基**:`i18n/{routing,request,navigation,messages}.ts` + `messages/{en,ja,zh}.json`(ICU 复数)+ `next.config` 套 `withNextIntl`。`components/ui/link.tsx` 改 re-export next-intl locale-aware `Link`(保留 scroll=false,单一收口自动补前缀);`bottom-nav` 用 `i18n/navigation` 的 `usePathname`(已去前缀)。
   - **proxy**:`createMiddleware(routing)` 与密码门鉴权组合(未带前缀→intl 加前缀;已带→鉴权,gate 落 `/{locale}/gate`);`resolveRedirect`/`resolvePath` 兜底本地化。
   - **组件**:客户端 `useTranslations`、服务端 `getTranslations({locale})`(**显式传 locale**,否则 `cacheComponents` 下读请求 locale/系统时区触发 "uncached data" 预渲染错误——`request.ts` 也 pin 了 `timeZone`、messages 走 `'use cache'`、provider 五个 prop 全显式)。语言切换器 = shadcn Select(触发器显 EN/日/中 简写)。
   - **SSG 验证**:`bun run build` 生成 **192 静态页**(locale × 全部路由,含三语 gate),`◐` PPR;curl 实测 Accept-Language(ja/zh/fr→ja/zh/en)+ 本地化 gate 重定向 + 三语 gate 渲染全过。PRODUCT.md / AGENTS.md 语言策略已同步改。
   - **和 #2 的关系**:#2(内容双语)是后端 D1 schema + 全曲库补译,与本条(前端 UI)独立,可各自推进。
4. **MV 站内流播(零 Worker 消耗,2026-07-13 已落地 ✅)** — MV 视频改为公开 bucket 直连流播,**全程免费**:
   - **已做**:新建公开桶 `yamashita-mv`,14 部 MV 的视频+缩略图从 `yamashita-tatsuro` 迁入(删原件、不留两份);绑自定义域 **`tatsuro-mv.withyakul.me`**(zone `withyakul.me` 同账号,min-TLS 1.2)。前端 `<video>` 直连该域流播,Range 请求走 R2(实测 **206 Partial Content**),完全不过 Worker。
   - **架构**:`/mv/list` 现返回 `streamUrl`/`thumbnailUrl`(公开域直链,缩略图也不再过 Worker);Worker 加第二 binding `MV_BUCKET`→`yamashita-mv`,仅 `/mv/download`(整文件 GET,带 `attachment`,单请求不是 Range,成本可忽略)与 `/mv/thumbnail`(遗留路由)读它。前端卡片点缩略图内联播放(`components/mv/mv-card.tsx` 转 client),保留下载钮;`next.config.ts` remotePatterns 加 `tatsuro-mv.withyakul.me`(env `NEXT_PUBLIC_MV_HOST` 可覆盖)。
   - **费用依据**([R2 Pricing](https://developers.cloudflare.com/r2/pricing/)):egress 全免费;GET/Range = Class B,1000 万次/月免费;存储账号合计(迁移是零增量,MV 本就在总量里)。
   - **Cache Everything 规则(dashboard 手动)**:wrangler 的 OAuth token 无 rulesets 权限,需在 dashboard 给 `withyakul.me` zone 加一条 cache rule(hostname = `tatsuro-mv.withyakul.me`,Eligible for cache + Edge TTL override 6 months)让 .mp4 进 CDN。缓存 key 是 URL 不含 Range,整份文件缓存后任意 Range 都 HIT。不加也在免费额度内,只是每次 Range 打一次 R2。
   - **mv_09「蒼氓」已删**(2026-07-13):视频文件在源桶本就缺失(D1 有记录+缩略图,mp4 无,473MB 4K),旧站下载早已 404。站主本地有原件但 wrangler put 封顶 300MB、免费面板上传也不给传 >300MB,遂决定从 D1 `mvs` 删该行(现 13 部)+ 清掉孤儿缩略图。将来若要补回:需 S3 多段上传(建 R2 API token 走 `<账号>.r2.cloudflarestorage.com`,bun 原生 S3 client 自动多段)+ 重新插 D1 行。
   - **音频仍全私有**:主桶 `yamashita-tatsuro` 不动。将来音频若也想省 Worker,走 **S3 presigned URL**(每首签 1 次,浏览器直连 R2 做 Range)。

5. **被缓存歌曲的视觉表示**(2026-07-13 记,未排期)— Service Worker 音频缓存(阶段 1 已落地,`audio-cache-events` 广播 + IndexedDB LRU)目前对用户完全不可见。想在曲目行/迷你条/全屏播放器上给「已离线缓存」的歌一个视觉标记(下载好的小图标/状态点,深水律),让用户知道哪些歌不吃流量。数据源已有(SW 的 `audio-cache-events` 广播 + IndexedDB 查询),缺的是前端订阅 + 标记 UI。
6. **歌曲与专辑的分享(2026-07-14 单曲分享已落地 ✅)** — **照老站做法:不建 `/song/[id]` 独立路由**(站主拍板),分享链接 = **专辑页 + `?song=` 高亮**。落地:
   - **分享钮** `components/track/share-button.tsx`:`useShareSong(song)` hook(独立钮 + 行内溢出菜单共用)+ 独立 `ShareButton`(全屏播放器)。点击调 `lib/share.ts` 的 `getSongShareLink(discId, songId, locale)` server action(登录态是 httpOnly cookie、JS 读不到,故 server 现签 token),回 `/album/{releaseId}?song={songId}&argot={token}`,前端拼 origin+locale;移动端 `navigator.share`、桌面 `clipboard`+toast。
   - **落地高亮** `components/album/shared-song-highlight.tsx`:客户端组件,**用 `window.location.search` 读 `?song`(不用 `useSearchParams`——专辑页是 `generateStaticParams` SSG,`useSearchParams` 在 cacheComponents 下会把整条路由拽成动态、触发 notFound)**,`useEffect` 里 `document.querySelector([data-song-id])` 滚动居中 + 4.5s `data-shared` 高亮(reduced-motion 走 auto)。`TrackRow` 的行 div 加 `data-song-id={track.id}` + `data-[shared=true]` 高亮样式。
   - **OG = 专辑卡**(不是单曲专属):OG 图走文件约定认路由不认 query,`?song=` 在专辑页上 → 分享预览是专辑卡(封面+专辑名),落地后高亮那首。要单曲专属预览只能独立路由(不要)或动态 metadata(牺牲专辑页 SSG)——放弃。
   - **disc→release 反查** `findReleaseByDisc`(`albums.ts`,`'use cache'`):wire song 的 `albumId` 是**碟 id 不是 release id**(单碟才相等),分享/「查看原专辑」都靠它拿到 release+edition。
   - **溢出菜单**(见下)里歌单/Liked 行有「查看原专辑」(`getAlbumHref` 反查后 `router.push`),专辑页自己的行不放(已在那)。
   - **待做**:整张专辑分享 / 打包下载(Backlog #10)。私享站,token 链接=可访问,面向熟人可接受。
7. **SEO / GEO / metadata / OpenGraph(2026-07-14 已落地 ✅,全前端)** — 定位拍板:**私享站 = 不被搜索引擎索引,但分享链接要有好预览**。落地:
   - **metadata 体系**:root layout 加 `metadataBase`(env `NEXT_PUBLIC_SITE_URL`,dev 回退 localhost;部署时设真域名)+ title 模板(`%s — Tatsuro Yamashita`)+ `robots:{index:false}`;`app/[locale]/layout.tsx` 出**三语** og 默认(siteName/og:locale/localized description);各屏 `generateMetadata` 补 title(走模板)+ 三语 description + openGraph/twitter(home/album/edition/mv/playlists/gate)。messages `metadata` 命名空间补齐 en/ja/zh(siteDescription/mvDescription/playlistsDescription/albumDescription(ICU `{name}`)/gateTitle/gateDescription)。
   - **OG 图**(`lib/og.tsx`,`next/og` `ImageResponse`,**用 app 色**,**全 SSG**):品牌卡 = 实色天空蓝 `#BFE9F2` + 墨蓝字标(站主拍板:去掉 T monogram/顶部渐变水线/奶油黄底,渐变一律不要);gate 锁定卡 = 暮蓝底 + 珊瑚「PASSWORD PROTECTED」+ 画的挂锁,一眼私享;**专辑/单曲卡 = 封面模糊环境光铺满 + 向右溶进实色浅天蓝面板**(同专辑详情「封面环境光」材质),crisp 封面在左、文字在右面板上(墨蓝题+ink-mist kicker+ocean-deep 副行+深水 accent bar)。文字**只拉丁**(satori 无 CJK 字体;release 名本就是罗马字,单曲卡用罗马字 en 名,封面自带日文)。**satori 坑**:①`filter:blur()` 支持;②**不认 `inset:0` 简写**→ veil div 必须显式 `top/left/width/height`,否则零尺寸、深色封面(For You)上文字看不清;③多 stop 的实色段不稳,veil 用 2-stop `transparent→#E7F4FA 46%` 到文字侧全实色。`opengraph-image.tsx` 落在 [locale]/gate/album[id]/album[edition]/mv/playlists/song[id]——**路由坑**:①root 的不会被 `[locale]` 子树继承 → 在 `[locale]` 放一份(root 那份是死的,已删);②页面 `generateMetadata` 覆写 `openGraph` 会**丢掉祖先继承的 og 图** → 覆写 og 的屏(mv/playlists)必须同段落自带 `opengraph-image`。
   - **`robots.ts`**:`Disallow: /`(私享站不给索引;link-preview bot 抓单链接不看 robots,分享预览照常)。**故意不做** `sitemap`(与 disallow 冲突)、schema.org 结构化数据、canonical/hreflang(noindex 下无意义)。
   - **鉴权/隐私联动**(`proxy.ts`):bot 判定换成 `userAgent().isBot`(不再手写正则);**未带密码的分享 → 落到 gate 的「需要密码」OG**(不泄露指向哪张专辑),**只有带 token 的分享链接(`?argot=`)才出真内容 OG**(bot 不留 cookie,token 在 URL 里直接放行渲染);OG 图/icon 路由恒公开(bot 能抓到卡)。
   - **验证**:tsc/biome 全过;起了个临时 bun 预览服(job tmp,非仓库)按 bot UA+签名 token 抓 11 屏真实 metadata + OG 卡逐一核对,11/11 og:image、三语 description、noindex、tokenless→gate 全绿。**未做**:单曲深链 OG(等 #6 分享形态);专辑名双语 OG(接口无);部署时记得设 `NEXT_PUBLIC_SITE_URL`。

8. **PWA 形态 + 主动缓存 + 存储设置页**(2026-07-13 记,未排期)— 目标是**车载/离线**场景:手机进支架、蓝牙连车机,屏幕关着也能用。盘点后确认底层已 90% 就位,差的是三块产品化:
   - **PWA 可安装形态**(投入最小)— SW 已就绪并注册(阶段 1,`@serwist/turbopack` + `sw-provider.tsx`),但**缺 `manifest.webmanifest` + 图标 + layout metadata**,所以装不到主屏、iOS 不 standalone 全屏。要加:`app/manifest.ts`(name/short_name/`display:"standalone"`/`start_url`/`theme_color`/双主题 `background_color`/icons 192·512)、一套图标(192/512/maskable + `apple-touch-icon`)、`layout.tsx` metadata 补 `manifest`/`appleWebApp`/`themeColor`/viewport。**MediaSession 与 iOS 后台播放已全做**(`audio-engine.tsx`:元数据/锁屏控制/positionState/焦点仲裁/`audioSession.type="playback"`),车机中控屏 + 方向盘键开箱可用,不用动。
   - **主动缓存(保留被动)** — 现状 `app/sw/audio-cache.ts` 是**被动 opportunistic**:播过才后台存整文件、LRU 到 quota 一半淘汰。对"重复听"够用,但**跑长途听新歌仍会卡**(没听过=没缓存)。要加"下载这张专辑/歌单离线"入口:主动 fetch 队列里各首喂进现成的 `audioStreamHandler`(白送),被动缓存不变。
   - **存储设置页** — "音乐很大"必须让用户看得见、管得了:用量条(已缓存 N 首 / 占 X MB / 上限 = quota 一半)+ 一键清理 + 每张专辑的离线开关状态。数据源现成(`audio-cache-events` 广播 + IndexedDB LRU 元数据),缺前端订阅 + UI。**与 #5(缓存的视觉标记)同源**,可合并一起做。
   - 决策倾向(讨论已定):**做但克制** — 只在专辑/歌单给下载开关,不做全站"下载所有";PWA 图标待站主定长相。

9. **Discover 页(策展合集)**(2026-07-13 记,未排期)— 内容底稿已成型:见 **[DISCOVER.md](./DISCOVER.md)**(曲目全部对着真实库核对、能播)。两类内容:**情绪明信片**(8+ 张 10–13 首,用来逛/挑心情,呼应 The Noon Postcard)+ **长途 Mix**(3 张 60+ 分,开车/循环用,全程中高能量零慢板,防犯困)。**待拍板**(见 DISCOVER.md 尾):①策展方式(纯手工倾向 / mood 标签自动聚需 D1 加字段 / 混合)②明信片封面形态 ③点进去可播(接 #5 歌单)+ 可离线跑长途(接 #8)才闭环。**依赖 #5 歌单基建**——discover 合集本质就是编辑部歌单,建议 #5 落地后顺势做。

10. **专辑下载(整张打包下载到本地)(2026-07 已落地 ✅)** — 专辑详情的 Play/Share 一行下方给「下载整张」入口:主动把整张 edition 交给浏览器落盘(区别于 #8 的 SW 后台缓存)。落地:
   - **形态 = 服务端 zip**:后端新增 `/music/edition_zip/:editionId`(Worker 现拉现打,`Content-Disposition: attachment`);前端 `editionZipUrl()`(`lib/api/urls.ts`)+ `edition-view.tsx` 的 `<a target="_blank" download>`(glass-ink 按钮 + 大小副行,`formatFileSize`),仅当 `edition.download` 存在时露出。
   - **音频转码解决通用性**:zip 里是 **AAC-192k `.m4a`(不是 opus-only)+ 封面**——离线转码在 `discography/` 工具里预生成 AAC/本地 flac/aac 库(见 1e23e33),`EditionDownload{editionId,size}` 由后端下发。
   - **配套:整张专辑分享**(原 Backlog #6 待做项)也一起做了 — `components/album/share-edition-button.tsx` + `getEditionShareLink()`(`lib/share.ts`),分享 edition 深链带 minted token 免 gate,与单曲分享同机制。
   - **未做**:单曲下载入口进迷你条/播放器(`songDownloadUrl` helper 已备,UI 未接)。

## 阶段 4 — 上线

- [x] 生产部署(2026-07)— **Vercel**(不是旧站的 Docker/opi 路子):`vercel.json` 固定 `regions: ["hnd1"]`(东京,贴近后端 Worker + 用户);`@vercel/analytics` + `@vercel/speed-insights` 已接入 `app/layout.tsx`。部署时需设 `NEXT_PUBLIC_SITE_URL`(OG/metadataBase,见 Backlog #7)
- [ ] 数据回归验证:29–34 张专辑、歌词、MV 全通
- [ ] 旧站下线或跳转到新站

---

## 工作方式

- **界面任务**:`/impeccable craft <屏名>`;局部修型用 `polish` / `colorize` / `layout` / `clarify`
- **每屏完成标准**(全过才算勾):
  1. 双主题(正午/黄昏)都成立
  2. 移动端 390px 无溢出、触控 ≥44px
  3. 深水律:文字/图标/状态只坐深水表面
  4. reduced-motion 有替代
  5. 用真实数据字段(albumName / coverFrontId / duration…),文案朴素功能性
- **改了 token / 组件** → 打开 `/demo` 肉眼核对两主题

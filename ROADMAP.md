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

- [~] `lib/api/`:集中 API client——**已做 `albums.ts`(`getAlbums`/`getAlbum`)+ `songs.ts`(`getAlbumSongs`/`getSong`)+ `urls.ts`(封面/流媒体/MV 直链构造)**;`lyrics.ts` / `mv.ts` 待建。缓存策略统一到 Next 16 Cache Components:`next.config.ts` 开 `cacheComponents: true`,每个 client 函数 `'use cache'` + `cacheLife('max')` + `cacheTag`(`albums`/`songs` + 细粒度 `album:{id}`/`song:{id}` 等),将来 `revalidateTag('albums'|'songs')` 一键刷新
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
- [ ] **5. 歌单** — 列表 / 详情 / 创建弹窗 / 固定的 Liked Songs
- [x] **6. 歌词**(2026-07)— 住在全屏播放器里(header 右 Quotes 钮封面⇄歌词翻面,不跳路由),浮在封面环境光上不加卡。**数据**:`lib/api/lyrics.ts`(`GET /lyrics/{id}`,结构化 JSON:`startTime` 秒 + `lyrics.{origin,ja,en}`,404=无词→空数组;`isTimed`=全部行 `startTime>0`,与旧站约定一致)+ `lib/queries/lyrics.ts`(`["lyrics", id]`)。**同步**:`components/player/lyrics-panel.tsx`——currentTime 线性扫描当前行,当前行 Coral Ink(黄昏=浅水珊瑚 6.6:1),已过行 muted;滚动跟随 `list.scrollTo` 居中(list 加 `relative` 保证 offsetTop 参照,只滚列表不带动 dialog),用户 wheel/touch 后暂停跟随 3s,reduced-motion 走 `behavior:auto`;点行 seek+播放(整行 button,`aria-current`);上下 mask 渐隐。**降级**:无时间轴→纯文本静排;无词→"No lyrics for this song yet.";加载→pulse 骨架(`<output>`)。翻译 ja/en 有则小字对照(当前数据多为 null)。浏览器实测:同步高亮/居中跟随/点行跳播(51.4s ✓)/双主题/390px 全过。编辑器(POST+password 打轴工具)未移植——站主需要时再说。**2026-07 站主反馈迭代**:①歌词占屏太少 → 歌词模式重排:大封面收成 48px 缩略 + 歌名一行,歌词吃掉 header 与 scrubber 之间全部空间(列表 `flex-1 min-h-0`;居中 padding 从 `py-[38%]` 改固定 `py-14/16`——百分比 padding 不可压缩会把音量条挤出视口);②圆体歌词发腻 → 歌词正文改 `--font-jp-gothic` 标准黑体(混排律已更新:圆体只给标题性内容);③引号图标看不懂 → 换 `MicrophoneStage`(麦克风=歌词/跟唱,旧站同款惯例);④歌词列表 `no-scrollbar`(渐隐 mask 会把原生滚动条拦腰切断)+ 全局 `color-scheme` 跟主题
- [ ] **7. 播放队列 / 历史**(抽屉或侧栏)
- [ ] **8. MV 页** — 视频卡片网格(缩略图/名称/时长/下载)
- [ ] **9. 404 / 空状态** — 呼应封面美学,不用手绘元素
- [ ] **10. 导航/信息架构定稿** — 顶部轻导航 + 移动底部标签栏(Home / Search / Library)

## 阶段 3 — 主题与打磨

- [x] next-themes 接入(`ThemeProvider` in `app/layout.tsx`,`attribute="class"` / `defaultTheme="system"` / `enableSystem` / `storageKey="tatsuro-theme"`——首访跟随系统深色,手动切换后记住;`components/theme-toggle.tsx` 磨砂玻璃日月切换钮,图标随 `.dark` 纯 CSS 交叉淡入,套 shadcn(base-ui)`tooltip` 做 a11y——聚焦/悬停出上下文文案「Switch to noon/dusk」,tooltip 用 `bg-foreground/text-background` 天然 AA;`/demo` 已从手写 localStorage 升级到共享 `useTheme`)
- [ ] 动效统一 pass(`/impeccable animate`):氛围光斑、页面过渡,慵懒丝滑 400–600ms
- [ ] a11y pass(`/impeccable audit`):键盘可达、44px 触控、input 边界对比、reduced-motion 全覆盖
- [ ] 响应式 pass(`/impeccable adapt`):`100dvh`、CSS 断点(不依赖 UA 分支)
- [ ] 性能:封面懒加载、日文字体加载策略、`/impeccable optimize`
- [ ] (探索,可不做)金色日出第三主题

## 阶段 4 — 上线

- [ ] 生产部署(旧站 `Dockerfile` / `deploy_opi.sh` 可参考)
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

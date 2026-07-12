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
- [ ] 播放器内核:队列状态机 store(从旧 `usePlayerStore` 移植清理;替换 `seekFn` 注入这种 DOM 强耦合)
- [x] Gate 鉴权逻辑移植(`proxy.ts` + `lib/auth.ts` + `lib/constants.ts`;去掉了 UA 设备分支,重定向目标限同源)
- [ ] (后期)Service Worker 音频缓存移植(`sw/audio-cache` + LRU)

## 阶段 2 — 逐屏重做(每屏 = 一次 `/impeccable craft`)

顺序:定调 → **先有内容可浏览(专辑/歌曲)** → 再做播放器 → 外围。
> 播放器改到网格/详情之后:播放器需要真实歌曲喂养 + 一个点歌入口才能验透队列/播放流程;首页网格 + 专辑详情正好把数据层(albums/songs API + 统一 Song 模型)跑通。孤立地拿假数据做播放器验不透。

- [x] **1. Gate 登录页** — 真实海景照片 + 磨砂玻璃表单;第一屏定调。字标 + 密码表单居中锁版(**去掉了黑胶唱片**——空转的唱片=假 affordance,违反动效传达状态的原则)。双主题各用一张真实照片(正午=航拍青绿海+白沙+单棵棕榈 Unsplash,本身在海蓝系,不调色、`object-[50%_30%]`;黄昏=暮色紫红棕榈剪影 Unsplash);白字标后加浅 navy 椭圆遮罩(`at 50% 44%`)防止压在高光/glow 上。无障碍:登录框自动聚焦 + 输错后重新聚焦、`aria-describedby` 关联错误提示
- [x] **2. 首页专辑网格** — 沉浸式:整屏固定海景照片(正午/黄昏各一张,本地 `app/_assets`,深水律 scrim)+ 磨砂玻璃网格面板浮起在照片上;25 张 release 明信片卡(`getAlbums()`→`/music/releases`),封面 `auto-fill minmax(190px)`(手机 2 列、宽屏 6 列、恒定 ~210px),**All · Studio · Live · Compilations** 筛选(chips 靠右同标题行)+ 顶栏通用搜索;`2 CD`/`3 CD`/`2 versions` 徽标、`· Live`(coral-ink)/`· Compilation` 标签;按年代排;双主题成立、移动无溢出、44px、`w-screen` 固定照片消除滚动条抖动。**后端数据模型重塑**:多碟(Opus/Joy/Rarities/Poppin'/Softly)与再版(Ride on Time/Pocket Music)合并为「release→edition→disc」,JOY 1.5 归为 Ray of Hope 第 2 碟(live);详见 `../yamashita-api` migrations + 新接口 `/music/releases`、`/music/release/:id`(旧接口不变)。页面已收进 `app/(main)/` 路由组;over-photo 的 glass chrome(nav/chips/搜索)做成了 `Button`/`Input` 的 `glass`/`glass-active` variant(暗色走 dusk-navy 暮蓝玻璃)
- [x] **3. 专辑详情**(2026-07 重做一版)— **封面环境光·正午亮洗**:每张专辑自己的封面模糊放大铺满视口做环境色,再**溶进白光**(黄昏=暮蓝,渐变 scrim 收在浅罩律内),文字全程墨色/前景 token——不再压深色蒙版。桌面 = **左侧粘性身份栏**(封面无白边、圆角+postcard 投影;专辑名日文自动 Zen Maru;meta 行:年份·category·曲数·碟数·总时长;Play;Edition chips)+ 右侧磨砂 sheet 曲目列表(bg-card/80,一层玻璃),Opus 三碟长列表滚动时封面常驻;移动 = 居中竖排,390px 无溢出。**版本 = 路由**(不做客户端切换):默认(最新)版住 `/album/:id`,再版住 `/album/:id/:year`(如 `/1986`,slug 用 `editionSlug`=年份、缺年份回退 edition id);chips 是 `Link`(`aria-current`),选中 = 深水渐变+白字,新→旧排;URL 可分享、可后退。公共 chrome(返回 pill + 主题切换)在 `app/(main)/album/layout.tsx`;组件拆为 `edition-view`(服务端组合)/`album-ambient`/`edition-switch`/`disc-section`/`track-row`,唯一客户端叶子 = `fade-image`(服务端组件的 phosphor 图标走 `dist/ssr` 入口)。**多碟分组**:碟头 = 碟own封面缩略 + 标题(无标题则 Disc N,副行不重复)+ Live 标(coral-ink)+ 曲数/时长副行 + 细线;单碟无碟头。曲目行:序号 hover 换播放glyph(接口位留给 #4)、歌名 truncate、时长 mono tabular,行高 ≥44px。**静态化**:`generateStaticParams` 预渲染 25 张默认版 + 全部再版年份路由(自底向上给出 `{id, edition}`),坏 id/坏 edition → `getAlbum().catch(notFound())`/`findEdition` 失败 → `album/not-found.tsx`(渲染在 layout 里);ambient 模糊层不 priority(hero 封面才是 LCP)。Play 仍是 `aria-disabled` + tooltip 诚实占位。双主题成立、reduced-motion 走全局开关、生产构建通过。
- [ ] **4. 全屏播放器**(桌面 + 移动)+ **迷你播放条**(永远实色)(**此时已有真实歌曲 + 点歌入口**;需要阶段 1 的队列状态机 store)
- [ ] **5. 歌单** — 列表 / 详情 / 创建弹窗 / 固定的 Liked Songs
- [ ] **6. 歌词页** — 时间轴同步、原文+翻译对照、当前行高亮(浅色主题 = Coral Ink)
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

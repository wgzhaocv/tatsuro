<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tatsuro Yamashita Player (rebuild)

山下达郎歌迷向音乐播放器的**推倒重做**。旧站在 `../yamashita_tatsuro`:其 API/数据层契约原样保留(见旧仓库 `design/00-api-contract.md`,后端 `ys-tr.withyakul.me`),UI/UX 全部重新设计实现。本仓库当前处于逐屏重建阶段。

**任何工作先看 [ROADMAP.md](./ROADMAP.md)** — 它是唯一的进度真相,做完一项勾一项。其余治理文档:

| 文件 | 作用 |
|---|---|
| `ROADMAP.md` | 阶段计划 + 每屏完成标准。跟着它做 |
| `PRODUCT.md` | 产品定位:用户、双主题范围、语言策略、可达性基线 |
| `DESIGN.md` | 视觉规范(normative)。"The Noon Postcard" 系统:色板、命名规则、组件规格 |
| `/demo` 路由 | 设计系统活体演示页(长期保留)。**改了 token/组件后打开它双主题核对** |
| `design/` | 原始设计定稿(核心设计想法.md + Claude 视觉稿) |

## Commands

包管理器是 **bun**(bun.lock)。

```bash
bun run dev          # dev server (localhost:3000)
bun run build        # production build
bun run lint         # biome check(不是 eslint)
bun run format       # biome format --write
bunx biome check --write <file>   # 修单个文件的 lint/格式
bunx shadcn add <component>       # 装 shadcn 组件
```

没有测试框架(尚未引入)。Next 16 的 dev 有锁文件机制:杀掉 bun 包装进程后 next-server 子进程可能存活,用 `lsof -ti:3000 | xargs kill` 清理。

## Stack 陷阱(与训练数据不同的地方)

- **Tailwind v4,CSS-first**:没有 tailwind.config;所有 token 在 `app/globals.css` 的 `@theme inline` 块里。**`@theme inline` 的品牌 token(如 `--color-ocean`)在运行时不存在对应 CSS 变量**——用工具类(`bg-ocean`)或字面 hex;但 `--gradient-*` 定义在 `:root`,是真运行时变量,可以 `var()` 引用。
- **shadcn 是 base-maia 风格,底层是 @base-ui/react(不是 Radix)**;图标库是 @phosphor-icons/react(不是 lucide)。
- 语义 token(`--primary` 等)已喂入海边色板:shadcn 组件默认长在系统上,`Button` default 变体天生 AA 达标,别自己发明按钮样式。
- biome 有针对 `app/globals.css` 的 override(允许 reduced-motion 块的 `!important`);`.impeccable/hook.cache.json` 已 gitignore。
- 设计检查 hook 会扫描 UI 文件的字面颜色:**色板外的颜色会被标记**。新增颜色必须先进 `DESIGN.md` frontmatter + `.impeccable/design.json`,再进代码。

## 设计系统硬规则(写代码时会踩的)

完整规范在 DESIGN.md,以下是写代码时最常触碰的:

- **深水律**:文字/图标/状态指示永远不放在浅水原色上(`#1CA7C4` / `#2FBFA8` / `#FF8A5B` 对白字只有 2.3–2.9:1)。承载信息一律用深水形态:`ocean-deep #0C8097` / `turquoise-deep #0A8473` / `coral-ink #B04E23`(全部 ≥4.5:1),或 `--gradient-action`。浅水渐变(`--gradient-primary` / `--gradient-cta`)只做装饰。
- **双主题**:`:root` = 正午(默认浅色),`.dark` = 黄昏暮蓝(不是黑夜)。每屏必须两个主题都成立。文字用语义 token(`text-foreground` / `text-muted-foreground`),别硬编码 navy。
- **字体**:Quicksand(`font-display`,h1–h3 自动)/ Inter(`font-sans` 默认)/ 日文自动走标准黑体系统栈(Hiragino Sans / Noto Sans JP)——给日文内容标 `lang="ja"` 即可(`:lang(ja)` 规则接管,不需要字体工具类)。字重 700 禁用;不用等宽字体(时间码用 `tabular-nums`)。
- **语言**:UI chrome 走 **i18n 三语(en/ja/zh)**——所有界面文案从 `messages/{en,ja,zh}.json` 取,**不要硬编码可见英文串**(客户端组件用 `useTranslations`,服务端用 `getTranslations` 且页面先 `setRequestLocale(locale)`;新增文案必须三语都补齐,`en.json` 为翻译基准)。**内容数据不进字典**:歌词/专辑名保持日文(靠 `lang="ja"` + `isJapanese()` 选字体);**歌名双语**——song-name 接口带 `?lang=en|ja`,前端用 `nameLang(locale)`(`lib/api/types.ts`,ja→ja、en/zh→en,中文用英文名)派生 lang,`getAlbum(id, lang)` 的 lang 进 `'use cache'` 键、`cacheTag` 保持 lang 无关;客户端(播放器)从 `useLocale()` 取,服务端从路由 `locale` 取,都收口到同一个 `nameLang()`。站内链接用 `@/components/ui/link`(已包 next-intl 的 locale-aware `Link`,自动补前缀);程序化跳转用 `@/i18n/navigation` 的 `useRouter`/`usePathname`(后者已去 locale 前缀)。整站在 `app/[locale]/` 下(gate 也本地化);proxy 组合了 next-intl middleware + 密码门鉴权。文案朴素功能性,禁止营销腔。
- **动效**:交互 400–600ms `ease-lazy`;氛围动效用 `animate-breathe/glint/shimmer`(8–20s 周期)。全局 reduced-motion kill-switch 已存在,别绕过它。
- **阴影**:只用 `shadow-postcard` / `shadow-lift-navy` / `shadow-lift-ocean` / `shadow-lift-coral`(带色、向下、收紧)。看到 `rgba(0,0,0,…)` 大糊影就是违规。
- **材质**:照片背景上的内容用磨砂玻璃托底;平涂背景用实色;迷你播放条永远实色;玻璃不叠玻璃。

## 架构(阶段 1 已落地)

- **数据模型 = 「Release → Edition → Disc」,由后端建模**(后端在 `../yamashita-api`:Cloudflare Workers + Hono + D1 + R2)。后端把扁平的 album 行合并成逻辑发行:多 CD 归为多 Disc、再版归为多 Edition(默认展开最新版),另带 `year` / `category`(studio/live/compilation)。**新接口** `/music/releases`(网格列表)、`/music/release/:id`(嵌套 editions/discs);**旧接口**(`/music/albums`、`/music/album_songs/:id`、`/music/{id}`、`/stream/*`、`/mv/*`)原样保留——旧站还在用。契约看后端 `migrations/`(0001 DDL / 0002 seed / 0003 JOY1.5→Ray of Hope)+ `src/routes/music.ts`。
- `lib/api/`(fetch 全部收拢在此,不散落进组件——旧站头号教训,见旧仓库 `design/01-ui-audit.md`):`albums.ts`(`getAlbums`→/releases、`getAlbum`→/release/:id)、`songs.ts`(`getDiscSongs`→/album_songs/:discId、`getSong`)、`urls.ts`(封面/流媒体/MV 直链)、`types.ts`(领域模型 `Album`/`Edition`/`Disc`/`Song` + wire→domain 映射)。每个 client 函数 `'use cache' + cacheLife('max') + cacheTag`(`albums`/`songs` + 细粒度)。**后端数据改了要清两层缓存才生效**:① Cloudflare Workers 前置缓存(`wrangler deploy` 后端刷,**purge 无效**)② Next `'use cache'`(`revalidateTag` 或重部署前端)。完整流程见 `discography/imports/README.md`「补数据后怎么让前端刷新」。
- 页面在 **`app/(main)/` 路由组**(gate/demo 在组外);首页 `app/(main)/page.tsx` = 专辑网格。新 section(album/[id]、songs、mv、playlists)都进 `app/(main)/`。
- **站内链接一律用 `@/components/ui/link`(不要裸 `next/link`)**:滚动由 `components/page-scroll.tsx` 全权接管(基于 Activity 缓存的每路由滚动记忆),wrapper 默认 `scroll={false}`。新增会滚动的页面/作用域,挂一个 `<PageScroll />`(见 `album/[id]/layout.tsx` 的作用域范例)。浏览类屏(专辑/MV/歌单)的固定海景 hero + 浅罩 + PageScroll 收在 `components/section-hero.tsx`,别再手抄那段渐变。
- **歌单/Likes = 本地优先**:`lib/playlists/`——`store.ts` 是独立 zustand persist(key `tatsuro-playlists`,镜像 player store 的 skipHydration/partialize),**不是** `lib/api`(纯本地,无后端)。数据形状(`types.ts`)刻意做成将来 D1 的超集(`toWireRows` 瘦投影 + `updatedAt`/`deletedAt` 墓碑),账号系统落地后哑上传即可(Backlog #1)。Liked 是 `id:"liked"` 的保留歌单。曲目行/播放按钮走 `components/track/`(`playback-context` 队列上下文 + `track-row` + `track-actions`,album 与 playlist 共用);**队列身份用稳定 `contextId`(edition.id/playlist.id),不是显示名**。读 store 用文件底部的响应式 hooks(`useVisiblePlaylists`/`usePlaylist`/`useIsLiked`),别在渲染里调 `getState`。
- 播放器状态:zustand store(队列状态机从旧站移植清理)——**未做**。
- 流媒体直接拼 URL:`{API}/stream/new_play/{songId}`(音频)、`{API}/stream/img/{coverId}`(封面);封面域已加进 next.config remotePatterns(`/stream/img/**`、`/mv/thumbnail/**`)。
- 界面类任务用 `/impeccable craft <屏>`;每屏完成标准见 ROADMAP.md 底部。**本项目不开 branch,直接在 `main` 上改。**

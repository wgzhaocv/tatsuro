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

- [ ] `lib/api/`:集中 API client(`albums.ts` / `songs.ts` / `lyrics.ts` / `mv.ts`),统一缓存策略——不再让 fetch 散落在组件里
- [ ] 统一 `Song` 领域模型 + `lib/api/types.ts`(消除旧站 `AlbumSong{id,originalName}` / `SongType{songId,songName}` 双套字段)
- [ ] `.env`:`NEXT_PUBLIC_API_URL` / `ARGOT` / `AUTH_SECRET`(参考旧仓库 .env)
- [ ] `next.config.ts` remotePatterns 加后端图片域(`/stream/img/*`、`/mv/thumbnail/*`)
- [ ] 播放器内核:队列状态机 store(从旧 `usePlayerStore` 移植清理;替换 `seekFn` 注入这种 DOM 强耦合)
- [ ] Gate 鉴权逻辑移植(`proxy.ts` + `auth.ts`)
- [ ] (后期)Service Worker 音频缓存移植(`sw/audio-cache` + LRU)

## 阶段 2 — 逐屏重做(每屏 = 一次 `/impeccable craft`)

按定调 → 核心体验 → 外围的顺序:

- [ ] **1. Gate 登录页** — 黑胶意象 + 真实海景照片 + 磨砂玻璃;第一屏定调
- [ ] **2. 全屏播放器**(桌面 + 移动)+ **迷你播放条**(永远实色)
- [ ] **3. 首页专辑网格** — ~34 张明信片卡,All/Studio/Live 筛选,hover 翻面看背封
- [ ] **4. 专辑详情** — 大封面 + 曲目列表(序号/歌名/时长/操作)
- [ ] **5. 歌单** — 列表 / 详情 / 创建弹窗 / 固定的 Liked Songs
- [ ] **6. 歌词页** — 时间轴同步、原文+翻译对照、当前行高亮(浅色主题 = Coral Ink)
- [ ] **7. 播放队列 / 历史**(抽屉或侧栏)
- [ ] **8. MV 页** — 视频卡片网格(缩略图/名称/时长/下载)
- [ ] **9. 404 / 空状态** — 呼应封面美学,不用手绘元素
- [ ] **10. 导航/信息架构定稿** — 顶部轻导航 + 移动底部标签栏(Home / Search / Library)

## 阶段 3 — 主题与打磨

- [ ] next-themes 接入(正午默认;黄昏=暗色;把 /demo 的 localStorage 切换升级过去)
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

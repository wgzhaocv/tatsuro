# 03 · CSS / 绘制 / 合成

> 审计对象:`app/globals.css`、玻璃材质(backdrop-filter)全量盘点、ambient 模糊层、fixed 照片背景、阴影/hover 过渡、字体加载、滚动条与视口单位、tw-animate-css 体积。

## 概述

**这个代码库的合成性能素养远高于平均水平**。多处注释直接记录了此前的性能修复(breathe 动画因"看不见但烧 GPU"被连根删除、全屏播放器展开改 opacity-only 避免 blur 重栅格化、transform-gpu 治 iOS URL 栏 detach、scrollbar-gutter 治 Windows 闪动),且都验证为真实生效。全库零 `will-change` 滥用。真正的残留成本集中在一处:**视口级 GlassPanel 在 fixed 照片上滚动 → 每帧重跑 backdrop-filter**——设计系统的核心材质,无法删除但可以做便宜。

## 健康项(逐项核实过)

1. **动画关键帧全部合成器友好**(`globals.css:204-230`):`glint` 只动 opacity,`shimmer` 只动 transform+opacity,`spin-slow` 只动 transform;`breathe` 已删除且 :201-203 注释记录了理由。
2. **reduced-motion 全局 kill-switch 完整**(:232-241);JS 侧配套(`spectrum.tsx:39` 直接不启动 rAF)。
3. **零 `will-change`**;仅有的两处层提升(`bottom-nav.tsx:105`、`mini-player.tsx:64`)用 `transform-gpu` 治 iOS URL 栏 fixed detach 实际 bug,有的放矢。
4. **"ambient blur 展开重栅格化"修复已验证生效**:`full-player.tsx:120-132` Popup 只 fade(opacity 合成器直通),slide 移到 ambient 的兄弟层,`AlbumAmbient` 是 fixed 独立层,不在被 transform 动画的祖先之下。
5. **AlbumAmbient 是静止层**:`blur-xl` 挂载时栅格化一次,之后零每帧成本。
6. **fixed 全屏照片不导致滚动重绘**:独立合成层,滚动内容自己平移;`100lvh` 定高规避 Chrome Android URL 栏 rescale;scrim 是静态渐变,无每帧成本。
7. **ThemeImage 双主题只下载一张**(原生 `<picture>` + prefers-color-scheme),blurDataURL 占位零网络。
8. **Windows 滚动条修复到位**:`scrollbar-gutter: stable`(:176-183);全屏播放器滑入闪动已解决;视口单位使用精准(滚动布局 `min-h-dvh`、fixed 背景 `100lvh`)。
9. **tw-animate-css 不是整库打包**:全部 `@utility`,Tailwind v4 按需编译,常驻开销只有 ~17 条 `@property`(几百字节)。无 CSS 膨胀。
10. **track row(50+ 行)hover 只动 colors/opacity**,无 transform/shadow/布局属性。
11. **迷你播放条的玻璃是 DESIGN.md 明文豁免**(:207),不算违规。
12. **日文字体策略实际已落地且是正确答案**(见 C7,可勾掉 ROADMAP 那项)。

## 发现

### C1 · GlassPanel:视口级 backdrop-filter 在 fixed 照片上滚动 = 每帧重跑模糊 —— 高

**证据**:
- `glass-panel.tsx:13` `backdrop-blur-xs`(4px)玻璃 sheet 配方;
- `browse-grid.tsx:27` 首页/MV/歌单网格的 GlassPanel 是 `flex-1` 全宽大面板,铺满 hero 以下整个视口并随内容滚动;
- `edition-view.tsx:186-188` 专辑页曲目 sheet 同配方;
- 身下是 `section-hero.tsx:30` / `album-ambient.tsx:31` 的 **fixed** 背景层。

**影响**:backdrop-filter 的输入是"元素背后的像素"。面板随滚动移动、照片 fixed 不动 → 相对位移,**每一个滚动帧**都要重新采样视口大小的背板并重跑 4px 模糊。半径小救了桌面,但 mobile Safari / 中端 Android 上,这正是"滚专辑网格微掉帧、发热"的典型来源——且这是浏览类屏(网格 25-32 卡、专辑页 50+ 行)的主滚动面,暴露时间最长。

**建议修法**(保住玻璃观感,零每帧滤镜):背板是静态且已知的(那张 fixed 照片)——模糊结果可以预先算好。在 GlassPanel 内部铺一层 `fixed inset-x-0 top-0 h-[100lvh]` 的同一张照片**预模糊副本**(构建期出一张 blur 过的变体,或同图一次性 element filter,挂载时栅格化一次),被面板 `overflow` 剪裁;面板本体退化为半透明填充(`bg-white/45`)不再带 backdrop-filter。视觉逐像素等价(面板背后只有这张照片),滚动成本归零。专辑页(背板是同样 fixed 静态的 AlbumAmbient)同理。

### C2 · 常驻 chrome 的 backdrop-filter 随滚动重滤(bottom-nav / mini-player)—— 中

**证据**:`bottom-nav.tsx:105` `backdrop-blur-md`(12px)全宽 56px 常驻;`mini-player.tsx:73` `backdrop-blur-xl`(24px)+ `backdrop-saturate-150` 双滤镜串联,有队列时全站常驻。

**影响**:fixed 元素,内容从背后滚过 → 每滚动帧重滤。面积小(条状),量级远低于 C1,但 mini bar 是 24px 大半径 + 双滤镜,且专辑页 50+ 行的滚动恰好都发生在它背后。

**建议修法**:设计签名,可保留;便宜化:mini bar `blur-xl` 降 `blur-md`(64px 高的条上肉眼几乎无差,成本减半)。前提是先把 C1 的大面板成本拿掉。

### C3 · 同屏 backdrop-filter 层数偏多(首页桌面 ≈ 12-15 层)—— 中低

**证据**:首页桌面同屏——nav 药丸(blur-xs)、搜索钮(blur-xs)、account/language/theme 三个 size-11 圆钮(**均 blur-xl**)、4 个 glass chip(blur-xs)、大面板(blur-xs)、mini bar(blur-xl)、若干卡片角标(blur-sm);移动端再加 bottom-nav。

**影响**:每个 backdrop-filter 强制独立合成层 + 一份背板拷贝。44px 圆钮用 24px 半径是浪费——半径比元素还大,且与全站玻璃配方(blur-xs)材质不一致。

**建议修法**:三个 nav 圆钮统一降 `backdrop-blur-xs`,与 `glassSurface` 同配方——省半径成本又符合"玻璃材质单一来源"的设计意图。

### C4 · BottomNav 玻璃浮在 GlassPanel 之上——豁免条款未覆盖 —— 低

**证据**:DESIGN.md:207/275 玻璃纪律唯一豁免是"底部悬浮播放条";但 `bottom-nav.tsx:105` 同样浮在滚动的玻璃面板内容上。

**建议修法**:要么 DESIGN.md 把豁免扩为"底部悬浮 chrome(播放条+移动 tab bar)",要么 bottom-nav 走实色 `bg-card`——填充已 80-85% 不透明,砍 blur 观感损失极小、省一层滤镜。

### C5 · AlbumCard hover 用 `transition` 简写连带动画 box-shadow —— 低

**证据**:`album-card.tsx:42` `transition duration-500 … group-hover:shadow-lift-navy`;`playlist-card.tsx:31` 同型。hover 的 500ms 里 shadow 逐帧插值 = 卡片区域逐帧重绘(shadow 不可合成)。

**影响**:一次只 hover 一张,量级小;静态 shadow-postcard 是一次性 paint 无持续成本。标准的"shadow 动画应改伪元素 opacity"案例,顺手可修。

**建议修法**:`::after` 承载 `shadow-lift-navy` 默认 `opacity-0`,hover `transition-opacity` 到 1;或 transition 收窄为 `transition-transform`,shadow 瞬时切换。

### C6 · Button 基类 `transition-all` —— 低

**证据**:`ui/button.tsx:7` 每个按钮都带 `transition-all`(shadcn 上游默认);另 `gate-form.tsx:49`、`theme-toggle.tsx:42,48` 等。当前各 variant hover 只变 bg/brightness/shadow,无实际卡顿,但属埋雷:未来任何 class 切换都被隐式动画化;glass 按钮上任何属性变化可能牵动重滤。

**建议修法**:收窄为 `transition-[color,background-color,border-color,box-shadow,transform,opacity]`。优先级不高。

### C7 · 日文字体加载策略(ROADMAP 未勾项)——现状评估:已解决,可勾掉 —— 低

**证据**:`app/layout.tsx:17-32` 三套 latin 字体走 next/font(自托管、自动 preload、内置 size-adjust fallback,CLS 已消);`globals.css:193-200` 日文经 `:lang(ja)` 走纯系统栈(Hiragino / Yu Gothic / Noto Sans JP),零下载零 FOUT;全库无 JP webfont。

**影响**:歌名/歌词/专辑名首帧即最终字形,三平台(macOS/iOS、Windows、Android)都成立。ROADMAP:55 的"日文字体加载策略"作为风险项已被架构决定消解。

**建议修法**:① Jost 只服务 7 个字母的 wordmark,可加 `text` 参数子集化到 ~1KB(与 07 报告 B3 同一发现);② ROADMAP 勾掉该项并注明"策略=系统栈,决定记录于 globals.css :lang(ja)"。

### C8 · MiniProgress `transition-[width]` 持续动画宽度 —— 低

**证据**:`mini-player.tsx:199-200`,~4Hz 更新 + 300ms 过渡 = 播放期间持续 width 插值(layout+paint,不可合成)。元素极小、绝对定位、是 blur 层子元素(不触发 backdrop 重滤),实际成本很低——但它是播放期唯一每帧跑 layout 的东西。

**建议修法**:内层全宽条 + `transform: scaleX()` + `transition-transform`。同类:`player-dock.tsx:27` spacer 的 `transition-[height]`(队列出现时动画整页 reflow 150ms,一次性,可直接去掉 transition)。

### C9 · 桌面播放页 Spectrum 60fps canvas 常驻 —— 低(有意为之)

**证据**:`spectrum.tsx:55-117` 播放中每 rAF 清屏重画 96 根圆头柱。已被三重门控;笔电电池下是可感知常驻功耗。

**建议修法**(可选):节流 30fps(隔帧画,阻尼系数相应调大),频谱类视觉几乎无差,功耗减半。

### C10 · Playlist 详情页双份 fixed 全屏背景层叠挂 —— 低

**证据**:`playlist-detail.tsx:84` 有封面时挂 `AlbumAmbient`(fixed 100lvh blur 层),其下 SectionHero 的 fixed 照片层仍完整存在。

**影响**:一屏持有约两份全屏纹理 + 一份 blur 中间结果——静态无滚动成本,只是移动端显存;hero 照片下载后完全被糊层盖住(带宽小浪费,还是 eager+high)。

**建议修法**:有 `ambientCoverId` 时不渲染 SectionHero 照片层,空白期由 ambient 的 dissolve 渐变兜底。

## 备注:未发现的问题

- 昂贵选择器:`globals.css:172-175` 的 `*` reset 只设两种颜色,影响可忽略;无深层后代/属性选择器风暴。
- 玻璃叠玻璃仅 C4 边界案例;full-player 的 glass-ink 按钮底下是 element-blur(非 backdrop),不构成叠加。
- `mv-card.tsx:40` play 角标 hover scale 逐帧重滤自身 blur-sm——56px 元素,可忽略。

**修复优先级**:C1(大面板 backdrop → 预模糊 fixed 副本)≫ C3(nav 圆钮 blur-xl→xs,一行改动)> C8 > C5 > 其余。C1 做完后,全 app 滚动路径基本不含每帧滤镜(只剩两条小 bar),移动端提升可感知。

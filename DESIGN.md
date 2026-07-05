---
name: Tatsuro — The Noon Postcard
description: 山下达郎播放器的夏日海边视觉系统 — 高明度、平涂、通透的 City Pop 明信片美学
colors:
  ocean-cyan: "#1CA7C4"
  ocean-deep: "#0C8097"
  turquoise: "#2FBFA8"
  turquoise-deep: "#0A8473"
  coral: "#FF8A5B"
  coral-ink: "#B04E23"
  peach: "#FFB4A2"
  sun: "#FFD666"
  dawn-gold: "#FFD07A"
  sky: "#BFE9F2"
  sky-bright: "#59C7E0"
  cobalt-deep: "#145495"
  deep-navy: "#0B3A53"
  ink-mist: "#4C7083"
  sea-glass: "#E9F7F2"
  shell-white: "#FFF6E9"
  dusk-navy: "#12263A"
  dusk-deep: "#23324D"
  dusk-slate: "#3A4A6B"
  dusk-plum: "#C4739A"
typography:
  display:
    fontFamily: "Quicksand, ui-rounded, sans-serif"
    fontSize: "clamp(2.75rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Quicksand, ui-rounded, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 500
    lineHeight: 1.15
  title:
    fontFamily: "Quicksand, ui-rounded, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  japanese:
    fontFamily: "Zen Maru Gothic, Quicksand, sans-serif"
    fontWeight: 500
    lineHeight: 1.7
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  pill: "999px"
spacing:
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ocean-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "12px 28px"
  button-cta:
    backgroundColor: "{colors.coral-ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "12px 28px"
  button-ghost:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.pill}"
    padding: "12px 28px"
  chip:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  card:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.deep-navy}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Tatsuro — The Noon Postcard

## 1. Overview

**Creative North Star: "The Noon Postcard"（正午海边的明信片）**

场景句(拍板原话):**"青蓝色的透明海,白色的沙滩,棕榈树,阳光。"** 每一个视觉决定都要能放回这幅画面里——放不回去的,不属于这个系统。

整个系统是一张正午海边寄出的明信片:高明度、低饱和、大面积留白、平涂色块和干净的边缘。通透感是第一目标,它来自三件事的叠加——画面整体亮(近白、浅色调)、颜色不铺满每一像素(呼吸空间)、平涂加利落边缘(不靠层层渐变堆砌)。视觉母题是永井博《A Long Vacation》与铃木英人《For You》的 City Pop 封面美学:碧蓝海水、天空渐变、棕榈、白色现代主义,乐观而慵懒。

**真实摄影是一等材质。** 界面质感靠真实精致的海景照片承载(Login 的绿松石海滩航拍、Home 的泳池棕榈),不靠手绘装饰元素。照片选材只要海、天、白沙、棕榈树(至多海鸥),不要人、建筑、船;以平视海景为主。照片之上的 UI 层必须遵守材质纪律(见 Elevation)。

这个系统明确拒绝:旧站的深紫/品红霓虹夜店风、霓虹脉冲动效、重阴影与深色蒙版、玻璃叠玻璃、手绘廉价装饰、营销腔文案、通用 AI 模板感。界面主语言为英语,歌名/歌词等内容大量为日文,日英混排质量是排版的硬要求。

**Key Characteristics:**
- 高明度 + 低饱和 + 大留白 = 通透(不可妥协的第一原则)
- 平涂色块、干净边缘;渐变只用于天空/海面等"环境层"与品牌渐变(浅水做装饰,深水做按钮)
- 真实海景照片做质感底,浅色 overlay,磨砂玻璃托底内容
- 深钴蓝/深海军蓝做深锚点,"亮的更亮、深的更深"
- 动效像海边的光:8–20 秒极慢周期、几乎察觉不到
- 双主题:正午(默认浅色,海天渐变)与黄昏(暗色,暮蓝非黑夜)

## 2. Colors

一句话:天与海的中高明度青绿系为主体,落日珊瑚做稀缺的暖强调,深海军蓝代替黑色。

### Primary
- **Ocean Cyan 海洋青** (#1CA7C4 / oklch(0.673 0.115 216.8)): 品牌主色——**浅水**。只做不承载信息的装饰:环境色块、均衡器动画、导航激活下划线、大面积品牌涂装。浅水渐变 `linear-gradient(90deg, #1CA7C4, #2FBFA8)`。
- **Ocean Deep 深水青** (#0C8097 / oklch(0.555 0.097 216.8)): 交互主色——**深水**。按钮、进度条已播段、选中态、focus ring,一切承载文字/图标/状态的青色表面。白字 4.6:1。深水渐变 `linear-gradient(90deg, #0C8097, #0A8473)`(`--gradient-action`)。
- **Sky Bright 亮天青** (#59C7E0): 黄昏主题下的 primary——暮蓝背景上配深 navy 文字(7.8:1)。

### Secondary
- **Turquoise 绿松** (#2FBFA8 / oklch(0.726 0.122 179.2)): 浅水渐变的另一端;装饰用。
- **Turquoise Deep 深水绿松** (#0A8473 / oklch(0.55 0.098 179.2)): 深水渐变的另一端;白字 4.6:1。

### Tertiary
- **Coral 落日珊瑚** (#FF8A5B / oklch(0.753 0.155 42.0)): 唯一的暖强调——**浅水珊瑚,只做装饰**:落日渐变 `linear-gradient(90deg, #FF8A5B, #FFB4A2)`、点亮心形的填充、悬停光晕。黄昏主题下可直接做文字(对暮蓝 6.6:1)。
- **Coral Ink 焦糖珊瑚** (#B04E23 / oklch(0.543 0.14 42)): 珊瑚在浅色主题下的**可读形态**。浅底上的珊瑚文字/图标一律用它:当前歌词行高亮、Like 计数、CTA 实色按钮(白字 5.3:1)。
- **Peach 蜜桃** (#FFB4A2)、**Sun 阳光黄** (#FFD666)、**Dawn Gold 暖金** (#FFD07A): 珊瑚的邻近暖色,用于渐变端点、高光点缀、日出方向的探索。不单独承担语义。

### Neutral
- **Deep Navy 深海军蓝** (#0B3A53 / oklch(0.331 0.065 237.5)): 正文文字。**永远代替纯黑**——黑色会压死通透感。
- **Cobalt Deep 深钴蓝** (#145495): 深锚点。全是中高明度画面会发平、发灰;钴蓝按钮/图形元素让画面"透"起来。也是小号文字需要坐在品牌色上时的安全底色。
- **Ink Mist 雾蓝** (#4C7083 / oklch(0.526 0.051 232)): muted 文字(时长、年份、次要信息)。在最深的浅色底(--muted)上仍有 4.55:1;**不要再浅了**——这是次要文字的明度地板。
- **Sea Glass 海玻璃白** (#E9F7F2)、**Shell White 贝壳白** (#FFF6E9)、**Sky 天青** (#BFE9F2): 正午背景渐变的三个停靠点 `linear-gradient(to bottom, #BFE9F2, #E9F7F2, #FFF6E9)`。Sky 同时是 chip/边框的浅色底。
- **Dusk Navy 暮夜蓝** (#12263A)、**Dusk Deep 暮海蓝** (#23324D)、**Dusk Slate 暮蓝灰** (#3A4A6B)、**Dusk Plum 暮色紫红** (#C4739A): 黄昏主题的背景渐变 `linear-gradient(to bottom, #12263A, #23324D 40%, #3A4A6B)`;Dusk Deep 兼任黄昏主题的卡片/迷你播放条底色;Plum 只做黄昏天际线的一抹,不是 UI 语义色。

### Named Rules
**The Transparency Rule(通透律)。** 任何新增颜色/图层先问:它降低画面明度了吗?让边界发脏了吗?是,就重做。深色蒙版能不压就不压,要压也压到 14–28% 透明度的浅 navy 为止。

**The Deep Anchor Rule(深锚律)。** 每一屏至少有一处 Deep Navy 或 Cobalt 的深色锚点(文字、按钮或图形)。没有深锚点的画面会发平、发灰。

**The One Sunset Rule(一抹落日律)。** Coral 及其暖色家族在任一屏面积 ≤10%:它是落日,不是墙漆。它的稀缺就是它的强调力。

**The Deep Water Rule(深水律)。** 浅水做氛围,深水载信息。Ocean / Turquoise / Coral 的原色(浅水)只允许出现在不承载信息的装饰层;凡是文字、图标、状态指示所在的彩色表面,一律换同色相的深水形态(Ocean Deep / Turquoise Deep / Coral Ink,全部经 ≥4.5:1 验算——浅水对白字实测只有 2.3–2.9:1,任何字号都不达标)。深浅并置不是妥协:透明海之所以透明,正是浅滩旁边有深水道。

## 3. Typography

**Display Font:** Quicksand(圆润几何无衬线,fallback: ui-rounded, sans-serif)
**Body Font:** Inter(正文与数据,fallback: system-ui)
**Japanese Font:** Zen Maru Gothic(日文歌名/歌词专用圆体,fallback: Quicksand)
**Mono Font:** Geist Mono(时间码等对齐数据,可选)

**Character:** 圆润、轻盈、松弛。Quicksand 的圆几何呼应海边的柔和,Inter 保证数据可读,Zen Maru Gothic 让日文歌名带着与拉丁字形一致的圆润气质。

### Hierarchy
- **Display** (600, clamp(2.75rem, 5vw, 3.75rem) ≈60px, lh 1.08): 页面主标题、Gate 页艺术家名。仅此处允许 600 以上字重。
- **Headline** (500, 2.5rem/40px, lh 1.15): 专辑详情页专辑名、全屏播放器歌名。
- **Title** (500, 1.75rem/28px, lh 1.25): 区块标题、卡片组标题。
- **Body** (400, 1rem/16px, lh 1.6): 曲目列表、正文。行长 ≤72ch。
- **Label** (500, 0.8125rem/13px, lh 1.4, +0.02em): 时长、年份、辅助标签。
- **Japanese** (Zen Maru Gothic 500, 继承所在层级字号, lh 1.7): 日文内容自动应用;日文行高比拉丁文松一档。

### Named Rules
**The Light-Weight Rule(轻字重律)。** 层级靠大小和间距拉开,不靠加黑。400–500 是常态,600 只给 Display 和按钮,700 禁用。满屏加粗 = 重、闷,是通透感的敌人。

**The Mixed-Script Rule(混排律)。** UI chrome 一律英文;歌名/歌词等日文内容用 Zen Maru Gothic 渲染,禁止用拉丁字体的伪日文回退。日英同行混排时对齐基线、日文行高 1.7。

## 4. Elevation

系统整体是**平涂优先**:分层第一选择是换一块平涂色或一条细线,而不是投影。必须有投影时,遵守"少用、用浅、单方向"——所有阴影都向下、扩散收紧(负 spread)、并且**带颜色**:或取元素自身色相,或用暖色,绝不用重黑阴影。深、糊、多方向的阴影会拉低明度、让边界发脏,是通透感的头号敌人。

### Shadow Vocabulary
- **lift-navy**(`box-shadow: 0 12px 26px -16px rgba(11,58,83,0.5)`): 白卡片在浅背景上的默认抬升;安静、几乎不可见。
- **lift-ocean**(`box-shadow: 0 10px 22px -8px rgba(28,167,196,0.7)`): 青色系按钮/激活元素的悬停光晕,颜色即元素本色。
- **lift-coral**(`box-shadow: 0 10px 22px -8px rgba(255,138,91,0.7)`): CTA/收藏按钮的悬停光晕。
- **postcard**(`box-shadow: 0 12px 22px -14px rgba(11,58,83,0.35)`): 专辑封面明信片卡的常驻纸感投影。

### Named Rules
**The Warm Shadow Rule(暖影律)。** 阴影必须带色(元素本色或暖色)、单方向向下、负 spread 收紧。看到 `rgba(0,0,0,…)` 的大糊影就是违规。

**The Glass Discipline Rule(玻璃纪律)。** 照片背景上的内容层 → 半透明磨砂玻璃托底(`rgba(255,255,255,0.88)` + backdrop-blur,压住照片的杂乱、让海景透出来);平涂背景上 → 不透明实色,不需要玻璃。常驻迷你播放条**永远是不透明实色**。玻璃叠玻璃 = 发糊、层级不清,绝对禁止。

**The Light Overlay Rule(浅罩律)。** 照片上需要压字时,用浅 navy 渐变 scrim(`rgba(11,58,83,0.14)` 到 `0.28`),绝不用深黑蒙版把照片压死。

## 5. Components

### Buttons
- **Shape:** 胶囊 pill(999px);圆润呼应海边气质。
- **Primary:** 深水渐变 `linear-gradient(90deg, #0C8097, #0A8473)`(`--gradient-action`),白字 500–600(4.6:1),padding 12px 28px。悬停:轻微上浮 (-2px) + lift-ocean 光晕,400ms ease-out。
- **CTA / Like:** Coral Ink (#B04E23) 实色,白字(5.3:1);悬停 lift-coral 光晕。落日渐变只做该按钮的装饰(光晕、点亮心形的浅水填充),不做文字底。
- **Ghost:** 白/半透明白底,Deep Navy 文字,1px Sky 边框;照片上则为磨砂玻璃底。
- **对比度守则(深水律的按钮版):** 白字只坐深水表面(Ocean Deep / Turquoise Deep / Coral Ink / Cobalt #145495,全部 ≥4.5:1);浅水渐变上**永远不放文字或必需图标**——实测 2.3–2.9:1,任何字号都不达标。

### Chips(筛选/标签:All · Studio · Live)
- **Style:** Sky (#BFE9F2) 浅底,Deep Navy 文字,pill,6px 16px。
- **Selected:** 深水渐变底 + 白字(4.6:1);非选中悬停时 Sky 加深一档。

### Cards / Containers(专辑明信片卡)
- **Corner Style:** 20px(lg);封面图本身 12–16px。
- **Background:** 纯白(平涂背景上)或磨砂玻璃(照片背景上,遵守玻璃纪律)。
- **Shadow Strategy:** postcard 常驻纸感投影;悬停微浮 + 投影轻抬,像拿起一张明信片。
- **Border:** 无,或 1px Sky 细线代替投影分层。
- **Internal Padding:** 16px(md);网格间距 24px(lg)。

### Inputs / Fields(Search…)
- **Style:** 白底或磨砂玻璃底,pill 或 16px 圆角,1px Sky 描边,placeholder 用 Ink Mist(不许更浅)。
- **Focus:** 描边转 Ocean Cyan + 2px ring(`rgba(28,167,196,0.35)`);focus-visible 永远可见。

### Navigation
- **Style:** 顶部轻导航(TATSURO 字标 + Albums / Songs / MV / Playlists),Quicksand 500,Deep Navy;激活项文字用 Ocean Deep (#0C8097,≥4.5:1),下方 2px 浅水渐变短线做装饰。移动端收纳为底部标签栏(Home / Search / Library),图标 + 13px 标签,触控 ≥44px。
- 照片背景上的导航条用磨砂玻璃托底;平涂背景上直接透明或实色。

### Progress / Scrubber(签名组件)
- 轨道:Sky 浅底 4px;已播:深水渐变(状态指示,对 Sky 轨道 3.7:1);拖点:白色圆点 + lift-ocean 光晕。时间码 Label 级、Ink Mist、Geist Mono 可选。全屏播放器可在已播段加缓慢的波光 shimmer(8s+ 周期,reduced-motion 时静止)。

### Mini Player Bar(签名组件)
- 常驻底部,**不透明实色**(浅色主题:白/贝壳白;黄昏:Dusk Deep #23324D)——玻璃纪律的明文豁免区之外。封面缩略 44px 圆角 8px、歌名 Body、播放/暂停主色圆钮、细进度线贴顶。

### Photo Surface(签名材质)
- 照片只出现在**环境层**(页面背景、Gate 全屏、专辑详情头图):海、天、白沙、棕榈,平视,无人物/建筑/船。
- 处理链:照片 → (需要压字时)浅 navy 渐变 scrim 14–28% → 磨砂玻璃内容板 → 实色交互件。层级永远清晰,一眼能数出材质层数。

## 6. Do's and Don'ts

### Do:
- **Do** 保持每屏的深色锚点:Deep Navy 文字或 Cobalt 元素至少一处(深锚律)。
- **Do** 用真实精致的海景照片提升质感——只要海、天、白沙、棕榈树,平视视角(Unsplash/Pexels: `palm tree blue sky`、`turquoise sea white sand`)。
- **Do** 让动效像海边的光:8–20 秒周期的缓慢呼吸/光斑,交互过渡 400–600ms ease-out;每个动画都配 `prefers-reduced-motion` 静态替代。
- **Do** 文案朴素、功能性:标题、专辑名、年份、时长这些真实信息,仅此而已。UI 一律英文,日文内容用 Zen Maru Gothic。
- **Do** 分层优先用细线或换平涂色;必须投影时带色、浅、单方向向下。

### Don't:
- **Don't** 使用旧站的"深紫/品红霓虹夜店风"及任何霓虹脉冲、一惊一乍的动画(弹跳、闪烁、快速位移)——PRODUCT.md 明令抛弃的方向。
- **Don't** 写做作、煽情、营销腔文案("进入这个聆听室""驶向朝阳"这类)。
- **Don't** 用手绘装饰元素(手绘太阳之类)——显廉价;质感只来自真实照片与干净平涂。
- **Don't** 玻璃叠玻璃;迷你播放条永远实色(玻璃纪律)。
- **Don't** 用重黑阴影、多方向糊影或深色蒙版压照片——一切拉低明度、让边界发脏的东西都违反通透律。
- **Don't** 用纯黑文字(用 Deep Navy #0B3A53),也不要把 muted 文字淡过 Ink Mist #4C7083(对比度红线 4.5:1)。
- **Don't** 把文字或必需图标放在浅水原色(Ocean/Turquoise/Coral/Sun)上——浅色主题下白字最高只有 2.9:1;要么换深水形态(深水律),要么让浅水保持纯装饰。
- **Don't** 满屏加粗(700 禁用)、渐变文字(background-clip: text)、侧色条(border-left >1px)、同尺寸卡片无限网格等通用 AI 模板痕迹。

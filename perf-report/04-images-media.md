# 04 · 图片与媒体加载

> 审计对象:全站 `next/image` 用法(sizes/priority/CLS)、hero 照片管线、取色 hook、MediaSession artwork、MV 视频、OG 图、图标路由、SW 封面缓存互动。含对后端封面响应的实测。

## 概述

整体图片管线状态相当好:hero 照片是服务端渲染的 `<picture>`(无 hydration 依赖的 LCP),所有 `next/image` 都有 `sizes`,OG 卡片全部静态化,图标路由带 immutable 缓存,SW 封面缓存匹配精确。**真正的漏洞集中在一处模式:绕过 next/image 优化器直接使用原始封面 URL 的地方**——后端封面原图实测约 1MB/张(`curl -I /stream/img/…` → `content-length: 1065847`,image/jpeg),而优化后的 96px WebP 只有几 KB。取色 hook 和 MediaSession artwork 都在拉原图。

## 健康项(已验证)

1. **Hero LCP 不被 hydration 阻塞**:`theme-image.tsx:49-67` 服务端渲染 `<picture>` + prefers-color-scheme source,`loading="eager"` + `fetchPriority="high"`,只按 OS 主题下载一张;blurDataURL 占位零网络。override 层只在用户主题≠OS 时补一张,常规路径零成本。
2. **网格卡片 sizes 准确**:`album-card.tsx:51` `"(max-width: 640px) 45vw, 230px"` 对得上网格布局;`mv-card.tsx:33` 同。
3. **priority 布线正确**:首行 6 张封面 eager+high,其余 lazy;专辑页 hero 封面 `priority`(sizes 与栏宽吻合);ambient eager 但不 high(注释权衡明确)。
4. **无 CLS 风险**:所有 `fill` 图都在 `aspect-square`/`aspect-video` 定尺寸盒子里。
5. **小图 sizes 精确**:mini-player `"44px"`、对话框 `40px`、搜索 36px、歌词缩略图 `48px/288px`。
6. **OG 全静态**:`lib/og.tsx:27-47` 在 `'use cache' + cacheLife('max')` 边界内完成封面 fetch + satori 渲染,`generateStaticParams` 预渲染全部 34 张卡。每次 unfurl 零运行时成本。
7. **图标路由缓存正确**:`tile.tsx:49` `public, max-age=31536000, immutable`。
8. **SW 封面缓存设计好**(`app/sw.ts:46-74`):只匹配 `/_next/image?url=*/stream/img/*`(不误吞 hero/MV 缩略图),CacheFirst + 300 条 + 30 天 + `purgeOnQuotaError`,写入记账进 IndexedDB。
9. **hero 照片跨四个 section 复用**(home/playlists/more/mv 同一组静态 URL,全站只下载一次);remotePatterns 收得紧。
10. **MV 页**:13 张缩略图原图仅 ~24KB 且走优化器,全部 lazy。

## 发现

### I1 · 取色 hook 每张新封面拉 ~1MB 原图 —— 高

**证据**:`lib/player/use-dominant-color.ts:57` `fetch(src, { cache: "force-cache" })`,`src` 来自 `mini-player.tsx:45-47` 的 `coverUrl(...)` = 原始 `/stream/img/:id`。屏幕上的 `<Image>` 下载的是 `/_next/image?…&w=96` 优化变体——**原始 URL 不在 HTTP 缓存里**,注释「very likely already in the browser cache」不成立。实测原图 1.07MB JPEG。

**影响**:每换一张专辑的歌,手机上多下 ~1MB,只为算一个 48×48 的色调;且原始 URL 不匹配 SW 封面缓存规则 → 离线时取色直接失败。连续听不同专辑 = 每张 1MB。

**建议修法**:改拉优化器 URL:`/_next/image?url=${encodeURIComponent(src)}&w=96&q=75`(同源无 CORS 顾虑,`w` 取 imageSizes 中的值)。mini-player 44px@2x 请求的正是 w=96——大概率 SW/HTTP 缓存直接命中,**净成本归零**,离线也能工作。

### I2 · MediaSession artwork 指向 1MB 原图,且 sizes 声明是假的 —— 中

**证据**:`audio-engine.tsx:244-248`:`[128,256,512].map(s => ({ src: coverUrl(...), sizes: \`${s}x${s}\` }))`——三个条目同一个原始 URL。

**影响**:锁屏/系统 UI 抓 artwork 时下载 ~1MB 原图(与 I1 共享 HTTP 缓存条目,两者只重一次);原始 URL 绕过 SW → 离线播放时锁屏无封面。

**建议修法**:三档分别指向 `/_next/image?…&w=128/256/640` 同源优化 URL,锁屏图离线也能命中 SW 封面缓存。(与 06 报告 D6 同一发现,两个 agent 独立命中。)

### I3 · Ambient 模糊背景实际请求 828-1200px 变体 —— 中

**证据**:`album-ambient.tsx:49` `sizes="384px"`。sizes 与 DPR 相乘选 srcset:DPR2 手机 → 需求 768 → 命中 w=828;DPR3 → w=1080/1200。注释意图(「a small variant suffices」)被 DPR 放大抵消。该组件用于专辑页、全屏播放器、歌单详情、MV 观看页四处。

**影响**:`blur-xl`(24px 模糊)下 828px 和 128px 视觉无差;每次进这些屏多传 ~50-100KB,还多产生高宽度档位的 Vercel transform。

**建议修法**:`sizes="128px"`(DPR3 顶到 w=384,仍绰绰有余)。

### I4 · 未启用 AVIF —— 低-中

**证据**:`next.config.ts:22-29` 未设 `formats`;Next 16 默认仅 `['image/webp']`。

**影响**:封面/hero 均为照片类内容,AVIF 通常再省 20-30%——最大单项是 1920w 的 hero(WebP 估 ~200KB 级)。代价:Vercel 按 unique transform 计费,34 张封面 × ~7 档 ≈ 240 个 transform,翻倍到 ~500 也远低于配额。

**建议修法**:`images: { formats: ["image/avif", "image/webp"] }`;若更在意 transform 配额则维持现状(合理选择,注明即可)。

### I5 · 首页 7 个 fetchPriority=high 请求互相稀释 —— 低

**证据**:hero(theme-image.tsx:61)+ 前 6 张封面(`album-grid.tsx:22` `priority={i<6}`)。手机首行只有 2 列,却有 6 张 high。

**影响**:与 hero(真 LCP)争带宽,LCP 可能被推迟几十到几百 ms(视网络)。

**建议修法**:保留 6 张 eager,`fetchPriority="high"` 收窄到前 2-3 张;hero 保持唯一最高优先级。

### I6 · 全屏播放器大封面 sizes 缺 lg 分支 —— 低

**证据**:`full-player.tsx:268` `sizes="(max-width: 640px) 78vw, 44vh"`,但盒子在 lg 是 `min(18rem,30vh)`=最大 288px。900px 高桌面窗口 44vh=396 → DPR2 命中 w=828,实际渲染 288px。

**建议修法**:`"(max-width: 640px) 78vw, (min-width: 1024px) 288px, 44vh"`。

### I7 · Vercel transform 核算:现状可接受 —— 信息

一张封面跨场景 unique 变换约 5-8 个(卡片/mini/专辑 hero/全屏/ambient/搜索各档),34 张 ≈ 240 个 transform,配额内没有问题。采纳 I3/I6 后档位还会收敛。

### I8 · MV 观看页 poster 重复 + 比例跳变 —— 低

**证据**:`mv-watch.tsx:112-117` `<video autoPlay poster={mv.thumbnailUrl}>`(poster 是 24KB 原始 jpg,同屏 ambient 又请求同图优化变体,同一像素两个 URL 各下一次);metadata 到达后宽高比从 16:9 切到真实比例有一次小 reflow。均可忽略。

**建议修法**:可不改;求净可省 poster,或后端 /mv/list 带宽高。

### I9 · Hero 源文件盘点 —— 无需动作

`home-noon.jpg` 646KB @2400×1600、`home-dusk.jpg` 513KB @2000×1333、`beach.jpg` 594KB @2000×1380、`beach-dusk.jpg` 333KB @1600×2240、demo 的 `photo-surface.jpg` 1.03MB @1800×2400。全部经优化器转出,源体积不上线。唯一小瑕疵:beach-dusk 只有 1600w,>1600px 视口的 gate 暗色 hero 无 1920 档(next 不放大)——模糊系背景可接受。

**注意**:这些源图会被 SW precache 全量塞给每个访客——见 07 报告 B1,那才是它们真正上线的路径。

### I10 · 封面双层存储(SW + HTTP 缓存)—— 信息

`sw.ts:50` CacheFirst 把优化封面存进 cover 桶,同一响应也在浏览器 HTTP 缓存 → 磁盘 ~2×,上限 300 条 × 几十 KB ≈ 几 MB。刻意设计(reload 时 SW 短路 304 往返、离线可用),有界、有记账、有淘汰——合理,保留。

## 优先行动清单

1. `use-dominant-color.ts:57` 改拉 `/_next/image?…&w=96`(每张专辑省 ~1MB,离线可用)
2. `audio-engine.tsx:244-248` MediaSession artwork 换 w=128/256/640 优化 URL
3. `album-ambient.tsx:49` `sizes="384px"` → `"128px"`
4. (可选)开 AVIF;收窄首页 high-priority 封面数;full-player 补 lg sizes 分支

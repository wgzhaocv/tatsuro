# 07 · Bundle 体积与字体加载

> 审计对象:生产构建产物(`bun run build`,2026-07-18)、`app/layout.tsx` 字体配置、SW 预缓存清单。
> 数据全部来自本机构建实测,非估算的地方已标注。

## 概述

整站是"全局播放器"架构:播放器、providers、离线 reconciler 全部挂在根 layout,所以**每个页面首次加载的 JS 完全相同——实测 24 个 chunk 共 1.30MB(未压缩)/ 403KB(gzip)**。对一个音乐播放器 PWA 来说这不算失控,但其中相当一部分是"进站就下载、但要用户做特定动作才会用到"的代码,且**全仓库没有任何一处 `next/dynamic` / `React.lazy` / 动态 `import()`**——没有做过任何按需拆分。

CSS 单文件 113KB(未压缩)/ 18.7KB(gzip),健康。字体策略健康。最大的问题在 SW 预缓存清单。

## 健康项

- **字体**(`app/layout.tsx:17-32`):只有三套 Google 变量字体(Quicksand / Inter / Jost),全部 `subsets: ["latin"]`,next/font 自托管 + 默认 `display: swap`,其中 3 个关键字重带 preload。**日文完全走系统栈**(Hiragino/Noto Sans JP),零网络成本——这是最贵的一类字体成本,已经躲开了。全部 woff2 合计约 370KB,但按页实际只取用到的字重。
- **图标**:`@phosphor-icons/react` 全站只用了 28 个独立图标,ESM 具名导入可被 Turbopack tree-shake;服务端组件走 `dist/ssr` 入口(3 处),没把整个图标库拽进 bundle。
- **CSS**:18.7KB gzip 单文件,含双主题 + 动效词汇,规模合理。
- **HTML**:首页 SSG HTML 21.6KB gzip(含 25+ 张卡片的完整内容),PPR 静态壳有效。
- **依赖面干净**:没有 moment/lodash 之类的经典胖依赖;react-dom(227KB 未压缩 / 71KB gz)是底价,躲不掉。

## 发现

### B1 · SW 预缓存 4.8MB,其中 ~3.1MB 照片原图永远不会被页面请求 —— 高

**证据**:构建日志 `✓ (serwist) 51 precache entries (4825.11 KiB)`;`app/sw.ts:26`(`precacheEntries: self.__SW_MANIFEST`)不带任何过滤;`.next/static/media/` 里 5 张 hero 照片原图合计 ~3.1MB(`photo-surface` 1.03MB、`home-noon` 646KB、`beach` 594KB、`home-dusk` 513KB、`beach-dusk` 333KB)全部进了清单。

**问题**:页面上的 hero 走的是 `components/theme-image.tsx` 的 `getImageProps()` → `<picture>` srcSet,**实际请求 URL 是 `/_next/image?url=…&w=…`(Vercel 优化变体),不是 `/_next/static/media/*.jpg` 原图**。预缓存的原图 URL 没有任何页面请求会命中——纯粹是每个新访客(以及每次部署后 revision 变化时)白下载 3MB+。移动端首访代价直接翻倍还多;两套主题的照片(正午+黄昏)也都各下了一份。

**建议修法**:给 serwist 的 manifest 做排除——`@serwist/turbopack` 的 route 配置支持 manifest 变换/globIgnores 一类选项,把 `*.jpg`(以及顺手 `*.png` 大图)从 precache 排除。hero 照片本身有 HTTP immutable 缓存 + `ThemeImage` 的 blur 占位兜底,不需要 SW 预缓存。若将来做"整站离线",应该缓存的是页面实际用的 `/_next/image` 变体(runtime cache 已经在做封面这件事,同一个思路)。

**预期收益**:新访客 SW 安装流量从 ~4.8MB 降到 ~1.7MB;每次部署后的增量重下载也同步缩小。

### B2 · 零代码拆分:cmdk 搜索、全屏播放器、More 管理器全部随首屏加载 —— 中

**证据**:`grep -rn "next/dynamic\|React.lazy\|import(" components app lib` 零命中。chunk 指纹分析:~103KB(未压缩)的 chunk 内含 cmdk(33 处标记)+ Dialog(40 处)——命令面板搜索整包在首屏 JS 里;`full-player.tsx` + `lyrics-panel.tsx` + `spectrum.tsx`(Web Audio 分析器)、`components/more/*`(缓存管理器)同样全部打进共享包。

**问题**:这些 UI 都有明确的"用户动作门槛"——搜索要按 ⌘K/点搜索框,全屏播放器要点迷你条展开,More 页要切 tab 才进。首屏(尤其 gate 登录页,用户还没进站)就付掉全部下载+解析成本。403KB gzip 里估计 60-90KB 属于这类"可迟付"的代码。

**建议修法**(按性价比排序):
1. `command-search.tsx` 的 cmdk `Dialog` 内容 → `next/dynamic`(打开时才载),这是最大单块;
2. `full-player.tsx`(连同 lyrics-panel、spectrum)→ `next/dynamic`,迷你条常驻但全屏面板按需;注意保留 `AudioEngine` 常驻(它才是 `<audio>` 的持有者,拆的只是全屏 UI);
3. `components/more/offline-manager.tsx` → 路由本身已按需,但它被打进共享 chunk 的话检查引用链(`more/page.tsx` 之外是否有人 import 它)。

**权衡提醒**:这是个"熟人私享站 + 回头客"产品,回访都吃 HTTP 缓存,收益主要在**首访/清缓存后/低端机解析时间**。gate 页收益最实在(登录前真的什么都用不到)。如果不想引入加载闪烁,可以只做 cmdk 一处。

### B3 · Jost 全站加载,只有字标在用 —— 低

**证据**:`app/layout.tsx:29-32`,注释自述 "Brand wordmark only (nav / gate)"。

**问题**:一个只渲染几个字符的字体加载了完整 latin 字集(~20-30KB woff2)。

**建议修法**:可以不动(成本小、字体有 preload 不阻塞);讲究的话给 Jost 加 `text` 参数(next/font 支持 `text: "TATSURO YAMASHITA…"` 按字符子集化),woff2 能缩到 ~2KB。

### B4 · `shadcn` 作为 runtime dependency —— 低

**证据**:`package.json` dependencies 里有 `"shadcn": "^4.13.0"`。

**问题**:shadcn 是 CLI 脚手架,不该出现在 dependencies(它不会进客户端 bundle,但会进 `bun install` 的生产依赖树,拖慢部署安装)。

**建议修法**:挪到 devDependencies,或干脆删掉用 `bunx shadcn` 即可。

## 实测数据附录

| 项 | 未压缩 | gzip |
|---|---|---|
| 首页 JS(24 chunks) | 1,303KB | 403KB |
| /more JS(25 chunks) | 1,321KB | ~408KB |
| 最大 chunk(react-dom) | 227KB | 71KB |
| cmdk+Dialog chunk | 103KB | ~30KB(估) |
| 主 CSS | 113KB | 18.7KB |
| 首页 HTML | 159KB | 21.6KB |
| SW 预缓存 | 4,825KB / 51 项 | —(含 ~3.1MB jpg 原图) |
| 字体 woff2 合计 | ~370KB(13 文件,3 个 preload) | — |

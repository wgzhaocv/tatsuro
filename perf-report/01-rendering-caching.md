# 01 · 服务端渲染与缓存架构

> 审计对象:`app/[locale]/` 全部路由、`lib/api/` 的 `'use cache'` 层、`proxy.ts`、`next.config.ts`、serwist 路由;用 `.next/prerender-manifest.json`(178 routes / 35 dynamicRoutes)交叉验证;`cacheLife("max")` 语义从 next 源码核实(stale 5min / revalidate 30d / expire 1y)。

## 概述

这套架构整体处于**非常健康**的状态:全部内容路由(首页、33 专辑页 + 6 再版页、14 MV 页 × 3 locale,共 178 条)构建期完全静态预渲染,`'use cache'` 层键空间克制、无请求瀑布,中间件热路径只有廉价 HMAC,客户端边界收得很紧。**没有高严重度问题**;最值得注意的是「OG 图与 sw.js 实为首请求渲染而非构建期产物(与代码注释相悖)」「专辑页曲目列表在 RSC payload 双份序列化」和「`getMessagesFor` 缺 cacheLife 把全站路由 ISR 钉在 15 分钟档」。

## 健康项(已核实)

1. **静态预渲染覆盖完整**:prerender-manifest 确认全部内容路由构建期 HTML+RSC 落盘;未知 id 走 `fallback: null` 按需渲染 → 主题化 404。
2. **`generateStaticParams` 组合正确、扇出并行**(`[edition]/page.tsx:13-14` `Promise.all`,无顺序瀑布)。
3. **无意外动态化**:全仓无 `useSearchParams`、页面/布局无 `cookies()/headers()`;每处 `getTranslations` 都带显式 `{locale}`(grep 零例外);`NextIntlClientProvider` 喂满静态值、timeZone 固定——next-intl 在 Cache Components 下所有破坏 prerender 的暗坑全堵死。
4. **PPR 动态洞粒度堪称范本**:全 app 只有两个 Suspense 动态洞——底部导航仅"高亮"动态(整条 bar 进静态壳,`(main)/layout.tsx:36-38`);`playlists/[id]` 的 params 读取收进 Suspense。没有"整页陪跑动态"。
5. **`lib/api` 缓存层设计正确**:全部 `'use cache' + cacheLife("max") + cacheTag`;键空间无爆炸(`NameLang` 只有 en/ja,zh→en;OG 固定 en,三 locale 共享);page + `generateMetadata` 同 `(id,lang)` 由 `'use cache'` 去重不打两次后端;搜索索引直连 CF 边缘、歌词/单曲走浏览器端 TanStack——分层清晰,刻意绕开 Vercel 带宽/函数。
6. **proxy.ts 热路径廉价、matcher 正确**:每请求 1-2 次 WebCrypto HMAC,无 fetch;无 cookie 请求第一行短路;matcher 排除静态资产/图标/OG(bot 免门禁抓卡)。
7. **客户端边界紧**:EditionView/DiscSection/SectionHero/AlbumAmbient 均服务端组件;`'use client'` 只落真正交互的叶子。
8. **LCP 通路讲究**:`ThemeImage` 服务端 `<picture>` 单张下载 + `fetchPriority="high"` 免 hydration;`FadeImage` 明确移除了压 LCP 的透明度渐入。
9. **serwist 路由生产不重打包**:`force-static` + `revalidate=false`,每次部署最多一次 esbuild 后进 ISR 缓存。
10. **next.config 合理**:remotePatterns 只放行两条路径;图标 route 用 immutable 响应头。

## 发现

### N1 · `getMessagesFor` 缺 `cacheLife` → 全站路由 ISR revalidate 被钉在 15 分钟档 —— 低-中

**证据**:`i18n/messages.ts:7-10` 只有 `"use cache"` 无 `cacheLife`(默认 profile revalidate=15min);构建输出全部路由显示 `Revalidate 15m / Expire 1y`——而 `lib/api` 层全是 max(30d)。路由的 revalidate 取页面所用全部 cached 函数的最小值,messages 这一个函数把 178 条静态路由全部拉到 15 分钟档。(全仓仅此一处真缺 cacheLife;`lib/api/client.ts` 和 `mv/[id]/page.tsx` 的 grep 命中只是注释。)

**影响**:有流量时每条路由每 15 分钟触发一次后台 ISR 重渲染(serverless 函数调用;重渲染内层数据全 cached,不打后端)。量级不大但纯属浪费——messages 是随部署固化的静态 JSON,15 分钟档没有任何意义。副作用:意外获得了"专辑数据 revalidateTag 后最迟 15 分钟自动生效"的行为,若改成 max 档,刷新流程回归显式 `revalidateTag`/重部署(与文档一致)。

**建议修法**:`getMessagesFor` 加 `cacheLife("max")`(一行);路由 revalidate 回归 30d 档。

### N2 · 专辑页曲目列表在 RSC payload 双份序列化 —— 低(大编制专辑接近中)

**证据**:`edition-view.tsx:67` 生成 `queueSongs` 后 :89-94 传给客户端 `QueuePlaybackProvider`(第一份);`disc-section.tsx:64-70` 又把每个 `track` 作为 prop 传给客户端 `TrackRow`(第二份)。而 `TrackRow` 内部第一选择就是 provider 那份:`const song = songs[queueIndex] ?? track`(`track-row.tsx:46-47`),`track` 只剩兜底。

**影响**:每首 ~0.2-0.4KB 在 HTML 内嵌 RSC payload 出现两次。普通专辑多 ~3-5KB;多碟 live 合集(Opus/JOY 级,百余轨)多 **~20-40KB 未压缩**(gzip 后数 KB)纯冗余传输+解析。

**建议修法**:任选一边作唯一数据源——`TrackRow` 去掉 `track` prop 仅传 `queueIndex`(标题从 `useQueuePlayback().songs[queueIndex]` 取),或 provider 只收 id 列表。

### N3 · `@phosphor-icons/react` 走根桶导入,未列 `optimizePackageImports` —— 低

**证据**:32 个文件从根桶导入;Next 默认 optimize 列表不含 phosphor;包自带 `sideEffects: false`。

**影响**:生产 bundle 大概率被 tree-shaking 救回(07 报告实测确认未整包打入);主要代价是 dev/build 解析 ~1500 个 re-export 桶模块(Turbopack 冷编译、HMR 变慢),并依赖 shaking 不失手。

**建议修法**:`next.config.ts` 加 `experimental: { optimizePackageImports: ["@phosphor-icons/react", "@phosphor-icons/react/dist/ssr"] }`,零风险。

### N4 · OG 卡片与 sw.js 并非构建期预渲染,而是"首请求渲染 + 静态缓存"——与注释相悖 —— 低(信息+注释纠偏)

**证据**:prerender-manifest 的 routes 中没有任何 `opengraph-image`/`serwist` 条目,只在 dynamicRoutes(`renderingMode: "STATIC"`,无预渲染实例);而 `album/[id]/opengraph-image.tsx:14-20`、`lib/og.tsx:22-27` 注释声称 "prerendered at build"。构建输出中 gate/mv/playlists/root 的 OG 路由标 ƒ 与此一致。

**影响**:每次部署后每个 OG URL 第一次 unfurl 在函数内跑 satori(`'use cache'` 保住封面 fetch+渲染字节跨部署留存,多数只付一次),冷启 +300-800ms——只影响 bot,不影响真人。sw.js 同理,部署后首请求付一次 esbuild。

**建议修法**:行为可接受;把 "prerendered at build" 注释改为 "static-cached on first request",避免未来维护者错误推断。

### N5 · More 页 `cachedAlbums` 走 server action,且离线必挂 —— 低

**证据**:`more/actions.ts:22-24`(`"use server"` + `songReleaseIndex()`),客户端 `album-cache-section.tsx:65` 调用。

**影响**:每次打开 More 离线管理 POST 一次 hnd1 函数(RTT + serverless 调用);索引是纯静态目录派生物,action 响应不可缓存。更要紧的是语义:**离线时这个 action 必挂,而它恰是"离线管理"面板**。

**建议修法**:后端像 `/music/search-index` 一样暴露 song→album 索引(CF 边缘 + immutable),分组逻辑移到客户端——离线也能工作。离线语义比性能更值得改。

### N6 · `findReleaseByDisc` 按 `disc:lang` 缓存整个 AlbumDetail,与 `songReleaseIndex` 重叠 —— 低

**证据**:`albums.ts:99-118`,每 disc×lang 存一份含全部 editions/discs/tracks 的条目;调用方仅 `lib/share.ts:19`(低频)。与 06 报告 D3 同源——两套 disc→release 反查并存。

**建议修法**:`getAlbumHref` 先查 `songReleaseIndex()` 拿 `albumId/editionId` 再单次 `getAlbum`,删掉全目录扫描形态。非紧迫。

### N7 · 杂项微优化 —— 低/信息

- **locale 307 跳转**:无前缀路径(含 PWA `start_url: "/"`)每次冷启吃一次 edge 307(~10-30ms)。next-intl 标准行为,不推荐轻动。
- **HMAC key 每请求 `importKey`**(`lib/auth.ts:34-40`):可模块级缓存 `Promise<CryptoKey>`,省亚毫秒——纯洁癖项。
- **`app/not-found.tsx` 兜底**:未匹配 URL 经历 404→`/`→307→`/{locale}` 三跳。极低频,可直接 redirect 进 defaultLocale 省一跳。
- **AVIF 未启用**:见 04 报告 I4。

## 结论

按用户可感知影响排序,值得动手的只有 N1(一行 cacheLife)、N2(大专辑省 20-40KB payload)、N3(一行配置)、N4(纠正注释)。没有任何路由存在"本可静态却按请求渲染"的问题——这是 cacheComponents 项目里预渲染纪律非常好的代码库:动态 API 零泄漏、Suspense 洞只包真正动态的像素、缓存键空间被 `nameLang` 主动收敛、中间件热路径无 IO。

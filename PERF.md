# 性能备忘 — 手机发热调查

> 起因:app 用久了手机发热。做了一轮代码审计 + 上网查证,先把结论和候选修法记下来,**尚未profile、尚未动手改**(试改过 album-ambient 移动端降 blur,已回退)。下次接着从「怎么定位」往下走。

## TL;DR

- 手机发热 = CPU/GPU 一直没停下来。嫌疑集中在**每帧重算的东西**:`backdrop-filter` 磨砂玻璃(滚动时)、播放中的持续动画。
- 代码防护整体做得好:频谱只在「播放中+桌面+非 reduced-motion」跑;迷你条封面暂停时冻结;进度走 `timeupdate`(~4Hz)不是逐帧 RAF。**没有明显低级泄漏。**
- **关键区分**:`filter: blur`(如 album-ambient 满屏层)是"糊一次缓存",持续成本低;`backdrop-filter`(固定 chrome)才是"每帧重糊",是发热主嫌。别把两者混为一谈。
- **还没 profile。** 下面的排序是理论推断,真机 profile 才是定论。

## 已排除 / 低嫌疑

- `components/player/spectrum.tsx` — canvas RAF 频谱。守卫严:`!isPlaying || !isDesktop || prefersReducedMotion()` 直接 return,手机根本不跑。
- `components/album/album-ambient.tsx` — 满屏糊化封面,用的是 **`filter: blur-xl`(普通 filter,非 backdrop-filter)**,且 breathe 动画早已删除 → 静态栅格化一次、之后是缓存纹理,**不每帧重算**。唯一移动端成本是那张 viewport 大小的 RGBA 纹理占 GPU 显存。降 blur 半径只省显存,对持续发热作用有限(试改已回退)。
- 进度更新 — `useProgressStore` 走 `<audio>` 的 `onTimeUpdate`(~4Hz),不是逐帧。

## 主嫌疑(每帧重算 / 持续动)

| 嫌疑 | 位置 | 为什么 | 候选修法 |
|---|---|---|---|
| **固定 chrome 的 backdrop-filter** | `components/bottom-nav.tsx`(`backdrop-blur-md`,`lg:hidden` 纯移动端)、`components/player/mini-player.tsx`(`bg-white/72 backdrop-blur-md`) | `backdrop-filter` 每帧要"渲染背后画面→模糊→合成";**滚动时背后内容一动就重糊**。底栏满宽固定,内容在下面滚 = 每滚动帧重算。 | 移动端降 blur 档 or 直接实色。**注意**:DESIGN.md 说「迷你播放条永远实色」,当前是玻璃 = 与规范不符;改回实色既省电又合规。 |
| **播放中持续旋转的封面** | `components/player/mini-player.tsx` `animate-spin-slow`(8s infinite,播放时 running) | transform 动画理论上走合成器很便宜,但持续动画 + 处在 `overflow-hidden`+glass 容器里,某些移动 GPU 上可能触发重绘/使合成层常驻。 | 移动端 `lg:animate-spin-slow`(仅桌面转)。**需 profile 确认是否真有成本再动。** |

其余 `backdrop-blur-xs`(button/input/home-nav 等 2px)成本可忽略,不用管。

## 高斯模糊为什么贵(查证结论)

- `backdrop-filter` 比普通 `filter` 贵得多:要先把**背后整个画面**渲染出来→模糊→再合成自己。
- 三个放大因素:① 模糊半径(逐像素采样,`blur(20px)` ≫ `blur(5px)`);② 元素数量(叠乘);③ **背后有东西在动 → 每帧重糊**(发热直接元凶,多篇点名 "heat the device / battery drain")。
- 公认解法(按性价比):① 预糊化静态图替代实时 backdrop-filter;② 移动端 media query 降半径;③ 少叠、别在 blur 背后放动画;④ 半透明实色兜底;⑤ `will-change`/`translateZ(0)` GPU 提示(双刃剑,用错更耗显存)。

来源:
- runebook — backdrop-filter troubleshooting <https://runebook.dev/en/docs/css/backdrop-filter>
- CSS-Tricks — blur() <https://css-tricks.com/almanac/functions/b/blur/>
- A Faster Web — CSS Filters and Mobile Performance <https://www.afasterweb.com/2016/01/31/css-filters-and-mobile-performance/>
- Mozilla Bugzilla 1718471 — 多元素时 backdrop-filter 卡 <https://bugzilla.mozilla.org/show_bug.cgi?id=1718471>
- GitHub Xen-HTML #219 — backdrop-filter 掉电/卡 <https://github.com/Matchstic/Xen-HTML/issues/219>

## 下一步:怎么定位(还没做)

1. **2 分钟排除法**(不用工具):发热时逐个关变量看哪个让手机凉——停播放但留在页面 / 切到简单页(首页网格)继续播 / 系统开「减弱动态效果」(触发全局 reduced-motion kill-switch)/ 深浅主题各测。先把问题域缩到「动画 vs 音频 vs 某一屏」。
2. **真机远程 profile**(最准):
   - iPhone:设置→Safari→高级→网页检查器;Mac Safari→开发菜单→选中 iPhone→Timelines,录一段**播放但不操作**15s,看 CPU/Energy + Frames。
   - Android:USB 调试 → 电脑 Chrome `chrome://inspect` → inspect → Performance 录 15s。
   - 读图:底部 FPS/GPU 条一直活动 = 有东西逐帧重绘;Summary 饼图 Rendering+Painting 高 = blur/合成,Scripting 高 = JS 循环;Rendering 抽屉勾 **Paint flashing** 看哪块一直闪绿;Layers 面板看合成层数。
3. **Lighthouse**(移动模式)跑一次,看 "Avoid non-composited animations" 审计,会直接点名主线程动画。
4. 定位后再按上表候选修法动手,**一次一个变量**便于 A/B 对比温度。

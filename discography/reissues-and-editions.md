# 再版与多碟结构 · Reissues, Editions & Discs

本站的**多版本(再版)**和**多碟**发行——即 Release → Edition → Disc 里 Edition/Disc 数 > 1 的条目。以当前 D1 为准。

## 先分清:「压盘再版」≠「edition」

山下达郎最热门的专辑(Ride on Time / For You 等)历经**几十次再版**——初版 LP → 首次 CD 化 → 1990 自监 remaster → 2002《RCA/AIR YEARS》数字重制(BMG)→ 2010s Blu-spec CD → 2023 黑胶 Vinyl Collection,外加历年重压 / 地区版 / 盒装。Discogs 上一张旗舰能列二三十条目录号。

**但本站只建「有意义的 edition」,不追每次压盘。** 判断标准:

| 情况 | 建 edition? |
|---|:--:|
| 母带重制导致**声音不同**(如 1990 remaster vs 2002 数字重制) | ✅ 建(如 Ride on Time 的 `1986·Air` / `2002·BMG`) |
| **收录内容不同**(多 bonus track / 别版) | ✅ 建(如 Opus 初回限定盘第 4 碟) |
| 同一内容、只换厂牌 / 格式 / 母带的**第 N 次压盘** | ❌ 不追(音乐一样,追了数据爆炸) |

> 所以「某张再版了几十次」不构成收藏缺口——那多是同一批录音的重复发行。目前按 edition 建模的有 4 张(下表)。

## 多版本发行(再版 · 一个 Release 下多个 Edition)

带一个以上版本的发行,**默认展开最新版**:

| 发行 | 类别 | 版本 | 默认版 |
|---|---|---|---|
| Ride on Time | studio | `1986 · Air` / `2002 · BMG` | **2002 · BMG** |
| Pocket Music | studio | `1986 · Moon` / `1991 · Moon` / `2020 · Moon` | **2020 · Moon**(2026-07) |
| Big Wave | studio | `Standard` / `2014 · Moon` | **2014 · Moon**(2026-07) |
| Artisan | studio | `Standard` / `2021 · Moon` | **2021 · Moon**(2026-07) |

> 其余发行本站均为单一版。**2026-07 relabel**:Circus Town / Spacy / Go Ahead! / Moonglow / For You 这 5 张的唯一版本原标 `Standard`,实为 2002 BMG 重制,已改标 `2002 · BMG`(`edition_year=2002`;`release.year` 仍是原始年代)。
> 真实世界里几乎每张专辑都有多次 CD 再版/重制,但本站只对内容不同的版本建 edition。

## 多碟发行(一个 Edition 下多个 Disc)

| 发行 | 年 | 类别 | 碟数 | 碟结构 |
|---|--:|---|:--:|---|
| It's a Poppin' Time | 1978 | live | 2 | 现场,碟 1 + 碟 2 |
| Joy - Tatsuro Yamashita Live | 1989 | live | 2 | 现场,碟 1 + 碟 2 |
| Rarities | 2002 | compilation | 2 | 稀有曲,碟 1 + 碟 2 |
| Ray Of Hope | 2011 | studio | 2 | 碟 1 录音室 + 碟 2 = **JOY 1.5** 现场 |
| Opus - All Time Best 1975-2012 | 2012 | compilation | **4** | 碟 1–3 all-time best + **碟 4 = Bonus Disc**(2026-07 补入) |
| Softly | 2022 | studio | 2 | 碟 1 录音室 + 碟 2 = **The Latest Acoustic Live** |

## edition 缺口(已清)

- ✅ **Opus 初回限定盤第 4 碟**(6 首从未 CD 化音源,含《硝子の少年》1997 demo 人声版)——2026-07 已作为 Opus 的碟 4 补入(`disc_title='Bonus Disc'`,`recording='studio'`)。当前无已知 edition 缺口。

## 备注

- **JOY 1.5** 原为 Ray of Hope 盒装内附的现场碟,`0003` 迁移已把它并为 Ray of Hope 的碟 2(`recording='live'`),不再是独立发行。
- 多碟里 `recording` 是**碟级**字段:同一发行可以碟 1 是 `studio`、碟 2 是 `live`(Ray of Hope、Softly 即如此)。

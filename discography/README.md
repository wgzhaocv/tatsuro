# 山下达郎 · 唱片目录 & 收录进度

本目录把山下达郎(Tatsuro Yamashita)的**完整个人正式发行**整理成几个 md 文件,并逐条标出**本站是否已收录**,方便回答:*我收了多少、还差多少。*

- **✅ 已收录** = 存在于后端 D1(初始 seed + **2026-07 导入批次**,见 [imports/](./imports/))。
- **❌ 缺失** = 真实发行、但后端还没有。

> 真实世界清单核对自英文维基 [Tatsuro Yamashita discography](https://en.wikipedia.org/wiki/Tatsuro_Yamashita_discography)。年份以维基为准。
> **2026-07-13 导入**:Sonorite、Come Along 3、Pacific、Sync of Summer、Christmas Eve(2018/2025)6 张新 Release;Artisan 2021 / Big Wave 2014 / Pocket Music 2020 三个新默认版本;Opus 补第 4 碟(初回限定盤);5 张 2002·BMG 版 relabel。共 +114 首。
> **2026-07-16 导入**:オノマトペISLAND／MOVE ON(2025 单曲)、**On the Street Corner 3**(1999,无伴奏翻唱系列收官)——至此**官方作品 100% 收全**。

## 收录进度总览

| 类别 | 已收录 | 主要发行总数 | 差 |
|---|--:|--:|--:|
| 录音室(含翻唱系列) | 19 | 19 | 0 |
| 精选集(主要) | 7 | 7 | 0 |
| 现场 | 2 | 2 | 0 |
| **合计** | **28** | **28** | **0** |

> 另收录 6 项主要清单外的发行:**Pacific**(1978,与细野晴臣/铃木茂合作盘)、**Sync of Summer**(2023 单曲)、**Let It Be Me**(2016,与竹内玛利亚合唱单曲)、**Christmas Eve** 2018/2025 两次单曲再版、**オノマトペISLAND／MOVE ON**(2025 单曲,宝可梦礼宾部主题曲)。乐队/合作盘另见 [collaborations.md](./collaborations.md)。

### 官方作品已 100% 收全 ✅

最后两项(**On the Street Corner 3** 1999 / **オノマトペISLAND／MOVE ON** 2025)已于 2026-07-16 入库(见 [imports/](./imports/))。OTSC3 收官后无伴奏翻唱系列齐全,单曲 Love Can Go the Distance 也随之解决。**主要清单 28/28,再无缺口。**

### 存疑 / 已核实排除

- **Joy 2**:官网 + 日文维基均**未列为已发售** → 官方 JOY 2 **从未发行**。二手市场的"JOY2 LIVE CD"(点点数字封面、天价)是**私盤/盗版**,非官方,别收(详见 [collaborations.md](./collaborations.md))。官方只有 JOY(1989),已收。
- **Tatsuro from Niagara**:官网 / 日文维基**都没列** → 从缺口降级为**存疑**(至多极冷门条目,可不追)。
- **SOUVENIR(2000)**:是**竹内玛利亚**的现场盘,不算达郎 solo。
- **精选集长尾**:合辑类另有大量冷门再版盒装 / 廉价 best,本目录只跟踪主要精选。
- **封面**:4 张已于 2026-07 补齐(图源见 `../memo.md`)。

## 数据模型:Release → Edition → Disc

- **Release** — 一张逻辑专辑,带 `year`(首版年代)、`category`(studio / live / compilation;单曲/合作盘用其它值,前端归入 All)。
- **Edition** — 同一发行的不同版本/再版(如 `1986 · Air` / `2002 · BMG`)。**默认展开最新版**。
- **Disc** — 一个版本内的物理碟(多 CD,或正片 + live bonus)。
- 主键 `id` = 默认版本第 1 碟的 album id,可直接拼流媒体/封面 URL。

## 分类文件

| 文件 | 内容 |
|---|---|
| [studio-albums.md](./studio-albums.md) | 录音室专辑 + 无伴奏翻唱系列(含收录状态) |
| [compilations.md](./compilations.md) | 精选集 / Best / 稀有曲集(含收录状态) |
| [live-albums.md](./live-albums.md) | 现场专辑(含收录状态) |
| [reissues-and-editions.md](./reissues-and-editions.md) | 多版本(再版)与多碟结构 |
| [singles.md](./singles.md) | 完整单曲(53 张)收录缺口分析 |
| [recent-releases.md](./recent-releases.md) | 近年单曲/主题曲/单曲再版 |
| [collaborations.md](./collaborations.md) | 乐队/合作盘(Pacific、Niagara Triangle、Sugar Babe)+ 私盤/误归属消歧义 |
| [imports/](./imports/) | 导入日志 + 可复用脚本(importer.py / add_covers.py) |

## 补数据流程(来自 AGENTS.md)

补入缺失发行:先进后端 `migrations/`——`releases` 加行、`albums` 挂 `release_id / edition_id / disc_number / recording`、`songs`/`covers` 各行 + 传 R2(key=`<encoded_filename>.<ext>`),再 `revalidateTag('albums')` 或重部署前端刷新缓存。实操脚本见 `imports/importer.py`(本批用它导入)。

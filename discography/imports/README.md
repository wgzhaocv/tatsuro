# 导入日志 · Import Log

后端(Cloudflare D1 + R2)加数据是**离线操作**(worker 只读无上传接口)。这里存**可复用脚本 + 每批导入记录**。当前状态永远以 D1 为准,`../README.md` 为对外真相;本文件只记「哪天导了什么」。

| 文件 | 作用 |
|---|---|
| `importer.py` | 批量导入器:FLAC→opus 256k(多核并行)、生成 id/encoded_filename、传 R2、灌 D1。`plan` 出计划、`apply` 执行 |
| `add_covers.py` | 封面工具:下载/上传封面到 R2 + 回填 `cover_front_id` |

## 批次记录

### batch-01 — 2026-07-13 ✅

从 `~/Downloads/added` 导入 **114 首**(FLAC→opus 256k),R2 +~0.93 GB,releases 25→31:

- **6 张新 Release**:Sonorite / Come Along 3(year=2017)/ Pacific(`studio`)/ Sync of Summer(`single`)/ Christmas Eve 2018(`single`)/ Christmas Eve 2025(`single`)
- **3 个新默认 Edition**:Artisan `2021·Moon` / Big Wave `2014·Moon` / Pocket Music `2020·Moon`
- **Opus** 补第 4 碟 `Bonus Disc`(→ 4CD)
- **5 张 relabel**(非导入):Circus Town / Spacy / Go Ahead! / Moonglow / For You —— 逐首歌名比对确认后端现有版本**本就是 2002 BMG**,故不重复导入,只把 `edition_label` 改成 `2002 · BMG`
- 校验:每张 D1 曲数 = 源 FLAC 数(无漏),songs 405→519,一首 Sonorite `/stream/new_play` HTTP 200

### covers — 2026-07-13 ✅

- 补 4 张此前无封面的 Release(Pacific / CE2018 / CE2025 / Sync of Summer)
- 替换 11 张低质封面(Spacy / Melodies / Joy / Pocket Music / OTSC 1·2 / Come Along II / Season's Greetings / Softly / Sync of Summer / CE2025)——用**新 R2 key** 绕过 `immutable` 缓存,旧图已删

### batch-02 · Let It Be Me — 2026-07-13 ✅

- 从 mora 下的 FLAC 导入 **Let It Be Me**(2016,达郎 & 竹内玛利亚配信限定单曲,无 CD)
- 1 首 → opus 256k;封面用 **FLAC 内嵌图**(1440×1440,优于网上 640×640)提取
- 建为 `category='single'` 单曲 Release;releases 31→32,songs 519→520;播放/出图均 HTTP 200

## 遗留(用户侧)

- 前端重部署(`revalidateTag` 或重建)后新专辑/封面才在网格显示——后端 API 直连已是新数据。
- 待入库:On the Street Corner 3(已购在途)、オノマトペISLAND(已购在途);到手按新批次导入,即官方全收。

## 复现要点

R2 key = `<encoded_filename>.<ext>`(音频 opus、封面 jpg);`id`=16 位数字串、`encoded_filename`=9 位随机串,都不透明,新增随机生成 + 查重。多版本设默认改 `releases.default_edition_id`。详见 `importer.py`。

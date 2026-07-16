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

### flac-backfill → 本地无损库 → R2 复原 — 2026-07-15 ✅

发现**最初的旧服务器→Cloudflare 迁移只搬了 opus,flac 全部留在旧机**(R2 迁移后 flac 对象数=0)。经过一轮探索后定案:**R2 保持纯 opus,flac 只做本地无损归档**。

- `flac_backfill.py`:曾给 10 张新专辑(batch-01)回填 114 个 flac 进 R2 + 加 `songs.flac_encoded_filename` 列(migration 0008)+ 改 `/stream/download` 有 flac 下 flac。**后已复原**:114 个 R2 flac 全删、列清回 NULL、下载回退 opus。migration 0008/schema/路由代码保留(列 NULL 时恒走 opus,将来想再上 flac 直接回填)。
- `flac_library.py`:构建**全库本地无损库** `~/Downloads/tatsuro-flac`(13 GB)。以新模型(D1)为权威结构,`年份 - 名字 [版本]`,多 CD 分 `CD{n}`,每张 front/back.jpg。flac 来源:114 新歌本地 `~/Downloads/added` + 405 老歌走 **opi 旧 API**(`http://192.168.0.106:8091/player_api`,旧 albumId==新 album_id,`/music/album_songs/:id`→downloadId→`/stream/download`)+ Let It Be Me 走 mora 本地。**508/520 首**入库(魔数全过、逐专辑曲数比对一致)。
- **数据损坏(已修复)**:opi `/home/zwg/storage/` 上 **Cozy(1998)track 04-15 共 12 个 flac 是 0 字节**(其余全库无损坏)。已用用户备份 `~/Downloads/cozy/1st`(AccurateRip 校验的 EAC rip)补齐 Cozy 全 15 首,时长逐首吻合。**本地库现 520/520 齐全**。

### batch-03 · オノマトペISLAND／MOVE ON — 2026-07-16 ✅

2025 双 A 面单曲(`~/Desktop/山下達郎 - オノマトペISLAND／MOVE ON`)。脚本 `add_single_onomatope.py`(plan/apply)。

- **6 首**:オノマトペISLAND / MOVE ON / Santé + 3 首 KARAOKE。**复用文件夹里已转好的 `opus/`**(259k=libopus 256k,时长逐首吻合,未重转)。
- 建 `category='single'` release(id=7167079766655044)+ album + 6 songs + 2 covers(front=オノマトペISLAND.jpg 1200²,back=moveon.jpg)。releases 32→33,重算 sort。
- 验证:D1 6 曲、流播 opus 200、封面 200。**flac 已归档** `~/Downloads/tatsuro-flac/2025 - オノマトペISLAND／MOVE ON [Standard]/`(库 520→526)。

### edition-zip · 按版本 m4a 下载 — 2026-07-16 ✅

给每个 edition 做「点击下载整版 m4a」。脚本:`transcode_aac.py`(flac→aac_at,做了 256/192/128 三档本地库 `~/Downloads/tatsuro-aac{256,192,128}`)、`zip_upload.py`(plan/apply,按 edition 打 zip→R2→回填 D1 指针)、`r2_put.py`(S3 PutObject,传超 wrangler 300MiB 上限的大文件)、`r2_size.py`(S3 ListObjectsV2 求真实用量)。

- 选定 **192k**(近乎透明、通用、3.4GB 能进 R2 免费额度)。每个 edition 一个 zip(存储模式,含各碟 m4a + front/back.jpg),**38 editions = 38 zip**。
- D1:migration 0009 给 `albums` 加 `zip_encoded_filename` + `zip_size`(写在 edition 第1碟行);R2 传 `<enc>.zip`;后端 `/music/edition_zip/:editionId` 下发(Content-Disposition 带「名 [版本].zip」);`/music/release/:id` 每个 edition 加 `download:{editionId,size}`。前端读它显示按钮(本地开发接)。
- **Opus 4CD zip=341MiB 超 wrangler 300MiB 上限** → 用 `r2_put.py`(S3,写 token)单独传。其余 37 个 wrangler 传。
- 验证:Sonorite / Opus 下载均 200 + `PK` 魔数 + 正确文件名。**R2 现 9.20GB/10GB,真实剩余仅 ~0.8GB**(近满,后续加专辑要留意)。凭据见 [[local-flac-library]]。

### batch-04 · On the Street Corner 3 — 2026-07-16 ✅

最后一张缺口专辑(`~/Desktop/山下達郎 - ON THE STREET CORNER 3 (1999)`)。脚本 `add_otsc3.py`(plan/apply,单发行全流程:归档 flac→本地库 + 转 aac192 + 打 zip + 灌 R2/D1)。

- **12 首**无伴奏翻唱。**复用文件夹里已转好的 `opus/`**(实测 250k=libopus 256k,未重转)。歌名从源全大写转**标题式**对齐 OTSC 1/2(如 `01 - Dedicated to the One I Love`)。
- 建 `category='studio'` release(id=`7958071825351962`)+ album(front=源封面 1082²、back=用户另找 1055×1080)+ 12 songs。releases 33→34,重算 sort。
- **同批做了下载 zip**:aac192(aac_at,front.jpg 内嵌)→ `~/Downloads/tatsuro-aac192/`,打 Stored zip(51.9MB/54.4M bytes)→ R2,`albums.zip_encoded_filename`+`zip_size` 指针挂上(和 edition-zip 批一致)。
- 验证:D1 12 曲、流播 opus 200、封面 200、`/music/edition_zip` 200(54413336 bytes 吻合)、release API `originalName` 正确。**flac 已归档** `~/Downloads/tatsuro-flac/1999 - On the Street Corner 3 [Standard]/`(库 526→538)。
- R2:15 对象 +117MB → **约 9.32GB/10GB**(剩 ~0.68GB,近满)。凭据见 [[local-flac-library]]。

**至此官方作品 100% 收全。**

## 遗留(用户侧)

- 前端重部署(`revalidateTag('albums')` 或重建)后新专辑/封面才在网格显示——后端 API 直连已是新数据。
- 缺口已清零(见 batch-04)。R2 近满(~0.68GB),后续若再加内容需先腾空间或扩容。

## 复现要点

R2 key = `<encoded_filename>.<ext>`(音频 opus、封面 jpg);`id`=16 位数字串、`encoded_filename`=9 位随机串,都不透明,新增随机生成 + 查重。多版本设默认改 `releases.default_edition_id`。详见 `importer.py`。

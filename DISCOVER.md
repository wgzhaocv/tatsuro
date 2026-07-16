# Discover — 内容底稿(未实现)

> Discover 页的**策展内容草案 + 结构定案**,不是已落地功能。实现见 [ROADMAP.md](./ROADMAP.md) Backlog #9。
> 页面结构 2026-07-16 与站主定案(见下「结构」):**只做 ① 权威推荐 + ② 开车两区**,站长个人精选区已砍掉(站主本人非公众人物、不署私人品味)。
> **曲目已全部跑 `/music/search-index`(33 releases / 526 首)对库核对 —— ① + ② 所有曲目全部命中,零缺失**(连极新单曲 REBORN / MOVE ON / アトムの子 都在库里,原先"新曲可能没有"的担心是多余的)。各区里标了要换/存疑/版本选择的少数几首。
> 名字用库里的原始拼写(旧专辑 romaji、新专辑日文),方便实现时映射到 songId。

---

## 前提(决定了整页怎么设计)

1. **达郎不上流媒体订阅制**(Spotify / Apple Music 都没有他),官方只有 **YouTube 频道**——他出了名地反订阅制。所以"达郎歌单"这件事没有官方/算法的心情歌单可抄,网上要么是 YouTube 混音/メドレー,要么是挂他名其实混编同风格 city pop(放的多是别人的歌)。**"谁选的"就是价值本身**,私享歌迷站尤其如此。
2. **官方精选合集(Opus / Treasures / Greatest Hits)不进 Discover**——它们已在首页专辑网格里能浏览,重复。Discover 只放**网格里没有的策展清单**。
3. **命名/诚实律**:整页叫 **Discover**(逛的入口)没问题,但**权威归权威、站长归站长**,靠区块标题 + 每张卡署真实出处分清楚,绝不让站主的私人品味冒充官方/达郎本人的分类。
4. **~~Come Along = 达郎自选兜风精选~~ ❌ 错误,已删**:查证下来 Come Along 起源是 1979 年 RVC 唱片公司做的**店头播放促销 LP**,达郎本人当初还相当抗拒把它当正式作品发行。它**不是**达郎自选的,不能作为"艺人认证的情境策展"依据。
5. **时效钩子**:2026 = 山下达郎 **solo 出道 50 周年**(楽天 / TOKYO FM 都在做纪念特集),①区可用作起手由头。

---

## 结构:两区

Discover = **一墙"明信片"**(呼应 The Noon Postcard:每张合集 = 一种气候/时刻/视角),两区:

- **① 权威推荐 · Editors' Picks** — 别人(权威个人/组织)做的策展清单,每张卡角落**署真实出处 + 外链**。
- **② 开车 · For the Road** — 长途 Mix(60+ 分),全程中高能量、零慢板,repeat-all 天然循环。站主专门点名的场景。

> **砍掉的「③ 站长精选」**:原本想放站主自选的情绪明信片(真夏の海辺 / 都会の夜 …)。站主拍板不做——本人非公众人物、不想用私人品味署名担保。心情策展这件事既然没有达郎官方/权威背书,就不硬做。Discover 只放"别人做的权威清单"和"实用场景(开车)",诚实、干净。(那批情绪明信片曲目若将来想要,git 历史里可捞回。)

---

## ① 权威推荐(Editors' Picks)

> **曲目已对库核对,全部命中。** 每家角度和深轨不同(头部金曲会撞,但切入点各异),放 3–4 张不打架。
> **版本选择**(同 ②):很多曲只在精选/现场碟上(如「雨は手のひらにいっぱい」仅 Opus、「DOWN TOWN」仅 Joy 现场/Opus、「メリー・ゴー・ラウンド」Joy 现场/Melodies)——映射时优先录音室原版,无录音室版的用精选版,别误取 Karaoke/Live。

### 🗓️ 50 周年 · 一路走来 — 编年入门
*一时期一首代表作,从 1975 走到今天。新歌迷从这进。*
**来源:Audio-Technica「あらためて聴きたい山下達郎の名曲10選」**(编年格式)
雨は手のひらにいっぱい(SONGS/75)· WINDY LADY(CIRCUS TOWN/76)· LOVE SPACE(SPACY/77)· PAPER DOLL(GO AHEAD!/78)· DAYDREAM(RIDE ON TIME/80)· SPARKLE(FOR YOU/82)· メリー・ゴー・ラウンド(MELODIES/83)· 風の回廊(POCKET MUSIC/86)· 新・東京ラプソディー(僕の中の少年/88)· さよなら夏の日(ARTISAN/91)
> 来源:https://www.audio-technica.co.jp/always-listening/articles/tatsuro-yamashita-best/

### 🌐 海外之耳 — 城市流行之神
*西方 city pop 复兴视角,专辑级经典。给"从复兴认识他"的人。*
**来源:AFTER 5「Tatsurō Yamashita, the god of City-Pop」**(专辑级,需从这几张各取招牌曲)
Moonglow(79)· Ride on Time(80)· For You(82)· Softly(22) 各取代表曲 → 待定曲目:Ride on Time · Sparkle · Love Talkin' · Bomber · …(实现时从这几张专辑挑)
> 来源:https://after5.fr/en/2023/city-pop/tatsuro-yamashita-god-of-city-pop/

### 💿 乐迷私藏 Top — Come Along Radio
*深度乐迷榜,情感/私人向,挖冷门深轨(蒼氓等),不只金曲。*
**来源:COME ALONG RADIO「My Top 20 Tatsuro Yamashita Songs」**(个人博客)
蒼氓 · Someday(いつか)· Circus Town · 僕らの夏の夢 · Bomber · Ride on Time · メリー・ゴー・ラウンド · The Theme from Big Wave · 高気圧ガール · …
> 来源:https://comealongradio.blogspot.com/2021/10/my-top-20-tatsuro-yamashita-songs-part-1.html

### 🏆 人气投票 Top — 大众票选交集
*纯人气,各大排行/卡拉OK 榜的头部交集。国民认知度。*
**来源:RAG Music 人気曲ランキング / みんなのランキング(134 首投票)/ JOYSOUND 卡拉OK 榜**
クリスマス・イブ · RIDE ON TIME · SPARKLE · FOREVER MINE · 高気圧ガール · LOVELAND, ISLAND · DOWN TOWN · さよなら夏の日 · …
> 来源:https://ranking.net/rankings/best-tatsuroyamashita-songs · https://www.ragnet.co.jp/ranking-yamashita-tatsuro-songs

### (备选)🎁 楽天音乐 名曲セレクション
*50 周年 + 季节感 + 较新单曲,别家不收的新曲(REBORN / MOVE ON)。*
**来源:楽天ミュージック「山下達郎 名曲セレクション」**
CIRCUS TOWN · SPARKLE · LOVELAND, ISLAND · クリスマス・イブ · さよなら夏の日 · アトムの子 · REBORN · Sync of Summer · MOVE ON
> 注:全部命中——REBORN(Softly)/ MOVE ON(オノマトペISLAND／MOVE ON 单曲)/ Sync of Summer(同名单曲)库里都有。
> 来源:https://music.rakuten.co.jp/column/archive/14/

> **其他可引权威(未取完整曲单)**:MUSIC MAGAZINE 2022年7月号 特集 / レコード・コレクターズ(印刷乐评特集,可当背书引用);サンデー・ソングブック(达郎自己的电台,但放的是老歌 oldies、非他曲库,只借"DJ 气质"精神,不作歌单)。

---

## ② 开车 · For the Road(长途 Mix / 循环)

> 全程中高能量、**零慢板抒情**(潮騒/Fragile/情歌全部剔除,防止开车犯困)。时长按库里真实音频算,搭 repeat-all = 天然一小时循环。**曲目已跑 search-index 对库核对,全部命中。**
>
> **核对 + 风格审查结论(2026-07-16,已应用到上面曲目):**
> - **已换(慢板/犯困)**:`Lady Blue`(B,慢板 soul)→ **Your Eyes**;`Merry-Go-Round`(C,6分+厚重、且是宏大伤感大抒情,与"明亮夏日"双重不符)→ **素敵な午後は**。
> - **已换(风格违和)**:`踊ろよ、フィッシュ`(B)= 俏皮蹦跳番外曲,与夜巡"洗练色っぽい"不搭 → **Daydream**(Ride on Time,smooth 夜 groove)。
> - **已换(数据存疑)**:`Every Night`(C)——库里对应行名字错标成 "WINDY LADY"(挂 For You,但 Windy Lady 实为 Circus Town 曲) → **Dreaming Girl(夢みる少女)**。顺带回头让后端核对那条错标。
> - **留着但知悉**:`恋のブギ・ウギ・トレイン`(热闹 boogie、且仅 Joy 现场版)、`Boomerang Baby`(Cozy 期流行摇滚)——对"洗练夜巡"略偏,但不违和,保留以免 Mix 削太薄。
> - **版本选择**:`Down Town` / `恋のブギ・ウギ・トレイン` 库里**只有 Live 版(Joy 现场)**,进单会带现场氛围/前奏;`Daydream` 也在 ① 编年卡出现(跨合集重复,可接受)。其余多版本曲映射**优先录音室原版**,别误取 Live / Karaoke。
> - **跨单重复**:`Get Back in Love` 在 A、B 都有(见 C 末注),嫌重从 B 拿掉。
> - 轻度 mellow 但可留:`Blue Midnight` / `Morning Glory` / `僕らの夏の夢`(不算 ballad,氛围成立)。

### 🚗 A · Daylight Highway — 白昼高速 · 16 首 · **78 分**
*最快最亮,放克+夏日,长途最顶。*
Sparkle · Ride on Time · Bomber · Let's Dance Baby · Solid Slider · Funky Flushin' · Dancer · Magic Ways · Koukiatsu Girl · Down Town · Hot Shot · Loveland, Island · Paper Doll · Get Back in Love · Sprinkler · Love Celebration
> 想卡到 **59 分**:砍掉 Solid Slider(7:10)+ Hot Shot(5:53)+ Funky Flushin'(5:42)。

### 🌆 B · Night Cruise — 夜巡 · 14 首 · **63 分**
*夜里开车,都会律动,洗练但不困。*
Amaku Kiken na Kaori · Mermaid · Love Talkin' · Shin Tokyo Rhapsody · Groovin' · Koi no Boogie Woogie Train · Space Crush · Blue Midnight · Yashou · Jungle Swing · Your Eyes · Get Back in Love · Boomerang Baby · Daydream

### 🏝️ C · Endless Summer — 无尽夏 · 16 首 · **68 分**
*海边兜风,明亮不燥,新老夏日曲。*
Cheer Up! The Summer · Sync of Summer · Natsu e no Tobira · My Sugar Babe · Girls on the Beach · The Theme from Big Wave · Bokura no Natsu no Yume · Music Book · Morning Glory · Suteki na Gogo wa(素敵な午後は)· Doyoubi no Koibito · Dreaming Girl(夢みる少女)· Candy · Tsuite Oide(ついておいで)· Love's on Fire · Southbound #9

> `Get Back in Love` 在 A、B 都有(长歌单交叠无妨,嫌重从 B 拿掉)。

---

## 待定(实现前拍板)

1. **① 权威区放哪几张**:候选 5 张(50周年编年 / 海外之耳 / 乐迷私藏 / 人气投票 / 楽天备选)——全上还是挑 3–4 张。
2. ~~**① 曲目对库核对**~~ ✅ 已核对(2026-07-16),①②全部命中零缺失。剩下的是实现时逐首选定 songId + 版本(见各区版本选择注)。
3. **明信片封面形态**(整墙视觉重量):某张专辑封面裁片 / 海景照片裁片 / 纯色 + 大字标题。**未定。**
4. **合集数据形态**:静态住仓库(编辑部策展,不进用户 localStorage 歌单 store),`/discover` 铺墙 + `/discover/[slug]` 详情,`contextId = discover:{slug}`,复用 `components/track/` 播放上下文;每首可 like / 加入自己歌单。
5. ~~**② 开车待处理**~~ ✅ 已处理(2026-07-16):Lady Blue→Your Eyes、踊ろよフィッシュ→Daydream(B)、Merry-Go-Round→素敵な午後は、Every Night→Dreaming Girl(C)。
6. **长 Mix 是否再加一张**(如纯放克)。

## 待办(实现,后面找时间)

- 导航点亮:`components/home/home-nav.tsx` + `components/bottom-nav.tsx` 里 `discover` 现为 `aria-disabled` 占位,加 `/discover` href(Compass 图标已在 bottom-nav 备好)。
- 三语 i18n:区块标题 / 卡片名 / 出处署名补 `messages/{en,ja,zh}.json`。
- 权威卡的"出处 + 外链"署名 UI(深水律,朴素功能性)。

# Discover — 内容底稿(未实现)

> Discover 页的**策展内容草案**,不是已落地功能。实现见 [ROADMAP.md](./ROADMAP.md) Backlog。
> 曲目全部**对着真实库核对过**(32 releases / 439 首,`/music/releases` + `/music/release/:id`),这里列的每首库里都有、能播。
> 名字用库里的原始拼写(旧专辑 romaji、新专辑日文),方便实现时映射到 songId。

## 形态:两类内容

Discover = **一墙"明信片"**(呼应 The Noon Postcard 设计系统:每张合集 = 一种气候/时刻/心情)。内容分两种,都保留:

- **情绪明信片(短)** — 10–13 首,用来**逛**、挑心情。
- **长途 Mix(长)** — 60+ 分钟,用来**开车/循环**(repeat-all),全程中高能量、**零慢板**,避免开车犯困。

策展方式倾向**纯手工选曲**(库就 300 来首、合集就十几张,一次选完;私享站手选的品味感正是价值)。达郎本人就这么分——`Come Along` 系列 = 他自选的兜风精选,`Cheer Up! The Summer` / `Sync of Summer` = 专门的夏日单曲,按情绪/季节聚类是艺人认证的玩法。

---

## 一、情绪明信片(短歌单)

### 🌊 Peak Summer, Seaside — 真夏の海辺
*摇下车窗、海风、闪耀。*
Sparkle · Ride on Time · Loveland, Island · Koukiatsu Girl(高気圧ガール)· Magic Ways · Girls on the Beach · The Theme from Big Wave · Natsu e no Tobira(夏への扉)· My Sugar Babe · Cheer Up! The Summer · Sync of Summer · Bokura no Natsu no Yume(僕らの夏の夢)· Cosmic Surfin'

### 🕺 Feel Like Dancing — 踊りたい夜
*纯律动/放克,不管心情只管身体。*
Bomber · Let's Dance Baby · Solid Slider · Funky Flushin' · Dancer · Down Town · Hot Shot · Koi no Boogie Woogie Train(恋のブギ・ウギ・トレイン)· Sprinkler · Groovin' · Get Back in Love · Love Celebration

### 🌃 City Night — 都会の夜
*霓虹、深夜高架、色っぽい。*
Amaku Kiken na Kaori(甘く危険な香り)· Mermaid · Lady Blue · Blue Midnight · Yashou(夜想 / Night-Fly)· Windy Lady · Love Talkin' · Shin Tokyo Rhapsody(新・東京ラプソディー)· Tokyo's a Lonely Town · Misty Mauve · Secret Lover · Moonlight · Juujiro(十字路)

### ☕ Sunlit Afternoon — 午後の陽だまり
*慵懒、明亮、周末白天。都会感里的"日"。*
Suteki na Gogo wa(素敵な午後は)· Morning Glory · Music Book · Doyoubi no Koibito(土曜日の恋人)· Merry-Go-Round · Ashioto(足音)· Candy · Touch Me Lightly · Kaze no Corridor(風のコリドー)· Hitotoki(ひととき)· Every Night

### 🍂 The End of Summer — 夏の終わり
*换季、金色、怅惘。比笼统"低沉"精准。*
Sayonara Natsu no Hi(さよなら夏の日)· Soubou(蒼氓)· Natsu no Collage(夏のコラージュ)· Samui Natsu(寒い夏)· Kumo no Yuku e ni(雲のゆくえに)· Yoru no Tsubasa(夜の翼)· Kanashimi no Jody(悲しみのジョディ)· Silent Screamer · Guess I'm Dumb

### 🌙 Quiet Night — 静かな夜
*内省、退潮、一个人。*
Shiosai(潮騒)· Tokiyo(時よ)· Fragile · Heron · Tsuki no Hikari(月の光)· Mokusou(黙想)· 2000 Ton no Ame(2000トンの雨)· Kataomoi(片想い)· Oyasumi(おやすみ)· Human · Itsuka Hareta Hi ni(いつか晴れた日に)

### 💗 Love Songs — 恋のうた
*温柔情歌。ずっと一緒さ 是主心骨。*
Zutto Issho sa(ずっと一緒さ)· Itsuka(いつか / Someday)· Futari(二人)· Only with You · Forever Mine · Kimi no Koe ni Koishiteru(君の声に恋してる)· Wasurenaide(忘れないで)· Mighty Smile(魔法の微笑み)· Propose(プロポーズ)· My Gift to You

### ❄️ Winter & Christmas — 冬とクリスマス
*引流位:クリスマス・イブ 全球最有名。*
Christmas Eve(クリスマス・イブ)· White Christmas · Christmas Eve (English) · Bella Notte · Silent Night · Have Yourself a Merry Little Christmas · Smoke Gets in Your Eyes · Blue Christmas · My Gift to You · Koori no Manicure(氷のマニキュア)· Gunjou no Honoo(群青の炎)

### 🎤 Late-Night Doo-wop — (可选/小众)
*无伴奏老歌翻唱(On the Street Corner 1&2)。特别但偏窄。*
So Much in Love · My Memories of You · Chapel of Dreams · You Belong to Me · Close Your Eyes · Spanish Harlem · Ten Commandments of Love

---

## 二、长途 Mix(开车 / 循环)

> 全程中高能量、**零慢板抒情**(潮騒/Fragile/情歌全部剔除,防止开车犯困)。时长按库里真实音频算,搭 repeat-all = 天然一小时循环。

### 🚗 A · Daylight Highway — 白昼高速 · 16 首 · **78 分**
*最快最亮,放克+夏日,长途最顶。*
Sparkle · Ride on Time · Bomber · Let's Dance Baby · Solid Slider · Funky Flushin' · Dancer · Magic Ways · Koukiatsu Girl · Down Town · Hot Shot · Loveland, Island · Paper Doll · Get Back in Love · Sprinkler · Love Celebration
> 想卡到 **59 分**:砍掉 Solid Slider(7:10)+ Hot Shot(5:53)+ Funky Flushin'(5:42)。

### 🌆 B · Night Cruise — 夜巡 · 14 首 · **63 分**
*夜里开车,都会律动,洗练但不困。*
Amaku Kiken na Kaori · Mermaid · Love Talkin' · Shin Tokyo Rhapsody · Groovin' · Koi no Boogie Woogie Train · Space Crush · Blue Midnight · Yashou · Jungle Swing · Lady Blue · Get Back in Love · Boomerang Baby · Odoro yo, Fish(踊ろよ、フィッシュ)

### 🏝️ C · Endless Summer — 无尽夏 · 16 首 · **68 分**
*海边兜风,明亮不燥,新老夏日曲。*
Cheer Up! The Summer · Sync of Summer · Natsu e no Tobira · My Sugar Babe · Girls on the Beach · The Theme from Big Wave · Bokura no Natsu no Yume · Music Book · Morning Glory · Every Night · Doyoubi no Koibito · Merry-Go-Round · Candy · Tsuite Oide(ついておいで)· Love's on Fire · Southbound #9

> `Get Back in Love` 在 A、B 都有(长歌单交叠无妨,嫌重从 B 拿掉)。

---

## 待定(实现前拍板)

1. **策展方式**:纯手工选曲(倾向)/ 后端给歌打 mood 标签自动聚 / 混合。手工最准但要站主定稿每首;标签能自动纳新歌但要 D1 加字段。
2. **明信片封面**:某张专辑封面裁片 / 海景照片裁片 / 纯色 + 大字标题。决定 discover 页视觉重量。
3. **可播 + 可离线**:一张合集点进去即可播放的歌单(接 Backlog「歌单 #5」)+ 可"下载离线"跑长途(接 Backlog「PWA + 主动缓存 #8」)才闭环。
4. 长 Mix 是否再加一张(如纯放克)。

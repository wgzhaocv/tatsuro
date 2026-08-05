#!/usr/bin/env python3
"""Add SUGAR BABE — Songs (1975, 2025 50th Anniversary Edition, 2CD).

Assets already exist locally (ripped + transcoded in this session), so unlike
add_otsc3.py this script does no ripping/transcoding — it stages and ingests:
  - opus 256k  ~/Downloads/tatsuro-flac/<folder>/opus/CD{1,2}
  - aac192 zip ~/Downloads/tatsuro-aac192-zip/<folder>.zip
  - front.jpg  <folder>/front.jpg           (no back cover exists for this title)

Emits D1 sql: 1 cover, 1 release, 2 albums (discs), 33 songs, sort recompute.
Disc rows follow the It's a Poppin' Time shape: release_id == edition_id ==
disc-1 album id, zip pointer on the disc-1 row only.

plan  -> build sql + manifest, no prod writes
apply -> upload to R2, apply sql to D1, verify counts
"""
import os, json, random, string, subprocess, shutil, sys, concurrent.futures

FOLDER = "1975 - Songs [2025 · 50th Anniversary]"
LIB    = os.path.expanduser(f"~/Downloads/tatsuro-flac/{FOLDER}")
ZIP    = os.path.expanduser(f"~/Downloads/tatsuro-aac192-zip/{FOLDER}.zip")
FRONT  = os.path.join(LIB, "front.jpg")
SCR    = ("/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro"
          "/fed79f0c-6ce2-4d24-87ad-0008d41702d0/scratchpad")
STAGE  = f"{SCR}/songs50_upload"
CFG    = "/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME = "yamashita-tatsuro"
BUCKET = "yamashita-tatsuro"
SQLF   = f"{SCR}/songs50.sql"
MAN    = f"{SCR}/songs50_manifest.json"

REL_NAME      = "Songs"
YEAR          = 1975          # original release era
EDITION_LABEL = "2025 · 50th Anniversary"
EDITION_YEAR  = 2025
CATEGORY      = "studio"

# (name_ja, name_en) per disc, in track order. name_en follows the library's
# wapuro-Hepburn convention (Joou / Juujiro / Doyoubi), katakana loanwords
# rendered as the English word (cf. "Kaze no Corridor", "Dreaming Day").
DISCS = [
    dict(disc=1, title="1975 Original Edition", recording="studio", tracks=[
        ("SHOW",                          "SHOW"),
        ("DOWN TOWN",                     "DOWN TOWN"),
        ("蜃気楼の街",                     "Shinkirou no Machi"),
        ("風の世界",                       "Kaze no Sekai"),
        ("ためいきばかり",                 "Tameiki Bakari"),
        ("いつも通り",                     "Itsumo Doori"),
        ("すてきなメロディー",             "Suteki na Melody"),
        ("今日はなんだか",                 "Kyou wa Nandaka"),
        ("雨は手のひらにいっぱい",         "Ame wa Tenohira ni Ippai"),
        ('過ぎ去りし日々 "60\'s Dream"',   'Sugisarishi Hibi "60\'s Dream"'),
        ("SUGAR",                         "SUGAR"),
        ("夏の終りに (Demo)",              "Natsu no Owari ni (Demo)"),
        ("パレード (Demo)",                "Parade (Demo)"),
        ("SHOW (Demo)",                   "SHOW (Demo)"),
        ("指切り (Demo)",                  "Yubikiri (Demo)"),
        ("WINDY LADY (Live)",             "WINDY LADY (Live)"),
        ("DOWN TOWN (Live)",              "DOWN TOWN (Live)"),
        ("愛は幻 (Live)",                  "Ai wa Maboroshi (Live)"),
        ("今日はなんだか (Live)",          "Kyou wa Nandaka (Live)"),
    ]),
    dict(disc=2, title="Tatsuro Yamashita Sings Sugar Babe Live", recording="live", tracks=[
        ("SHOW",                          "SHOW"),
        ("指切り",                         "Yubikiri"),
        ("WINDY LADY",                    "WINDY LADY"),
        ("ラスト・ステップ",               "Last Step"),
        ("ドリーミング・デイ",             "Dreaming Day"),
        ('過ぎ去りし日々 "60\'s Dream"',   'Sugisarishi Hibi "60\'s Dream"'),
        ("こぬか雨",                       "Konuka Ame"),
        ("雨は手のひらにいっぱい",         "Ame wa Tenohira ni Ippai"),
        ("SUGAR",                         "SUGAR"),
        ("今日はなんだか",                 "Kyou wa Nandaka"),
        ("DOWN TOWN",                     "DOWN TOWN"),
        ("パレード",                       "Parade"),
        ("ココナツ・ホリデー",             "Coconut Holiday"),
        ("MY SUGAR BABE",                 "MY SUGAR BABE"),
    ]),
]

rnd = random.Random(19750425)
ALPH = string.ascii_letters + string.digits


def d1(sql):
    r = subprocess.run(["wrangler", "d1", "execute", DBNAME, "--remote", "--config", CFG,
                        "--json", "--command", sql], capture_output=True, text=True)
    if r.returncode != 0:
        print("D1 ERR:", r.stderr[-400:]); sys.exit(1)
    out = r.stdout[r.stdout.index("["):]
    return json.loads(out)[0]["results"]


def S(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"


def ffdur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", p], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)


def opus_path(disc, n, name_ja):
    """opus filenames mirror the flac ones: 'NN - <ja title>.opus'."""
    d = os.path.join(LIB, "opus", f"CD{disc}")
    want = f"{n:02d} - "
    for f in sorted(os.listdir(d)):
        if f.startswith(want) and f.endswith(".opus"):
            return os.path.join(d, f)
    sys.exit(f"missing opus: CD{disc} track {n} ({name_ja})")


def plan():
    os.makedirs(STAGE, exist_ok=True)
    assert os.path.isfile(ZIP), f"missing zip: {ZIP}"
    assert os.path.isfile(FRONT), f"missing cover: {FRONT}"

    used_id = {x["id"] for x in d1(
        "SELECT id FROM releases UNION SELECT id FROM albums "
        "UNION SELECT id FROM songs UNION SELECT id FROM covers")}
    used_enc = {x["e"] for x in d1(
        "SELECT encoded_filename e FROM songs UNION SELECT encoded_filename FROM covers "
        "UNION SELECT zip_encoded_filename FROM albums WHERE zip_encoded_filename IS NOT NULL")}

    def new_id():
        while True:
            v = str(rnd.randint(7 * 10**15, 8 * 10**15 - 1))
            if v not in used_id:
                used_id.add(v); return v

    def new_enc():
        while True:
            v = "".join(rnd.choice(ALPH) for _ in range(9))
            if v not in used_enc:
                used_enc.add(v); return v

    aids = [new_id() for _ in DISCS]        # album (disc) ids; aids[0] == release id
    rel_id = edition_id = aids[0]
    cov_id, cov_enc = new_id(), new_enc()
    zip_enc, zip_size = new_enc(), os.path.getsize(ZIP)

    sql = [f"-- add SUGAR BABE — Songs ({YEAR}) {EDITION_LABEL}, 2CD"]
    uploads = []

    shutil.copyfile(FRONT, f"{STAGE}/{cov_enc}.jpg")
    uploads.append((f"{STAGE}/{cov_enc}.jpg", f"{cov_enc}.jpg", "image/jpeg"))
    sql.append(f"INSERT INTO covers (id,encoded_filename,extension) "
               f"VALUES ({S(cov_id)},{S(cov_enc)},'jpg');")

    sql.append(f"INSERT INTO releases (id,name,year,category,default_edition_id,sort) "
               f"VALUES ({S(rel_id)},{S(REL_NAME)},{YEAR},{S(CATEGORY)},{S(edition_id)},0);")

    shutil.copyfile(ZIP, f"{STAGE}/{zip_enc}.zip")
    uploads.append((f"{STAGE}/{zip_enc}.zip", f"{zip_enc}.zip", "application/zip"))

    listing = []
    for d, aid in zip(DISCS, aids):
        zcols = (f"{S(zip_enc)},{zip_size}" if d["disc"] == 1 else "NULL,NULL")
        sql.append(
            "INSERT INTO albums (id,name,cover_front_id,cover_back_id,release_id,edition_id,"
            "edition_label,edition_year,disc_number,disc_title,recording,zip_encoded_filename,"
            f"zip_size) VALUES ({S(aid)},{S(REL_NAME + ' - CD' + str(d['disc']))},{S(cov_id)},"
            f"NULL,{S(rel_id)},{S(edition_id)},{S(EDITION_LABEL)},{EDITION_YEAR},{d['disc']},"
            f"{S(d['title'])},{S(d['recording'])},{zcols});")
        for n, (ja, en) in enumerate(d["tracks"], 1):
            src = opus_path(d["disc"], n, ja)
            sid, enc = new_id(), new_enc()
            dur = ffdur(src)
            dst = f"{STAGE}/{enc}.opus"
            shutil.copyfile(src, dst)
            uploads.append((dst, f"{enc}.opus", "audio/ogg"))
            name = f"{n:02d} - {en}"
            sql.append(
                "INSERT INTO songs (id,name,album_id,encoded_filename,extension,duration,"
                f"mv_id,lyrics,favorite,name_ja,name_en) VALUES ({S(sid)},{S(name)},{S(aid)},"
                f"{S(enc)},'opus',{dur},'','',0,{S(ja)},{S(en)});")
            listing.append((d["disc"], n, ja, en, dur))

    existing = d1("SELECT id, year FROM releases")
    allrel = [(r["id"], r["year"] if r["year"] is not None else 9999) for r in existing] + \
             [(rel_id, YEAR)]
    allrel.sort(key=lambda x: (x[1], x[0]))
    for i, (rid, _) in enumerate(allrel, 1):
        sql.append(f"UPDATE releases SET sort={i} WHERE id={S(rid)};")

    open(SQLF, "w").write("\n".join(sql) + "\n")
    json.dump(dict(uploads=uploads, release_id=rel_id, album_ids=aids, cover_id=cov_id,
                   zip_enc=zip_enc, zip_size=zip_size,
                   counts=[len(d["tracks"]) for d in DISCS]),
              open(MAN, "w"), ensure_ascii=False)

    print(f"PLAN — {REL_NAME} ({YEAR}) · {EDITION_LABEL}")
    print(f"  release {rel_id}  category={CATEGORY}  edition={edition_id}")
    for d, aid in zip(DISCS, aids):
        print(f"  CD{d['disc']} album {aid}  «{d['title']}»  recording={d['recording']}")
    for disc, n, ja, en, dur in listing:
        print(f"    CD{disc} {n:02d}  {ja}   /   {en}   ({dur}s)")
    print(f"  cover {cov_enc}.jpg   zip {zip_enc}.zip ({zip_size/1024/1024:.1f} MB)")
    tot = sum(os.path.getsize(p) for p, _, _ in uploads)
    print(f"  uploads={len(uploads)}   R2 add ≈ {tot/1024/1024:.1f} MB ({tot} bytes)")
    print(f"  sort: {len(allrel)} releases renumbered; this one lands at "
          f"{[i for i,(r,_) in enumerate(allrel,1) if r==rel_id][0]}")
    print(f"  sql={SQLF} ({len(sql)} statements)")


def apply():
    man = json.load(open(MAN))
    uploads = man["uploads"]
    print(f"uploading {len(uploads)} objects to R2...")

    def put(job):
        p, key, ct = job
        r = subprocess.run(["wrangler", "r2", "object", "put", f"{BUCKET}/{key}", "--file", p,
                            "--remote", "--config", CFG, "--content-type", ct],
                           capture_output=True, text=True)
        return None if r.returncode == 0 else (key, r.stderr.strip()[:200])

    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for e in ex.map(put, uploads):
            if e:
                errs.append(e)
    print(f"upload done. errors={len(errs)}")
    for k, m in errs:
        print("  ERR", k, m)
    if errs:
        print("ABORT before D1."); sys.exit(1)

    print("applying sql to D1...")
    r = subprocess.run(["wrangler", "d1", "execute", DBNAME, "--remote", "--config", CFG,
                        "--file", SQLF], capture_output=True, text=True)
    if r.returncode != 0:
        print("D1 ERR:", r.stderr[-600:]); sys.exit(1)
    print(r.stdout[-200:])

    for aid, want in zip(man["album_ids"], man["counts"]):
        got = d1(f"SELECT COUNT(*) c FROM songs WHERE album_id='{aid}'")[0]["c"]
        print(f"verify: album {aid} songs = {got} (expect {want})")


if __name__ == "__main__":
    {"plan": plan, "apply": apply}[sys.argv[1]]()

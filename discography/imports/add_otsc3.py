#!/usr/bin/env python3
"""Add On the Street Corner 3 (1999) — the last missing official release.

Full pipeline for one studio release (single disc, a cappella covers):
  - archive flac into the local lossless library (title-cased names + front/back.jpg)
  - transcode aac192 (aac_at, front.jpg embedded) into ~/Downloads/tatsuro-aac192
  - build the per-edition download zip (Stored) into ~/Downloads/tatsuro-aac192-zip
  - stage opus (reuse pre-transcoded 256k) + 2 covers + 1 zip for R2
  - emit D1 sql: covers, release, album (with zip pointer), 12 songs, sort recompute

plan  -> do all local work (library/aac/zip), build sql + manifest, no prod writes
apply -> upload to R2, apply sql to D1, verify counts
"""
import os, re, json, random, string, subprocess, shutil, sys, zipfile, concurrent.futures

SRC    = "/Users/wenguang/Desktop/山下達郎 - ON THE STREET CORNER 3 (1999)"
FRONT  = os.path.join(SRC, "on the street corner 3.jpg")
BACK   = "/Users/wenguang/Downloads/on the street corner 3 back.jpg"
FOLDER = "1999 - On the Street Corner 3 [Standard]"      # efolder(year, name, label)
LIB    = os.path.expanduser(f"~/Downloads/tatsuro-flac/{FOLDER}")
AACDIR = os.path.expanduser(f"~/Downloads/tatsuro-aac192/{FOLDER}")
ZIP    = os.path.expanduser(f"~/Downloads/tatsuro-aac192-zip/{FOLDER}.zip")
SCR    = "/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/f658d177-d32c-4871-a040-89bd9b2077a2/scratchpad"
STAGE  = f"{SCR}/otsc3_upload"
CFG    = "/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME = "yamashita-tatsuro"
BUCKET = "yamashita-tatsuro"
SQLF   = f"{SCR}/otsc3.sql"
MAN    = f"{SCR}/otsc3_manifest.json"

REL_NAME = "On the Street Corner 3"
YEAR = 1999

# track number -> title-cased song title (source flacs are ALL CAPS; match OTSC 1/2 style)
TITLES = {
    1:  "Dedicated to the One I Love",
    2:  "Stand by Me",
    3:  "Gloria",
    4:  "Angel",
    5:  "Dream Girl",
    6:  "Their Hearts Were Full of Spring",
    7:  "Don't Ask Me to Be Lonely",
    8:  "Love You So",
    9:  "Love T.K.O.",
    10: "Why Do Fools Fall in Love",
    11: "Heavenly Father",
    12: "Love Can Go the Distance (Album Remix)",
}

rnd = random.Random(19990101)
ALPH = string.ascii_letters + string.digits

def d1(sql):
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--json","--command",sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("D1 ERR:", r.stderr[-400:]); sys.exit(1)
    return json.loads(r.stdout)[0]["results"]

def S(s): return "NULL" if s is None else "'"+str(s).replace("'","''")+"'"
def ffdur(p):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],
                       capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)

def tracks():
    """(tracknum, title, flac_path, opus_path) sorted by track number."""
    out = []
    for f in sorted(os.listdir(SRC)):
        if f.lower().endswith(".flac"):
            base = os.path.splitext(f)[0]
            n = int(re.match(r"^\s*(\d+)", base).group(1))
            out.append((n, TITLES[n], os.path.join(SRC, f), os.path.join(SRC, "opus", base + ".opus")))
    out.sort(key=lambda x: x[0])
    return out

def archive_flac(tks):
    os.makedirs(LIB, exist_ok=True)
    for n, title, flac, _ in tks:
        shutil.copyfile(flac, os.path.join(LIB, f"{n:02d} - {title}.flac".replace("/", "／")))
    shutil.copyfile(FRONT, os.path.join(LIB, "front.jpg"))
    shutil.copyfile(BACK,  os.path.join(LIB, "back.jpg"))
    bad = [f for f in os.listdir(LIB) if f.endswith(".flac") and open(os.path.join(LIB, f), "rb").read(4) != b"fLaC"]
    print(f"  library: {LIB}  flac={len([f for f in os.listdir(LIB) if f.endswith('.flac')])} bad_magic={len(bad)}")

def transcode_aac(tks):
    os.makedirs(AACDIR, exist_ok=True)
    def enc(job):
        n, title, flac, _ = job
        dst = os.path.join(AACDIR, f"{n:02d} - {title}.m4a".replace("/", "／"))
        if os.path.isfile(dst) and os.path.getsize(dst) > 1024: return None
        tmp = dst + ".tmp.m4a"
        cmd = ["ffmpeg","-hide_banner","-loglevel","error","-y","-i",flac,"-i",FRONT,
               "-map","0:a","-map","1:v","-c:a","aac_at","-b:a","192k",
               "-c:v","mjpeg","-disposition:v","attached_pic",tmp]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not os.path.isfile(tmp): return (dst, r.stderr.strip()[:160])
        os.replace(tmp, dst); return None
    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count() or 8) as ex:
        for e in ex.map(enc, tks):
            if e: errs.append(e)
    shutil.copyfile(FRONT, os.path.join(AACDIR, "front.jpg"))
    shutil.copyfile(BACK,  os.path.join(AACDIR, "back.jpg"))
    print(f"  aac192: {AACDIR}  m4a={len([f for f in os.listdir(AACDIR) if f.endswith('.m4a')])} errs={len(errs)}")
    for d, m in errs: print("    ERR", d, m)
    if errs: sys.exit(1)

def build_zip():
    files = sorted(f for f in os.listdir(AACDIR) if f.endswith(".m4a"))
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_STORED) as z:
        for f in files:
            z.write(os.path.join(AACDIR, f), f"{FOLDER}/{f}")
        z.write(os.path.join(AACDIR, "back.jpg"),  f"{FOLDER}/back.jpg")
        z.write(os.path.join(AACDIR, "front.jpg"), f"{FOLDER}/front.jpg")
    print(f"  zip: {ZIP}  {os.path.getsize(ZIP)/1024/1024:.1f} MB  entries={len(files)+2}")

def plan():
    os.makedirs(STAGE, exist_ok=True)
    tks = tracks()
    assert len(tks) == 12, f"expected 12 tracks, got {len(tks)}"
    for _, _, _, opus in tks:
        assert os.path.isfile(opus), f"missing opus: {opus}"
    print("PLAN — On the Street Corner 3 (1999)")
    print("[1/4] archive flac"); archive_flac(tks)
    print("[2/4] transcode aac192"); transcode_aac(tks)
    print("[3/4] build zip"); build_zip()
    print("[4/4] build sql + manifest")

    # dedupe id / enc against live D1
    used_id = {x["id"] for x in d1(
        "SELECT id FROM releases UNION SELECT id FROM albums UNION SELECT id FROM songs UNION SELECT id FROM covers")}
    used_enc = {x["e"] for x in d1(
        "SELECT encoded_filename e FROM songs UNION SELECT encoded_filename FROM covers "
        "UNION SELECT zip_encoded_filename FROM albums WHERE zip_encoded_filename IS NOT NULL")}
    def new_id():
        while True:
            v = str(rnd.randint(7*10**15, 8*10**15-1))
            if v not in used_id: used_id.add(v); return v
    def new_enc():
        while True:
            v = "".join(rnd.choice(ALPH) for _ in range(9))
            if v not in used_enc: used_enc.add(v); return v

    aid = new_id()                                  # release.id == album.id (single disc)
    cf_id, cb_id = new_id(), new_id()
    cf_enc, cb_enc = new_enc(), new_enc()
    zip_enc = new_enc()
    zip_size = os.path.getsize(ZIP)

    sql = ["-- add On the Street Corner 3 (1999)"]
    uploads = []
    # covers
    shutil.copyfile(FRONT, f"{STAGE}/{cf_enc}.jpg"); uploads.append((f"{STAGE}/{cf_enc}.jpg", f"{cf_enc}.jpg", "image/jpeg"))
    shutil.copyfile(BACK,  f"{STAGE}/{cb_enc}.jpg"); uploads.append((f"{STAGE}/{cb_enc}.jpg", f"{cb_enc}.jpg", "image/jpeg"))
    sql.append(f"INSERT INTO covers (id,encoded_filename,extension) VALUES ({S(cf_id)},{S(cf_enc)},'jpg');")
    sql.append(f"INSERT INTO covers (id,encoded_filename,extension) VALUES ({S(cb_id)},{S(cb_enc)},'jpg');")
    # release + album (with zip pointer on the single disc row)
    sql.append(f"INSERT INTO releases (id,name,year,category,default_edition_id,sort) "
               f"VALUES ({S(aid)},{S(REL_NAME)},{YEAR},'studio',{S(aid)},0);")
    sql.append("INSERT INTO albums (id,name,cover_front_id,cover_back_id,release_id,edition_id,edition_label,"
               "edition_year,disc_number,disc_title,recording,zip_encoded_filename,zip_size) VALUES "
               f"({S(aid)},{S(REL_NAME)},{S(cf_id)},{S(cb_id)},{S(aid)},{S(aid)},'Standard',{YEAR},1,NULL,"
               f"'studio',{S(zip_enc)},{zip_size});")
    # zip upload
    shutil.copyfile(ZIP, f"{STAGE}/{zip_enc}.zip"); uploads.append((f"{STAGE}/{zip_enc}.zip", f"{zip_enc}.zip", "application/zip"))
    # songs (reuse existing opus)
    rows = []
    for n, title, flac, opus in tks:
        sid, enc = new_id(), new_enc()
        dur = ffdur(opus)
        dst = f"{STAGE}/{enc}.opus"; shutil.copyfile(opus, dst)
        uploads.append((dst, f"{enc}.opus", "audio/ogg"))
        name = f"{n:02d} - {title}"
        sql.append(f"INSERT INTO songs (id,name,album_id,encoded_filename,extension,duration,mv_id,lyrics,favorite) "
                   f"VALUES ({S(sid)},{S(name)},{S(aid)},{S(enc)},'opus',{dur},'','',0);")
        rows.append((name, dur))
    # recompute chronological sort across all releases (year, then id)
    existing = d1("SELECT id, year FROM releases")
    allrel = [(r["id"], r["year"] if r["year"] is not None else 9999) for r in existing] + [(aid, YEAR)]
    allrel.sort(key=lambda x: (x[1], x[0]))
    for i, (rid, _) in enumerate(allrel, 1):
        sql.append(f"UPDATE releases SET sort={i} WHERE id={S(rid)};")

    open(SQLF, "w").write("\n".join(sql) + "\n")
    json.dump(dict(uploads=uploads, album_id=aid, zip_enc=zip_enc, zip_size=zip_size,
                   tracks=[r[0] for r in rows]), open(MAN, "w"), ensure_ascii=False)
    print(f"\n  release/album id = {aid}  name = {REL_NAME}  year={YEAR} category=studio")
    for name, dur in rows: print(f"    {name}   ({dur}s)")
    print(f"  covers: front + back   zip: {zip_enc}.zip ({zip_size/1024/1024:.1f} MB)")
    up = {}
    for _, _, ct in uploads: up[ct] = up.get(ct, 0) + 1
    print(f"  uploads={len(uploads)} {up}   R2 add ≈ {sum(os.path.getsize(p) for p,_,_ in uploads)/1024/1024:.1f} MB")
    print(f"  sql={SQLF}  ({len(sql)} statements)")

def apply():
    man = json.load(open(MAN))
    uploads = man["uploads"]
    print(f"uploading {len(uploads)} objects to R2...")
    def put(job):
        p, key, ct = job
        r = subprocess.run(["wrangler","r2","object","put",f"{BUCKET}/{key}","--file",p,
                            "--remote","--config",CFG,"--content-type",ct], capture_output=True, text=True)
        return None if r.returncode == 0 else (key, r.stderr.strip()[:160])
    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for e in ex.map(put, uploads):
            if e: errs.append(e)
    print(f"upload done. errors={len(errs)}")
    for k, m in errs: print("  ERR", k, m)
    if errs: print("ABORT before D1."); sys.exit(1)
    print("applying sql to D1...")
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--file",SQLF],
                       capture_output=True, text=True)
    print(r.stdout[-300:]); print(r.stderr[-200:])
    cnt = d1(f"SELECT COUNT(*) c FROM songs WHERE album_id='{man['album_id']}'")[0]["c"]
    print(f"verify: D1 songs for album = {cnt} (expect 12)")

if __name__ == "__main__":
    {"plan": plan, "apply": apply}[sys.argv[1]]()

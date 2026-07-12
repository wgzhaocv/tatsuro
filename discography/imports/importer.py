#!/usr/bin/env python3
"""Import batch-01 (114 tracks) into D1 + R2. Reuses already-transcoded opus_out.
plan  -> generate migration.sql + staging files + upload manifest (no prod writes)
apply -> upload staging to R2 (parallel) then apply migration.sql to D1
"""
import os, re, json, subprocess, random, string, shutil, sys, concurrent.futures

SRC   = "/Users/wenguang/Downloads/added"
BASE  = "/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/5e211750-941b-4ab0-b97d-9ec75398fdae/scratchpad"
OPUS  = f"{BASE}/opus_out"
STAGE = f"{BASE}/upload"
CFG   = "/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME= "yamashita-tatsuro"
BUCKET= "yamashita-tatsuro"
SQLF  = f"{BASE}/migration.sql"
MAN   = f"{BASE}/upload_manifest.json"

col = json.load(open(f"{BASE}/collision.json"))
used_ids = set(col["ids"]); used_enc = set(col["enc"])
rnd = random.Random(20260712)  # deterministic across plan/apply runs

def new_id():
    while True:
        v = str(rnd.randint(7*10**15, 8*10**15 - 1))
        if v not in used_ids:
            used_ids.add(v); return v
ALPH = string.ascii_letters + string.digits
def new_enc():
    while True:
        v = "".join(rnd.choice(ALPH) for _ in range(9))
        if v not in used_enc:
            used_enc.add(v); return v

def ffdur(p):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],
                       capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)

def S(s):  # sql string literal / NULL
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

def opus_of(srcflac):
    rel = os.path.relpath(srcflac, SRC)
    return os.path.join(OPUS, os.path.splitext(rel)[0] + ".opus")

def tracks(d):
    out = []
    for f in os.listdir(d):
        if f.lower().endswith(".flac"):
            m = re.match(r'^\s*(\d+)\s*[-.]\s*(.+)$', os.path.splitext(f)[0])
            num = int(m.group(1)); title = m.group(2).strip()
            out.append((num, f"{num:02d} - {title}", os.path.join(d, f)))
    out.sort(key=lambda x: x[0])
    return out

# ---- resolution ----
NEW_RELEASES = [
 dict(dir="2005 - Tatsuro Yamashita - Sonorite (2005)", name="Sonorite", year=2005, category="studio", cover=("file","folder.jpg","jpg")),
 dict(dir="2012 - 山下達郎 - Come Along 3 +", name="Come Along 3", year=2017, category="compilation", cover=("file","Folder.jpg","jpg")),
 dict(dir="1978 - 山下達郎 - Haruomi Hosono, Shigeru Suzuki - Pacific (GT) (1978)", name="Pacific", year=1978, category="studio", cover=("none",)),
 dict(dir="2023 - Tatsuro Yamashita - Sync of Summer (Moon)", name="Sync of Summer", year=2023, category="single", cover=("none",)),
 dict(dir="2018 - Tatsuro Yamashita - Christmas Eve (1983 ~ re-issue 2018)", name="Christmas Eve (2018 Reissue)", year=2018, category="single", cover=("none",)),
 dict(dir="2025 - 1983／2025  クリスマス・イブ ep(2025 All-in-One Edition)", name="Christmas Eve (2025 All-in-One)", year=2025, category="single", cover=("none",)),
]
NEW_EDITIONS = [
 dict(dir="1991 - Tatsuro Yamashita - Artisan (2021, Moon)", release_id="7153713385668608", name="Artisan", label="2021 · Moon", eyear=2021, front="7155502813417472", back="7155502813069312"),
 dict(dir="1984 - Tatsuro Yamashita - Big Wave (2014, Moon)", release_id="7153709340991488", name="Big Wave", label="2014 · Moon", eyear=2014, front="7155503258906624", back="7155503258808320"),
 dict(dir="1986 - Tatsuro Yamashita - Pocket Music (2020, Moon)", release_id="7153710643888128", name="Pocket Music", label="2020 · Moon", eyear=2020, front="7155511179300864", back="7155511179100160"),
]
OPUS_CD4 = dict(dir="2012 - Tatsuro Yamashita - Opus- All Time Best 1975-2012 (Moon) 4CD/CD4 - Bonus Disc",
    release_id="7153721897775104", edition_id="7153721897775104", name="Opus - All Time Best 1975-2012",
    label="Standard", eyear=2012, disc_number=4, disc_title="Bonus Disc", front="7155514482864128", back="7155514482679808")
RELABEL = ["7153694478798848","7153695604793344","7153696694857728","7153704922038272","7152117059796992"]

def d1(sql):
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--json","--command",sql],
                       capture_output=True, text=True)
    return json.loads(r.stdout)[0]["results"]

def plan():
    os.makedirs(STAGE, exist_ok=True)
    sql = ["-- batch-01 import (auto-generated)"]
    uploads = []           # (staging_path, r2_key)
    counts = dict(releases=0, editions=0, discs=0, songs=0, covers=0)

    def add_songs(album_id, tks):
        for _, name, src in tks:
            sid, enc = new_id(), new_enc()
            dur = ffdur(opus_of(src))
            op = f"{STAGE}/{enc}.opus"; shutil.copyfile(opus_of(src), op)
            uploads.append((op, f"{enc}.opus"))
            sql.append(f"INSERT INTO songs (id,name,album_id,encoded_filename,extension,duration,mv_id,lyrics,favorite) "
                       f"VALUES ({S(sid)},{S(name)},{S(album_id)},{S(enc)},'opus',{dur},'','',0);")
            counts["songs"] += 1

    def cover_ids(spec, d):
        if spec[0] == "file":
            cid, cenc, ext = new_id(), new_enc(), spec[2]
            cp = f"{STAGE}/{cenc}.{ext}"; shutil.copyfile(os.path.join(d, spec[1]), cp)
            uploads.append((cp, f"{cenc}.{ext}"))
            sql.append(f"INSERT INTO covers (id,encoded_filename,extension) VALUES ({S(cid)},{S(cenc)},{S(ext)});")
            counts["covers"] += 1
            return cid, None
        return None, None

    # new releases (single disc; release.id = album.id)
    for u in NEW_RELEASES:
        d = os.path.join(SRC, u["dir"]); tks = tracks(d)
        aid = new_id()
        cf, cb = cover_ids(u["cover"], d)
        sql.append(f"INSERT INTO releases (id,name,year,category,default_edition_id,sort) "
                   f"VALUES ({S(aid)},{S(u['name'])},{u['year']},{S(u['category'])},{S(aid)},0);")
        sql.append(f"INSERT INTO albums (id,name,cover_front_id,cover_back_id,release_id,edition_id,edition_label,edition_year,disc_number,disc_title,recording) "
                   f"VALUES ({S(aid)},{S(u['name'])},{S(cf)},{S(cb)},{S(aid)},{S(aid)},'Standard',{u['year']},1,NULL,'studio');")
        add_songs(aid, tks); counts["releases"] += 1; counts["discs"] += 1

    # new editions (attach to existing release; become default)
    for u in NEW_EDITIONS:
        d = os.path.join(SRC, u["dir"]); tks = tracks(d)
        aid = new_id()
        sql.append(f"INSERT INTO albums (id,name,cover_front_id,cover_back_id,release_id,edition_id,edition_label,edition_year,disc_number,disc_title,recording) "
                   f"VALUES ({S(aid)},{S(u['name'])},{S(u['front'])},{S(u['back'])},{S(u['release_id'])},{S(aid)},{S(u['label'])},{u['eyear']},1,NULL,'studio');")
        sql.append(f"UPDATE releases SET default_edition_id={S(aid)} WHERE id={S(u['release_id'])};")
        add_songs(aid, tks); counts["editions"] += 1; counts["discs"] += 1

    # opus CD4 -> new disc 4 on existing Opus edition
    u = OPUS_CD4; d = os.path.join(SRC, u["dir"]); tks = tracks(d); aid = new_id()
    sql.append(f"INSERT INTO albums (id,name,cover_front_id,cover_back_id,release_id,edition_id,edition_label,edition_year,disc_number,disc_title,recording) "
               f"VALUES ({S(aid)},{S(u['name'])},{S(u['front'])},{S(u['back'])},{S(u['release_id'])},{S(u['edition_id'])},{S(u['label'])},{u['eyear']},{u['disc_number']},{S(u['disc_title'])},'studio');")
    add_songs(aid, tks); counts["discs"] += 1

    # relabel the 5 already-in-DB 2002 BMG reissues
    for rid in RELABEL:
        sql.append(f"UPDATE albums SET edition_label='2002 · BMG', edition_year=2002 WHERE id={S(rid)};")

    # recompute chronological sort across all releases (existing + new)
    existing = d1("SELECT id, year, sort FROM releases")
    new_ids = {u["id"] if "id" in u else None for u in []}  # placeholder
    # collect new release rows we just inserted (year)
    newrel = [(re.search(r"VALUES \('(\d+)',", s).group(1), int(re.search(r"',(\d{4}),", s).group(1)))
              for s in sql if s.startswith("INSERT INTO releases")]
    allrel = [(r["id"], r["year"] if r["year"] is not None else 9999) for r in existing] + newrel
    allrel.sort(key=lambda x: (x[1], x[0]))
    for i, (rid, _) in enumerate(allrel, 1):
        sql.append(f"UPDATE releases SET sort={i} WHERE id={S(rid)};")

    open(SQLF, "w").write("\n".join(sql) + "\n")
    json.dump(uploads, open(MAN, "w"))
    print("PLAN:", json.dumps(counts))
    print(f"  statements={len(sql)}  uploads={len(uploads)}  sql={SQLF}")

def apply():
    uploads = json.load(open(MAN))
    print(f"uploading {len(uploads)} objects to R2...")
    def put(job):
        p, key = job
        r = subprocess.run(["wrangler","r2","object","put",f"{BUCKET}/{key}","--file",p,"--remote","--config",CFG],
                           capture_output=True, text=True)
        return None if r.returncode == 0 else (key, r.stderr.strip()[:160])
    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for i, e in enumerate(ex.map(put, uploads), 1):
            if e: errs.append(e)
            if i % 25 == 0: print(f"  ...{i}/{len(uploads)}")
    print(f"upload done. errors={len(errs)}")
    for k, m in errs[:10]: print("  ERR", k, m)
    if errs:
        print("ABORT: fix upload errors before D1 apply."); sys.exit(1)
    print("applying migration.sql to D1...")
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--file",SQLF],
                       capture_output=True, text=True)
    print(r.stdout[-600:]); print(r.stderr[-600:])

if __name__ == "__main__":
    (plan if sys.argv[1] == "plan" else apply)()

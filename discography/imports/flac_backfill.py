#!/usr/bin/env python3
"""Backfill lossless FLAC download sources for the batch-01 imports.

Only the 10 albums whose FLAC source lives in ~/Downloads/added get a FLAC:
6 new releases + 3 new (default) editions + Opus CD4. Streaming stays opus.

Safety (do NOT mis-map a FLAC to the wrong song):
  1. exact 1:1 name match  — source basename "NN - title" == songs.name
  2. duration cross-check  — ffprobe(flac) vs D1 duration (from opus) <= 2.0s
Any album that fails either check aborts the whole run before touching prod.

plan  -> verify matches, stage flac copies, write flac_backfill.sql + manifest
apply -> upload staged flac to R2 (parallel), then apply the UPDATE sql to D1
"""
import os, re, json, subprocess, random, string, shutil, sys, concurrent.futures

SRC   = "/Users/wenguang/Downloads/added"
BASE  = "/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/fbc8b99b-bfc2-465f-bb8d-630198f1faf0/scratchpad"
STAGE = f"{BASE}/flac_upload"
CFG   = "/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME= "yamashita-tatsuro"
BUCKET= "yamashita-tatsuro"
SQLF  = f"{BASE}/flac_backfill.sql"
MAN   = f"{BASE}/flac_manifest.json"
DUR_TOL = 2.0

# source dir (relative to SRC) -> D1 album_id (resolved + count-verified against D1)
ALBUMS = [
 ("2005 - Tatsuro Yamashita - Sonorite (2005)", "7302825822442109"),
 ("2012 - 山下達郎 - Come Along 3 +", "7627525907066196"),
 ("1978 - 山下達郎 - Haruomi Hosono, Shigeru Suzuki - Pacific (GT) (1978)", "7899837905100997"),
 ("2023 - Tatsuro Yamashita - Sync of Summer (Moon)", "7896053227972970"),
 ("2018 - Tatsuro Yamashita - Christmas Eve (1983 ~ re-issue 2018)", "7221356331397713"),
 ("2025 - 1983／2025  クリスマス・イブ ep(2025 All-in-One Edition)", "7536346654579549"),
 ("1991 - Tatsuro Yamashita - Artisan (2021, Moon)", "7804073130850446"),
 ("1984 - Tatsuro Yamashita - Big Wave (2014, Moon)", "7178878513203465"),
 ("1986 - Tatsuro Yamashita - Pocket Music (2020, Moon)", "7499834326713433"),
 ("2012 - Tatsuro Yamashita - Opus- All Time Best 1975-2012 (Moon) 4CD/CD4 - Bonus Disc", "7459590942850225"),
]

rnd = random.Random(20260715)
ALPH = string.ascii_letters + string.digits

def d1(sql):
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--json","--command",sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("D1 ERROR:", r.stderr[-400:]); sys.exit(1)
    return json.loads(r.stdout)[0]["results"]

def ffdur(p):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],
                       capture_output=True, text=True)
    return round(float(r.stdout.strip()), 3)

def S(s):
    return "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

def src_tracks(d):
    """Same parse as importer.tracks: basename 'NN - title' -> name 'NN - title'."""
    out = {}
    for f in os.listdir(d):
        if f.lower().endswith(".flac"):
            base = os.path.splitext(f)[0]
            m = re.match(r'^\s*(\d+)\s*[-.]\s*(.+)$', base)
            if not m:
                print(f"  !! unparseable filename: {f}"); sys.exit(1)
            name = f"{int(m.group(1)):02d} - {m.group(2).strip()}"
            if name in out:
                print(f"  !! duplicate track name in source: {name}"); sys.exit(1)
            out[name] = os.path.join(d, f)
    return out

def build():
    used_enc = {r["enc"] for r in d1("SELECT encoded_filename AS enc FROM songs "
                                     "UNION SELECT encoded_filename FROM covers")}
    def new_enc():
        while True:
            v = "".join(rnd.choice(ALPH) for _ in range(9))
            if v not in used_enc:
                used_enc.add(v); return v

    plan = []      # (song_id, name, flac_path, enc, dur_flac, dur_db)
    for reldir, album_id in ALBUMS:
        d = os.path.join(SRC, reldir)
        if not os.path.isdir(d):
            print(f"  !! missing source dir: {reldir}"); sys.exit(1)
        srcs = src_tracks(d)
        rows = d1(f"SELECT id, name, duration FROM songs WHERE album_id='{album_id}'")
        db = {r["name"]: r for r in rows}
        # 1:1 name match, both directions
        if set(srcs) != set(db):
            print(f"  !! MISMATCH in {reldir}")
            print("     only in source:", sorted(set(srcs)-set(db)))
            print("     only in D1    :", sorted(set(db)-set(srcs)))
            sys.exit(1)
        for name, path in srcs.items():
            dd = db[name]["duration"]
            df = ffdur(path)
            if dd is None or abs(df - dd) > DUR_TOL:
                print(f"  !! DURATION MISMATCH {reldir} / {name}: flac={df} db={dd}")
                sys.exit(1)
            plan.append((db[name]["id"], name, path, new_enc(), df, dd))
        print(f"  ok  {len(srcs):2d} tracks  {reldir}")
    return plan

def plan_cmd():
    os.makedirs(STAGE, exist_ok=True)
    plan = build()
    sql = ["-- flac backfill (auto-generated) — sets songs.flac_encoded_filename"]
    uploads = []
    for song_id, name, path, enc, df, dd in plan:
        dst = f"{STAGE}/{enc}.flac"; shutil.copyfile(path, dst)
        uploads.append((dst, f"{enc}.flac"))
        sql.append(f"UPDATE songs SET flac_encoded_filename={S(enc)} WHERE id={S(song_id)};")
    open(SQLF, "w").write("\n".join(sql) + "\n")
    json.dump(uploads, open(MAN, "w"))
    total = sum(os.path.getsize(p) for p,_ in uploads) / 1024/1024
    print(f"\nPLAN OK: {len(plan)} tracks matched (name + duration), "
          f"{total:.0f} MB staged\n  sql={SQLF}\n  manifest={MAN}")

def apply_cmd():
    uploads = json.load(open(MAN))
    print(f"uploading {len(uploads)} flac to R2...")
    def put(job):
        p, key = job
        r = subprocess.run(["wrangler","r2","object","put",f"{BUCKET}/{key}","--file",p,
                            "--remote","--config",CFG,"--content-type","audio/flac"],
                           capture_output=True, text=True)
        return None if r.returncode == 0 else (key, r.stderr.strip()[:160])
    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        for i, e in enumerate(ex.map(put, uploads), 1):
            if e: errs.append(e)
            if i % 20 == 0: print(f"  ...{i}/{len(uploads)}")
    print(f"upload done. errors={len(errs)}")
    for k, m in errs[:10]: print("  ERR", k, m)
    if errs:
        print("ABORT: fix upload errors before D1 apply."); sys.exit(1)
    print("applying flac_backfill.sql to D1...")
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--file",SQLF],
                       capture_output=True, text=True)
    print(r.stdout[-500:]); print(r.stderr[-300:])

if __name__ == "__main__":
    {"plan": plan_cmd, "apply": apply_cmd}[sys.argv[1]]()

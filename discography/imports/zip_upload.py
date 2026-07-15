#!/usr/bin/env python3
"""Upload per-edition m4a zip bundles to R2 and point D1 at them.

Each edition (group of albums rows sharing edition_id) -> one <enc>.zip in the
main bucket. Pointer (zip_encoded_filename) + zip_size stored on the edition's
first-disc row (min disc_number). Zips were pre-built by zipping the aac192
per-edition folders (folder name == D1-derived edition folder).

plan  -> map every edition to its local zip + target row (read-only), report
apply -> upload zips to R2, then UPDATE albums with pointer + size
"""
import os, re, json, random, string, subprocess, shutil, sys, concurrent.futures

ZIPDIR = os.path.expanduser("~/Downloads/tatsuro-aac192-zip")
SCR    = "/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/fbc8b99b-bfc2-465f-bb8d-630198f1faf0/scratchpad"
STAGE  = f"{SCR}/zip_upload"
CFG    = "/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME = "yamashita-tatsuro"
BUCKET = "yamashita-tatsuro"
SQLF   = f"{SCR}/zip.sql"
MAN    = f"{SCR}/zip_manifest.json"

rnd = random.Random(20260716)
ALPH = string.ascii_letters + string.digits

def d1(sql):
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--json","--command",sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("D1 ERR:", r.stderr[-300:]); sys.exit(1)
    return json.loads(r.stdout)[0]["results"]

def sanitize(s): return (s or "").replace("/","／").replace(":","：").strip()
def efolder(year, relname, label):
    pre = f"{year} - " if year is not None else ""
    return sanitize(f"{pre}{relname} [{label or 'Standard'}]")

def build():
    rows = d1("""SELECT a.id AS album_id, a.edition_id, a.edition_label, a.disc_number,
                        r.name AS release_name, r.year
                 FROM albums a JOIN releases r ON a.release_id=r.id""")
    used = {x["e"] for x in d1("SELECT encoded_filename AS e FROM songs "
                               "UNION SELECT encoded_filename FROM covers "
                               "UNION SELECT zip_encoded_filename FROM albums WHERE zip_encoded_filename IS NOT NULL")}
    def new_enc():
        while True:
            v = "".join(rnd.choice(ALPH) for _ in range(9))
            if v not in used: used.add(v); return v
    # group by edition_id
    eds = {}
    for r in rows:
        eds.setdefault(r["edition_id"], []).append(r)
    plan = []
    for eid, ds in eds.items():
        ds.sort(key=lambda x: (x["disc_number"] or 1))
        first = ds[0]                              # disc 1 == API's `first`
        folder = efolder(first["year"], first["release_name"], first["edition_label"])
        zpath = os.path.join(ZIPDIR, folder + ".zip")
        plan.append(dict(edition_id=eid, target_row=first["album_id"], folder=folder,
                         zip=zpath, exists=os.path.isfile(zpath),
                         size=os.path.getsize(zpath) if os.path.isfile(zpath) else 0))
    return plan, new_enc

def plan_cmd():
    plan, _ = build()
    missing = [p for p in plan if not p["exists"]]
    print(f"editions: {len(plan)}   zip matched: {len(plan)-len(missing)}   missing: {len(missing)}")
    for p in missing:
        print("  !! MISSING zip:", p["folder"] + ".zip")
    total = sum(p["size"] for p in plan if p["exists"])
    print(f"total zip upload: {total/1024/1024/1024:.2f} GB")
    if not missing:
        print("every edition maps to a zip ✓")

def apply_cmd():
    plan, new_enc = build()
    missing = [p for p in plan if not p["exists"]]
    if missing:
        print("ABORT: missing zips", [p["folder"] for p in missing]); sys.exit(1)
    os.makedirs(STAGE, exist_ok=True)
    sql = ["-- edition zip pointers"]
    uploads = []
    for p in plan:
        enc = new_enc()
        stage = f"{STAGE}/{enc}.zip"; shutil.copyfile(p["zip"], stage)
        uploads.append((stage, f"{enc}.zip"))
        sql.append(f"UPDATE albums SET zip_encoded_filename='{enc}', zip_size={p['size']} "
                   f"WHERE id='{p['target_row']}';")
    open(SQLF,"w").write("\n".join(sql)+"\n")
    json.dump(uploads, open(MAN,"w"))
    print(f"uploading {len(uploads)} zips to R2...")
    def put(job):
        pth, key = job
        r = subprocess.run(["wrangler","r2","object","put",f"{BUCKET}/{key}","--file",pth,
                            "--remote","--config",CFG,"--content-type","application/zip"],
                           capture_output=True, text=True)
        return None if r.returncode==0 else (key, r.stderr.strip()[:140])
    errs=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for i,e in enumerate(ex.map(put, uploads),1):
            if e: errs.append(e)
            if i%10==0: print(f"  {i}/{len(uploads)}")
    print(f"upload done. errors={len(errs)}")
    for k,m in errs: print("  ERR",k,m)
    if errs: sys.exit(1)
    print("applying pointers to D1...")
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--file",SQLF],
                       capture_output=True, text=True)
    print(r.stdout[-300:]); print(r.stderr[-200:])

if __name__ == "__main__":
    {"plan":plan_cmd,"apply":apply_cmd}[sys.argv[1]]()

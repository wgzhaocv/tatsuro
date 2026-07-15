#!/usr/bin/env python3
"""Add the 2025 single オノマトペISLAND／MOVE ON to D1 + R2, and file its flac into
the local lossless library. Reuses the pre-transcoded opus/ (259k = libopus 256k).

plan  -> build migration.sql + upload manifest (no prod writes), print for review
apply -> upload opus+covers to R2, apply sql to D1, copy flac into the library
"""
import os, re, json, random, string, subprocess, shutil, sys, concurrent.futures

SRC   = "/Users/wenguang/Desktop/山下達郎 - オノマトペISLAND／MOVE ON"
LIB   = os.path.expanduser("~/Downloads/tatsuro-flac/2025 - オノマトペISLAND／MOVE ON [Standard]")
SCR   = "/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/fbc8b99b-bfc2-465f-bb8d-630198f1faf0/scratchpad"
STAGE = f"{SCR}/onoma_upload"
CFG   = "/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME= "yamashita-tatsuro"
BUCKET= "yamashita-tatsuro"
SQLF  = f"{SCR}/onoma.sql"
MAN   = f"{SCR}/onoma_manifest.json"

REL_NAME = "オノマトペISLAND／MOVE ON"
YEAR = 2025
COVER_FRONT = "オノマトペISLAND.jpg"
COVER_BACK  = "moveon.jpg"
# source basename (without ext) -> D1 song name "NN - Title"
def parse_name(base):
    m = re.match(r'^\s*(\d+)[\s.\-]+(.+)$', base)
    return f"{int(m.group(1)):02d} - {m.group(2).strip()}"

used_ids = set(json.load(open(f"{SCR}/ids.json")))
used_enc = set(json.load(open(f"{SCR}/encs.json")))
rnd = random.Random(20260716)
ALPH = string.ascii_letters + string.digits
def new_id():
    while True:
        v = str(rnd.randint(7*10**15, 8*10**15 - 1))
        if v not in used_ids: used_ids.add(v); return v
def new_enc():
    while True:
        v = "".join(rnd.choice(ALPH) for _ in range(9))
        if v not in used_enc: used_enc.add(v); return v

def ffdur(p):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",p],capture_output=True,text=True)
    return round(float(r.stdout.strip()),3)
def S(s): return "NULL" if s is None else "'"+str(s).replace("'","''")+"'"
def d1(sql):
    r=subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--json","--command",sql],capture_output=True,text=True)
    return json.loads(r.stdout)[0]["results"]

def tracks():
    out=[]
    for f in sorted(os.listdir(SRC)):
        if f.lower().endswith(".flac"):
            base=os.path.splitext(f)[0]
            out.append((parse_name(base), os.path.join(SRC,f), os.path.join(SRC,"opus",base+".opus")))
    return out

def plan():
    os.makedirs(STAGE, exist_ok=True)
    tks=tracks()
    assert len(tks)==6, f"expected 6 tracks, got {len(tks)}"
    aid=new_id()                      # release.id == album.id (single disc)
    cf_id, cb_id = new_id(), new_id()
    cf_enc, cb_enc = new_enc(), new_enc()
    sql=["-- add single オノマトペISLAND／MOVE ON (2025)"]
    uploads=[]
    # covers
    shutil.copyfile(os.path.join(SRC,COVER_FRONT), f"{STAGE}/{cf_enc}.jpg"); uploads.append((f"{STAGE}/{cf_enc}.jpg", f"{cf_enc}.jpg"))
    shutil.copyfile(os.path.join(SRC,COVER_BACK),  f"{STAGE}/{cb_enc}.jpg"); uploads.append((f"{STAGE}/{cb_enc}.jpg", f"{cb_enc}.jpg"))
    sql.append(f"INSERT INTO covers (id,encoded_filename,extension) VALUES ({S(cf_id)},{S(cf_enc)},'jpg');")
    sql.append(f"INSERT INTO covers (id,encoded_filename,extension) VALUES ({S(cb_id)},{S(cb_enc)},'jpg');")
    # release + album
    sql.append(f"INSERT INTO releases (id,name,year,category,default_edition_id,sort) VALUES ({S(aid)},{S(REL_NAME)},{YEAR},'single',{S(aid)},0);")
    sql.append(f"INSERT INTO albums (id,name,cover_front_id,cover_back_id,release_id,edition_id,edition_label,edition_year,disc_number,disc_title,recording) "
               f"VALUES ({S(aid)},{S(REL_NAME)},{S(cf_id)},{S(cb_id)},{S(aid)},{S(aid)},'Standard',{YEAR},1,NULL,'studio');")
    # songs (reuse existing opus)
    plan_rows=[]
    for name, flac, opus in tks:
        assert os.path.isfile(opus), f"missing opus: {opus}"
        sid, enc = new_id(), new_enc()
        dur = ffdur(opus)
        dst=f"{STAGE}/{enc}.opus"; shutil.copyfile(opus, dst); uploads.append((dst, f"{enc}.opus"))
        sql.append(f"INSERT INTO songs (id,name,album_id,encoded_filename,extension,duration,mv_id,lyrics,favorite) "
                   f"VALUES ({S(sid)},{S(name)},{S(aid)},{S(enc)},'opus',{dur},'','',0);")
        plan_rows.append((name, dur, flac))
    # recompute chronological sort across all releases
    existing=d1("SELECT id, year FROM releases")
    allrel=[(r["id"], r["year"] if r["year"] is not None else 9999) for r in existing]+[(aid, YEAR)]
    allrel.sort(key=lambda x:(x[1],x[0]))
    for i,(rid,_) in enumerate(allrel,1):
        sql.append(f"UPDATE releases SET sort={i} WHERE id={S(rid)};")
    open(SQLF,"w").write("\n".join(sql)+"\n")
    json.dump(dict(uploads=uploads, album_id=aid, tracks=[(n,f) for n,_,f in plan_rows], cover_front=COVER_FRONT, cover_back=COVER_BACK), open(MAN,"w"), ensure_ascii=False)
    print("PLAN:")
    print(f"  release/album id = {aid}  name = {REL_NAME}  year={YEAR} category=single")
    for n,dur,_ in plan_rows: print(f"    {n}   ({dur}s)")
    print(f"  covers: front={COVER_FRONT} back={COVER_BACK}")
    print(f"  uploads={len(uploads)} (6 opus + 2 jpg)   sql statements={len(sql)}")
    print(f"  sql={SQLF}")

def apply():
    man=json.load(open(MAN))
    uploads=man["uploads"]
    print(f"uploading {len(uploads)} objects to R2...")
    def put(job):
        p,key=job
        ct="image/jpeg" if key.endswith(".jpg") else "audio/ogg"
        r=subprocess.run(["wrangler","r2","object","put",f"{BUCKET}/{key}","--file",p,"--remote","--config",CFG,"--content-type",ct],capture_output=True,text=True)
        return None if r.returncode==0 else (key, r.stderr.strip()[:140])
    errs=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for e in ex.map(put, uploads):
            if e: errs.append(e)
    print(f"upload done. errors={len(errs)}")
    for k,m in errs: print("  ERR",k,m)
    if errs: print("ABORT before D1."); sys.exit(1)
    print("applying sql to D1...")
    r=subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--file",SQLF],capture_output=True,text=True)
    print(r.stdout[-400:]); print(r.stderr[-200:])
    # copy flac into local library
    os.makedirs(LIB, exist_ok=True)
    for name, flac in man["tracks"]:
        shutil.copyfile(flac, os.path.join(LIB, name.replace("/","／").replace(":","：")+".flac"))
    shutil.copyfile(os.path.join(SRC, man["cover_front"]), os.path.join(LIB,"front.jpg"))
    shutil.copyfile(os.path.join(SRC, man["cover_back"]),  os.path.join(LIB,"back.jpg"))
    # verify library flac
    bad=[f for f in os.listdir(LIB) if f.endswith(".flac") and open(os.path.join(LIB,f),"rb").read(4)!=b"fLaC"]
    print(f"library: {LIB}\n  flac={len([f for f in os.listdir(LIB) if f.endswith('.flac')])}  bad_magic={len(bad)}")

if __name__=="__main__":
    {"plan":plan,"apply":apply}[sys.argv[1]]()

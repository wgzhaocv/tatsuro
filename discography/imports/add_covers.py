#!/usr/bin/env python3
import subprocess, json, random, string, shutil, os, sys

BASE="/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/5e211750-941b-4ab0-b97d-9ec75398fdae/scratchpad"
COVERS=f"{BASE}/covers"; STAGE=f"{BASE}/upload_covers"
CFG="/Users/wenguang/Desktop/projects/musicPlayer/yamashita-api/wrangler.jsonc"
DBNAME="yamashita-tatsuro"; BUCKET="yamashita-tatsuro"
os.makedirs(STAGE, exist_ok=True)

# file -> release name (release.id == album.id for these single-disc new releases)
MAP = {
  "pacific.jpg": "Pacific",
  "ce2018.jpg":  "Christmas Eve (2018 Reissue)",
  "ce2025.jpg":  "Christmas Eve (2025 All-in-One)",
  "sync.jpg":    "Sync of Summer",
}

def d1(sql):
    r = subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--json","--command",sql],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-500:]); sys.exit(1)
    return json.loads(r.stdout)[0]["results"]

# fresh collision set
used_ids=set(); used_enc=set()
for t in ("songs","albums","releases","covers","mvs"):
    for x in d1(f"SELECT id FROM {t}"): used_ids.add(x["id"])
for t in ("songs","covers","mvs"):
    for x in d1(f"SELECT encoded_filename AS e FROM {t}"): used_enc.add(x["e"])

# name -> release id
namemap={}
for x in d1("SELECT id,name FROM releases"):
    namemap[x["name"]]=x["id"]

rnd=random.Random(777)
ALPH=string.ascii_letters+string.digits
def nid():
    while True:
        v=str(rnd.randint(7*10**15,8*10**15-1))
        if v not in used_ids: used_ids.add(v); return v
def nenc():
    while True:
        v="".join(rnd.choice(ALPH) for _ in range(9))
        if v not in used_enc: used_enc.add(v); return v
def S(s): return "'"+str(s).replace("'","''")+"'"

sql=[]; uploads=[]
for fn, rname in MAP.items():
    if rname not in namemap:
        print(f"!! release not found: {rname}"); sys.exit(1)
    rid=namemap[rname]
    cid, cenc = nid(), nenc()
    dst=f"{STAGE}/{cenc}.jpg"; shutil.copyfile(f"{COVERS}/{fn}", dst)
    uploads.append((dst, f"{cenc}.jpg"))
    sql.append(f"INSERT INTO covers (id,encoded_filename,extension) VALUES ({S(cid)},{S(cenc)},'jpg');")
    sql.append(f"UPDATE albums SET cover_front_id={S(cid)} WHERE id={S(rid)};")
    print(f"  {rname:<32} release={rid} cover={cid} key={cenc}.jpg")

# upload
print("uploading covers to R2...")
for p,key in uploads:
    r=subprocess.run(["wrangler","r2","object","put",f"{BUCKET}/{key}","--file",p,"--remote","--config",CFG],
                     capture_output=True,text=True)
    if r.returncode!=0: print("ERR",key,r.stderr[-200:]); sys.exit(1)
print("upload ok. applying D1...")
sqlf=f"{BASE}/covers.sql"; open(sqlf,"w").write("\n".join(sql)+"\n")
r=subprocess.run(["wrangler","d1","execute",DBNAME,"--remote","--config",CFG,"--file",sqlf],capture_output=True,text=True)
print(r.stdout[-300:]); print(r.stderr[-300:] if r.returncode else "D1 ok")

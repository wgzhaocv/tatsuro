#!/usr/bin/env python3
"""Transcode the local FLAC library -> AAC (.m4a, Apple aac_at encoder) at a given
bitrate, mirroring the album/CD structure, embedding each album's front.jpg and
copying front/back.jpg alongside. Idempotent (skips existing .m4a).

usage: transcode_aac.py <bitrate_k> <out_dir>
"""
import os, sys, shutil, subprocess, concurrent.futures

LIB = os.path.expanduser("~/Downloads/tatsuro-flac")
BR  = sys.argv[1]                 # e.g. "192"
OUT = os.path.expanduser(sys.argv[2])
WORKERS = int(sys.argv[3]) if len(sys.argv) > 3 else (os.cpu_count() or 8)

def cover_for(flac_path):
    d = os.path.dirname(flac_path)
    for cand in (os.path.join(d, "front.jpg"), os.path.join(os.path.dirname(d), "front.jpg")):
        if os.path.isfile(cand):
            return cand
    return None

def jobs():
    out = []
    for root, _, files in os.walk(LIB):
        for f in files:
            if f.lower().endswith(".flac"):
                src = os.path.join(root, f)
                rel = os.path.relpath(src, LIB)
                dst = os.path.join(OUT, os.path.splitext(rel)[0] + ".m4a")
                out.append((src, dst))
    return out

def encode(job):
    src, dst = job
    if os.path.isfile(dst) and os.path.getsize(dst) > 1024:
        return None
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cov = cover_for(src)
    tmp = dst + ".tmp.m4a"
    if cov:
        cmd = ["ffmpeg","-hide_banner","-loglevel","error","-y","-i",src,"-i",cov,
               "-map","0:a","-map","1:v","-c:a","aac_at","-b:a",f"{BR}k",
               "-c:v","mjpeg","-disposition:v","attached_pic",tmp]
    else:
        cmd = ["ffmpeg","-hide_banner","-loglevel","error","-y","-i",src,
               "-c:a","aac_at","-b:a",f"{BR}k","-vn",tmp]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.isfile(tmp):
        return (dst, r.stderr.strip()[:140])
    os.replace(tmp, dst)
    return None

def copy_cover_art():
    # mirror front.jpg / back.jpg into every album folder
    for root, _, files in os.walk(LIB):
        for f in files:
            if f in ("front.jpg", "back.jpg"):
                rel = os.path.relpath(os.path.join(root, f), LIB)
                d = os.path.join(OUT, rel)
                os.makedirs(os.path.dirname(d), exist_ok=True)
                shutil.copyfile(os.path.join(root, f), d)

def main():
    js = jobs()
    print(f"[{BR}k] {len(js)} tracks -> {OUT}  (workers={WORKERS})")
    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for i, e in enumerate(ex.map(encode, js), 1):
            if e: errs.append(e)
            if i % 100 == 0: print(f"  [{BR}k] {i}/{len(js)}")
    copy_cover_art()
    print(f"[{BR}k] done. errors={len(errs)}")
    for d, m in errs[:10]: print("  ERR", d, m)

if __name__ == "__main__":
    main()

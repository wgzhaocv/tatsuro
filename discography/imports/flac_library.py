#!/usr/bin/env python3
"""Build a local, correctly-structured FLAC library of the whole discography.

Authoritative structure = the NEW model (Cloudflare D1, dumped to structure.json
+ songs.json). Layout:
    <base>/<year> - <release> [<edition_label>]/[CD<n>/]<NN - Title>.flac
                                              /front.jpg  /back.jpg
Editions are separate folders; multi-disc editions get CD<n> subdirs, single-disc
is flat. Covers come from R2 (new D1 cover ids) for every album.

FLAC bytes:
  * 114 recently-added tracks (songs.flac_encoded_filename set) -> local ~/Downloads/added
  * 406 legacy tracks -> Orange Pi old API (album_id preserved across migration:
    new album_id == old albumId, so /music/album_songs/<id> gives downloadId ->
    /stream/download/<downloadId> streams the flac)

Safety: every flac is verified (size>0 + 'fLaC' magic). Nothing is silently
dropped — any new-model song without a resolvable flac, and any opi track not in
the new model, is listed in the report.

plan  -> resolve every source (read-only), print match report + est size
apply -> create folders, copy/download + verify, write covers, print final report
"""
import os, re, json, sys, shutil, urllib.request, concurrent.futures

BASE  = os.path.expanduser("~/Downloads/tatsuro-flac")
ADDED = os.path.expanduser("~/Downloads/added")
SCR   = "/private/tmp/claude-501/-Users-wenguang-Desktop-projects-musicPlayer-tatsuro/fbc8b99b-bfc2-465f-bb8d-630198f1faf0/scratchpad"
OPI   = "http://192.168.0.106:8091/player_api"
TATSU = "https://ys-tr.withyakul.me"

# album_id -> subdir under ADDED (the 10 batch-01 imports that carry flac locally)
ADDED_DIRS = {
 "7302825822442109": "2005 - Tatsuro Yamashita - Sonorite (2005)",
 "7627525907066196": "2012 - 山下達郎 - Come Along 3 +",
 "7899837905100997": "1978 - 山下達郎 - Haruomi Hosono, Shigeru Suzuki - Pacific (GT) (1978)",
 "7896053227972970": "2023 - Tatsuro Yamashita - Sync of Summer (Moon)",
 "7221356331397713": "2018 - Tatsuro Yamashita - Christmas Eve (1983 ~ re-issue 2018)",
 "7536346654579549": "2025 - 1983／2025  クリスマス・イブ ep(2025 All-in-One Edition)",
 "7804073130850446": "1991 - Tatsuro Yamashita - Artisan (2021, Moon)",
 "7178878513203465": "1984 - Tatsuro Yamashita - Big Wave (2014, Moon)",
 "7499834326713433": "1986 - Tatsuro Yamashita - Pocket Music (2020, Moon)",
 "7459590942850225": "2012 - Tatsuro Yamashita - Opus- All Time Best 1975-2012 (Moon) 4CD/CD4 - Bonus Disc",
}

# explicit per-song flac overrides (album_id -> {d1_song_name: abspath}) for
# sources that live outside ADDED and aren't on opi (e.g. mora配信-only singles).
DIRECT = {
 "7972658643085202": {  # Let It Be Me (2016, mora配信 single)
   "01 - Let It Be Me": os.path.expanduser("~/Music/mora/山下達郎&竹内まりや/Let It Be Me/01-Let It Be Me_32763855.flac"),
 },
}

def sanitize(s):
    return (s or "").replace("/", "／").replace(":", "：").strip()

_added_map = {}
def added_name_map(srcdir):
    """Map normalized 'NN - Title' -> actual flac path, parsing whatever number
    format the source uses (mirrors importer/flac_backfill's tracks() regex)."""
    if srcdir not in _added_map:
        m = {}
        if os.path.isdir(srcdir):
            for f in os.listdir(srcdir):
                if f.lower().endswith(".flac"):
                    mo = re.match(r'^\s*(\d+)\s*[-.]\s*(.+)$', os.path.splitext(f)[0])
                    if mo:
                        m[f"{int(mo.group(1)):02d} - {mo.group(2).strip()}"] = os.path.join(srcdir, f)
        _added_map[srcdir] = m
    return _added_map[srcdir]

def http_get(url, timeout=60):
    # Cloudflare (ys-tr) 403s the default urllib UA; opi (LAN) doesn't care.
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (flac-library)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()

def http_json(url, timeout=30):
    return json.loads(http_get(url, timeout))

_opi_cache = {}
def opi_album_songs(album_id):
    if album_id not in _opi_cache:
        try:
            _opi_cache[album_id] = http_json(f"{OPI}/music/album_songs/{album_id}")
        except Exception as e:
            _opi_cache[album_id] = {"__error__": str(e)}
    return _opi_cache[album_id]

def load():
    structure = json.load(open(f"{SCR}/structure.json"))
    songs = json.load(open(f"{SCR}/songs.json"))
    by_album = {}
    for s in songs:
        by_album.setdefault(s["album_id"], []).append(s)
    return structure, by_album

def edition_folder(row):
    yr = row["year"]
    prefix = f"{yr} - " if yr else ""
    return sanitize(f"{prefix}{row['release_name']} [{row['edition_label'] or 'Standard'}]")

def disc_dir(row):
    """Absolute dir for this disc's flac files."""
    ef = os.path.join(BASE, edition_folder(row))
    if row["discs_in_edition"] > 1:
        return os.path.join(ef, f"CD{row['disc_number']}")
    return ef

def resolve():
    """Return (jobs, covers, unresolved, extras).
    jobs: list of dict(kind='added'|'opi', src, dst, name, album)
    """
    structure, by_album = load()
    jobs, covers, unresolved, extras = [], [], [], []
    seen_edition_cover = set()

    for row in structure:
        aid = row["album_id"]
        folder = edition_folder(row)
        ddir = disc_dir(row)
        songs = by_album.get(aid, [])

        # cover once per edition folder (from disc 1 or first row that has ids)
        ekey = (row["release_id"], row["edition_id"])
        if ekey not in seen_edition_cover:
            ef = os.path.join(BASE, folder)
            if row.get("cover_front_id"):
                covers.append((f"{TATSU}/stream/img/{row['cover_front_id']}", os.path.join(ef, "front.jpg")))
            if row.get("cover_back_id"):
                covers.append((f"{TATSU}/stream/img/{row['cover_back_id']}", os.path.join(ef, "back.jpg")))
            seen_edition_cover.add(ekey)

        if aid in DIRECT:
            for s in songs:
                src = DIRECT[aid].get(s["name"])
                if not src or not os.path.isfile(src):
                    unresolved.append((folder, s["name"], f"direct override missing: {src}"))
                    continue
                jobs.append(dict(kind="added", src=src, dst=os.path.join(ddir, f"{sanitize(s['name'])}.flac"), name=s["name"], album=folder))
        elif aid in ADDED_DIRS:
            srcdir = os.path.join(ADDED, ADDED_DIRS[aid])
            nmap = added_name_map(srcdir)
            for s in songs:
                src = nmap.get(s["name"])
                if not src:
                    unresolved.append((folder, s["name"], f"added file missing in {srcdir}"))
                    continue
                jobs.append(dict(kind="added", src=src, dst=os.path.join(ddir, f"{sanitize(s['name'])}.flac"), name=s["name"], album=folder))
        else:
            rows = opi_album_songs(aid)
            if isinstance(rows, dict) and "__error__" in rows:
                for s in songs:
                    unresolved.append((folder, s["name"], f"opi album fetch failed: {rows['__error__']}"))
                continue
            name2dl = {r["originalName"]: r["downloadId"] for r in rows}
            for s in songs:
                dl = name2dl.get(s["name"])
                if not dl or dl == "0":
                    unresolved.append((folder, s["name"], "no matching opi track / no downloadId"))
                    continue
                jobs.append(dict(kind="opi", src=f"{OPI}/stream/download/{dl}", dst=os.path.join(ddir, f"{sanitize(s['name'])}.flac"), name=s["name"], album=folder))
            db_names = {s["name"] for s in songs}
            for r in rows:
                if r["originalName"] not in db_names:
                    extras.append((folder, aid, r["originalName"]))
    return jobs, covers, unresolved, extras

def verify_flac(path):
    try:
        if os.path.getsize(path) < 1024:
            return False
        with open(path, "rb") as f:
            return f.read(4) == b"fLaC"
    except Exception:
        return False

def plan_cmd():
    jobs, covers, unresolved, extras = resolve()
    added = sum(1 for j in jobs if j["kind"] == "added")
    opi = sum(1 for j in jobs if j["kind"] == "opi")
    print(f"PLAN: {len(jobs)} flac to place  (added-local={added}, opi-download={opi}), "
          f"{len(covers)} covers")
    if unresolved:
        print(f"\n!! UNRESOLVED ({len(unresolved)}) — new-model songs with no flac source:")
        for folder, name, why in unresolved:
            print(f"   [{folder}] {name}  <-- {why}")
    if extras:
        print(f"\n?? OPI EXTRAS ({len(extras)}) — on opi but NOT in new model (old tracklist noise):")
        for folder, aid, name in extras:
            print(f"   [{folder}] ({aid}) {name}")
    if not unresolved:
        print("\nAll 520 new-model songs have a flac source. ✓")
    json.dump(dict(jobs=jobs, covers=covers), open(f"{SCR}/library_manifest.json", "w"), ensure_ascii=False)
    print(f"\nmanifest={SCR}/library_manifest.json")

def _do_flac(j):
    if verify_flac(j["dst"]):   # idempotent: already downloaded + valid
        return None
    os.makedirs(os.path.dirname(j["dst"]), exist_ok=True)
    for attempt in range(3):
        try:
            if j["kind"] == "added":
                shutil.copyfile(j["src"], j["dst"])
            else:
                data = http_get(j["src"], timeout=120)
                with open(j["dst"], "wb") as f:
                    f.write(data)
            if verify_flac(j["dst"]):
                return None
        except Exception as e:
            last = str(e)[:120]
        else:
            last = "verify failed (not fLaC / too small)"
    return (j["album"], j["name"], last)

def _do_cover(c):
    url, dst = c
    if os.path.isfile(dst) and os.path.getsize(dst) > 512:
        return None
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    for _ in range(3):
        try:
            data = http_get(url, timeout=60)
            if len(data) > 512:
                with open(dst, "wb") as f:
                    f.write(data)
                return None
        except Exception as e:
            last = str(e)[:120]
        else:
            last = "cover too small"
    return (dst, last)

def apply_cmd():
    man = json.load(open(f"{SCR}/library_manifest.json"))
    jobs, covers = man["jobs"], man["covers"]
    print(f"placing {len(jobs)} flac + {len(covers)} covers into {BASE} ...")
    errs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for i, e in enumerate(ex.map(_do_flac, jobs), 1):
            if e: errs.append(e)
            if i % 40 == 0: print(f"  flac {i}/{len(jobs)}")
    cerrs = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        for e in ex.map(_do_cover, covers):
            if e: cerrs.append(e)
    print(f"\ndone. flac_errors={len(errs)}  cover_errors={len(cerrs)}")
    for a, n, why in errs[:20]: print("  FLAC ERR", a, "/", n, "--", why)
    for d, why in cerrs[:20]: print("  COVER ERR", d, "--", why)

if __name__ == "__main__":
    {"plan": plan_cmd, "apply": apply_cmd}[sys.argv[1]]()

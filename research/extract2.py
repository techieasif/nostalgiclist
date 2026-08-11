#!/usr/bin/env python3
"""
nostalgiclist extractor v2 — generic, key-driven.

v1 failed (11% coverage) because it hardcoded key ORDER. Real sites use
{youtubeId,videoId,ytId,id,vid} in any order. v2 keys off the field name,
then validates with the free oEmbed endpoint.

Pipeline:  fetch html + same-origin JS  ->  find KEY:"<11char>" pairs
        ->  keep IDs under plausible keys  ->  oEmbed-validate (keyless, no quota)
        ->  title/author for free
"""
import re, json, sys, urllib.request, urllib.parse, concurrent.futures as cf
from collections import Counter

UA = {"User-Agent": "Mozilla/5.0 (nostalgiclist-spike)"}
ID = r"[A-Za-z0-9_-]{11}"
# keys that plausibly hold a YouTube id, in any quoting style / order
KEYPAT = re.compile(r'["\']?(youtubeId|videoId|ytId|ytid|vid|videoID|id)["\']?\s*:\s*["\'](' + ID + r')["\']')
# a nearby human title, if present
TITLEPAT = re.compile(r'["\']?(title|name|song|track)["\']?\s*:\s*["\']((?:[^"\'\\]|\\.){2,90})["\']')


def get(url, timeout=25):
    try:
        return urllib.request.urlopen(
            urllib.request.Request(url, headers=UA), timeout=timeout
        ).read().decode("utf-8", "replace")
    except Exception:
        return ""


def oembed(vid):
    u = ("https://www.youtube.com/oembed?url="
         + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}", safe="")
         + "&format=json")
    try:
        return json.loads(urllib.request.urlopen(
            urllib.request.Request(u, headers=UA), timeout=12).read().decode())
    except Exception:
        return None


def harvest(site):
    html = get(site)
    if not html:
        return None
    base = re.match(r"https?://[^/]+", site).group(0)
    blob = html
    for a in re.findall(r'(?:src|href)="([^"]+\.js)"', html)[:10]:
        if a.startswith("http") and not a.startswith(base):
            continue
        blob += "\n" + get(urllib.parse.urljoin(site + "/", a))
    pairs = KEYPAT.findall(blob)
    keys = Counter(k for k, _ in pairs)
    # dedupe ids, preserve order
    seen, ids = set(), []
    for _, v in pairs:
        if v not in seen:
            seen.add(v); ids.append(v)
    titles = [t for _, t in TITLEPAT.findall(blob)]
    return {"site": site, "keys": dict(keys), "ids": ids, "titles": titles[:60], "blob_len": len(blob)}


def run(sites, validate_cap=30):
    rows = []
    for s in sites:
        h = harvest(s)
        if not h:
            print(f"  {s:46} UNREACHABLE"); continue
        cand = h["ids"][:validate_cap]
        real = []
        if cand:
            with cf.ThreadPoolExecutor(10) as ex:
                for c, v in zip(cand, ex.map(oembed, cand)):
                    if v:
                        real.append({"youtubeId": c, "title": v["title"], "artist": v.get("author_name")})
        h["verified"] = real
        rows.append(h)
        keydesc = ",".join(f"{k}×{n}" for k, n in sorted(h["keys"].items(), key=lambda x: -x[1])[:3]) or "-"
        print(f"  {s:46} ids={len(h['ids']):3d} verified={len(real):3d}  keys[{keydesc}]")
    return rows


if __name__ == "__main__":
    sites = [l.strip() for l in open("sites.txt") if l.strip()]
    rows = run(sites)
    ok = [r for r in rows if r["verified"]]
    tot = sum(len(r["verified"]) for r in rows)
    print(f"\n=== v2 COVERAGE ===")
    print(f"  sites with >=1 VERIFIED youtube id: {len(ok)}/{len(rows)} = {100*len(ok)//len(rows)}%")
    print(f"  total verified songs (capped at 30/site): {tot}")
    json.dump(rows, open("extract2_results.json", "w"), indent=1, ensure_ascii=False)
    print("\n  per-site:")
    for r in sorted(ok, key=lambda x: -len(x["verified"])):
        print(f"    {len(r['verified']):3d}  {r['site']}")

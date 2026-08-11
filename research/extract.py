#!/usr/bin/env python3
"""
nostalgiclist extractor spike.

Proves the tiered pipeline on real sites:
  T1 structured  : JSON/JS object literals carrying an explicit youtubeId field
  T2 candidates  : bare 11-char regex over HTML + linked JS bundles  (noisy!)
  T3 validate    : keyless YouTube oEmbed -> kills false positives, yields title/author
  T4 enrich      : keyless iTunes Search -> canonical title/artist/album + Apple trackId

No API keys. No quota. Nothing here needs OAuth.
"""
import re, json, sys, urllib.request, urllib.parse, concurrent.futures as cf

UA = {"User-Agent": "Mozilla/5.0 (nostalgiclist-spike)"}
YT_ID = re.compile(r"[A-Za-z0-9_-]{11}")


def get(url, timeout=25):
    try:
        return urllib.request.urlopen(
            urllib.request.Request(url, headers=UA), timeout=timeout
        ).read().decode("utf-8", "replace")
    except Exception:
        return ""


def get_json(url, timeout=20):
    try:
        return json.loads(
            urllib.request.urlopen(
                urllib.request.Request(url, headers=UA), timeout=timeout
            ).read().decode("utf-8", "replace")
        )
    except Exception:
        return None


# ---------- T1: explicit structured tracklists ----------
STRUCTURED = [
    # {"youtubeId":"..","title":"..","artist":".."}  (saloon.wtf, minified JSON in RSC chunk)
    re.compile(r'"youtubeId"\s*:\s*"([A-Za-z0-9_-]{11})"\s*,\s*"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"artist"\s*:\s*"((?:[^"\\]|\\.)*)"'),
    # youtubeId: "..", title: "..", artist: ".."   (roadways.wtf, unminified source)
    re.compile(r'youtubeId\s*:\s*"([A-Za-z0-9_-]{11})"\s*,\s*title\s*:\s*"([^"]*)"\s*,\s*artist\s*:\s*"([^"]*)"'),
]


def tier1(blob):
    out = {}
    for pat in STRUCTURED:
        for vid, title, artist in pat.findall(blob):
            if vid not in out:
                out[vid] = {
                    "youtubeId": vid,
                    "title": json.loads(f'"{title}"') if "\\" in title else title,
                    "artist": json.loads(f'"{artist}"') if "\\" in artist else artist,
                    "tier": "structured",
                }
    return out


# ---------- T3: oEmbed validation (the false-positive killer) ----------
def oembed(vid):
    u = ("https://www.youtube.com/oembed?url="
         + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}", safe="")
         + "&format=json")
    return get_json(u, timeout=12)


# ---------- T4: iTunes Search enrichment (keyless, gives Apple catalog id) ----------
NOISE = re.compile(
    r"\b(full\s+(video\s+)?song|full\s+audio|official\s+(video|audio)|lyrical|lyrics?|"
    r"video\s+song|hd|hq|4k|1080p|720p|remaster(ed)?|w/?\s*english\s+translation|"
    r"jhankar|beat|with\s+lyrics|audio|song)\b", re.I)


def clean_title(raw):
    t = raw
    t = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", t)      # bracketed noise
    t = t.split("|")[0]                                # YouTube pipe-credits
    t = re.sub(r"#\S+", " ", t)                       # hashtags
    t = NOISE.sub(" ", t)
    t = re.sub(r"[^\w\s'&-]", " ", t, flags=re.UNICODE)
    return re.sub(r"\s+", " ", t).strip()


def itunes(term, country="in"):
    if not term:
        return None
    u = ("https://itunes.apple.com/search?term=" + urllib.parse.quote(term)
         + f"&country={country}&media=music&entity=song&limit=1")
    d = get_json(u, timeout=15)
    if d and d.get("resultCount"):
        r = d["results"][0]
        return {
            "appleTrackId": r.get("trackId"),
            "title": r.get("trackName"),
            "artist": r.get("artistName"),
            "album": r.get("collectionName"),
        }
    return None


def extract(site):
    html = get(site)
    if not html:
        return {"site": site, "error": "unreachable"}
    base = re.match(r"https?://[^/]+", site).group(0)

    # gather html + all same-origin JS bundles
    blob = html
    assets = re.findall(r'(?:src|href)="([^"]+\.js)"', html)
    for a in assets[:8]:
        if a.startswith("http") and not a.startswith(base):
            continue
        blob += "\n" + get(urllib.parse.urljoin(site + "/", a))

    found = tier1(blob)
    structured_n = len(found)

    # T2: bare candidates (only needed when T1 came up short)
    raw_cands = set(YT_ID.findall(blob)) - set(found)
    # cheap pre-filter: real IDs almost always mix cases/digits/-_ ; JS identifiers rarely do
    likely = [c for c in raw_cands
              if re.search(r"[-_0-9]", c) and not re.fullmatch(r"[A-Za-z]+", c)]

    return {
        "site": site,
        "structured": structured_n,
        "songs": list(found.values()),
        "raw_candidates": len(raw_cands),
        "prefiltered_candidates": len(likely),
        "candidates": likely[:40],
    }


if __name__ == "__main__":
    sites = sys.argv[1:] or [
        "https://saloon.wtf",
        "https://roadways.wtf",
        "https://haryanaroadways.wtf",
        "https://safaraudio.netlify.app",
        "https://safar-e-up.vercel.app",
    ]
    results = []
    for s in sites:
        r = extract(s)
        results.append(r)
        if "error" in r:
            print(f"{s:38} UNREACHABLE")
            continue
        print(f"{s:38} structured={r['structured']:3d}  "
              f"raw_11char={r['raw_candidates']:3d} -> prefiltered={r['prefiltered_candidates']:3d}")

    # validate the prefiltered candidates from sites that had NO structured data
    print("\n--- oEmbed validation of unstructured candidates ---")
    for r in results:
        if r.get("error") or r["structured"] or not r["candidates"]:
            continue
        with cf.ThreadPoolExecutor(8) as ex:
            vals = list(ex.map(oembed, r["candidates"]))
        real = [(c, v) for c, v in zip(r["candidates"], vals) if v]
        print(f"{r['site']:38} {len(real)}/{len(r['candidates'])} candidates are real videos")
        for c, v in real:
            print(f"     {c}  {v['title'][:66]}")
        r["songs"] = [{"youtubeId": c, "title": v["title"], "artist": v.get("author_name"),
                       "tier": "oembed"} for c, v in real]

    json.dump(results, open("extract_results.json", "w"), indent=1, ensure_ascii=False)
    total = sum(len(r.get("songs", [])) for r in results)
    print(f"\nTOTAL SONGS EXTRACTED ACROSS ALL SITES: {total}")

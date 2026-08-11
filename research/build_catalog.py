#!/usr/bin/env python3
"""
Build the nostalgiclist catalog.

For each site in the trend, extract a validated tracklist using only keyless endpoints:
  T1  key-driven regex over html + same-origin JS   ("youtubeId"|"videoId"|"ytId"|"id": "<11char>")
  T2  YouTube playlist scrape                        (youtube.com/playlist?list=<id> -> "videoId")
  ..  oEmbed validation                              (kills false positives, yields title + channel)

Output: ../app/data/catalog.json
"""
import re, json, os, sys, urllib.request, urllib.parse, concurrent.futures as cf

UA = {"User-Agent": "Mozilla/5.0 (compatible; nostalgiclist/0.1; +https://github.com/)"}
KEYPAT = re.compile(r'["\']?(youtubeId|videoId|ytId|ytid|vid|videoID|id)["\']?\s*:\s*["\']([A-Za-z0-9_-]{11})["\']')
PLPAT = re.compile(r'\b((?:PL|OLAK5uy_)[A-Za-z0-9_-]{10,40})\b')
MAX_TRACKS = 50           # watch_videos hard cap, verified empirically

# theme metadata — curated, since it's editorial not scrapable
THEMES = {
    "saloon.wtf": ("Deluxe Saloon", "90s Bollywood from a ₹20 neighbourhood barber shop", "@ybhrdwj"),
    "roadways.wtf": ("Roadways", "Pahadi bus winding through the mountains", None),
    "haryanaroadways.wtf": ("Haryana Roadways", "Route 47 — Delhi to Hisar via Rohtak, NH-9", None),
    "safar-e-up.vercel.app": ("सफ़र-ए-UP", "A Uttar Pradesh roadways bus, window seat available", "@Shashwat_web3"),
    "safaraudio.netlify.app": ("Safar Audio", "An immersive early-2000s Indian road trip", None),
    "www.deluxesaloon.space": ("Deluxe Saloon Radio", "A live 90s Bollywood radio station", None),
    "busdriver.wtf": ("Bus Driver", "The long-distance Indian bus driver's cabin", None),
    "hornokplease.xyz": ("Horn OK Please", "Non-stop 90s bangers from the highway", None),
    "truckplaylist.wtf": ("Truck Playlist", "Indian truck highway bangers, night run", None),
    "indian-truck-ride.vercel.app": ("Indian Truck Ride", "First-person long-haul across the plains", None),
    "privatebus.online": ("Private Bus", "Kerala private bus — Malayalam bangers", None),
    "town-bus.vercel.app": ("Town Bus", "Tamil Nadu town bus music", None),
    "kudimagan.vercel.app": ("Kudimagan", "Tamil TASMAC anthems", None),
    "thenisai.website": ("Then Isai", "Old Tamil melodies for a quiet Chennai evening", None),
    "bangla-banger.vercel.app": ("Bangla Banger", "Peak Bengali songs of all time", None),
    "mehfil-eosin.vercel.app": ("Mehfil", "A quiet qawwali room — press play", None),
    "mehfil-one.vercel.app": ("Mehfil — Ghazals", "Jagjit Singh, Mehdi Hassan, and a still evening", None),
    "rajasthani-folk.vercel.app": ("Rajasthani Folk", "Ghoomar and the desert songs", None),
    "telugu-mass.vercel.app": ("Telugu Mass", "Tractor Anna and the mass anthems", None),
    "garba.jdhruv.workers.dev": ("Garba", "Navratri in Vadodara, non-stop", None),
    "ganeshai.vercel.app": ("Ganeshotsav", "Pune's mandap, a little louder every year", None),
    "safarfm.vercel.app": ("Safar FM", "Your music for every journey", None),
    "nostalgiahits.in": ("Nostalgia Hits", "Multi-scene nostalgia player", None),
    "the-nostalgia.vercel.app": ("The Nostalgia", "Skeuomorphic vintage Philips cassette deck", None),
    "saloon-clone.vercel.app": ("Deluxe Saloon (mirror)", "A mirror of the original saloon", None),
    "kassita.xyz": ("Kassita", "Moroccan cassette-era nostalgia", None),
    "places-have-sound.vercel.app": ("Places Have Sound", "A tactile world map of local sound", None),
}


def get(url, timeout=25):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)\
            .read().decode("utf-8", "replace")
    except Exception:
        return ""


def oembed(vid):
    u = ("https://www.youtube.com/oembed?url="
         + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}", safe="") + "&format=json")
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=12).read()
        return json.loads(raw)               # 401 body is plain "Unauthorized", not JSON
    except Exception:
        return None


NOISE = re.compile(
    r"\b(full\s+(video\s+)?song|full\s+audio|official\s+(video|audio)|lyrical|lyrics?|"
    r"video\s+song|hd|hq|4k|1080p|720p|remaster(ed)?|complete\s+song|jhankar|super\s+jhankar|"
    r"with\s+lyrics|w\s*/?\s*\+?\s*english\s+translation|english\s+translation|audio|song|movie|"
    r"video|full|unplugged|cover|live|reprise|remix)\b", re.I)


def clean(raw):
    """YouTube titles are stuffed with pipes, credits and hashtags. Strip to a display title."""
    t = raw.split("|")[0]
    t = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", t)
    t = re.sub(r"#\S+", " ", t)
    t = NOISE.sub(" ", t)
    t = re.sub(r"\s*[-–—:]\s*[A-Za-z]{0,2}\s*$", "", t.strip())   # dangling " - S"
    t = re.sub(r"\s*[-–—:,]\s*$", "", t.strip())
    t = re.sub(r"\s+", " ", t).strip(" -–—:·,/+")
    return t or raw[:60]


def collect_ids(site):
    """Returns (ids, source_tier, real_playlist_id).

    Two independent things are collected, because they serve different buttons:

      ids / tier  — the tracklist. T1 (the site's own embedded list) beats T2 (its public
                    YouTube playlist): embedded lists are author-curated, while the public
                    playlists carry duplicate re-uploads and raw noisy titles.

      real_pl     — the site's actual "PL…" YouTube playlist, captured even when T1 supplied
                    the tracks. This matters: YouTube Music renders PL playlists but does NOT
                    recognise the temporary TLGG ids that watch_videos returns (verified — TLGG
                    yields 0 rows and <title>undefined</title>, identical to a garbage id).
                    So the YT Music button can only be offered when a PL id exists.
    """
    html = get(site)
    if not html:
        return [], None, None
    base = re.match(r"https?://[^/]+", site).group(0)
    blob = html
    for a in re.findall(r'(?:src|href)="([^"]+\.js)"', html)[:10]:
        if a.startswith("http") and not a.startswith(base):
            continue
        blob += "\n" + get(urllib.parse.urljoin(site + "/", a))

    # find a genuine playlist id (all-caps candidates are Three.js/WebGL constants)
    real_pl, pl_vids = None, []
    for pid in [c for c in dict.fromkeys(PLPAT.findall(blob)) if not re.fullmatch(r"[A-Z_0-9]+", c)][:6]:
        ph = get(f"https://www.youtube.com/playlist?list={pid}", timeout=30)
        vids = list(dict.fromkeys(re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', ph)))
        if len(vids) >= 3:
            real_pl, pl_vids = pid, vids
            break

    ids = list(dict.fromkeys(v for _, v in KEYPAT.findall(blob)))
    if len(ids) >= 5:
        return ids, "embedded", real_pl
    if pl_vids:
        return pl_vids, f"playlist:{real_pl}", real_pl
    return (ids, "embedded", real_pl) if ids else ([], None, real_pl)


def build_site(site):
    host = re.sub(r"^https?://", "", site).rstrip("/")
    name, blurb, creator = THEMES.get(host, (host, "", None))
    ids, tier, real_pl = collect_ids(site)
    if not ids:
        return {"host": host, "url": site, "name": name, "blurb": blurb,
                "creator": creator, "tier": None, "ytmPlaylist": real_pl, "tracks": []}

    ids = ids[:MAX_TRACKS]
    with cf.ThreadPoolExecutor(10) as ex:
        metas = list(ex.map(oembed, ids))

    tracks, seen_titles = [], set()
    for vid, m in zip(ids, metas):
        if not m:                                   # invalid, private, or embedding-disabled
            continue
        title = clean(m["title"])
        key = re.sub(r"[^a-z0-9]", "", title.lower())[:34]
        if key in seen_titles:                      # same song re-uploaded by another channel
            continue
        seen_titles.add(key)
        tracks.append({"id": vid, "title": title,
                       "raw": m["title"], "channel": m.get("author_name")})
    return {"host": host, "url": site, "name": name, "blurb": blurb, "creator": creator,
            "tier": tier, "ytmPlaylist": real_pl, "tracks": tracks}


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    sites = [l.strip() for l in open(os.path.join(here, "sites.txt")) if l.strip()]
    out = []
    for s in sites:
        r = build_site(s)
        out.append(r)
        print(f"  {r['host']:42} {len(r['tracks']):3d} tracks  "
              f"[{r['tier'] or 'NONE'}]  ytm={r.get('ytmPlaylist') or '—'}", flush=True)

    out = [r for r in out if r["tracks"]]

    # several sites are mirrors of each other (saloon-clone) or share one YouTube
    # playlist — collapse identical track sets, keeping the first (canonical) host
    unique, seen = [], {}
    for r in out:
        key = tuple(sorted(t["id"] for t in r["tracks"]))
        if key in seen:
            print(f"  – dropped {r['host']} (mirrors {seen[key]})")
            continue
        seen[key] = r["host"]
        unique.append(r)
    out = unique
    out.sort(key=lambda r: -len(r["tracks"]))
    dest = os.path.join(here, "..", "app", "data")
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, "catalog.json"), "w") as f:
        json.dump({"generated": "2026-08-11", "sites": out}, f, indent=1, ensure_ascii=False)
    print(f"\n{len(out)} sites, {sum(len(r['tracks']) for r in out)} validated tracks -> app/data/catalog.json")

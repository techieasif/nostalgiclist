# nostalgiclist — hands-on verified findings (2026-08-11)

Everything below I tested directly against live endpoints. Numbers are measured, not quoted.

## 1. The trend is real and 3 days old
- saloon.wtf ("Deluxe Saloon") by Yash Bharadwaj, posted to X 2026-08-08, 1.6M+ views.
- Covered by BusinessToday/MSN on 2026-08-10.
- All 5 seed sites resolve HTTP 200 as of today.
- **saloon.wtf already publishes its own Spotify + YT Music playlists** (both 200):
  - `https://open.spotify.com/playlist/2AVjI8Z57bqMJVtU3V9X1Q`
  - `https://music.youtube.com/playlist?list=PLTJ1PnzCWyFw`
  - Implication: the creators already want this. Partner/aggregate rather than scrape adversarially.

## 1b. The corpus is ~27 sites, not 5 — and it's pan-Indian
Research fleet found and I independently confirmed **27/27 live (HTTP 200)**. No hallucinated URLs.
Beyond the Hindi-belt bus/saloon theme it has already forked regionally:
- Tamil: `town-bus.vercel.app`, `kudimagan.vercel.app`, `thenisai.website`
- Bengali: `bangla-banger.vercel.app` · Malayalam: `privatebus.online`
- Telugu: `telugu-mass.vercel.app` · Rajasthani: `rajasthani-folk.vercel.app`
- Gujarati garba: `garba.jdhruv.workers.dev` · Marathi: `ganeshai.vercel.app`
- Qawwali/ghazal: `mehfil-eosin.vercel.app`, `mehfil-one.vercel.app`
- Trucks: `truckplaylist.wtf`, `hornokplease.xyz`, `busdriver.wtf`, `indian-truck-ride.vercel.app`
- Non-Indian offshoots: `kassita.xyz` (Moroccan), `places-have-sound.vercel.app` (global)
- Note `saloon-clone.vercel.app` is a byte-level clone of saloon.wtf — dedupe by content hash.

## 2. Extraction: tiered, and tier 2 is DEAD

| Site | Stack | Structured tracklist? | Result |
|---|---|---|---|
| saloon.wtf | Next.js/turbopack | YES — JSON in JS chunk | **59 songs** |
| roadways.wtf | plain JS | YES — unminified `const TRACKS=[...]` | **6 songs** |
| safar-e-up.vercel.app | Next.js | no — DOM after interaction | **10 songs** (headless) |
| haryanaroadways.wtf | Vite + Three.js | no | 0 statically |
| safaraudio.netlify.app | plain JS | no | 0 statically |

saloon.wtf song object shape (the gold standard):
```json
{"id":"2OsyNo53MzU","youtubeId":"2OsyNo53MzU",
 "title":"Mere Rashke Qamar (From \"Baadshaho\")",
 "artist":"Nusrat Fateh Ali Khan, Rahat Fateh Ali Khan & Tanishk Bagchi",
 "album":"...","cover":"/covers/2OsyNo53MzU.jpg",
 "previewUrl":"https://audio-ssl.itunes.apple.com/...m4a",
 "rawTitle":"Ustad Nusrat Fateh Ali Khan - Dulhe Ka Sehra Suhana in HD"}
```
`previewUrl` proves saloon.wtf already resolved YouTube→Apple catalog via the **keyless iTunes Search API**.
It managed **32/52 = 61%**, because it matched against noisy `rawTitle`.

### Bare 11-char regex is unusable — measured
`[A-Za-z0-9_-]{11}` over HTML+bundles:
- saloon.wtf: 2184 raw candidates
- haryanaroadways.wtf: 1788 raw candidates → **oEmbed says 0/40 are real videos**
- safaraudio: 183 → 0/40 real
- safar-e-up: 1138 → 1/40 real
False positives are JS identifiers of exactly 11 chars: `BatchedMesh`, `modelMatrix`,
`toneMapping`, `btnPlaylist`, `currentTime`, `ArrayBuffer`, `addBasePath`.

### oEmbed is a perfect, free validator
`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json`
- keyless, **zero YouTube Data API quota**
- returns `title` + `author_name`
- measured: 5/5 junk IDs rejected (400/404), 3/3 real IDs accepted (200)

## 3. Matching: it's a title-cleaning problem, not an ISRC problem

### Deezer as an ISRC source — UNVERIFIED, blocked from here
The research fleet recommended Deezer's free API as the ISRC hub. I could not confirm it:
`api.deezer.com/search?q=Pehla+Nasha` returns HTTP 200 with `total:159` but an **empty
`data:[]`** — consistent with geo/IP restriction on this network. Do not build on it until
tested from your actual deploy region.

### Odesli/Songlink is NOT the bridge — 6/6 failure
Tested 6 real video IDs from these sites against `api.song.link/v1-alpha.1/links`:
every one returned **only `['youtube','youtubeMusic']`** — no Spotify, no Apple Music.
For fan/label re-uploads of old Bollywood, Odesli has no cross-links. Do not build on it.

### iTunes Search API IS the bridge — keyless, returns Apple catalog `trackId`
`https://itunes.apple.com/search?term=<q>&country=in&media=music&entity=song`
- no auth, no key
- returns `trackId` (= Apple Music catalog ID needed for playlist creation), artist, album
- no ISRC field

### Measured match rates — the headline finding
| Input | Match rate |
|---|---|
| Raw YouTube titles | **0/4 = 0%** |
| Raw titles + my naive cleaner | 2/5 (and 1 was WRONG) |
| Site's own curated titles (safar-e-up DOM) | **10/10 = 100%** |
| Site's curated title+artist + similarity gate ≥0.62 | **26/30 = 86%** |

**A similarity gate is mandatory.** iTunes always returns *something* at `limit=1`:
`"Achha Sila Diya Toone Mere Pyar Ka"` → `"Humnava"` by Mithoon (score 0.1) — a
confidently wrong song that would silently land in the user's playlist.

Also note precision ≠ recall: `"Dil Laga Liya Maine Tumse Pyaar Karke"` matched
`"Dil Laga Liya"` by *Jernade Miah* (a cover, not the original), and
`"Mujhse Mohabbat Ka Izhaar Karta"` matched artist *"Satrang Music Official"* (a re-upload
channel). Gate on artist plausibility too, or let users fix matches.

## 4. YouTube `watch_videos` — works, zero auth, zero quota, 50-video cap
`https://www.youtube.com/watch_videos?video_ids=id1,id2,...`
- HTTP 200, redirects to `watch?v=<first>&list=TLGG...` — a real temporary playlist
- no API key, no OAuth, **no Data API quota**
- **Measured cap: 50.** 50 IDs and 52 IDs returned the *identical* playlist ID
  (`TLGGGJZG6yS_fo4x...`) — YouTube silently truncates the tail. Chunk in 50s.
- This is the only "build a playlist" path with no approval gate whatsoever.

### Measured coverage across the full 27-site corpus
| Extractor | Sites covered | Songs |
|---|---|---|
| v1 — hardcoded key **order** (`youtubeId,title,artist`) | 3/27 = **11%** | 95 |
| v2 — keyed on field **name** (`youtubeId\|videoId\|ytId\|id`) + oEmbed validation | 10/27 = **37%** | 211* |

\*capped at 30/site during the run, so true totals are higher.
The other 17 sites expose **zero** `key:"<11char>"` pairs — they fetch or render the tracklist
at runtime. Those need the headless tier, which I verified works (below).

### *** THE BREAKTHROUGH TIER: many sites just embed a YouTube PLAYLIST ***
Scraping `https://www.youtube.com/playlist?list=<id>` for `"videoId":"…"` is **keyless and costs
zero Data API quota**. This single tier beat everything else:

| Site | Playlist ID | Videos |
|---|---|---|
| places-have-sound | PLbN4o30dcPIus5E4Ot8EDIiCpRN7MSXBa | 469 |
| kudimagan (Tamil) | PLxQpegrlImYt1j0PXBEl1-BO3n57kbTDC | 206 |
| mehfil-one (ghazals) | PLJeNQvgQ4Sl9lLAjyhs8vJvA2-HO0rWWX | 100 |
| rajasthani-folk | PLa-awORRWZQw | 100 |
| **haryanaroadways** (unsolvable statically!) | PLN3m4TWNDpyU | **74** |
| saloon.wtf | PLTJ1PnzCWyFw | 62 |
| town-bus | PLWHnzK65Bknc | 59 |
| mehfil-eosin (qawwali) | PLSRj-VDlSajZRf78T9Nn-B4SMkN3LoydP | 55 |
| hornokplease | PLeatb7hupNV_AWUl_7ttbsKeCQh8tF5N4 | 54 |
| safaraudio | PLGRi6lrpu8X4 | 50 |
| …plus 5 more | | |

**15/27 sites, 1383 videos, zero API keys.**
Caveat: the `PL[A-Za-z0-9_-]{10,40}` regex also hits Three.js WebGL constants
(`PLACEMENTMAP`, `PLAY_P3_TO_LINEAR_SRGB`) — drop all-caps candidates and confirm by
actually fetching the playlist page.

### FINAL MEASURED COVERAGE — 77% with no API keys at all
| Tier | Sites |
|---|---|
| key-based (`youtubeId\|videoId\|id`) + oEmbed | 10/27 |
| YouTube playlist scrape | 15/27 |
| **UNION** | **21/27 = 77%** |

Remaining 6: safar-e-up (**solved by headless**, below), busdriver.wtf,
indian-truck-ride, privatebus.online, telugu-mass, safarfm → realistically ~81% with headless.

### Headless tier verified on safar-e-up.vercel.app
Static extraction: 0 songs. In a real browser, after clicking "बस में चढ़ें", the DOM renders a
"CASSETTE BOOKLET — 10 TRACKS" list. Scraped titles came out **already clean**:
`Pehla Nasha, Tujhe Dekha To, Ek Ladki Ko Dekha, Do Dil Mil Rahe Hain, Aankhon Se Tune Kya
Kehna Hai, Mujhse Mohabbat Ka Izhaar Karta, Dil Laga Liya Maine Tumse Pyaar Karke, Chand Ke
Paar Chalo, Chand Sifarish, Main Agar Kahoon`
These matched iTunes **10/10**. The rendered DOM is a *better* source than the underlying
YouTube metadata, because site authors clean titles for display.

## 4b. watch_videos ships YouTube only — NOT YouTube Music (corrected)
Ran saloon.wtf's 52 ids through `watch_videos`, chunked at 50:
```
batch 1 (50) -> TLGGGJZG6yS_fo4xMTA4MjAyNg
batch 2 ( 2) -> TLGGBxznuDQCfX4xMTA4MjAyNg
```
**CORRECTION.** I first reported this as covering both YouTube and YT Music because both URLs
returned HTTP 200. That was insufficient evidence — YT Music returns 200 for any list id.
Asserting on rendered content instead:

| list id | YT Music rows | title |
|---|---|---|
| real `PL…` | 66 / 78 | actual playlist name |
| `TLGG…` from watch_videos | **0** | `undefined` |
| garbage | 0 | "YouTube Music" |

So watch_videos covers **YouTube only**. YT Music needs the site's own `PL…` id — which 12 of the
18 shipped sites publish, all verified rendering real tracks.

## 4c. No-auth fallbacks for the gated platforms — all verified 200
- `https://open.spotify.com/search/<q>` → 200
- `https://music.apple.com/in/search?term=<q>` → 200
- `https://music.youtube.com/search?q=<q>` → 200
- iTunes Search returns a **direct Apple Music catalog URL**, keyless:
  `https://music.apple.com/in/album/pehla-nasha/1340749725?i=1340749968` → 200
  So even without the $99 developer program you can deep-link every song on Apple Music.

## 5. Open items (delegated to research fleet, not yet verified by me)
- Spotify post-Nov-2024 Development Mode 25-user allowlist / Extended Quota Mode availability
- YouTube Data API v3 quota math (10k units/day ÷ 50 per insert = ~200 adds/day)
- Apple MusicKit $99/yr developer membership + end-user subscription requirement
- Whether Data-API-created playlists surface inside YouTube Music

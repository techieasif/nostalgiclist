# nostalgiclist — Feasibility Brief

**Date:** 2026-08-11 · **Verdict:** Buildable this week, on YouTube + YouTube Music only.

Method: a 36-agent research fleet gathered the landscape; I then re-verified every load-bearing
claim myself against live endpoints. Where the two disagree, my direct test wins and I say so.

---

## 1. The trend

saloon.wtf ("Deluxe Saloon") by Yash Bharadwaj, posted to X **2026-08-08**, 1.6M+ views, covered
by Business Today/MSN on 08-10. In 72 hours it forked into a genre.

**The corpus is 27 sites, all confirmed live (27/27 HTTP 200) — not the 5 you started with.**
It has already gone pan-Indian:

| Region / theme | Sites |
|---|---|
| Hindi belt (bus, saloon) | saloon.wtf, roadways.wtf, haryanaroadways.wtf, safar-e-up, safaraudio, deluxesaloon.space, safarfm |
| Trucks / highway | truckplaylist.wtf, hornokplease.xyz, busdriver.wtf, indian-truck-ride |
| Tamil | town-bus, kudimagan, thenisai.website |
| Bengali / Malayalam / Telugu | bangla-banger, privatebus.online, telugu-mass |
| Rajasthani / Gujarati / Marathi | rajasthani-folk, garba.jdhruv.workers.dev, ganeshai |
| Qawwali / ghazal | mehfil-eosin, mehfil-one |
| Non-Indian offshoots | kassita.xyz (Moroccan), places-have-sound (global) |

Two product-shaping facts:
- **saloon.wtf already publishes its own Spotify + YT Music playlists** (both live). The creators
  *want* this. Build it as a directory that credits and links them, not an adversarial scraper.
- `saloon-clone.vercel.app` is a byte-level clone of saloon.wtf. **Dedupe by content hash.**

---

## 2. The hard wall — ranked by how feasible "create a playlist in the user's account" really is

### 1st — YouTube: FULLY OPEN (zero auth)
`https://www.youtube.com/watch_videos?video_ids=id1,id2,…` returns 303 → a real playlist.
No API key, no OAuth, no Google Cloud project, no app review, **no quota**.

> **CORRECTION (superseding an earlier claim in this repo).** I originally wrote that the
> resulting `TLGG…` id "resolves 200 on both youtube.com and music.youtube.com — one call, two
> platforms." **That was wrong**, and it was wrong because I checked only the HTTP status.
> YouTube Music returns 200 for *any* list id, valid or not. Checking the rendered content:
>
> | list id | YT Music track rows | `<title>` |
> |---|---|---|
> | `PLTJ1PnzCWyFw` (saloon.wtf's real playlist) | **66** | "banger songs that play at indian barber shop" |
> | `PLN3m4TWNDpyU` (haryanaroadways' real playlist) | **78** | "Indian Bus Driver's Playlist" |
> | `TLGGexcMV6If0Scx…` (from watch_videos) | **0** | `undefined` |
> | deliberate garbage | **0** | "YouTube Music" |
>
> **YouTube Music does not open watch_videos playlists.** The TLGG id behaves exactly like a
> garbage id there. Status codes are not evidence of rendering — assert on content.

**What this means for the build:** YouTube gets the generated `TLGG` playlist; YouTube Music can
only be offered when the site publishes its own `PL…` playlist. 12 of 18 shipped sites do, and all
12 were verified to render real tracks in YT Music.

*Verified limits (mine, empirical — none of this is documented):*
- **50-video cap, silently truncated.** 50 ids and 52 ids returned the identical playlist id.
- **One bad id destroys the whole playlist.** `[good, ZZZZZZZZZZZ, good]` → YouTube drops the
  `&list=` param entirely and redirects to a bare single video. **Pre-validate every id.**
- The id is **date-encoded and rotates daily**: `TLGGw5WlkOB-Ipc` + `MTA4MjAyNg` → base64 → `1082026`.
- Order-sensitive: reversing the ids yields a different id.

Caveat: YT Music renders the shared playlist through a music-only filter, so non-music videoIds
appear on YouTube but silently vanish in YT Music. Same object, two filters.

### 2nd — YouTube via official Data API: works, but dead at any scale
`playlistItems.insert` costs 50 units and accepts **one video per request** — no batch endpoint.
A 25-song playlist = 50 + 25×50 = **1,300 units**. The 10,000/day pool is **project-wide, not
per-user** → **~7 playlists/day across your entire userbase**.
2026 change in your favour: `search.list` no longer costs 100 units; it has its own bucket of
100 calls/day at 1 unit. Still only 100 track-resolutions/day for everyone combined.
Good news: `youtube.force-ssl` is a **sensitive**, not restricted, scope → **no CASA assessment,
$0** — but Google verification takes 4–8 weeks and unverified caps you at 100 users.

### 3rd — Apple Music: a hard $99/yr gate, but a free read path
Creating a library playlist requires **both** a paid Apple Developer Program membership
($99/yr, confirmed by Apple staff on the developer forums) **and** an active Apple Music
subscription on the end user. No anonymous creation exists. Apple publishes **no rate limits at
all** — not even response headers.
**But:** the keyless iTunes Search API returns a direct catalog URL per song
(`music.apple.com/in/album/pehla-nasha/1340749725?i=1340749968`, verified 200), so you can
deep-link every track on Apple Music for free.

### 4th — Spotify: effectively closed to a public consumer site
Development Mode is capped at **5 users** — *not* the widely-cited 25, which Spotify cut
effective Feb 2026. The app **owner** must hold active Spotify Premium or the app stops working.
Extended Quota Mode requires a registered business with a live service at **250,000+ MAU** — a
closed loop: you need 250k users for permission to exceed 5. Spotify's own Feb 2026 post says
Development Mode "should not be relied on as a foundation for building or scaling a business."
There is no anonymous fallback; playlist writes always need user OAuth.

> **Correction to the research fleet.** One agent claimed `POST /v1/users/{id}/playlists` and
> `POST /v1/playlists/{id}/tracks` were removed in Feb 2026 and now return 403. **This is wrong.**
> I tested both: they return **401** (route exists, needs auth), not 403 or 404. The endpoints
> are alive. The 5-user cap is the real constraint — not endpoint removal.

---

## 3. What actually works today, with no approvals and no money

1. **YouTube + YT Music playlist creation** — `watch_videos`, chunked at 50, ids pre-validated.
2. **Tracklist extraction from ~77% of the corpus** — keyless (§4).
3. **Apple Music + Spotify per-song deep links** — via keyless iTunes Search; all search URLs
   verified 200 (`open.spotify.com/search/<q>`, `music.apple.com/in/search?term=<q>`).

That is a complete, honest product. What you cannot do for free is *write* into Spotify or Apple.

---

## 4. The extraction pipeline

Measured across all 27 sites. **The tier everyone would reach for first is the one that fails.**

| Tier | Method | Coverage |
|---|---|---|
| T0 | `/songs.json`, `/tracks.json` probes | 0/27 — none expose one |
| T1 | Key-driven regex `("youtubeId"\|"videoId"\|"ytId"\|"id"): "<11char>"` + oEmbed validation | **10/27** |
| T2 | **YouTube playlist scrape** — `youtube.com/playlist?list=<id>` → `"videoId":"…"` | **15/27** |
| — | **T1 ∪ T2 (keyless)** | **21/27 = 77%** |
| T3 | Headless + interact, read rendered DOM | solves safar-e-up → ~81% |
| T4 | Human edit / submitter pastes list | the tail |

**T2 is the breakthrough.** Many of these sites don't hand-roll a tracklist at all — they embed a
YouTube playlist. It is keyless, zero-quota, and yielded **1,383 videos across 15 sites**,
including haryanaroadways.wtf (74 tracks) which is *unsolvable* statically.

**Never regex bare 11-char strings.** `[A-Za-z0-9_-]{11}` produced 1,788 candidates on
haryanaroadways of which **oEmbed confirmed 0/40 were real videos**. The false positives are JS
identifiers that happen to be 11 chars: `BatchedMesh`, `modelMatrix`, `toneMapping`,
`currentTime`, `ArrayBuffer`. Same trap on playlist ids — `PLACEMENTMAP` and
`PLAY_P3_TO_LINEAR_SRGB` are Three.js constants. Drop all-caps candidates; confirm by fetching.

**The validator: YouTube oEmbed.** Keyless, returns title + author, not in the quota table.
Measured 5/5 junk rejected, 3/3 real accepted. It doubles as your free metadata source *and* as
the pre-validation that stops one bad id from nuking a `watch_videos` playlist.
Caveats worth coding for: embedding-disabled and age-restricted videos return **401 even though
public**; the 401 body is the plain string `Unauthorized`, **not JSON**, so naive `.json()` throws;
bad ids give 400; and appending `&key=` paradoxically causes a 400.

---

## 5. Matching: a title-cleaning problem, not an ISRC problem

**Odesli/Songlink is not the bridge.** I tested 6 real video ids from these sites — every one
returned only `['youtube','youtubeMusic']`, no Spotify, no Apple. The fleet's own adversarial pass
refuted this claim 2/3 independently. For fan/label re-uploads of old Bollywood there are no
cross-links to find. Do not build on it.

**iTunes Search is the bridge** — keyless, returns `trackId` (the Apple catalog id you need) plus
canonical title/artist/album. This is what saloon.wtf itself used; its `previewUrl` fields are
iTunes preview URLs.

Measured match rates:

| Input | Rate |
|---|---|
| Raw YouTube titles | **0/4 = 0%** |
| Raw + naive cleaning | 2/5, and one was wrong |
| Site's own curated titles | **10/10 = 100%** |
| Curated title+artist, similarity gate ≥0.62 | **26/30 = 86%** |

Two rules follow:
1. **Prefer the site's curated titles over YouTube metadata.** Site authors already strip the
   noise for display; raw titles like `"Na Kajare Ki Dhar mohra Full Hd Video Song 1080p bollyhd
   nettube myodi"` match nothing. saloon.wtf itself only reached 61% because it matched `rawTitle`.
2. **A similarity gate is mandatory.** iTunes always returns *something* at `limit=1`:
   `"Achha Sila Diya Toone Mere Pyar Ka"` → `"Humnava"` by Mithoon, score 0.10. Without a gate that
   silently lands in the user's playlist. Also gate on artist plausibility — `"Dil Laga Liya Maine
   Tumse Pyaar Karke"` matched a cover by *Jernade Miah*, not the original.

**Unverified:** the fleet recommended Deezer as a free ISRC hub. I could not confirm it —
`api.deezer.com/search` returns 200 with `total:159` but an empty `data:[]`, consistent with
geo/IP blocking. Test from your deploy region before relying on it.

---

## 6. Recommended architecture

Stack: Next.js on Vercel + Postgres (Supabase/Neon). No queue needed at v0.

```
submit(url) ──▶ extract  ─┬─ T1 key regex ──┐
                          ├─ T2 playlist    ├─▶ [videoId]  ──▶ oEmbed validate ──▶ title/author
                          └─ T3 headless ───┘                        │
                                                                     ▼
                                                     iTunes Search + similarity gate
                                                                     │
                          ┌──────────────────────────────────────────┴────────┐
                          ▼                                                   ▼
             YouTube / YT Music                                    Spotify / Apple Music
        watch_videos, chunk 50, 0 auth                          per-song deep links (0 auth)
           ⇒ REAL PLAYLIST                                      ⇒ HONEST "open in app"
```

Data model: `site(url, title, creator, theme, content_hash)` ·
`track(site_id, youtube_id, title, artist, apple_track_id, confidence)` ·
`playlist_cache(site_id, tlgg_id, generated_on)` — cache per day, since ids rotate daily.

**Label the buttons honestly.** "Build YouTube Music playlist" creates a real one.
"Open in Spotify" does not — say so. Don't ship a Spotify button that quietly fails for user #6.

---

## 7. Phased plan

**v0 — days, $0, no approvals.** Directory of the 27 sites + "Play all on YouTube Music" via
`watch_videos`. Extraction T1+T2 = 77% coverage. Pre-cache tracklists; never extract at request
time. Credit every source site prominently with a link.

**v1 — +1 week.** Headless tier (T3) for the last ~6 sites; user-submitted + editable tracklists;
iTunes enrichment for Spotify/Apple deep links; per-track "fix this match" UI to clean up the 14%.

**v2 — only if traction justifies the gates.** Google OAuth verification (4–8 weeks, $0) for
permanent YouTube playlists — but note the ~7 playlists/day quota ceiling makes this a premium
feature, not a default. Apple Music write at $99/yr. **Skip Spotify write entirely** unless you
incorporate and hit 250k MAU.

---

## 8. Risks and open questions

- **Attribution is the main ethical risk.** These are hobby projects by individuals who are getting
  real attention. Credit each creator by handle, link the original prominently, honor robots.txt,
  cache aggressively so you send almost no traffic, and offer opt-out. Better: invite them to add a
  `/songs.json` and become partners.
- **The trend may be a 2-week spike.** It's 3 days old. Build cheap; don't over-engineer.
- **`watch_videos` is undocumented** and could break without notice. It's the product's spine —
  keep the Data API path as a fallback behind a flag.
- **oEmbed is equally undocumented.** No vendor guarantee of availability, rate limits, or quota
  exemption. Cache results permanently.
- **Unresolved:** Deezer geo-block; real oEmbed rate limits under load (one agent ran 70/70 clean,
  but no published limit exists); whether `watch_videos` behaves differently for logged-in users.

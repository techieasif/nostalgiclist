# nostalgiclist

A directory of the desi-nostalgia web — the wave of sites that recreate a 90s Indian barber shop,
a Haryana Roadways bus, a qawwali mehfil — with a button that turns any of them into a **real
playlist on your phone**, with no login and no API key.

18 sites · 549 validated songs.

```bash
npm install && npm run dev     # http://localhost:3311
```

## How it works

**Extraction** (`research/build_catalog.py`, run offline) walks each site and pulls its tracklist
using only keyless endpoints:

| Tier | Method | Sites |
|---|---|---|
| T1 | key-driven regex — `"youtubeId"\|"videoId"\|"ytId"\|"id": "<11 chars>"` over HTML + JS bundles | 10/27 |
| T2 | YouTube playlist scrape — `youtube.com/playlist?list=<id>` → `"videoId"` | 15/27 |
| — | **union, no API keys** | **21/27 = 77%** |

Every candidate id is then validated through **YouTube oEmbed** (keyless, no Data API quota),
which both filters false positives and returns the title and channel for free.

**Playlist building** (`app/api/playlist/route.ts`) posts the ids to YouTube's undocumented
`watch_videos` endpoint and reads the playlist id out of the redirect. No OAuth, no quota, no
Google Cloud project.

## Things that will bite you

These are all verified empirically — none are documented by Google.

- **A bare 11-char regex does not work.** It returned 1,788 candidates on one site of which
  *zero* were real videos. `BatchedMesh`, `modelMatrix`, `currentTime` are all exactly 11
  characters. Always validate. Same trap for playlist ids: `PLACEMENTMAP` and
  `PLAY_P3_TO_LINEAR_SRGB` are Three.js constants.
- **`watch_videos` caps at 50 ids** and silently truncates — 50 ids and 52 ids return the *same*
  playlist.
- **One bad id destroys the whole playlist.** YouTube drops the `&list=` param entirely and
  redirects to a single bare video. This is why every id is pre-validated at build time.
- **The returned `TLGG…` id is date-encoded and rotates daily** (`…MTA4MjAyNg` → `1082026`), so
  the API caches per-day.
- **YouTube Music cannot open `watch_videos` playlists.** A `TLGG` id renders 0 tracks with
  `<title>undefined</title>` there — identical to a garbage id — while a real `PL` id renders
  fine. HTTP status is 200 either way, so *assert on content, not status*. The YT Music button
  therefore appears only for the 12 sites that publish their own `PL` playlist; all 12 verified.

## On a phone

The playlist links are plain `https://` URLs to `music.youtube.com` and `www.youtube.com`, which
are claimed by the YouTube Music and YouTube apps as Android App Links / iOS Universal Links — so
tapping one opens the app when it's installed, and the web player when it isn't.

The catch, and the reason the buttons look the way they do: **`target="_blank"` breaks this.**
iOS will not resolve a Universal Link opened via `window.open` or a new tab; it silently falls
back to the web page. So the result buttons navigate in the *same tab* on touch devices and only
open a new tab on desktop (`SiteCard.tsx`). Layout is single-column under 700px with every tap
target at 44px or larger.

## Why only YouTube

- **Spotify** caps apps created today at **5 users**, and the app owner must hold Premium.
  Extended quota needs a registered business at 250k+ MAU.
- **Apple Music** needs a $99/yr developer membership *and* an active user subscription.

Both can still be deep-linked per song via the keyless iTunes Search API — that's the v1 plan.
Full analysis in [`research/FEASIBILITY.md`](research/FEASIBILITY.md).

## Deploy (Vercel)

The app is at the repo root and `vercel.json` pins `"framework": "nextjs"`, so no dashboard
configuration is needed. Root Directory stays `./`. No environment variables — there are no API
keys anywhere in this project.

If you ever see *"No Output Directory named `public` found after the Build completed"*, it means
the project's Framework Preset reverted to **Other**: Vercel runs the Next build successfully and
then looks for a static site. The `vercel.json` above is what prevents that.

Two things to know about it on serverless:

- The playlist route's day-cache is an in-memory `Map`, so it resets on every cold start. That
  costs an extra `watch_videos` round-trip, nothing more. Move it to Vercel KV if it matters.
- `data/catalog.json` is a build-time snapshot. Re-run `python3 research/build_catalog.py`
  and commit the result to refresh the songs; nothing is fetched from the source sites at
  request time.

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) — cookieless, no PII, so no consent
banner is required. Two things are measured:

- **page views**, via `<Analytics />` in `app/layout.tsx`
- **`playlist_built`**, fired server-side from the API route with `site`, `songs` and
  `hasYouTubeMusic`. Server-side on purpose: ad blockers eat client-side events, and this is the
  only number that says whether the product works rather than just gets looked at.

It has to be switched on once in the dashboard — **Project → Analytics → Enable**. Nothing is
collected until you do.

**The Hobby cap is 50,000 events/month**, and a page view is an event. If the launch lands, that
can go quickly. It fails safe: collection *pauses* until the next cycle rather than billing you,
and Hobby can't buy more. The site keeps working either way — analytics never blocks a playlist
build (the `track()` call is wrapped in try/catch).

## Credit

Every site here was made by someone else, on their own time, in the space of about a week.
Each card links to the original — go tell them.

## Layout

```
app/                     Next.js App Router
  page.tsx               directory
  SiteCard.tsx           per-site card + build button
  api/playlist/          watch_videos resolver (50-chunk, daily cache)
data/catalog.json        generated — do not hand-edit
research/
  build_catalog.py       the extractor that generates catalog.json
  FEASIBILITY.md         platform-by-platform analysis
  VERIFIED_FINDINGS.md   raw measurements
  extract.py             spike 1 — hardcoded key order, 11% coverage
  extract2.py            spike 2 — key-name driven, 37%
  tier_playlist.py       spike 3 — playlist scrape, the jump to 77%
```

Refresh the catalog with `python3 research/build_catalog.py`.

import { NextRequest, NextResponse } from "next/server";
import { track } from "@vercel/analytics/server";
import catalog from "@/data/catalog.json";

export const runtime = "nodejs";

/**
 * Resolves a site's tracklist into a real YouTube playlist via the undocumented
 * watch_videos endpoint. No API key, no OAuth, no quota.
 *
 * Verified constraints (empirical — none of this is documented by Google):
 *  - hard cap of 50 video ids; extras are silently truncated
 *  - ONE bad id makes YouTube drop the &list= param entirely, yielding a bare video
 *  - the returned TLGG id is date-encoded and rotates daily, so cache per-day
 */
const MAX_IDS = 50;

type Entry = { id: string; day: string };
const cache = new Map<string, Entry>();

const today = () => new Date().toISOString().slice(0, 10);

async function resolvePlaylist(ids: string[]): Promise<string | null> {
  const url =
    "https://www.youtube.com/watch_videos?video_ids=" +
    ids.slice(0, MAX_IDS).join(",");

  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; nostalgiclist/0.1)" },
  });

  // YouTube signals failure by omitting &list= rather than erroring
  const m = res.url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("site");
  if (!host) {
    return NextResponse.json({ error: "missing ?site" }, { status: 400 });
  }

  const site = (catalog.sites as any[]).find((s) => s.host === host);
  if (!site || !site.tracks?.length) {
    return NextResponse.json({ error: "unknown site" }, { status: 404 });
  }

  const day = today();
  const hit = cache.get(host);
  if (hit && hit.day === day) {
    return NextResponse.json({ ...build(hit.id, site), cached: true });
  }

  try {
    const ids = site.tracks.map((t: any) => t.id);
    const listId = await resolvePlaylist(ids);
    if (!listId) {
      return NextResponse.json(
        { error: "youtube_rejected", detail: "watch_videos returned no list — likely a dead video id" },
        { status: 502 }
      );
    }
    cache.set(host, { id: listId, day });

    // The number worth knowing: how many playlists actually get built, and for which
    // sites. Recorded two ways, because the good one costs money:
    //
    //  1. a structured log line — free on Hobby. Vercel → Logs, filter `playlist_built`.
    //  2. a Web Analytics custom event — ONLY records on Pro. On Hobby the dashboard
    //     shows "No custom events" and this is a no-op. Left in so it starts working
    //     the moment the project upgrades.
    //
    // Neither may break the thing the user actually asked for.
    const detail = {
      event: "playlist_built",
      site: host,
      songs: Math.min(site.tracks.length, MAX_IDS),
      hasYouTubeMusic: Boolean(site.ytmPlaylist),
    };
    console.log(JSON.stringify(detail));

    try {
      await track("playlist_built", {
        site: detail.site,
        songs: detail.songs,
        hasYouTubeMusic: detail.hasYouTubeMusic,
      });
    } catch {
      /* best-effort; no-op on Hobby */
    }

    return NextResponse.json({ ...build(listId, site), cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", detail: String(e) }, { status: 502 });
  }
}

function build(listId: string, site: any) {
  const count = Math.min(site.tracks.length, MAX_IDS);

  // YouTube Music does NOT render watch_videos' temporary TLGG playlists — verified: a TLGG id
  // returns 0 track rows and <title>undefined</title>, identical to a garbage id, while a real
  // PL id returns a full tracklist. So only offer YT Music when the site has a genuine PL.
  const pl = site.ytmPlaylist as string | null;

  return {
    listId,
    count,
    truncated: site.tracks.length > MAX_IDS,
    youtube: `https://www.youtube.com/playlist?list=${listId}`,
    youtubeMusic: pl ? `https://music.youtube.com/playlist?list=${pl}` : null,
  };
}

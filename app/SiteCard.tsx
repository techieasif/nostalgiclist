"use client";

import { useEffect, useState } from "react";

type Track = { id: string; title: string; channel?: string };
export type Site = {
  host: string;
  url: string;
  name: string;
  blurb: string;
  creator?: string | null;
  tier: string | null;
  tracks: Track[];
};

type Result = {
  listId: string;
  count: number;
  truncated: boolean;
  youtube: string;
  youtubeMusic: string | null;
};

export default function SiteCard({ site }: { site: Site }) {
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [onPhone, setOnPhone] = useState(false);

  // On a phone these are https App Links / Universal Links: youtube.com is claimed by the
  // YouTube app and music.youtube.com by YouTube Music, so a plain same-tab navigation hands
  // off to the installed app. Opening in a NEW TAB defeats that — iOS in particular will not
  // resolve a Universal Link from window.open/target=_blank and just renders the web page.
  // So: same tab on touch devices, new tab on desktop.
  useEffect(() => {
    setOnPhone(
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820
    );
  }, []);

  const linkProps = onPhone
    ? {}
    : { target: "_blank", rel: "noopener noreferrer" as const };

  async function build() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/playlist?site=${encodeURIComponent(site.host)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error || "could not build playlist");
      setRes(j);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const viaPlaylist = site.tier?.startsWith("playlist:");

  return (
    <article className="card">
      <h2>{site.name}</h2>
      <p className="blurb">{site.blurb}</p>

      <div className="meta">
        <span className="chip count">{site.tracks.length} songs</span>
        <span className="chip">{viaPlaylist ? "yt playlist" : "on-page list"}</span>
        <span className="chip">
          <a href={site.url} target="_blank" rel="noopener noreferrer">
            {site.host} ↗
          </a>
        </span>
        {site.creator && (
          <span className="chip">
            <a
              href={`https://x.com/${site.creator.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {site.creator}
            </a>
          </span>
        )}
      </div>

      <div className="actions">
        <button className="btn" onClick={build} disabled={busy}>
          {busy ? "बना रहे हैं…" : "▶ Build playlist"}
        </button>
        <button className="btn ghost" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide songs" : "Songs"}
        </button>
      </div>

      {err && (
        <div className="result">
          <span className="err">✕ {err}</span>
        </div>
      )}

      {res && (
        <div className="result">
          <strong>{res.count} songs</strong> queued up and ready.
          <div className="row">
            {res.youtubeMusic && (
              <a className="btn go" href={res.youtubeMusic} {...linkProps}>
                ♪ YouTube Music
              </a>
            )}
            <a
              className={res.youtubeMusic ? "btn" : "btn go"}
              href={res.youtube}
              {...linkProps}
            >
              ▶ YouTube
            </a>
          </div>
          {res.truncated && (
            <p className="note">
              First 50 only — YouTube caps anonymous playlists there.
            </p>
          )}
          <p className="note">
            {onPhone ? "Opens in the app if you have it. " : ""}
            {res.youtubeMusic
              ? "No login needed."
              : "No login needed. No YouTube Music version — this site doesn’t publish a playlist, and YT Music can’t open temporary ones."}
          </p>
        </div>
      )}

      {open && (
        <div className="tracks">
          <ol>
            {site.tracks.map((t, i) => (
              <li key={t.id}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span>{t.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

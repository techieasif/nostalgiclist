"use client";

import { useState } from "react";

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
            <a className="btn go" href={res.youtube} target="_blank" rel="noopener noreferrer">
              ▶ YouTube
            </a>
            {res.youtubeMusic && (
              <a
                className="btn"
                href={res.youtubeMusic}
                target="_blank"
                rel="noopener noreferrer"
              >
                ♪ YouTube Music
              </a>
            )}
          </div>
          {res.truncated && (
            <p className="note">
              First 50 only — YouTube caps anonymous playlists there.
            </p>
          )}
          <p className="note">
            {res.youtubeMusic
              ? "No login needed. The YouTube link is fresh today; the Music link is this site’s own playlist."
              : "No login needed. This link is fresh today — rebuild it tomorrow. (No YouTube Music version: this site doesn’t publish a playlist, and YT Music can’t open temporary ones.)"}
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

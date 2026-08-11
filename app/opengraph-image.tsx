import { ImageResponse } from "next/og";
import catalog from "@/data/catalog.json";

export const alt =
  "nostalgiclist — the desi nostalgia web, collected. Every site turns into a real playlist.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The social card. Kept to Latin glyphs and flat shapes on purpose: ImageResponse
 * ships a Latin font only, so Devanagari would render as tofu boxes.
 */
export default function OG() {
  const sites = (catalog.sites as any[]).length;
  const songs = (catalog.sites as any[]).reduce((n, s) => n + s.tracks.length, 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(160deg,#f9edd4 0%,#f7e8c9 40%,#efd9ae 100%)",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* marigold garland */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: 50,
                height: 50,
                borderRadius: 25,
                background: i % 2 ? "#e8890f" : "#f2a71b",
                border: "6px solid #b8860b",
                marginTop: i % 2 ? 6 : 0,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 10,
            color: "#c22d2d",
            fontWeight: 700,
            marginTop: 40,
          }}
        >
          EK SAFAR · KUCHH PURANE GAANE
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 132,
            fontWeight: 700,
            color: "#1a2745",
            letterSpacing: -3,
            marginTop: 14,
          }}
        >
          nostalgiclist
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#6b4a32",
            fontStyle: "italic",
            marginTop: 22,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          The desi nostalgia web, collected — and every one of them
          turns into a real playlist on your phone.
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              border: "4px solid #c22d2d",
              color: "#c22d2d",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {sites} sites
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              border: "4px solid #0d7b78",
              color: "#0d7b78",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {songs} songs
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 28px",
              borderRadius: 999,
              background: "#f2a71b",
              border: "4px solid #2a1a10",
              color: "#2a1a10",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            HORN OK PLEASE
          </div>
        </div>

        {/* truck-art chevron strip */}
        <div style={{ display: "flex", position: "absolute", bottom: 0, left: 0 }}>
          {Array.from({ length: 47 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: 30,
                height: 30,
                background: i % 2 ? "#c22d2d" : "#0d7b78",
                transform: "rotate(45deg)",
                marginLeft: -4,
              }}
            />
          ))}
        </div>
      </div>
    ),
    size
  );
}

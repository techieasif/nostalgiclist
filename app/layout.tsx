import type { Metadata } from "next";
import "./globals.css";

const SITE = "https://nostalgiclist.vercel.app";
const TITLE = "nostalgiclist — the desi nostalgia web, collected";
const DESC =
  "Someone built a website that plays the songs from a 90s Indian barber shop. Then everyone did. They're all here — and every one turns into a real YouTube Music playlist. No login, no app.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  applicationName: "nostalgiclist",
  keywords: [
    "saloon.wtf", "nostalgia", "90s Bollywood", "YouTube Music playlist",
    "Indian music", "retro", "desi web",
  ],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "nostalgiclist",
    title: TITLE,
    description: DESC,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="garland" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}

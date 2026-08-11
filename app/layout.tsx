import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nostalgiclist — साफ़ आवाज़, पुरानी सड़क",
  description:
    "The desi nostalgia web, collected. Turn any of these sites into a real YouTube Music playlist — no login, no app.",
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

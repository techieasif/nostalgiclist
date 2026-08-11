import catalog from "@/data/catalog.json";
import SiteCard, { type Site } from "./SiteCard";
import Facts from "./Facts";

export default function Home() {
  const sites = catalog.sites as Site[];
  const songs = sites.reduce((n, s) => n + s.tracks.length, 0);

  return (
    <main className="wrap">
      <header className="hero">
        <div className="devanagari">एक सफ़र · कुछ पुराने गाने</div>
        <h1>nostalgiclist</h1>
        <p className="tag">
          Someone built a website that plays the songs from a 90s barber shop. Then
          everyone did. They&rsquo;re all collected here — and every one of them turns
          into a real playlist on your phone.
        </p>
        <div className="plate">HORN OK PLEASE</div>
      </header>

      <div className="divider" aria-hidden="true" />

      <section className="grid">
        {sites.map((s) => (
          <SiteCard key={s.host} site={s} />
        ))}
      </section>

      <footer className="foot">
        <div className="divider" aria-hidden="true" />
        <p>
          <strong>{sites.length} sites · {songs} songs</strong> — every one made by
          someone else. Tap through and go tell them.
        </p>
        <Facts />
      </footer>
    </main>
  );
}

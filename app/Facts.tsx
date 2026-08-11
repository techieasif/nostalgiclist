"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Liner-note trivia, as an autoplaying carousel.
 *
 * Every fact here was checked against a source before it went in. Several of the
 * versions that circulate online are subtly wrong — "Pehla Nasha" was the first
 * *Hindi* song shot in slow motion (not the first Indian one), and playback singing
 * started with the *Bengali* Bhagya Chakra before its Hindi remake. The qualifiers
 * below are deliberate.
 */
type Fact = { kicker: string; head: string; body: string; year: string };

const FACTS: Fact[] = [
  {
    kicker: "the first voice",
    year: "1902",
    head: "“My name is Gauhar Jaan!”",
    body:
      "India’s first commercial recording was cut in Calcutta in November 1902. Gauhar Jaan had to climb onto a table, crane her head into a horn on the wall and sing as loudly as she could — then shout her name at the end, so the technicians pressing the wax masters in Hanover would know whose record it was. She ended every recording that way for the rest of her career.",
  },
  {
    kicker: "the voice is never the face",
    year: "1935",
    head: "Playback begins",
    body:
      "Nitin Bose had the idea of recording the song separately and letting the actor mouth it. He tried it first in the Bengali film Bhagya Chakra, then in its Hindi remake Dhoop Chhaon the same year. For ninety years since, the voice coming out of the screen has almost never belonged to the person on it.",
  },
  {
    kicker: "no synthesiser involved",
    year: "1975",
    head: "R.D. Burman’s bottles",
    body:
      "That opening on “Mehbooba Mehbooba” from Sholay is R.D. Burman and his assistants blowing across half-filled bottles, each tuned by how much was left inside. He used the same trick again for “O Manjhi Re” in Khusboo.",
  },
  {
    kicker: "shot at the wrong speed on purpose",
    year: "1992",
    head: "Pehla Nasha, frame by frame",
    body:
      "“Pehla Nasha” was the first Hindi song filmed almost entirely in slow motion. The trick: the actors danced while mouthing a sped-up version of the track, and the high-speed film was then slowed by exactly the same factor — so the movement floats while the words still land on time.",
  },
  {
    kicker: "a juice stall in Daryaganj",
    year: "1983",
    head: "How the cassette won",
    body:
      "Gulshan Kumar was selling fruit juice in Delhi when he started Super Cassettes — later T-Series — on 11 July 1983. He undercut everyone by selling tapes at about a third of the going price. That cheapness is precisely why film music reached every barber shop, bus and dhaba in the country.",
  },
  {
    kicker: "the biggest of them all",
    year: "1990",
    head: "Aashiqui outsold everything",
    body:
      "Nadeem–Shravan’s soundtrack for Aashiqui, put out by T-Series, is still the highest-selling Hindi film soundtrack ever made — around 20 million units. Kumar Sanu and Anuradha Paudwal sang most of it, over the shimmering jhankar percussion that would define the whole decade.",
  },
  {
    kicker: "never took a lesson",
    year: "—",
    head: "Kishore Kumar, untrained",
    body:
      "Kishore Kumar had no formal classical training at all, in an era when rigorous classical grounding was the price of entry to playback singing. He won a record eight Filmfare awards anyway. Bhimsen Joshi is said to have remarked: “It was good he never learnt classical singing. If he had, then who would have come to listen to people like us?”",
  },
  {
    kicker: "older than the movies",
    year: "1901",
    head: "The archive behind all of this",
    body:
      "Saregama started life in 1901 as The Gramophone Company of India, and traded for decades as HMV. It is the oldest music label in the country — and most of the songs on this page still live somewhere in its vaults.",
  },
];

const INTERVAL = 9000;

export default function Facts() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // enable animation only after mount, so the server and client agree on first paint
  useEffect(() => setMounted(true), []);

  const go = useCallback((n: number) => setI((c) => (n + FACTS.length) % FACTS.length), []);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => go(i + 1), INTERVAL);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [i, paused, go]);

  return (
    <section
      className="facts"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Indian music facts"
    >
      <div className="facts-head">
        <span className="reel" data-spin={mounted && !paused} aria-hidden="true" />
        <span className="facts-label">कैसेट के पीछे · liner notes</span>
        <span className="facts-count">
          {String(i + 1).padStart(2, "0")} / {String(FACTS.length).padStart(2, "0")}
        </span>
      </div>

      <div className="facts-window">
        <div
          className="facts-track"
          style={{
            transform: `translateX(-${i * 100}%)`,
            transition: mounted ? undefined : "none",
          }}
        >
          {FACTS.map((f, n) => (
            <article className="facts-slide" key={f.head} aria-hidden={n !== i}>
              <div className="facts-kicker">
                <span className="facts-year">{f.year}</span>
                {f.kicker}
              </div>
              <h3>{f.head}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="facts-bar" aria-hidden="true">
        <span
          key={`${i}-${paused}`}
          className="facts-fill"
          data-run={!paused && mounted}
          style={{ animationDuration: `${INTERVAL}ms` }}
        />
      </div>

      <div className="facts-foot">
        <div className="facts-nav">
          <button className="facts-btn" onClick={() => go(i - 1)} aria-label="Previous fact">
            ◀◀
          </button>
          <button
            className="facts-btn"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? "▶" : "❙❙"}
          </button>
          <button className="facts-btn" onClick={() => go(i + 1)} aria-label="Next fact">
            ▶▶
          </button>
        </div>

        <div className="facts-dots" role="tablist">
          {FACTS.map((f, n) => (
            <button
              key={f.head}
              role="tab"
              aria-selected={n === i}
              aria-label={f.head}
              className={n === i ? "on" : ""}
              onClick={() => setI(n)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

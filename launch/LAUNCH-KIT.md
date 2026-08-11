# nostalgiclist — X/Twitter launch kit

Live: **https://nostalgiclist.vercel.app** · Repo: https://github.com/techieasif/nostalgiclist
18 sites · 549 songs · 12 of the 18 also get a YouTube Music link.

> **The one rule for this launch:** you are the fifth person to arrive at someone else's party.
> Every site here was made by someone else, in the last two weeks, for free. Lead with credit in
> every version below. A directory that reads like a land-grab will get dunked on, and it would
> deserve it.

---

## 1. The main tweet — pick one

### A. Credit-forward *(recommended — safest and truest)*

```
Someone made a website that plays the songs from a 90s Indian barber shop.

Then everyone did. Bus rides, dhabas, qawwali rooms, garba nights.

I put 18 of them in one place — and made every one turn into a real playlist on your phone.

No login, no app.

nostalgiclist.vercel.app
```

### B. The itch *(best if you want replies)*

```
The catch with all these desi nostalgia sites: the songs only live in that tab.

So I collected 18 of them and gave each one a button that builds a real YouTube Music playlist.

549 songs. No login, no API key, nothing stored.

nostalgiclist.vercel.app
```

### C. Sense-memory *(best for reach beyond dev-twitter)*

```
₹20 haircut. A tape deck behind the mirror. Kumar Sanu on loop, whether you liked it or not.

18 people rebuilt rooms like that on the internet this month.

I put them in one place — and made each one a playlist you can actually take with you.

nostalgiclist.vercel.app
```

---

## 2. The reply to the original post *(highest leverage — do this)*

Reply to **https://x.com/ybhrdwj/status/2086060356133404746** (@ybhrdwj, saloon.wtf, the post
that started the whole thing). This is where the audience already is, and a humble reply to the
originator travels further than a cold launch.

```
this made me want the songs on my phone, not just in the tab

so i built that — yours plus 17 others that followed, each one turns into a real YT Music playlist in a tap

saloon.wtf is still the one that started it 🙏

nostalgiclist.vercel.app
```

Post the main tweet first, then this reply ~15 minutes later so the reply has somewhere to point.

---

## 3. The thread *(post under whichever main tweet you choose)*

Dev-twitter will actually enjoy this one — the findings are real and slightly counterintuitive.

**2/**
```
First surprise: the trend is way bigger than the timeline suggests.

It's not 4 sites. It's at least 27, and it's already forked regionally —
Tamil, Bengali, Malayalam, Telugu, Rajasthani, garba, Ganeshotsav, qawwali, ghazals.

Somebody even made a Moroccan one.
```

**3/**
```
To build a playlist you first need the songs, and the obvious approach fails badly.

YouTube IDs are 11 characters, so I regexed for 11-char strings. Got 1,788 hits on one site.

Real videos among them: zero.

BatchedMesh. modelMatrix. currentTime. All exactly 11 characters.
```

**4/**
```
What actually worked: most of these sites don't hand-roll a tracklist at all — they just embed a YouTube playlist.

Scraping that + a keyed regex gets 77% of the sites, with no API key and no quota.

YouTube's oEmbed endpoint validates each ID for free.
```

**5/**
```
The playlist itself is the fun part:

youtube.com/watch_videos?video_ids=a,b,c

No OAuth. No API key. No quota. It just hands you a playlist.

Undocumented, so the limits are undocumented too. I found them the hard way.
```

**6/**
```
Two that cost me:

• it silently caps at 50 videos — 50 ids and 52 ids return the *same* playlist
• ONE dead id and you get no playlist at all, just a bare video

So every id is validated before it's ever sent.
```

**7/**
```
Also worth knowing: YouTube Music won't open those temporary playlists. Renders 0 tracks.

Took me a while because the HTTP status is 200 either way — it just quietly shows nothing.

So YT Music only appears for the 12 sites that publish a real playlist.
```

**8/** *(the closer — credit)*
```
Every site on there was made by someone else, on their own time, in about two weeks.

Each card links straight to the original. Go tell them it's good.

nostalgiclist.vercel.app

(code, and the research notes: github.com/techieasif/nostalgiclist)
```

---

## 4. Media

**Attach an image to the main tweet.** Tweets with images get materially more engagement, and
the link card alone is easy to scroll past.

| Slot | What to capture | Alt text |
|---|---|---|
| Main tweet | The homepage top — garland, wordmark, HORN OK PLEASE plate, first row of cards | "The nostalgiclist homepage, styled like vintage Indian truck art: a marigold garland, the wordmark, and cards for Deluxe Saloon, Safar Audio and Kassita." |
| Alt / mobile | A phone screenshot of one card with the YouTube Music + YouTube buttons showing | "A phone screen showing the Deluxe Saloon card with 49 songs and two buttons: YouTube Music and YouTube." |
| Thread 8/ | The liner-notes carousel on the Gauhar Jaan slide | "A cassette-styled card reading 'My name is Gauhar Jaan!' about India's first commercial recording in 1902." |

The social card at `/opengraph-image` is generated automatically and already looks right —
that's what renders when someone pastes the link.

**A 10–20s screen recording beats all of it** if you have a minute: tap Build playlist → YouTube
Music opens with the songs in it. That's the whole pitch, and it's the part people won't believe
until they see it.

---

## 5. Timing and etiquette

- **Post 8–11pm IST**, weekday. That's peak Indian timeline, and this is an Indian audience first.
- **Do not mass-tag the 18 creators.** It reads as spam and it'll be the thing people reply about.
  Credit them in the thread, link every card to the original, and let them find it. If you want to
  tag, tag only @ybhrdwj in the reply above — they started it.
- **Reply to the quote-tweets of the original**, not just the main post. That's where the other
  builders are hanging out.
- Cross-post to **r/india** and **r/developersIndia** the next morning; the tech thread does better
  on HN as *"Show HN: I collected the Indian nostalgia sites and made them into playlists"*.

---

## 6. Replies you should have ready

**"Spotify?"** — the one you'll get most.
```
Wanted to. Can't, honestly.

Spotify caps apps made today at 5 users total, and Extended access needs a registered business at 250k+ MAU. Apple Music needs a $99/yr developer account.

YouTube is the only one that lets you do this with no login at all. So that's what shipped.
```

**"You're just scraping other people's work."**
```
Fair thing to check. Every card links straight to the original site, top of the card, and the songs are cached so I send almost no traffic their way.

Happy to remove any site the moment its maker asks — that's a real offer, not a line.
```

**"Song X is wrong / missing."**
```
Yeah, that'll happen. Titles come from YouTube and they're a mess — "Full Video HD 1080p bollyhd nettube" isn't a song name.

Send me which one and I'll fix it.
```

**"How does it work without login?"** → point at thread 5/ and 6/, or the README.

**"Add my site!"** → say yes, ask for the URL, and add it to `research/sites.txt` + rerun the
catalog. This is the best possible reply to get — treat it as the win condition.

---

## 7. Day 2–4 follow-ups

- **The one number that travels:** "the regex for YouTube IDs returned 1,788 matches on one site
  and *zero* were real videos" — that's the most screenshot-able finding you have.
- **A regional cut:** "there's a Tamil one, a Bengali one, a Malayalam one, a garba one" with
  screenshots. Reaches audiences the Hindi-belt framing misses entirely.
- **A creator spotlight:** quote-tweet one of the 18 makers per day. Costs nothing, builds goodwill,
  and gives you a week of posts without repeating the launch.
- **If a maker replies warmly**, ask them to publish a `/songs.json`. Two of them adding that turns
  this from scraping into a small, actual standard.

---

## 8. Before you hit post

- [ ] Paste the link into the X composer and confirm the card renders (needs one deploy after the
      OG image shipped; X caches aggressively — use cards.twitter.com/validator to bust it)
- [ ] Open the site on your own phone and tap Build playlist — confirm the app opens, not Safari
- [ ] Check the 549/18 numbers still match the live site if you've rebuilt the catalog
- [ ] Have the "Spotify?" reply in your clipboard

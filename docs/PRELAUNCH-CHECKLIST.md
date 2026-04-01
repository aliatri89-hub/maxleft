# MANTL Pre-Launch Checklist
*Last updated: April 1, 2026*

---

## 🔴 Blockers

- [ ] **Swap RevenueCat API key to production** — Integration is complete and fully wired. Replace `test_ttZsXEQKINarORbnqQPrgKhhwZo` in `src/utils/revenueCat.js` with the production Google key before launch. iOS key still pending MacBook setup.
- [ ] **Seed badges** — Badge system is built and working; content just needs seeding. See `docs/HANDOFF-badge-seeding.md`.

  **Blank Check** — 7 seeded, 3 to go (target 10):
  | # | Name | Type | Coverage |
  |---|---|---|---|
  | 8 | *"We're Gonna Need a Bigger Pod"* / The Beard | item_set | Spielberg — Pod Me If You Cast (19) + Podrassic Cast (15) = 34 films |
  | 9 | *"I Know"* / Han | item_set | Harrison Ford — Star Wars (patreon) + Indiana Jones + others. Run `actor-check.js` (TMDB person ID: 3) to confirm full set. |
  | 10 | *"I Have a Bad Feeling About This"* / The Force | item_set | Star Wars — all 4 patreon films (A New Hope, Empire, Return of the Jedi, Force Awakens) |

  **Rewatchables** — 0 seeded, 5 to go:
  | # | Name | Type | Coverage |
  |---|---|---|---|
  | 1 | *"King Kong Ain't Got Sh*t on Me"* / Denzel | item_set | Denzel Washington films |
  | 2 | *"I'll Be Back"* / The 80s | item_set | Stallone + Schwarzenegger films |
  | 3 | *"Pick a Dom"* / The Dom | item_set | Amanda Dobbins episodes (time-boxed through end of 2024) — curate manually from episode list |
  | 4 | *"You Talking to Me?"* / Eddie | item_set | Eddie Murphy films |
  | 5 | *"Here's to You, Mrs. Robinson"* / Jack | item_set | Jack Nicholson films |

  **HDTGM** — 0 seeded, 5 to go:
  | # | Name | Type | Coverage |
  |---|---|---|---|
  | 1 | *"It's Not the Bees!"* / Cage | item_set | Nicolas Cage — Con Air, Drive Angry, Face/Off, Season of the Witch, Trespass, Vampire's Kiss |
  | 2 | *"Do You Smell What the Pod Is Cooking"* / The Rock | item_set | Dwayne Johnson — Fast 6, Furious 7, Fate of the Furious, Hobbs & Shaw, Hercules, Skyscraper |
  | 3 | *"Above the Pod"* / Direct to Video | item_set | Seagal / JCVD films — verify coverage in data sesh |
  | 4 | *"Insert Coin"* / Game Over | item_set | Video game movies — verify coverage in data sesh |
  | 5 | *"The Whole Damn Ride"* / Toretto | item_set | Fast & Furious franchise completion |
- [ ] **Editorial blurbs** — per-film descriptions for MANTL Originals shelves. Currently null in log modal for all Originals items. Edit via Admin → Community Manager.

---

## 🟡 Should Fix Before Launch

- [ ] **Backfill missing episode descriptions** — 93 NPP + 16 BC episodes have null descriptions. NPP episodes have `rss_guid` and can be re-fetched via `enrich-episode-descriptions` edge function; BC episodes were manually seeded with no `rss_guid` and need a title/audio-URL match against the RSS feed. Data job, not a code change.
- [ ] **Delete dead edge functions** — the following are still live on Supabase but serve no purpose. Delete from Supabase Dashboard → Edge Functions:
  - `seed-sleeve-data`
  - `seed-ratings`
  - `seed-wt-movies`
  - `backfill-genres`
  - `expand-title-index`
  - `backfill-episodes`
  - `backfill-nbp-podcast-index`
  - `backfill-community-posters`
- [ ] **Rotate Supabase anon key** before payments go live — it has been public in the repo since day one; low risk now, worth rotating before any billing is attached.

---

## 🟢 Cleanup / Post-Launch

- [ ] **`feed_episodes_v2` 404** — dead endpoint; no references in src code so no user impact, but worth cleaning up
- [ ] **Replace hardcoded admin UUID in RLS policies** with an `is_admin()` function — low urgency but reduces fragility if admin account ever changes

---

## ✅ Done

- ✅ **RevenueCat / billing integration** — fully wired (RevenueCat SDK, `useSubscription`, `handle-rc-webhook`, webhook secret in Supabase Vault). Swap prod key to launch.
- ✅ **`user_badges` RLS** — dropped client INSERT/DELETE policies; badge awarding is now exclusively server-side via edge functions
- ✅ **`media` INSERT policy tightened** — requires `tmdb_id IS NOT NULL AND media_type = 'film'`
- ✅ **`games` table dropped** — confirmed gone
- ✅ **RAWG API key** — no references remaining in codebase
- ✅ Letterboxd sync — first-sync notification flood fixed
- ✅ Badge system + celebration video pipeline
- ✅ Notification center — Realtime channel, digest, badge unlocks
- ✅ Games — Triple Feature, Cast Connections, Reel Time, Pick a Flick
- ✅ VHS feed + community dashboards — NPP, BC, HDTGM, Rewatchables, and others
- ✅ MANTL Originals — 5 shelves, 53 films seeded
- ✅ Unauth pitches on NPP and BC
- ✅ Push notifications infrastructure — APNs + FCM
- ✅ All 57 database tables have RLS enabled
- ✅ No secrets or credentials exposed in source code
- ✅ Community log toasts — cleaned up (notification center handles progress)
- ✅ HDTGM community — Jade (1995) corrected, episode audio linked
- ✅ Empty player state — MANTL logo, backdrop images in log modals
- ✅ First-sync coverage notification flood — fixed

---

## Notes

**Launch communities:** Now Playing Podcast, Blank Check with Griffin & David
**Monetization model:** $5/month flat. Free tier: daily games, feed listening, community browsing, basic tracking. Paid: all communities, full badge systems, celebration videos, game stats/archive, diary.
**North star:** NYT ecosystem — Games, Feed, Communities.

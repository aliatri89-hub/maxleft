# MANTL Pre-Launch Checklist
*Last updated: April 1, 2026*

---

## 🔴 Blockers

- [x] **Swap RevenueCat API key to production (Android)** — Done. `goog_dhdAQjsUohpCwZwlqmxWVhGfryx` live in `src/utils/revenueCat.js`.

- [ ] **iOS launch** — Requires MacBook + Xcode. Full sub-checklist:
  - [ ] Apple Developer Program enrolled ($99/yr) at developer.apple.com
  - [ ] Xcode installed, repo cloned, `npm install` run
  - [ ] `npx cap add ios` — add iOS platform to Capacitor
  - [ ] Bundle ID set in `capacitor.config.ts` — e.g. `app.mymantl.mantl`
  - [ ] Bundle ID registered in App Store Connect — create new App
  - [ ] Signing certificate + provisioning profile in Xcode (automatic signing is fine)
  - [ ] `npx cap sync ios` — sync web assets to Xcode project
  - [ ] Build runs on simulator without errors
  - [ ] Build runs on physical iPhone without errors
  - [ ] **APNs** — enable Push Notifications capability in Xcode. Export APNs key from Apple Developer portal, add to Supabase Auth settings (alongside existing FCM config)
  - [ ] **RevenueCat iOS key** — add `RC_API_KEY_APPLE` to `src/utils/revenueCat.js` (placeholder already in code). Get from RC Dashboard → API Keys → Apple App Store key (`appl_...`)
  - [ ] **StoreKit / Apple IAP** — create matching products in App Store Connect: `mantl_monthly_pro` ($4.99) and `mantl_yearly_pro` ($39.99) with 7-day free trial. Link to RevenueCat.
  - [ ] **Audio on iOS** — verify `@mediagrid/capacitor-native-audio` works on iPhone (plugin uses AVAudioPlayer on iOS vs ExoPlayer on Android). Test playback + background mode + lock screen controls.
  - [ ] **Capacitor plugins audit** — confirm all plugins have iOS support (native audio, purchases, push notifications)
  - [ ] TestFlight build submitted — test full flow on iPhone including billing sandbox
  - [ ] App Store listing — screenshots (6.7" iPhone required), description, keywords, age rating, privacy policy URL
  - [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) — required by Apple for apps using certain APIs. Check if Capacitor plugins trigger requirement.
  - [ ] App Store review submitted — budget 1–3 days for first review
  - [ ] iOS billing tested end-to-end via sandbox account in TestFlight
- [ ] **Seed badges** — Badge system is built and working; content just needs seeding. See `docs/HANDOFF-badge-seeding.md`.

  **Blank Check** — 7 seeded, 3 to go (target 10):
  | # | Name | Type | Coverage |
  |---|---|---|---|
  | 8 | *"We're Gonna Need a Bigger Pod"* / The Beard | item_set | Spielberg — Pod Me If You Cast (19) + Podrassic Cast (15) = 34 films |
  | 9 | *"I Know"* / Han | item_set | Harrison Ford — Star Wars (patreon) + Indiana Jones + others. Run `actor-check.js` (TMDB person ID: 3) to confirm full set. |
  | 10 | *"I Have a Bad Feeling About This"* / The Force | item_set | Star Wars — all 4 patreon films (A New Hope, Empire, Return of the Jedi, Force Awakens) |

  **Rewatchables** — 5 seeded ✅:
  | # | Name | Plaque | Type | Coverage |
  |---|---|---|---|---|
  | 1 | *Original Gangster* | OG | item_set | Denzel Washington — 10 films |
  | 2 | *The Rivalry* | 1vs1 | item_set | Stallone + Schwarzenegger — 15 films |
  | 3 | *Klumpy* | Klumpy | item_set | Eddie Murphy — 7 films |
  | 4 | *The Big Pic* | Big Pic | item_set | Sean Fennessey + Amanda Dobbins co-episodes — 8 films |
  | 5 | *BS 2000s List* | BS | item_set | Bill Simmons' 50 Most Rewatchable Movies of the 21st Century — 42 films in catalog |

  **HDTGM** — 0 seeded, 5 to go:
  | # | Name | Type | Coverage |
  |---|---|---|---|
  | 1 | *"It's Not the Bees!"* / Cage | item_set | Nicolas Cage — Con Air, Drive Angry, Face/Off, Season of the Witch, Trespass, Vampire's Kiss |
  | 2 | *"Do You Smell What the Pod Is Cooking"* / The Rock | item_set | Dwayne Johnson — Fast 6, Furious 7, Fate of the Furious, Hobbs & Shaw, Hercules, Skyscraper |
  | 3 | *"Above the Pod"* / Direct to Video | item_set | JCVD — 6 films: Bloodsport, Hard Target, Timecop, Street Fighter, The Quest, Double Team |
  | 4 | *"Insert Coin"* / Game Over | item_set | Video game movies — curate from verified list: Street Fighter, Double Dragon, Mortal Kombat (2021), Super Mario Bros (2023), Dungeons & Dragons, In the Name of the King, Lawnmower Man, Lawnmower Man 2, Johnny Mnemonic, Gamer (10 clean hits in catalog). Needs manual review to confirm HDTGM episode coverage for each. |
  | 5 | *"The Whole Damn Ride"* / Toretto | item_set | Fast & Furious franchise completion |
- [ ] **Seed Sight & Sound community** — Static, no audio. 3 tabs: Directors List (top 100), Critics List (top 100), Individual ballots (publicly released top 10s from critics/podcasters). Data work only, no new code needed.

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

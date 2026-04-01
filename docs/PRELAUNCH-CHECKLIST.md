# MANTL Pre-Launch Checklist
*Last updated: April 1, 2026*

---

## 🔴 Blockers

- [ ] **Swap RevenueCat API key to production** — Integration is complete and fully wired. Replace `test_ttZsXEQKINarORbnqQPrgKhhwZo` in `src/utils/revenueCat.js` with the production Google key before launch. iOS key still pending MacBook setup.
- [ ] **Seed badges** — 10 Blank Check, 5 Rewatchables, 5 HDTGM. Badge system is built and working; content just needs seeding. See `docs/HANDOFF-badge-seeding.md`.
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

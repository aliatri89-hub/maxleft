# MANTL Pre-Launch Checklist
*Last updated: March 31, 2026*

---

## 🔴 Blockers

- [ ] **Figure out payments** — RevenueCat / IAP not yet integrated. Free-first launch is viable; gate communities behind paywall in a subsequent release.
- [ ] **Seed badges** — 10 Blank Check, 5 Rewatchables, 5 HDTGM. Badge system is built and working; content just needs seeding. See `docs/HANDOFF-badge-seeding.md`.
- [ ] **Editorial blurbs** — per-film descriptions for MANTL Originals shelves. Currently null in log modal for all Originals items.

---

## 🟡 Should Fix Before Launch

- [ ] **Backfill missing episode descriptions** — 93 NPP + 16 BC episodes have null descriptions. NPP episodes have `rss_guid` and can be re-fetched; BC episodes were manually seeded with no `rss_guid` and need a title/audio-URL match against the RSS feed. This is a data job, not a code change.
- [ ] **Fix `user_badges` RLS** — client INSERT/DELETE policies on `user_badges` allow any authenticated user to self-award badges. Drop both; badge awarding flows exclusively through edge functions with the service role. See `docs/SECURITY-AUDIT.md`.
- [ ] **Tighten `media` INSERT policy** — any authenticated user can insert arbitrary rows. Add `tmdb_id IS NOT NULL AND media_type = 'film'` to `WITH CHECK`. See `docs/SECURITY-AUDIT.md`.

---

## 🟢 Cleanup / Post-Launch

- [ ] **Delete one-time edge functions** — these were migration/backfill jobs and can be removed from Supabase:
  - `seed-sleeve-data`
  - `seed-ratings`
  - `seed-wt-movies`
  - `backfill-genres`
  - `expand-title-index`
  - `backfill-episodes`
  - `backfill-nbp-podcast-index`
  - `backfill-community-posters`
- [ ] **`feed_episodes_v2` 404** — outstanding broken endpoint, investigate or remove references
- [ ] **Drop empty `games` table** — dead from the media architecture migration, safe to drop
- [ ] **Replace hardcoded admin UUID in RLS policies** with an `is_admin()` function — low urgency but reduces fragility if admin account ever changes
- [ ] **Rotate Supabase anon key** before payments launch — it has been public in the repo since day one; low risk now, worth rotating before any billing is attached
- [ ] **Delete RAWG API key** from any remaining references — games are killed, key is unused

---

## ✅ Confirmed Ready

- Letterboxd sync — first-sync notification flood fixed
- Badge system + celebration video pipeline
- Notification center — Realtime channel, digest, badge unlocks
- Games — Triple Feature, Cast Connections, Reel Time, Pick a Flick
- VHS feed + community dashboards — NPP, BC, HDTGM, Rewatchables, and others
- MANTL Originals — 5 shelves, 53 films seeded
- Unauth pitches on NPP and BC
- Push notifications infrastructure — APNs + FCM
- All 57 database tables have RLS enabled
- No secrets or credentials exposed in source code
- Community log toasts — already cleaned up (notification center handles progress)
- HDTGM community — Jade (1995) corrected, episode audio linked
- Empty player state — MANTL logo, backdrop images in log modals
- First-sync coverage notification flood — fixed

---

## Notes

**Launch communities:** Now Playing Podcast, Blank Check with Griffin & David  
**Monetization model:** $5/month flat. Free tier: daily games, feed listening, community browsing, basic tracking. Paid: all communities, full badge systems, celebration videos, game stats/archive, diary.  
**North star:** NYT ecosystem — Games, Feed, Communities.

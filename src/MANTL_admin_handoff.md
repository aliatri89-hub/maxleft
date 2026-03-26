# MANTL Admin Panel — Handoff Document

**Last updated:** March 27, 2026
**Built in:** Single session, 4 phases
**Status:** Core admin panel live at `mymantl.app/admin`

---

## File Map

```
src/admin/
├── AdminShell.jsx        — Shell layout: sidebar nav, auth gate, lazy routing
├── MissionControl.jsx    — Phase 1: "is everything running?" dashboard
├── FeedManager.jsx       — Phase 2: Ingest queue, coming soon, dead audio
└── CommunityManager.jsx  — Phase 3: Items, shelves, badges CRUD
```

**Modified files:**
- `src/App.jsx` — Added lazy-loaded `/admin` route (lines 1–10 of App component)
- `vercel.json` — Added `/admin` rewrite before `/:username` catch-all

---

## How It Works

### Routing & Auth

The admin panel is a **lazy-loaded route** inside the main app. When the browser hits `/admin`, App.jsx short-circuits before any of the normal app logic and renders `<AdminShell />` wrapped in `<Suspense>`. This means:

- Zero impact on mobile bundle size (code-split via dynamic import)
- Shared Supabase client and auth session — no separate login
- Completely independent layout from the VHS mobile shell

Auth gate chain in AdminShell:
1. Loading → spinner
2. No session → Google sign-in button (redirects back to `/admin`)
3. Session but wrong user ID → "not an admin" message
4. Mobile viewport (<900px) → "use desktop" message
5. All clear → sidebar + content area

**Admin user ID:** `19410e64-d610-4fab-9c26-d24fafc94696` (hardcoded in AdminShell, same pattern as existing AdminItemEditor, AdminGameEditor, AdminFab, IngestReviewTool)

### Sidebar Navigation

Six nav slots, three currently active:
- **Mission Control** — active ✓
- **Feed & Ingest** — active ✓
- **Communities** — active ✓
- **Games** — stubbed (disabled, shows "soon")
- **Diagnostics** — stubbed
- **Config & Flags** — stubbed

---

## Section Details

### 1. Mission Control (`MissionControl.jsx`)

Single-page dashboard answering "is everything running?" Fetches all data in parallel on mount.

**Games row:** Three cards (Triple Feature, Reel Time, Cast Connections). Each shows a green/red status dot for whether today's puzzle exists in the corresponding `*_daily_puzzles` table. No runway tracking — puzzles are cron-generated.

**Feed & Ingest row:**
- Ingest queue depth (count of `ingest_review_queue` rows)
- Last ingest run date + stats (from `daily_ingest_summary`)
- Coming soon count (items where `air_date > today`)

**Community Health row:**
- Total communities, total items, active/total badges
- Missing posters (items with `tmdb_id` but null `poster_path`)
- Orphaned items (items with null `miniseries_id` — should always be 0)

**Users row:** Total profile count.

### 2. Feed & Ingest (`FeedManager.jsx`)

Three tabs:

**Ingest Queue** — Reimplementation of IngestReviewTool for desktop width. Same logic: reads `ingest_review_queue` view, groups by episode, shows confidence scoring (HIGH/MED/LOW), batch approve/reject via `approve_ingest_matches` and `reject_ingest_matches` RPCs. Includes TMDB re-match (swap `tmdb_id` on `podcast_episode_films`). Sync Now button calls `ingest-rss` edge function. High-confidence matches (≥0.9) auto-selected on load.

**Coming Soon** — Table of all `community_items` where `air_date > today`. Shows film poster, episode info, air date with countdown ("tomorrow", "in 5 days"), audio status pill (has audio / no audio). "Publish Now" sets `air_date` to today so the episode drops into the feed immediately.

**Dead Audio** — Lists `dead_audio_reports` with episode name, error type, broken URL, report date. Dismiss button deletes the report.

> **Important:** The mobile IngestReviewTool in ProfileScreen (`src/screens/ProfileScreen.jsx` line ~717) is intentionally kept. It's duplicate logic but needed for on-the-go approvals without laptop access. Both versions call the same RPCs, so there's no data conflict.

### 3. Community Manager (`CommunityManager.jsx`)

Community picker dropdown at top switches all three tabs.

**Items tab:**
- Search by title, filter by shelf dropdown
- Table: poster thumbnail, title, year, media type pill, shelf name, TMDB ID, sort order
- Inline edit: click Edit → row becomes editable inputs (title, year, tmdb_id, sort_order, shelf move via dropdown)
- Delete: confirms, cleans up `community_user_progress` first, then deletes item
- "+ Add Item": TMDB search panel (movie/TV toggle), pick result to auto-fill. Manual add fallback for items without TMDB data. Auto-assigns next sort_order.

**Shelves tab:**
- Table: title (with director emoji), director name, tab_key, status pill (active/completed/upcoming), item count, sort order
- Inline edit all fields including director emoji
- "+ New Shelf" form: title, director name, emoji, tab_key dropdown, status dropdown

**Badges tab:**
- Table: badge image, name + description, type pill, linked shelf, tagline preview, active/inactive toggle button
- Active toggle updates instantly via Supabase
- Edit expands into a full labeled card below the row with fields in correct order:
  1. Badge Name + sort order
  2. Progress Tagline *(shown while working toward badge)*
  3. Earn Tagline *(shown when badge is earned)*
  4. Description *(subtitle under badge name)*
  5. Badge Type + Linked Shelf
  6. Badge Image URL + Celebration Audio URL + Accent Color (color picker)
- "+ New Badge" form with all fields, defaults to `miniseries_completion` type and `flicker` celebration theme

---

## Known Limitations & Tech Debt

1. **Badge `item_set_completion` items:** The edit form lets you set badge_type to `item_set_completion`, but there's no UI for managing the `badge_items` rows that define which specific items count. Currently requires SQL to wire up. This is the main gap in badge management.

2. **Items table loads all at once:** No pagination. Fine for current community sizes (hundreds of items) but would need pagination if a community exceeds ~2,000 items.

3. **No drag-and-drop reordering:** Shelves and items use numeric `sort_order` edited inline. Drag-and-drop would be nicer but isn't necessary for a single-admin panel.

4. **Dropdown styling:** All `<select>` elements use `colorScheme: "dark"` and solid `#1a1714` backgrounds. Browser-native option dropdowns still render with OS-level styling — this is a browser limitation, not fixable without a custom dropdown component.

5. **No image upload:** Badge image and audio URLs must be manually entered (typically uploaded to the `banners` Supabase storage bucket first, then URL pasted in). A file upload widget would streamline this.

6. **Duplicate ingest tool:** FeedManager's Ingest Queue and ProfileScreen's IngestReviewTool are separate implementations of the same workflow. They share RPCs so there's no data risk, but code changes need to be made in both places.

---

## Next Priority: Analytics

### The Problem

MANTL has no behavioral analytics. There's no way to know which communities get visited, which episodes get listened to, which features get used, or how users move through the app. This data is critical for deciding what to build, what to paywall, and what to drop.

### Phase A: Event Instrumentation

Build a lightweight event tracking layer. Approach:

1. **Create `analytics_events` table** in Supabase:
   - `id` (uuid, pk)
   - `user_id` (uuid, nullable — track anon too)
   - `event_name` (text) — e.g. `community_visit`, `episode_play`, `badge_earned`, `game_played`
   - `event_data` (jsonb) — flexible payload: `{ community_slug, tmdb_id, duration_seconds, ... }`
   - `session_id` (text) — group events into sessions
   - `created_at` (timestamptz)
   - Partitioned by month or use `created_at` index for query performance

2. **Create `useAnalytics` hook** — thin wrapper that batches events and flushes to Supabase on an interval (every 30s or on page unload). Avoids a DB write on every click.

3. **Instrument key touchpoints:**
   - Community screen open → `community_visit` (slug, tab)
   - Episode play/pause/complete → `episode_play` (podcast_slug, episode_id, duration)
   - Film log/rate → `film_log` (tmdb_id, community_slug, rating)
   - Game play → `game_played` (game_type, score, time)
   - Badge earned → `badge_earned` (badge_id, community_slug)
   - Feed card tap → `feed_tap` (card_type, tmdb_id)
   - Tab switch → `tab_switch` (from, to)
   - Search → `search` (query, result_count)

4. **RLS policy:** Insert-only for authenticated users. Admin-only select.

### Phase B: Analytics Dashboard

New admin section (the "Diagnostics" nav slot, or rename to "Analytics"):

- **Overview:** DAU/WAU/MAU, sessions per day, events per day (line chart)
- **Communities:** Ranked by visits, completion rates, avg time. Identify which communities drive engagement.
- **Podcasts:** Most listened episodes, play-through rates, which podcasts drive the most film logs
- **Games:** Daily play rates per game, completion rates, avg scores
- **Funnel:** Landing → sign up → first log → first badge → subscription (when monetized)
- **Retention:** Cohort-style — are users coming back?

This is a meaningful build. Event instrumentation touches many files across the app (community screens, feed, games, audio player). The dashboard itself is contained to the admin panel. I'd estimate 2 sessions: one for instrumentation, one for the dashboard.

---

## Quick Reference

**Admin URL:** `mymantl.app/admin` (desktop only)

**Admin user ID:** `19410e64-d610-4fab-9c26-d24fafc94696`

**Key tables queried by admin panel:**
- `tf_daily_puzzles`, `wt_daily_puzzles`, `cc_daily_puzzles` — game status
- `ingest_review_queue` (view), `daily_ingest_summary` (view) — feed ingest
- `podcast_episode_films` — episode-film mappings
- `dead_audio_reports` — broken audio
- `community_pages`, `community_miniseries`, `community_items` — community CRUD
- `badges`, `badge_items`, `user_badges` — badge system
- `profiles` — user count

**Key RPCs used:**
- `approve_ingest_matches(mapping_ids)` — approve ingest queue items
- `reject_ingest_matches(mapping_ids)` — reject/delete bad matches

**Edge functions called:**
- `ingest-rss` — on-demand RSS sync (Sync Now button)
- `api-proxy` (action: `tmdb_search`) — TMDB search in add item / re-match flows

# MANTL Admin Panel — Handoff Document

**Last updated:** March 26, 2026
**Status:** All 6 admin sections live at `mymantl.app/admin`

---

## File Map

```
src/admin/
├── AdminShell.jsx          — Shell layout: sidebar nav, auth gate, lazy routing
├── MissionControl.jsx      — "Is everything running?" dashboard
├── FeedManager.jsx         — Ingest queue, coming soon, dead audio
├── CommunityManager.jsx    — Items, shelves, badges CRUD
├── AnalyticsDashboard.jsx  — Behavioral analytics (events, retention, engagement)
├── GamesManager.jsx        — Puzzle runway, today's preview, recent results
└── ConfigFlags.jsx         — Server-side feature flags, quick reference
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

7. **Feature flags not wired to app:** Server-side `feature_flags` table and admin UI exist, but existing hardcoded flags (USE_TITLE_BACKDROPS, SHOW_COMMUNITY_STATS, SHOW_VOTING) haven't been converted to read from the table yet. A `useFeatureFlags()` hook is needed to bridge this.

---

## 4. Analytics Dashboard (`AnalyticsDashboard.jsx`)

Full behavioral analytics powered by the `analytics_events` table and `useAnalytics` hook.

**Instrumentation (src/hooks/useAnalytics.js):**
- `useAnalytics(userId)` hook: batches events in memory, flushes to Supabase every 30s or on `visibilitychange`
- `trackEvent(userId, name, data)` standalone function for use outside React components
- Session ID generated per app lifecycle (survives tab switches, not refreshes)

**Events tracked (9 touchpoints across 10 files):**
- `tab_switch` — App.jsx, all main tab changes with `{from, to}`
- `community_visit` — CommunityRouter.jsx, `{slug, community_type}`
- `episode_play` — AudioPlayerProvider.jsx, new episode starts
- `episode_complete` — AudioPlayerProvider.jsx, episode finishes with duration
- `media_log` — useCommunityActions.js, film/show/book/game logged
- `game_played` — all 3 game API files, results with scores
- `badge_earned` — useBadges.js, badge unlock events
- `feed_mode_switch` — FeedScreen.jsx, releases/podcast/activity
- `search` — SearchScreen.jsx, query + result/covered counts

**Dashboard tabs:**

**Overview** — DAU/WAU/MAU KPI cards, daily activity bar chart, events-by-type horizontal bars. Time range selector (7d/30d/90d/1y).

**Retention** — Weekly cohort heatmap. Each row = users who first appeared that week. Columns = what % returned in subsequent weeks. Color-coded green (80%+) → red (<20%). Interpretation guide included.

**Engagement** — Top communities table (visits + unique users), game stats per game (plays + players), feed mode preference (% breakdown), top searches, dead-end searches (0 results = implicit feature requests), uncovered searches (TMDB match but no podcast coverage = demand signals).

**Live Stream** — Last 50 events with formatted details, event type pills, session IDs.

**SQL functions (11 total, all SECURITY DEFINER STABLE):**
- `analytics_overview(p_days)` — DAU/WAU/MAU + totals
- `analytics_events_by_type(p_days)` — grouped counts
- `analytics_daily_counts(p_days)` — date, event_count, user_count
- `analytics_top_communities(p_days)` — slug, visits, unique users
- `analytics_game_stats(p_days)` — game, plays, players
- `analytics_top_searches(p_days)` — query, count, avg results
- `analytics_feed_modes(p_days)` — mode, switch count
- `analytics_recent_events(p_limit)` — raw event stream
- `analytics_retention_cohorts(p_weeks)` — cohort heatmap data
- `analytics_zero_result_searches(p_days)` — searches with 0 results
- `analytics_uncovered_searches(p_days)` — found in TMDB but no coverage

---

## 5. Games Manager (`GamesManager.jsx`)

Read-only monitoring for the three daily games.

**Puzzle Runway** — Color-coded cards per game showing days of puzzles seeded ahead. Green (60+), yellow (14-60), red (<14). Shows last seeded date, total puzzles, total plays.

**Today's Puzzles** — Expandable preview per game. Triple Feature shows movie posters, titles, revenue, target/optimal. Reel Time shows year, movie count, difficulty. Cast Connections shows groups and color categories.

**Recent Results** — Last 10 results per game with player username, date, score/outcome, time.

---

## 6. Config & Flags (`ConfigFlags.jsx`)

**Server-Side Feature Flags** — CRUD UI for the `feature_flags` table. Toggle ON/OFF instantly, add new flags, delete unused ones. Changes take effect on next app load. Initial flags seeded: `SHOW_COMMUNITY_STATS`, `SHOW_VOTING`, `USE_TITLE_BACKDROPS`, `PAYWALL_ENABLED`, `PUSH_NOTIFICATIONS`.

**Hardcoded Flags** — Read-only reference listing constants still defined in component files (LogCard.jsx, NPPDashboard.jsx, BlankCheckDashboard.jsx). Included so you know what exists before converting to server flags.

**Quick Reference** — Supabase project ID, admin user ID, custom domain, Firebase project, GitHub repo, LLC info, RAWG API key.

---

## Post-Launch Analytics Roadmap

These features should be built once there are real users generating meaningful data:

1. **Session replay summary** — Pick a session_id, see the ordered sequence of events as a user journey story. Easy query, high insight.

2. **Conversion funnel** — Landing → signup → first log → first badge → subscription. Requires subscription events once monetization is live.

3. **Weekly digest** — Auto-generated summary pushed to admin (email or notification). "This week: 14 new users, 3 retained, 47 game plays, top search: Criterion."

4. **Episode listen-through rate** — % of started episodes that finish. Identifies stickiest podcast content.

5. **User-level analytics** — Click a user, see their full event history. Useful for debugging and understanding power users vs. churn.

---

## Quick Reference

**Admin URL:** `mymantl.app/admin` (desktop only)

**Admin user ID:** `19410e64-d610-4fab-9c26-d24fafc94696`

**Key tables queried by admin panel:**
- `tf_daily_puzzles`, `wt_daily_puzzles`, `cc_daily_puzzles` — game puzzles
- `tf_daily_results`, `wt_daily_results`, `cc_daily_results` — game results
- `ingest_review_queue` (view), `daily_ingest_summary` (view) — feed ingest
- `podcast_episode_films` — episode-film mappings
- `dead_audio_reports` — broken audio
- `community_pages`, `community_miniseries`, `community_items` — community CRUD
- `badges`, `badge_items`, `user_badges` — badge system
- `analytics_events` — behavioral analytics
- `feature_flags` — server-side feature toggles
- `profiles` — user data

**Key RPCs used:**
- `approve_ingest_matches(mapping_ids)` — approve ingest queue items
- `reject_ingest_matches(mapping_ids)` — reject/delete bad matches
- `analytics_*` — 11 analytics aggregation functions (see section 4)

**Edge functions called:**
- `ingest-rss` — on-demand RSS sync (Sync Now button)
- `api-proxy` (action: `tmdb_search`) — TMDB search in add item / re-match flows

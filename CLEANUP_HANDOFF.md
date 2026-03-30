# MANTL Cleanup Handoff — March 30, 2026

## ✅ Done this session

| Commit | What | Lines |
|--------|------|-------|
| `eeb888c` | Disabled NPP + BC community dashboards (code intact, `useState(null)`) | ~0 net (comment swap) |
| `d65d202` | Removed Steam sync from `useIntegrationSync.js`, Goodreads/StoryGraph from `importUtils.js`, `steam_id` + `goodreads_user_id` from App.jsx profile hydration | -207 |

### Also done earlier
- `feed_episodes_v2` function dropped from Supabase ✅
- `games` table already gone ✅
- Post-log toast killed ✅
- Dead App.jsx refs already clean ✅

---

## 🔴 Remaining: Quick cuts (finish in next thread)

### 1. `importUtils.js` — two leftovers

**A) Books dedup branch in `deduplicateItems()`:**
Remove the entire `if (format !== "letterboxd")` block (~lines 126-138) that queries `user_books_v`. Keep only the Letterboxd consolidation path below it.

**B) `importBooks` function:**
Delete the entire export function at the bottom of the file (~65 lines, starts around line 297). Nobody calls it after the Goodreads/StoryGraph removal.

### 2. `ImportCSVModal.jsx` — remove Goodreads option
Line ~74: delete `{ key: "goodreads", label: "Goodreads", hint: "My Books → Import/Export → Export Library" }` from the format options array.

### 3. `api.js` — dead search functions
Delete these functions (leaf code, no live callers after ShelfItModal cleanup):
- `searchGoogleBooks` 
- `searchGoogleBooksRaw`
- `searchRAWG`
- `searchRAWGRaw`
- RAWG API key constant (`744f042dd2e547eba93ea70774d66a00`)

---

## 🔴 Kill Get Played community (own thread)

Get Played is a video game podcast community. MANTL is now movies-only. The community doesn't even exist in `community_pages` anymore — all frontend code is orphaned.

### Frontend — delete entirely
- `src/components/community/getplayed/` — whole folder (5 files):
  - `GetPlayedScreen.jsx`
  - `GetPlayedHero.jsx`  
  - `GetPlayedItemCard.jsx`
  - `GetPlayedLogModal.jsx`
  - `useGetPlayedBridge.jsx`
- `src/components/community/shared/AdminGameEditor.jsx` — only used by Get Played

### Frontend — remove references
- `CommunityRouter.jsx` line ~19: remove `getplayed` lazy import
- `CommunitySleeveSheet.jsx` line ~29: remove `getplayed: "GP"` 
- `CommunityLoadingScreen.jsx` line ~19: remove `getplayed` entry
- `FeedPrimitives.jsx` lines ~456, ~471: remove `getplayed` abbreviation + color
- `useCommunityPage.js` line ~36: remove `getplayed` from `EPISODE_ENRICHED_SLUGS`

### Supabase — dead edge functions to delete
- `steam` — no frontend calls it anymore
- `strava` — FiveSeven-era, long dead
- `goodreads-rss` — books are dead

---

## 🔴 Larger sweep: Books / Games / Steam from personal shelves (own thread)

This is the big one — removing personal book/game shelf support. These files all have book/game code woven throughout and need careful per-file editing:

### Heavy files (significant game/book code inside)
- **`ShelfItModal.jsx`** (515 lines) — book + game categories in shelf picker, `logGame` calls, RAWG + Google Books search. After Get Played kill + api.js cleanup, the game/book branches are fully dead. Consider rewriting to movie-only.
- **`ShelvesProvider.jsx`** — fetches from `user_books_v`, `user_shows_v`, `user_games_v`. Needs scoping on whether shows stay.
- **`ShelfModals.jsx`** — games shelf UI throughout (status toggles, beat indicators, game-specific diary). Deeply interleaved.
- **`ItemDetailModal.jsx`** — Steam stats section, `updateGameStatus` helper import
- **`mediaWrite.js`** — `logGame`, `updateGameStatus` exports. Dead after ShelfItModal + Get Played cleanup.

### Lighter touches
- **`constants.js`** — remove `books` + `games` from `DEFAULT_ENABLED_SHELVES` / `DEFAULT_SHELF_ORDER`
- **`App.jsx`** — `enabledShelves` / `shelfOrder` still reference books + games
- **`ProfileScreen.jsx`** — shelf rendering for books/games
- **`UsernameSetup.jsx`** — books + games in default shelf picker (line ~332)
- **`ActivityCard.jsx`** — book/game `media_type` checks for logo fallback
- **`theme.js`** — Steam color/icon refs

### Supabase views to consider dropping
- `user_books_v`
- `user_shows_v` (if shows are dead too?)
- `user_games_v`

### Decision needed: Are shows dead too?
Books and games are clearly dead. Shows are currently "simple status-based" — confirm whether show tracking stays or goes before touching `ShelvesProvider` / `ShelfModals` / `ShelfItModal`.

---

## 🟡 Feature work (separate threads, not cleanup)

- **#5 FiveSeven dead feature cleanup** — TrackScreen challenges, granular book/show tracking, `workout_goals`, Strava, groups/challenges/daily_logs. Most frontend refs are already gone; check for orphaned Supabase tables/views/functions.
- **#6 Badge reveal grid for sign-up funnel** — was for unauth NPP dashboard, now moot since dashboards are disabled. Could repurpose for community browse or landing page.

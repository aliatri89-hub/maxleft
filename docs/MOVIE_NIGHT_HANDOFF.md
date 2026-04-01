# Movie Night — Handoff Doc

## What Was Built

### Core Game
Two users swipe through the same stack of 20 movies privately. When both finish, only the films they BOTH swiped right on are revealed. No negotiation — just matches.

Close cousin of Pick a Flick: identical swipe physics, same VHS aesthetic, same card dimensions/animations/haptics. Purple accent color (#9b59b6) to distinguish it.

### Files Created
- `src/features/movie-night/MovieNight.jsx` — full-screen overlay (lobby, share, swipe, waiting, reveal screens)
- `src/features/movie-night/useMovieNight.js` — session creation, TMDB stack generation, swipe state machine, partner polling, match reveal
- `src/features/movie-night/MovieNightPublic.jsx` — public invite landing page for `/night/CODE` links
- `supabase/migrations/20260401_movie_night.sql` — schema reference (already applied)

### Files Modified
- `src/App.jsx` — lazy imports, state, game launcher, overlay, nav conditionals, deep link handler, guest setup skip
- `src/features/games-hub/GamesHub.jsx` — Movie Night card + icon (purple, below Pick a Flick)
- `supabase/functions/api-proxy/index.ts` — added `with_genres` + `vote_count_gte` to TMDB discover handler
- `vite.config.js` — externalized `@revenuecat/purchases-capacitor` and `purchases-capacitor-ui`

### Schema (Applied via Supabase MCP)
```sql
movie_night_sessions
  id, code (unique), creator_id, partner_id, genre_id, genre_name,
  stack (jsonb — array of {tmdb_id, title, year, poster_path, overview}),
  creator_done, partner_done, created_at

movie_night_swipes
  id, session_id, user_id, tmdb_id, choice (boolean), created_at
  unique(session_id, user_id, tmdb_id)

movie_night_matches(p_session_id) — RPC, security definer
  Returns {ready: bool, matches: [tmdb_ids]} when both players done
```

RLS: creators/partners can read their sessions; users can insert/read only their own swipes; the match function reads across users securely.

### Infra Fixes (Bonus)
- **Vercel git deploys fixed**: Root cause was Vite 8 beta's Rolldown bundler treating `@revenuecat/purchases-capacitor` as a hard error. Fixed by adding it to `build.rollupOptions.external`. All git-triggered deploys now pass.
- **Node version**: Changed from 24.x to 22.x (LTS). Keep it there.
- **api-proxy v17**: Deployed with verify_jwt=false, genre + vote_count filters added.

---

## What Works
- ✅ Game card appears in Games Hub (purple, below Pick a Flick)
- ✅ Creator flow: pick genre → create session → share screen with `mymantl.app/night/CODE` link → start swiping
- ✅ Swipe physics match Pick a Flick exactly
- ✅ TMDB Discover stack generation (genre filter, vote_count floor, creator's logged films excluded)
- ✅ Share screen copies/shares the deep link URL
- ✅ `/night/CODE` deep link parsing in App.jsx
- ✅ Auto-open Movie Night after auth when join code present
- ✅ Auto-join session when opened via deep link
- ✅ Public invite page renders for unauthenticated users on `/night/CODE`
- ✅ Anonymous auth ("Play as guest") creates anon session in Supabase
- ✅ Vercel git deploys pass on every push

---

## What's Broken / Needs Work

### 1. Guest setup skip — NOT WORKING
**Problem**: Anonymous guests still hit the username setup screen despite the fix.

**Root cause identified**: The `handle_new_user()` Postgres trigger on `auth.users` auto-creates a profile with `username: null, setup_complete: false` BEFORE `loadUserData` runs. The latest fix (commit `9782f23`) detects `/night/CODE` in the URL at the setup-check stage and UPDATEs the profile — but Ali reports it's still not working.

**Debug approach**: 
- Check if the UPDATE is actually firing (query profiles table for recent anon users — look for `avatar_emoji: '🍿'` and `setup_complete: true`)
- If not firing, the URL check `window.location.pathname.match(/^\/night\/.../)` might be failing (www redirect? trailing slash? hash fragment from auth callback?)
- Console.log the pathname at that point to see what it actually is
- Nuclear option: don't check URL at all — check `user.is_anonymous` directly via `const { data: { user } } = await supabase.auth.getUser()` and skip setup for ALL anonymous users regardless of URL

**Location**: `src/App.jsx`, inside `loadUserData`, the `if (!prof.username || !prof.setup_complete)` block (around line 558).

### 2. Anon guests can access full app shell
**Problem**: After Movie Night overlay closes, anonymous guests land in the full app with empty tabs.

**Fix**: In MovieNight.jsx `handleClose`, check if user is anonymous (`session?.user?.is_anonymous`) and call `supabase.auth.signOut()` instead of closing to app shell. This boots them back to the invite/landing page.

### 3. Theater-only releases in stack
**Problem**: TMDB Discover returns movies currently in theaters that aren't available for home viewing.

**Fix options**:
- Add a release date ceiling to the TMDB discover call: `release_date_lte` set to ~3 months ago (filters out current theatrical releases)
- Or add `with_watch_monetization_types=flatrate` to only get streaming-available films (but this requires `with_watch_providers` which varies by region)
- Simplest: add `release_date_lte: <3 months ago>` in `useMovieNight.js` `generateStack()` when calling apiProxy

### 4. Partner join + reveal flow (untested end-to-end)
The two-player flow hasn't been fully tested with both players completing and seeing the reveal screen. Needs testing:
- Creator finishes first → waiting screen → partner finishes → both see reveal
- Partner finishes first → waiting screen → creator finishes → both see reveal  
- Zero matches → cheeky "nothing in common" screen
- Multiple matches → poster grid with confetti

### 5. No "watch tonight" log action on reveal
The reveal screen shows matches but doesn't have a "Log it" button that writes to `user_media_logs`. This was in the original spec — post-reveal CTA that logs the film for both users.

---

## Architecture Decisions (For Reference)

- **Stack source**: TMDB Discover API via api-proxy edge function. Genre filter optional (default: any). 3 pages fetched (60 results), creator's logged films excluded, randomly sampled to 20. Vote count floor of 100 to skip obscure films.
- **One round only**: No multi-round narrowing (unlike Pick a Flick). 20 films, one pass, show all matches.
- **Session code**: 6-char alphanumeric (no I/O/0/1 for readability). Stored in `movie_night_sessions.code` with unique constraint.
- **Polling**: Creator/partner poll session row every 3s to detect when partner finishes. Could upgrade to Supabase Realtime later.
- **Pro gate**: Not yet implemented. Plan: creator needs Pro, joiner plays free.
- **Deep link**: `mymantl.app/night/CODE` → parsed in App.jsx useState initializer → auto-opens after auth → auto-joins session.
- **Purple accent**: `#9b59b6` — distinguishes Movie Night from Pick a Flick (green) in Games Hub.

---

## Quick Reference

| Item | Value |
|------|-------|
| Game ID in App.jsx | `movieNight` |
| Overlay state | `showMovieNight` |
| Nav key | `movieNight` |
| Session table | `movie_night_sessions` |
| Swipe table | `movie_night_swipes` |
| Match RPC | `movie_night_matches(p_session_id)` |
| Deep link pattern | `/night/[A-Za-z0-9]{4,8}` |
| TMDB discover params | `with_genres`, `vote_count_gte` (added to api-proxy) |
| Public component | `MovieNightPublic.jsx` |
| Anon auth | Enabled in Supabase dashboard |

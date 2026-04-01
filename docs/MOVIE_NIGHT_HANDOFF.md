# Movie Night — Handoff

## Status: Hidden (card disabled in GamesHub, code intact)

The game is fully built and functional for authenticated users. Hidden behind `{false &&` in GamesHub.jsx until the guest flow is polished.

---

## What's shipped

### Schema (live in Supabase)
- `movie_night_sessions` — id, code, creator_id, partner_id, genre, stack (JSONB), creator_done, partner_done
- `movie_night_swipes` — session_id, user_id, tmdb_id, choice (boolean)
- `movie_night_matches()` RPC — security definer function, returns matching tmdb_ids when both players are done
- RLS policies: each user can only see their own swipes, sessions visible to creator/partner

### API
- `api-proxy` updated with `with_genres` + `vote_count_gte` params on `tmdb_discover` action

### Frontend
- `src/features/movie-night/MovieNight.jsx` — full-screen overlay, same swipe physics as Pick a Flick (purple accent)
- `src/features/movie-night/useMovieNight.js` — session creation, TMDB stack generation, swiping state machine, partner polling, match reveal
- `src/features/movie-night/MovieNightPublic.jsx` — public invite page for /night/CODE links
- `GamesHub.jsx` — card + icon (currently hidden with `{false &&`)
- `App.jsx` — lazy imports, overlay wiring, nav conditionals, /night/CODE deep link parsing, auto-open after auth

### Deep linking
- `/night/CODE` parsed from URL on app init -> `movieNightJoinCode` state
- When authed: auto-opens Movie Night overlay + auto-joins session
- When unauthed: shows MovieNightPublic invite page instead of landing screen

---

## What works
- Creator picks genre -> session created with 20 TMDB films -> share link generated
- Share screen shows `mymantl.app/night/CODE` with copy/share buttons
- Both authenticated players swipe the same stack privately
- When both done: match reveal with celebration animation (or zero-match humor)
- Anonymous auth via "Play as guest" button (Supabase anonymous sign-ins enabled)
- Deep link flow: /night/CODE -> invite page -> sign in -> auto-join

---

## Known issues

### 1. Guest flow still hits username setup (BLOCKING)

**Root cause:** `handle_new_user()` DB trigger creates a profile with `username: null, setup_complete: false` before `loadUserData` runs. By the time the code checks `if (!prof)`, the profile already exists — so the guest username/setup_complete INSERT never fires. The UPDATE attempt in the setup check has closure/timing issues with the `onAuthStateChange` callback.

**Possible solutions (pick one):**

**A. Reload after anonymous auth (simplest, recommended)**

In MovieNightPublic, after `signInAnonymously()` resolves, update the profile directly and reload:

```js
const handleGuestPlay = async () => {
  const { data } = await supabase.auth.signInAnonymously();
  if (data?.session) {
    await supabase.from("profiles").update({
      username: `guest_${Date.now().toString(36)}`,
      setup_complete: true,
      avatar_emoji: "🍿",
    }).eq("id", data.session.user.id);
    window.location.reload();
  }
};
```

On reload: app initializes with valid session + /night/CODE URL -> normal deep link flow -> straight into game. Crude but bypasses all closure/timing issues.

**B. Edge function for guest swipes (cleanest UX, more work)**

Create a `movie-night-guest` edge function (verify_jwt=false):
- Accepts: session code + array of swipe choices
- Validates code, writes swipes with generated guest UUID, sets partner_id + partner_done
- Returns matches if creator is also done

Guest never authenticates at all. MovieNightPublic renders the swipe UI directly, swipes accumulate in React state, POST to edge function when done. No profile, no setup, no auth.

**C. Modify the DB trigger**

Add logic to `handle_new_user()` to detect anonymous users and auto-set username + setup_complete. Couples trigger to game logic though.

### 2. Guest access to full app shell

After anonymous auth, closing Movie Night leaves the guest in the full app with empty tabs. Not dangerous but not polished.

**Fix:** In MovieNight onBack, check if user is anonymous. If so, `supabase.auth.signOut()` instead of closing to app shell.

### 3. No "log this movie" CTA on reveal

Reveal screen shows matches but doesn't close the loop into MANTL tracking.

**Fix:** Add "Watch tonight" button that logs the film for the user.

### 4. Stack exclusion only covers creator

Creator's logged films are excluded from the stack. Partner's are not (partner isn't known at stack generation time).

**Fix:** Acceptable for v1 — partner just swipes left on films they've seen.

---

## To re-enable

In `GamesHub.jsx` around line 393, change:
```jsx
{false && <button
```
back to:
```jsx
<button
```
And remove the matching `}` after the button's closing tag (around line 432).

---

## Also fixed this session (unrelated)

### Vercel git deploy failures
- **Root cause:** Vite 8 beta (Rolldown) treated `@revenuecat/purchases-capacitor` as a hard unresolved import error
- **Fix:** Added to `build.rollupOptions.external` in vite.config.js
- **Also:** Changed Node version from 24.x to 22.x (LTS) which fixed the patch-package cache issue as a side effect

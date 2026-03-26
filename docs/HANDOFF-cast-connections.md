# Cast Connections — Build Handoff

## What We Built

Cast Connections is a daily puzzle game where players group 9 actors into 3 movies. It's NYT Connections for film cast trivia — the third game in MANTL's daily puzzle lineup alongside Triple Feature and Reel Time.

### Architecture

```
src/features/cast-connections/
├── castConnectionsApi.js    # Supabase queries (fetchTodaysPuzzle, submitResult, hasPlayedToday)
├── useCastConnections.js    # Game state hook (selection, validation, solve/fail, timer)
└── CastConnections.jsx      # Full game UI (VHS aesthetic, animations, share)
```

**Follows the exact same pattern as Triple Feature and Reel Time:** API layer → hook → component → App.jsx overlay wiring.

### Database Schema (already applied)

Three tables, all with `cc_` prefix:

- **`cc_movies`** — Movie pool with full TMDB cast lists (200 movies, all 13k+ TMDB votes). Each row stores `cast_list` as JSONB array of `{tmdb_person_id, name, character, order}`.
- **`cc_daily_puzzles`** — Generated puzzles with `puzzle_date` (unique), `movies` (JSONB array of 3 movies, each with 3 actors), and `colors` (3-color array for reveal).
- **`cc_daily_results`** — Player results with `solved`, `mistakes`, `solve_order`, `time_seconds`. RLS: users can only access their own results.

### Puzzle Generation Pipeline

Three local scripts (not in the repo, Ali has them locally):

1. **`fetch-cc-pool.mjs`** — Pulls well-known movies from TMDB `/discover` endpoint (filtered by vote count). Outputs `cc_movie_pool.json` for human review. Uses v3 API key as query param (`?api_key=`).

2. **`seed-cc-to-supabase.mjs`** — Reads reviewed JSON, inserts into `cc_movies`. Supports `--dry-run`.

3. **`generate-cc-puzzles.mjs`** — The puzzle generator. For each puzzle:
   - Picks 3 random movies from pool
   - Builds actor→movie overlap map across ALL cast members
   - Finds actors exclusive to each movie (appear in zero other selected movies' casts)
   - Filters to top 8 billing positions only (ensures recognizable actors)
   - Takes the 3 highest-billed exclusive actors per movie
   - Rejects combos that can't produce 3 recognizable exclusive actors
   - Tracks used combos to prevent duplicates
   - Supports `--dry-run`, `--count`, `--start-date`, `--min-votes`

### GamesHub Integration

- `creditCheck` renamed to `castConnections` throughout GamesHub and App.jsx
- New 3×3 grid SVG icon (diagonal highlights)
- Unplayed status check via `ccHasPlayedToday`
- Full overlay wiring with back nav, bottom nav hiding

### Current State

- 200 movies in pool, 1 puzzle seeded for today (March 26)
- All remaining puzzles deleted — need to regenerate with updated generator (top-billing-only logic)
- Selection bug fixed (React inline style shorthand/longhand conflict)

---

## TODO: Movie Backdrop Reveals

### Goal

When a group is solved, instead of a flat color bar, show a cinematic TMDB backdrop behind the movie title — similar to how VHS feed cards use title backdrops.

### Data: Seeding Backdrops

The existing `tmdb_images` edge function (built for VhsSleeveSheet) already fetches backdrops. Two approaches:

**Option A: Store backdrop_path in puzzle JSON (simpler)**

Add `backdrop_path` to each movie object in `cc_daily_puzzles.movies` during puzzle generation. The generator already has access to `poster_path` — just also pull `backdrop_path` from the `cc_movies` table.

1. Add `backdrop_path` to `cc_movies` — the `fetch-cc-pool.mjs` script already fetches from TMDB `/discover` which returns `backdrop_path`. Just add it to the insert:
```javascript
// In fetch-cc-pool.mjs, the TMDB discover response already has backdrop_path
const entry = {
  tmdb_id: movie.id,
  title: movie.title,
  year,
  poster_path: movie.poster_path,
  backdrop_path: movie.backdrop_path,  // ADD THIS
  // ...
};
```

2. Backfill existing pool:
```sql
-- After updating fetch script and re-running, or manually via TMDB API
-- The cc_movies table needs an ALTER first:
ALTER TABLE cc_movies ADD COLUMN backdrop_path text;
```

3. Update `generate-cc-puzzles.mjs` to include `backdrop_path` in each puzzle movie object.

4. Regenerate all puzzles.

**Option B: Fetch backdrops at runtime via tmdb_images edge function**

Call the existing `tmdb_images` edge function from the client when a group is solved, using the `tmdb_id` from the puzzle data. This avoids storing backdrop paths but adds a network call per solve.

**Recommendation: Option A.** The data is static and small. Bake it into the puzzle JSON so the reveal is instant with no loading state.

### Frontend: Applying Backdrops to Movie Reveal

The solved group currently renders as a colored `<div>` with title and actor names. To add backdrops:

```jsx
// In CastConnections.jsx — update the solved group render
<div
  className="cc-solved-group"
  style={{
    ...S.solvedGroup,
    backgroundImage: movie.backdrop_path
      ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(https://image.tmdb.org/t/p/w780${movie.backdrop_path})`
      : undefined,
    backgroundColor: !movie.backdrop_path ? color : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
```

The VHS aesthetic treatment (from feed LogCard/VhsSleeveSheet):
- Warm amber overlay: `linear-gradient(to bottom, rgba(30,20,10,0.4), rgba(15,13,11,0.8))`
- Worn vignette edges
- Title in Bebas Neue, white with text-shadow for legibility over any backdrop
- Actor names in IBM Plex Mono, slightly transparent white

For the reveal animation, the backdrop could fade in slightly after the scaleY solve animation completes — a two-stage reveal where the color bar appears first, then the image fades in behind it.

### Fallback

If no backdrop available for a movie, fall back to the current flat color. The color array in `cc_daily_puzzles.colors` stays as the fallback.

---

## TODO: Difficulty Scaling Through the Week

### Goal

Monday–Thursday: all 3 actors per movie are top-billed leads (easy). Friday–Sunday: mix in 1–2 deeper cuts per movie (harder). Same game, escalating challenge.

### Generator Changes

Add a `difficulty` parameter to puzzle generation:

```javascript
// In generate-cc-puzzles.mjs
function tryBuildPuzzle(movies, difficulty = 'easy') {
  // ... existing overlap validation ...

  if (difficulty === 'easy') {
    // Current behavior: top 3 from billing positions 0-7
    const maxOrder = 7;
    const topExclusive = exclusiveActors.map(actors =>
      actors.filter(a => a.order <= maxOrder)
    );
    if (topExclusive.some(a => a.length < 3)) return null;
    return topExclusive.map(actors =>
      actors.sort((a, b) => a.order - b.order).slice(0, 3)
    );
  }

  if (difficulty === 'medium') {
    // 2 leads (order 0-4) + 1 supporting (order 5-10)
    return exclusiveActors.map(actors => {
      const leads = actors.filter(a => a.order <= 4);
      const supporting = actors.filter(a => a.order > 4 && a.order <= 10);
      if (leads.length < 2 || supporting.length < 1) return null;
      return [...leads.slice(0, 2), supporting[0]];
    });
  }

  if (difficulty === 'hard') {
    // 1 lead (order 0-3) + 2 supporting (order 4-10)
    return exclusiveActors.map(actors => {
      const leads = actors.filter(a => a.order <= 3);
      const supporting = actors.filter(a => a.order > 3 && a.order <= 10);
      if (leads.length < 1 || supporting.length < 2) return null;
      return [leads[0], ...supporting.slice(0, 2)];
    });
  }
}
```

Key constraint: supporting actors should still cap at `order <= 10`. Nobody beyond the top 10 billing — that keeps "harder" as "you need to know your Paul Reisers and your Ving Rhames" not "who the hell is this person."

### Puzzle Date Assignment

When generating, assign difficulty by day of week:

```javascript
const dayOfWeek = nextDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
let difficulty = 'easy';
if (dayOfWeek === 5) difficulty = 'medium';     // Friday
if (dayOfWeek === 6 || dayOfWeek === 0) difficulty = 'hard'; // Sat/Sun
```

Store the difficulty in the puzzle row (add to schema):

```sql
ALTER TABLE cc_daily_puzzles ADD COLUMN difficulty text DEFAULT 'easy';
```

This lets the frontend optionally show a difficulty indicator ("Weekend Challenge" or similar).

### Alternative: Manual Curation

For maximum control, generate a batch with `--dry-run`, tag each puzzle with a difficulty, and hand-assign them to specific dates. This is more work but guarantees editorial quality — important for early launch when every puzzle is a first impression.

---

## Quick Reference

| Task | Command |
|------|---------|
| Fetch movie pool from TMDB | `node fetch-cc-pool.mjs --pages 10 --min-votes 1500` |
| Review pool | Open `cc_movie_pool.json`, remove unwanted movies |
| Seed pool to Supabase | `node seed-cc-to-supabase.mjs` |
| Generate puzzles (preview) | `node generate-cc-puzzles.mjs --count 90 --start-date 2026-03-27 --dry-run` |
| Generate puzzles (insert) | `node generate-cc-puzzles.mjs --count 90 --start-date 2026-03-27` |
| Reset test results | `DELETE FROM cc_daily_results;` |
| Shift puzzle dates for launch | `UPDATE cc_daily_puzzles SET puzzle_date = puzzle_date + INTERVAL 'X days';` |
| Check pool size | `SELECT count(*) FROM cc_movies;` |
| Check puzzle coverage | `SELECT min(puzzle_date), max(puzzle_date), count(*) FROM cc_daily_puzzles;` |

### Env Vars Needed

- `TMDB_API_KEY` — v3 API key (used as query param, not bearer token)
- `SUPABASE_SERVICE_ROLE_KEY` — for seed/generate scripts
- `SUPABASE_URL` — defaults to `https://gfjobhkofftvmluocxyw.supabase.co`

### Files on Ali's Machine (not in repo)

- `fetch-cc-pool.mjs`
- `seed-cc-to-supabase.mjs`
- `generate-cc-puzzles.mjs`
- `cc_movie_pool.json`

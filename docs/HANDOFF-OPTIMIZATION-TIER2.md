# MANTL Optimization Handoff — Tier 2

**Date:** March 26, 2026
**Context:** Follows the code splitting + error boundaries PR and quick-wins cleanup PR. These are the remaining architectural improvements from the March 2026 codebase audit.

---

## What's Already Done

| Item | Branch | Status |
|------|--------|--------|
| Code splitting (1,889 kB → 388 kB main bundle) | `perf/code-splitting-error-boundaries` | ✅ Ready to merge |
| Error boundaries on all major sections | same branch | ✅ |
| Vendor chunk splitting (supabase, react-dom, capacitor, html2canvas) | same branch | ✅ |
| VhsSleeveSheet → hydrate_media RPC migration | same branch | ✅ |
| Strip 33 console.log statements | `cleanup/quick-wins` | ✅ Ready to merge |
| Remove dead deps (cheerio, dotenv, xml2js) | same branch | ✅ |
| Delete strava edge function | same branch | ✅ |
| Gitignore large data files, move loose docs | same branch | ✅ |
| Remove unused `sb` import from App.jsx | same branch | ✅ |

---

## 1. Shelf Context Provider

**Priority:** HIGH — biggest architectural win remaining
**Effort:** ~1 hour
**Impact:** Eliminates prop drilling through 7+ layers, reduces cascade re-renders

### Problem

`App.jsx` loads shelf data via `loadShelves()` (6 parallel Supabase queries) and stores it in local state (`shelves`, `shelvesLoaded`). This state is then prop-drilled to ShelfHome, ProfileScreen, FeedScreen, and community screens. Any shelf update causes App.jsx to re-render, which cascades down to every child.

### Solution

Extract into `src/contexts/ShelvesProvider.jsx`:

```jsx
import { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../supabase";

const ShelvesContext = createContext(null);

export function ShelvesProvider({ userId, children }) {
  const [shelves, setShelves] = useState({ books: [], movies: [], shows: [], games: [], totalItems: 0 });
  const [shelvesLoaded, setShelvesLoaded] = useState(false);

  const loadShelves = useCallback(async (uid) => {
    const id = uid || userId;
    if (!id) return;
    // ... move the 6-query Promise.all from App.jsx lines 176-199 here ...
    setShelvesLoaded(true);
  }, [userId]);

  const refreshShelves = useCallback(() => loadShelves(userId), [userId, loadShelves]);

  return (
    <ShelvesContext.Provider value={{ shelves, shelvesLoaded, loadShelves, refreshShelves }}>
      {children}
    </ShelvesContext.Provider>
  );
}

export const useShelves = () => useContext(ShelvesContext);
```

Then in App.jsx:
- Remove `shelves`, `shelvesLoaded`, `loadShelves` state/callback
- Wrap the app in `<ShelvesProvider userId={session?.user?.id}>`
- In child components, replace `shelves` prop with `const { shelves } = useShelves()`

### Files to Touch

- `src/contexts/ShelvesProvider.jsx` (new)
- `src/App.jsx` — remove shelf state, wrap with provider
- `src/screens/ShelfHome.jsx` — `useShelves()` instead of props
- `src/screens/ProfileScreen.jsx` — same
- `src/components/ShelfItModal.jsx` — if it accesses shelves
- Any community screen that receives `onShelvesChanged` — replace with `refreshShelves()`

### Watch Out For

- `loadShelves` is called from `handleUsernameComplete`, `signOut`, `deleteAccount`, `onImportComplete`, and `onShelvesChanged`. All of these need to call `refreshShelves()` from context instead.
- The `sync.runInitialSync` call in `loadUserData` takes the profile — that stays in App.jsx.

---

## 2. Image Lazy Loading + Alt Attributes

**Priority:** MEDIUM — bandwidth savings, accessibility
**Effort:** ~45 minutes (mostly mechanical)
**Impact:** Fewer images loaded on initial paint, better a11y scores

### Problem

Only 29 of ~200+ images have `loading="lazy"`. 69 images are missing `alt` attributes entirely. For a media-heavy app with TMDB posters, backdrops, and cover art, this means unnecessary bandwidth and poor accessibility.

### Solution

Global find-and-replace across components:

```bash
# Find all img tags missing loading="lazy"
grep -rn "<img " src/ --include="*.jsx" | grep -v 'loading=' | grep -v 'alt='
```

For poster/cover images, add both:
```jsx
// Before
<img src={posterUrl} style={{...}} />

// After
<img src={posterUrl} loading="lazy" alt={`${title} poster`} style={{...}} />
```

### Rules of Thumb

- **Don't lazy-load** the header logo, the landing page hero, or above-the-fold feed cards (first 3-4)
- **Do lazy-load** all poster grids, community film lists, backdrop images, cover art in shelves
- **Alt text patterns:** `"{title} poster"` for posters, `"{title} backdrop"` for backdrops, `"{name} avatar"` for profile images, `""` (empty string, not missing) for purely decorative images
- Avatar images in the header should have `alt=""` since they're decorative next to a username

### Files with Most Missing Images

Check these first:
- `src/components/feed/LogCard.jsx` — feed card posters
- `src/components/feed/VhsSleeveSheet.jsx` — sleeve backdrops and stills
- `src/components/community/primitives/ItemCard.jsx` — community film cards
- `src/screens/ShelfHome.jsx` — shelf poster grids
- `src/components/feed/BrowseCard.jsx` — browse/discovery cards

---

## 3. App.css Split

**Priority:** LOW-MEDIUM — maintainability, marginal perf gain
**Effort:** ~1.5 hours
**Impact:** Better CSS scoping, slightly faster initial paint (unused styles not parsed)

### Problem

`App.css` is 5,916 lines in a single file. Combined with 8 other global CSS files imported in `main.jsx`, every community's styles ship to every page. No CSS modules, no scoping, no tree-shaking.

### Solution

Split App.css into logical sections. Don't try CSS modules yet — just separate files:

```
src/styles/
  tokens.css        ← already exists (CSS custom properties)
  base.css           ← already exists
  shell.css          ← header, nav bar, tab slider, toast
  feed.css           ← feed cards, sleeve sheet, browse cards
  community.css      ← community screens, log modals, badges
  games.css          ← triple feature, reel time, cast connections, games hub
  shelves.css        ← shelf home, shelf modals
  profile.css        ← profile screen, settings
  modals-dark.css    ← already exists
  explore-dark.css   ← already exists
  ...
```

### Approach

1. Open App.css and identify section boundaries (look for comment headers like `/* ─── FEED ───*/`)
2. Cut each section into its own file
3. Import each file in main.jsx (or lazy-import in the relevant component)
4. Test that nothing visually breaks

### Watch Out For

- Specificity wars: some styles may rely on order-of-import. Test carefully.
- The 8 CSS files already in `main.jsx` may overlap with sections in App.css.
- Don't rename class names — just move declarations to separate files.

---

## 4. Community Log Modal Consolidation

**Priority:** LOW — code health, not user-facing
**Effort:** ~2-3 hours (requires careful diffing)
**Impact:** Reduces ~3,500 lines across 7 modals, easier to add new communities

### Problem

`CommunityLogModal.jsx` (shared base) is 987 lines, but 7 of 10 community log modal wrappers are still 500-1,200 lines each. The thin wrappers (BlankCheck: 133, NowPlaying: 117, Filmspotting: 192) prove the base works — the fat ones have community-specific logic that leaked back in.

### Approach

1. Diff a fat wrapper (e.g. `RewatchablesLogModal` at 785 lines) against `CommunityLogModal`
2. Identify patterns that repeat: custom fetch logic, extra UI sections, provider rendering
3. Add extension points to `CommunityLogModal` (render props, config objects) for the common patterns
4. Thin out each wrapper one at a time, testing as you go

### Sizes for Reference

| Modal | Lines | Target |
|-------|------:|------:|
| BlankCheckLogModal | 133 | ✓ already thin |
| NowPlayingLogModal | 117 | ✓ already thin |
| FilmspottingLogModal | 192 | ✓ already thin |
| ChapoLogModal | 596 | ~150 |
| HDTGMLogModal | 557 | ~150 |
| FilmJunkLogModal | 555 | ~150 |
| GetPlayedLogModal | 659 | ~200 |
| BigPictureLogModal | 661 | ~200 |
| RewatchablesLogModal | 785 | ~200 |
| NowPlayingGameLogModal | 1,256 | ~300 (game logic is genuinely different) |

### Don't Do This Until

- Code splitting is merged (so you're not resolving merge conflicts in every modal)
- You have a way to test each community (subscriptions or dev overrides)

---

## 5. Supabase Audit (Separate Task)

Not covered in this handoff but flagged in the original audit. When ready, check:

- Table sizes and row counts (identify bloat)
- Unused tables from FiveSeven era
- Index coverage on hot queries: `feed_activity`, `community_user_progress`, `user_media_logs`
- RLS policy audit (now that media table is admin-only)
- Edge function invocation frequency (which are actually called?)
- Cron job health (`publish_due_episodes`, Triple Feature seeding)

---

## Recommended Order

1. **Shelf context provider** — do this next, biggest bang-for-effort
2. **Image lazy loading** — mechanical but impactful on mobile
3. **App.css split** — do when you're tired of scrolling 6K lines
4. **Log modal consolidation** — do when adding a new community (you'll feel the pain)
5. **Supabase audit** — do before scaling to real users

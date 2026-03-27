# MANTL Premium Loading Polish — Handoff Doc

## What Was Done (3 commits, now on main)

### Commit 1: Feed skeletons + stagger + FadeImg
- **Activity skeleton**: 4 cards with 16:9 aspect ratio matching LogCard, staggered `feedCardIn`, shimmer overlay
- **Movies skeleton**: 5 tape-shaped cards with dark tape edges matching BrowseCard layout (replaced BrowseLoadingSplash branded splash)
- **Podcast skeleton**: 4 structured cards with 60x60 artwork + text line placeholders matching PodcastCard
- **BrowseCards wrapped in FeedCard**: Movies tab now has staggered fade-in (Activity and Podcast already had it)
- **PodcastCard**: backdrop and artwork images swapped from raw `<img>` to `FadeImg`

### Commit 2: VhsSleeveSheet (detail view when you tap a card)
- **Content skeleton**: still+cast placeholders, director line, episode row placeholders with `sleeve-pulse` shimmer. Shows while detail data loads, replaces blank gap that filled in piece by piece
- **FadeImg on**: episode podcast artwork (32x32), external coverage artwork (32x32), hero backdrop (already had it), scene still (already had it)
- **Fade-in animations**: cast/stills section, director block, content area animate in with `sleeveContentIn` (0.4s ease, staggered delays)
- **Reverted logos**: movie logos and studio logos are transparent PNGs — FadeImg wrapper background bleeds through. These stay as raw `<img>`.

### Commit 3: Shared community components
- **CommunityLogModal**: poster image → FadeImg
- **CommunitySleeveSheet**: hero backdrop + podcast artwork → FadeImg
- **CommunityTapeCard**: ghost backdrop + both followed/unfollowed artwork → FadeImg
- **BadgeDetailScreen**: badge image → FadeImg with accent placeholder
- **BadgeCelebration**: badge unlock image → FadeImg
- **AudioPlayerProvider**: expanded player artwork → FadeImg

---

## Key Rule: When to Use FadeImg vs Raw `<img>`

**Use FadeImg for opaque images**: posters, backdrops, podcast artwork squares, scene stills, cover art — anything that fills its container completely.

**Use raw `<img>` for transparent PNGs**: movie title logos, studio logos, icons, any image with transparency. FadeImg wraps in a `<div>` with `backgroundColor` which shows through as a solid block on transparent images.

**FadeImg location**: `src/components/feed/FeedPrimitives.jsx`, exported as `{ FadeImg }`.

**Import pattern**:
```jsx
import { FadeImg } from "../../feed/FeedPrimitives";
// or from deeper nesting:
import { FadeImg } from "../../../components/feed/FeedPrimitives";
```

**Usage pattern**:
```jsx
// Before
<img loading="lazy" src={url} alt={title}
  style={{ width: "100%", height: "100%", objectFit: "cover" }} />

// After
<FadeImg src={url} alt={title}
  placeholderColor="#1a1a2e"
  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
```

`placeholderColor` should be a dark warm tone matching the surrounding UI. Common values:
- `"#1a1a2e"` — generic dark blue-ish (log modals)
- `"#2a2520"` — warm dark (podcast artwork, player)
- `"rgba(240,235,225,0.05)"` — near-invisible cream (sleeve sheet elements)
- `"transparent"` — for bg images where you don't want a flash (ghost backdrops)
- `` `${accent}15` `` — badge accent at 15% opacity

---

## What's Left: Remaining Raw `<img>` Tags (User-Facing Only)

### Priority 1 — Per-Community Log Modals (6 files, 1 poster each)
All identical pattern: poster `<img>` that should be `FadeImg`.

| File | Line | What |
|------|------|------|
| `src/components/community/hdtgm/HDTGMLogModal.jsx` | 227 | poster coverUrl |
| `src/components/community/big-picture/BigPictureLogModal.jsx` | 232 | poster coverUrl |
| `src/components/community/filmspotting/FilmspottingLogModal.jsx` | 64 | poster coverUrl |
| `src/components/community/film-junk/FilmJunkLogModal.jsx` | 242 | poster coverUrl |
| `src/components/community/rewatchables/RewatchablesLogModal.jsx` | 230 | poster coverUrl |
| `src/components/community/getplayed/GetPlayedLogModal.jsx` | 226 | poster coverUrl |

**ChapoLogModal** has 2 imgs: line 226 is the poster (swap to FadeImg), line 286 is a tiny 12x12 Patreon favicon (leave as raw img).

### Priority 2 — Awards/Lists Tabs (poster grids)
These show poster images in grids. All should be FadeImg.

| File | Lines | What |
|------|-------|------|
| `src/components/community/filmspotting/FilmspottingAwardsTab.jsx` | 353 | posterUrl |
| `src/components/community/film-junk/FilmJunkAwardsTab.jsx` | 291, 373 | posterUrl, bannerUrl |
| `src/components/community/film-junk/FilmJunkListsTab.jsx` | 354, 433 | posterUrl, bannerUrl |
| `src/components/community/blank-check/CommunityAwardsTab.jsx` | 536, 721 | posterUrl in two sections |

**Note**: `bannerUrl` images at lines 373 and 433 in the Film Junk files may be transparent — check before swapping.

### Priority 3 — GetPlayed Components

| File | Line | What |
|------|------|------|
| `src/components/community/getplayed/GetPlayedScreen.jsx` | 318 | game cover (resolvedCover) |
| `src/components/community/getplayed/GetPlayedHero.jsx` | 129 | game cover (game.cover_url) |

### Priority 4 — Screens & Features

| File | Count | What |
|------|-------|------|
| `src/screens/LandingScreen.jsx` | 8 | Badge images on landing — CHECK for transparency before swapping |
| `src/screens/SearchScreen.jsx` | 3 | Search result posters |
| `src/screens/ProfileScreen.jsx` | 3 | Profile/avatar images |
| `src/screens/ShelfHome.jsx` | 1 | Shelf cover |
| `src/components/modals/ShelfModals.jsx` | 5 | Poster images in modals |
| `src/components/ShelfItModal.jsx` | 2 | Poster images |
| `src/components/shelf/BadgeShelf.jsx` | 2 | Badge images — CHECK for transparency |
| `src/components/shelf/MediaShelf.jsx` | 1 | Cover image |
| `src/components/modals/ItemDetailModal.jsx` | 1 | Detail poster |
| `src/components/NotificationCenter.jsx` | 1 | Notification image |
| `src/components/BadgeOverviewPage.jsx` | 1 | Badge image — CHECK for transparency |
| `src/features/what-to-watch/WhatToWatch.jsx` | 6 | Movie posters |
| `src/features/reel-time/ReelTime.jsx` | 3 | Movie posters/stills |
| `src/features/triple-feature/TripleFeature.jsx` | 1 | Poster |
| `src/features/triple-feature/TripleFeaturePublic.jsx` | 1 | Poster |

### Skip (Admin-Only)
These are admin dashboard tools — not worth the effort:
- `NPPDashboard.jsx` (3 imgs)
- `BlankCheckDashboard.jsx` (1 img)
- `RSSSyncTool.jsx` (1 img)
- `AdminGameEditor.jsx` (2 imgs)
- `FeedManager.jsx` (4 imgs)
- `CommunityManager.jsx` (6 imgs)
- `GamesManager.jsx` (2 imgs)

---

## Community Skeleton Audit

### Already good:
- **FeedScreen** — all 3 tab skeletons are layout-accurate (done in this work)
- **NowPlayingGenreTab** — dynamic shelf skeletons fixed previously (120px wide, aspect-ratio 2/3)

### Could be improved (lower priority):
- **CommunityLoadingScreen** (`src/components/CommunityLoadingScreen.jsx`) — used by NPP and BC dashboards. Currently a branded VHS play button animation. Could be replaced with layout-accurate skeletons matching the actual community screen structure, same pattern as feed skeletons.
- **CommunityLoadingSkeleton** in `App.jsx` (line 78) — generic Suspense fallback for lazy-loaded tabs. Currently a basic pulsing skeleton. Low priority since it only flashes briefly.

---

## Execution Checklist

For each file in the priority list above:

1. Open the file, find the `<img>` tag(s)
2. Check: is the image opaque (poster, artwork, backdrop) or transparent (logo, icon, badge art)?
3. If opaque → swap to `FadeImg` with appropriate `placeholderColor`
4. If transparent → leave as raw `<img>`
5. Add `import { FadeImg } from "path/to/FeedPrimitives"` if not already imported
6. Build check: `npx vite build`
7. Visual check: make sure no solid-color blocks appear where images should be

The whole thing is mechanical — no logic changes, just `<img>` → `<FadeImg>` with a placeholder color. Sonnet can handle it.

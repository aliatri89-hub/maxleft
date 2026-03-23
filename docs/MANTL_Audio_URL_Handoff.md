# MANTL Audio URL Cleanup — Handoff Doc

**Date:** March 23, 2026
**Branch:** `fix/episode-url-single-source-of-truth`
**Commits:** 2 (helper + FK migration)

---

## What This Fixes (User-Facing)

**Duplicate recents entries — FIXED.** The same episode played from Browse, then from a community page, then from Search would create up to 3 separate recents entries. The `upsertRecent` dedup checks both guid and enclosureUrl, but each surface produced different URLs from different field names. Now all surfaces resolve through `resolveAudioUrl`, producing the same string — URL-based dedup catches duplicates every time.

**"Is this playing?" indicator not lighting up — FIXED.** VhsSleeveSheet, SearchScreen, and useEpisodeMatch compare `currentEp.enclosureUrl` against the episode's URL to show the active state. Before, one side might hold `audio_url` while the other held `episode_url`. Now both sides use the same resolver.

**Bookmark resume not finding saved position — FIXED.** On app launch, the bookmark merges into recents by matching guid or enclosureUrl. With consistent URLs, the match always succeeds.

**Remaining edge case (Priority 2 below):** guid prefixes (`browse-`, `log-`, `seeded-`) still differ across surfaces. This doesn't cause duplicate recents (URL dedup handles it), but `playEpisode` checks recents by guid *first* for resume position — on guid miss it falls through to URL match, which works but is the slower path. Using `episode_id` as the canonical guid makes resume lookup instant and eliminates the prefix system entirely.

---

## What Was Done

### 1. Single Source of Truth Helper (`src/utils/episodeUrl.js`)

Created `resolveAudioUrl()` and `toPlayerEpisode()` — one place that converts any episode-shaped object into what the audio player expects. Previously, 6 different components each hand-rolled their own `{ enclosureUrl: ep.audio_url }` mapping.

**Wired into:**
- `BrowseCard.jsx` — handlePlay + handleQueue
- `LogCard.jsx` — handlePlayEpisode + handleQueueEpisode
- `SearchScreen.jsx` — handlePlay + handleQueue + JSX active-state checks
- `useEpisodeMatch.js` — matchedEpisode construction
- `VhsSleeveSheet.jsx` — `epUrl` via resolveAudioUrl for active/Patreon checks

**URL resolution priority:** `audio_url` → `episode_url` → `extra_data.episode_url` → `enclosureUrl`

### 2. `episode_id` Foreign Key on `community_items`

Applied migration: `add_episode_id_fk_to_community_items`

- Added `episode_id UUID REFERENCES podcast_episodes(id) ON DELETE SET NULL`
- Indexed where not null
- Backfilled 1,982 rows from `episode_url = audio_url` matches
- 246 items remain unlinked (124 Patreon links, 122 Earwolf webpage URLs — expected)

### 3. Stopped the Dual-Write

AdminItemEditor no longer writes `episode_url` to `extra_data`. The column `community_items.episode_url` is the single source of truth. `extra_data` keeps `episode_title` only.

Both save paths (quick-match and manual save) now look up `podcast_episodes.id` by `audio_url` and write `episode_id` alongside `episode_url`.

---

## What Still Needs Doing

### Priority 1: Clean up `extra_data.episode_url` from existing rows

The dual-write is stopped going forward, but ~1,982 rows still have the old `extra_data.episode_url` value. This is harmless (the read path in `resolveAudioUrl` checks the column first), but cleaning it up removes ambiguity:

```sql
UPDATE community_items
SET extra_data = extra_data - 'episode_url'
WHERE extra_data ? 'episode_url';
```

Run this after confirming the branch is merged and everything works.

### Priority 2: Use `episode_id` as the canonical guid

Right now every play surface invents its own guid prefix (`browse-`, `log-`, `search-`, `seeded-`). Same episode played from different surfaces = two recents entries. Fix: when `episode_id` is available, use it as the guid in `toPlayerEpisode`. This requires `get_episodes_for_film` SQL function to return `podcast_episodes.id` (it may already — verify).

Update `toPlayerEpisode` to prefer `ep.id` or `ep.episode_id`:
```js
guid: overrides.guid || ep.id || ep.episode_id || ep.guid || ...
```

Then update BrowseCard/LogCard/SearchScreen to stop passing `guid` overrides when the episode has a real ID.

### Priority 3: Null out Get Played Earwolf URLs

122 Get Played items have `episode_url` set to Earwolf webpage links (not audio). These aren't playable and make `episode_url IS NOT NULL` unreliable as a "has audio" signal:

```sql
UPDATE community_items ci
SET episode_url = NULL, episode_id = NULL
FROM community_miniseries cm
JOIN community_pages cp ON cp.id = cm.community_id
WHERE ci.miniseries_id = cm.id
  AND cp.slug = 'getplayed'
  AND ci.episode_url LIKE '%earwolf.com%';
```

Once Get Played is in the ingest pipeline, re-link via AdminItemEditor quick-match.

### Priority 4: Server-side listening progress (future)

Recents and bookmarks currently live in localStorage. Works for single device but diverges across phone/laptop. Future table:

```sql
CREATE TABLE user_listening_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  speed REAL NOT NULL DEFAULT 1,
  duration_seconds INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);
```

Replace localStorage recents with this + a sync hook.

### Priority 5: Dead code cleanup

`FeedPlayButton` in `FeedPrimitives.jsx` is exported but never imported. Safe to delete.

---

## Data Audit Results (March 23, 2026)

| Community | Items with episode_url | Status |
|---|---|---|
| Now Playing Podcast | 899 | ✅ All match podcast_episodes |
| Blank Check | 495 audio + 124 Patreon | ✅ All audio URLs match. Patreon intentional. |
| Rewatchables | 330 | ✅ All match |
| HDTGM | 235 | ✅ All match |
| Get Played | 122 | ⚠️ Earwolf webpage links (not audio) |
| Big Picture | 19 | ✅ All match |
| Film Junk | 4 | ✅ All match |

---

## Architecture Reference

### URL field names by location

| Location | Field | Role |
|---|---|---|
| `podcast_episodes.audio_url` | Canonical source | Set by ingest-rss, backfill-episodes |
| `community_items.episode_url` | Denormalized copy | Set by AdminItemEditor (copied from podcast_episodes) |
| `community_items.episode_id` | FK to podcast_episodes | Set by AdminItemEditor (NEW) |
| `community_items.extra_data.episode_title` | Display metadata | Set by AdminItemEditor |
| localStorage `mantl_audio_recents` | Player state | `enclosureUrl` field (set by AudioPlayerProvider) |

### Rule: Never fetch a fresh RSS URL for community_items

When linking an episode to a community item, always copy from `podcast_episodes.audio_url`. The ingest pipeline is the single entry point for episode URLs. AdminItemEditor's quick-match still parses RSS client-side for fuzzy matching UI, but the saved URL should match what's in `podcast_episodes`.

### Files changed in this branch

```
NEW  src/utils/episodeUrl.js                              — resolveAudioUrl + toPlayerEpisode
MOD  src/components/feed/BrowseCard.jsx                   — uses helper
MOD  src/components/feed/LogCard.jsx                      — uses helper
MOD  src/components/feed/VhsSleeveSheet.jsx               — uses resolveAudioUrl
MOD  src/screens/SearchScreen.jsx                         — uses helper
MOD  src/hooks/community/useEpisodeMatch.js               — uses toPlayerEpisode
MOD  src/components/community/shared/AdminItemEditor.jsx  — episode_id FK + stop dual-write
NEW  scripts/reconcile_episode_urls.sql                   — diagnostic queries (reference)
```

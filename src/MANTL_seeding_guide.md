# MANTL — Data Seeding & Operations Guide
**Last updated:** March 14, 2026  
**For use across Claude sessions when building/maintaining community data**

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding a New Community](#adding-a-new-community)
3. [Seeding Items by Media Type](#seeding-items-by-media-type)
4. [Adding Badges](#adding-badges)
5. [Episode & RSS Matching](#episode--rss-matching)
6. [Drafts & Awards](#drafts--awards)
7. [Common Pitfalls](#common-pitfalls)
8. [Useful Diagnostic Queries](#useful-diagnostic-queries)

---

## Architecture Overview

The community data model is a strict chain:

```
community_pages (top-level identity)
  └── community_miniseries (groupings — director filmographies, categories, tabs)
        └── community_items (individual films, books, games, shows, episodes)
              └── community_user_progress (per-user log/rating/status)
```

**Key rules:**
- Every `community_item` MUST belong to a `community_miniseries` via `miniseries_id`
- Every `community_miniseries` MUST belong to a `community_pages` via `community_id`
- Items are deduplicated per miniseries via `idx_community_items_no_dupes` — a partial unique index on `(miniseries_id, tmdb_id, media_type) WHERE tmdb_id IS NOT NULL`
- `community_user_progress` has a unique constraint on `(user_id, item_id)` — one progress row per user per item
- FKs use `ON DELETE RESTRICT` on items → miniseries and progress → items (prevents accidental data loss)

**Adjacent tables:**
- `community_guests` + `community_item_guests` — podcast guest appearances per episode
- `community_awards_picks` — annual awards (e.g., Blankies)
- `community_drafts` + `community_draft_picks` — draft episodes (e.g., Big Picture)
- `community_lists` + `community_list_items` — ranked lists
- `badges` + `badge_items` + `user_badges` — achievement badges

---

## Adding a New Community

### Step 1: Create the community page

```sql
INSERT INTO community_pages (slug, name, description, tagline, logo_url, banner_url, hero_image_url, sort_order)
VALUES (
  'filmjunk',                              -- slug: URL-safe, lowercase, no spaces
  'Film Junk',                             -- display name
  'Weekly film review podcast since 2006', -- description
  'Premium Podcast. Premium Listeners.',   -- tagline (optional)
  'https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/filmjunk_logo.png',
  'https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/filmjunk_banner.jpg',
  NULL,                                    -- hero_image_url (optional)
  8                                        -- sort_order among communities
)
RETURNING id;
```

Save the returned `id` — you'll need it for everything else.

### Step 2: Create miniseries (groupings)

Miniseries are the organizational backbone. They can represent:
- A director's filmography (Blank Check pattern)
- A content category like "Films", "Books & Nachos", "Games" (NPP pattern)
- A tab in the UI, controlled by `tab_key`

```sql
INSERT INTO community_miniseries (community_id, title, tab_key, sort_order, status)
VALUES
  ('COMMUNITY_UUID', 'Films',     'filmography', 0, 'completed'),
  ('COMMUNITY_UUID', 'Books',     'books',       1, 'completed'),
  ('COMMUNITY_UUID', 'Patreon',   'patreon',     2, 'completed');
```

**tab_key values used in the app:**
- `filmography` — main content tab
- `patreon` — Patreon-exclusive content
- `books` — book content (NPP)
- `blankies` — awards tab (Blank Check)
- NULL — defaults to filmography behavior

**Blank Check pattern** (director-based miniseries):

```sql
INSERT INTO community_miniseries 
  (community_id, title, director_name, director_emoji, series_number, year_covered, tab_key, sort_order, status)
VALUES
  ('COMMUNITY_UUID', 'Podrassic Cast',   'Steven Spielberg', '🦕', 1,  '1971–1993', 'filmography', 1, 'completed'),
  ('COMMUNITY_UUID', 'Podcast Away',     'Robert Zemeckis',  '🪶', 2,  '1978–2000', 'filmography', 2, 'completed'),
  ('COMMUNITY_UUID', 'Pod Six Express',  'John Carpenter',   '🔑', 55, '1974–2010', 'filmography', 55, 'active');
```

### Step 3: Seed items

See the next section for media-type-specific patterns.

---

## Seeding Items by Media Type

### Films (most common)

**Required fields:** `miniseries_id`, `media_type`, `title`, `tmdb_id`, `sort_order`  
**Recommended fields:** `year`, `creator` (director), `poster_path`, `backdrop_path`

```sql
INSERT INTO community_items (miniseries_id, media_type, title, year, creator, tmdb_id, poster_path, sort_order)
VALUES
  ('MINISERIES_UUID', 'film', 'Jaws',            1975, 'Steven Spielberg', 578,   '/lxM6kqilAdpdhqUl2biYp5frUxE.jpg', 1),
  ('MINISERIES_UUID', 'film', 'Close Encounters', 1977, 'Steven Spielberg', 840,   '/rd3uthq5wRNNKuzfxjaCSdMYVwp.jpg', 2),
  ('MINISERIES_UUID', 'film', 'Raiders',          1981, 'Steven Spielberg', 85,    '/ceG9VzoRAVGwivFU403Wc3AHRys.jpg', 3);
```

**Getting TMDB data:**
- TMDB ID: Search at themoviedb.org or via API
- Poster path: `/movie/{tmdb_id}` → `poster_path` field (starts with `/`)
- Backdrop path: same endpoint → `backdrop_path`
- Full poster URL = `https://image.tmdb.org/t/p/w500{poster_path}`

**Bulk poster backfill** (uses the existing RPC):

```sql
SELECT bulk_update_poster_paths(
  '[
    {"id": "ITEM_UUID_1", "poster_path": "/abc123.jpg"},
    {"id": "ITEM_UUID_2", "poster_path": "/def456.jpg"}
  ]'::jsonb
);
```

### Books

**Required fields:** `miniseries_id`, `media_type`, `title`, `sort_order`  
**Recommended fields:** `creator` (author), `isbn`, `year`  
**Cover images:** Store in `extra_data` as `{"cover_url": "..."}`

```sql
INSERT INTO community_items (miniseries_id, media_type, title, creator, isbn, sort_order, extra_data)
VALUES
  ('MINISERIES_UUID', 'book', 'Dune',           'Frank Herbert', '9780441172719', 1, '{"cover_url": "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg"}'),
  ('MINISERIES_UUID', 'book', 'The Shining',    'Stephen King',  '9780307743657', 2, '{"cover_url": "https://covers.openlibrary.org/b/isbn/9780307743657-L.jpg"}');
```

**Why extra_data for covers?** Books don't use TMDB. The `poster_path` column is TMDB-specific. Book covers come from OpenLibrary or Google Books and are stored as full URLs in `extra_data.cover_url`. The `feed_user_logs` view handles this: `COALESCE(ci.poster_path, ci.extra_data->>'cover_url')`.

### Games

**Required fields:** `miniseries_id`, `media_type`, `title`, `sort_order`  
**Recommended fields:** `year`, `creator` (developer/publisher)  
**External IDs:** Store RAWG ID in `extra_data` as `{"rawg_id": 12345}`

```sql
INSERT INTO community_items (miniseries_id, media_type, title, year, creator, sort_order, extra_data)
VALUES
  ('MINISERIES_UUID', 'game', 'The Last of Us',      2013, 'Naughty Dog',   1, '{"rawg_id": 3636, "cover_url": "https://media.rawg.io/..."}'),
  ('MINISERIES_UUID', 'game', 'Elden Ring',           2022, 'FromSoftware',  2, '{"rawg_id": 326243, "cover_url": "https://media.rawg.io/..."}');
```

**No tmdb_id for games.** The dedup index only fires when `tmdb_id IS NOT NULL`, so game items won't conflict. Use `extra_data.rawg_id` for external lookups.

### Shows / TV

**Required fields:** `miniseries_id`, `media_type`, `title`, `tmdb_tv_id`, `sort_order`  
**Note:** Use `tmdb_tv_id` (not `tmdb_id`) for TV shows. `tmdb_id` is for movies.

```sql
INSERT INTO community_items (miniseries_id, media_type, title, year, tmdb_tv_id, poster_path, sort_order)
VALUES
  ('MINISERIES_UUID', 'show', 'Andor',         2022, 83867, '/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg', 1),
  ('MINISERIES_UUID', 'show', 'The Acolyte',   2024, 114479, '/mztdt1d4U0gsBcUwVFJwRGRx1PN.jpg', 2);
```

**Important:** The dedup index is on `(miniseries_id, tmdb_id, media_type)` — since shows use `tmdb_tv_id` not `tmdb_id`, they won't be caught by dedup. Be careful not to insert duplicate shows manually.

---

## Adding Badges

Badges reward users for completing a set of items (typically all films in a miniseries).

### Step 1: Create the badge

```sql
INSERT INTO badges (
  community_id, name, description, tagline, progress_tagline,
  badge_type, miniseries_id, 
  image_url, audio_url, accent_color, celebration_theme,
  sort_order, is_active
)
VALUES (
  'COMMUNITY_UUID',
  'Haddonfield Historian',                                    -- name (shown in UI)
  'Complete all Halloween franchise films',                   -- description
  'You survived every night in Haddonfield',                  -- tagline (shown on badge earn)
  'Making your way through Haddonfield...',                   -- progress_tagline (shown while in-progress)
  'miniseries_completion',                                    -- badge_type
  'MINISERIES_UUID',                                          -- which miniseries to track
  'https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/pumpkin_badge.png',
  'https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/halloween_clip.mp3',
  '#ff6a00',                                                  -- accent_color (hex)
  'flicker',                                                  -- celebration_theme (animation style)
  1,                                                          -- sort_order
  true                                                        -- is_active
)
RETURNING id;
```

**celebration_theme options:** `flicker` (default), or whatever your BadgeCelebration component supports.

**Assets:** Upload badge images and audio clips to the `banners` Supabase storage bucket first. Use the public URL pattern:
```
https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/{filename}
```

### Step 2: How badge completion works

Badge completion is **automatic** — no seeding of `badge_items` needed for `miniseries_completion` badges. Here's the flow:

1. `community_badges_init` RPC loads all active badges for a community
2. For each unearned badge with `badge_type = 'miniseries_completion'`, it checks: do all `community_items` in the badge's `miniseries_id` have a matching `community_user_progress` row with `status = 'completed'`?
3. The check is **cross-community via tmdb_id** — if you watched a film in community A, it counts toward a badge in community B
4. When all items are completed, the frontend inserts into `user_badges`
5. `BadgeCelebration.jsx` fires the animation + audio

### Step 3: Verify badge is wired up

```sql
-- Check the badge exists and is active
SELECT id, name, miniseries_id, is_active FROM badges 
WHERE community_id = 'COMMUNITY_UUID';

-- Check the miniseries has items
SELECT COUNT(*) AS item_count FROM community_items 
WHERE miniseries_id = 'MINISERIES_UUID';

-- Test the init RPC
SELECT community_badges_init('COMMUNITY_UUID', 'YOUR_USER_ID');
```

### Badge with custom items (badge_items table)

If a badge doesn't map 1:1 to a miniseries (e.g., "Watch any 5 horror films"), use `badge_items`:

```sql
-- Create badge with no miniseries_id
INSERT INTO badges (community_id, name, badge_type, is_active, ...)
VALUES ('COMMUNITY_UUID', 'Horror Hound', 'item_collection', true, ...)
RETURNING id;

-- Link specific items
INSERT INTO badge_items (badge_id, item_id) VALUES
  ('BADGE_UUID', 'ITEM_UUID_1'),
  ('BADGE_UUID', 'ITEM_UUID_2'),
  ('BADGE_UUID', 'ITEM_UUID_3');
```

**Note:** The `community_badges_init` RPC currently only handles `miniseries_completion` badges. `item_collection` badge checking would need separate logic in the frontend.

---

## Episode & RSS Matching

Episodes are stored as community_items with extra metadata for audio playback:

```sql
INSERT INTO community_items (
  miniseries_id, media_type, title, tmdb_id, sort_order,
  episode_number, episode_number_display, episode_url, air_date, rss_guid,
  extra_data
)
VALUES (
  'MINISERIES_UUID', 'film', 'Jaws', 578, 1,
  'EP001',                                          -- episode_number (internal sort key)
  'Ep. 1',                                          -- episode_number_display (shown in UI)
  'https://feeds.megaphone.fm/...',                  -- episode_url (direct audio link)
  '2024-03-15',                                     -- air_date
  'abc123-guid-from-rss',                           -- rss_guid (for dedup during RSS sync)
  '{"episode_title": "Jaws (w/ Special Guest)"}'    -- episode_title goes in extra_data
);
```

**RSS fields:**
- `episode_url` — direct link to the audio file or episode page
- `rss_guid` — unique identifier from the RSS feed, used to prevent duplicate imports
- `air_date` — episode publish date, used by `feed_upcoming_episodes` and `feed_episode_cards`
- `extra_data.episode_title` — the podcast episode title (distinct from the film title)

---

## Drafts & Awards

### Awards (e.g., Blankies)

```sql
INSERT INTO community_awards_picks (
  community_id, year, category, category_group, category_sort,
  host, title, subtitle, tmdb_id, poster_path,
  is_winner, rank, sort_order
)
VALUES
  ('COMMUNITY_UUID', 2024, 'Best Picture', 'standard', 1,
   'Griffin', 'Anora', NULL, 1064028, '/poster.jpg',
   true, 1, 0),
  ('COMMUNITY_UUID', 2024, 'Best Picture', 'standard', 1,
   'David', 'The Brutalist', NULL, 549509, '/poster.jpg',
   true, 1, 1);
```

**Fields:**
- `category_group` — groups categories in the UI (`standard`, `technical`, `fun`, etc.)
- `category_sort` — ordering of categories within a group
- `is_winner` — true for the actual pick, false for nominees/runners-up
- `rank` — within a category, rank of this pick (1 = winner)

### Drafts (e.g., Big Picture year-end drafts)

```sql
-- Create the draft
INSERT INTO community_drafts (
  community_id, draft_type, draft_year, title, 
  episode_title, episode_date, format, rules, categories, draft_order,
  data_confidence, sort_order
)
VALUES (
  'COMMUNITY_UUID', 'year', 2024, '2024 Movie Draft',
  'The 2024 Draft Episode', '2024-12-20', 'snake',
  'Standard snake draft, 5 rounds',
  ARRAY['Action', 'Comedy', 'Drama', 'Horror', 'Wildcard'],
  ARRAY['Sean', 'Amanda', 'Chris'],
  'verified', 0
)
RETURNING id;

-- Add picks
INSERT INTO community_draft_picks (
  draft_id, community_id, host, title, movie_year, category, tmdb_id, poster_path, sort_order
)
VALUES
  ('DRAFT_UUID', 'COMMUNITY_UUID', 'Sean', 'Anora', 2024, 'Drama', 1064028, '/poster.jpg', 1),
  ('DRAFT_UUID', 'COMMUNITY_UUID', 'Amanda', 'Dune: Part Two', 2024, 'Action', 693134, '/poster.jpg', 2);
```

---

## Common Pitfalls

### 1. Forgetting miniseries_id
Every item needs a miniseries. If you insert without one, the item is orphaned and won't appear in any community view.

### 2. tmdb_id vs tmdb_tv_id
- `tmdb_id` = movies (from themoviedb.org `/movie/{id}`)
- `tmdb_tv_id` = TV shows (from themoviedb.org `/tv/{id}`)
- The dedup index only checks `tmdb_id`. Shows using `tmdb_tv_id` bypass it — dedup manually.

### 3. Poster path format
- TMDB poster paths start with `/` → `/lxM6kqilAdpdhqUl2biYp5frUxE.jpg`
- Book/game covers are full URLs → stored in `extra_data.cover_url`
- Don't put full TMDB URLs in `poster_path` — the app prepends the base URL

### 4. sort_order gaps
`sort_order` controls display order within a miniseries. Gaps are fine (10, 20, 30), but if you need to insert between items, use the `reflow_sort_order` RPC:
```sql
SELECT reflow_sort_order('MINISERIES_UUID', 15, 'EXCLUDE_ITEM_UUID');
```

### 5. Duplicate items
The partial unique index `idx_community_items_no_dupes` prevents `(miniseries_id, tmdb_id, media_type)` duplicates when `tmdb_id IS NOT NULL`. But items with NULL tmdb_id (books, some games) can be duplicated — always check before inserting.

### 6. Badge miniseries mismatch
A badge's `miniseries_id` must match the actual miniseries containing the items to track. If you move items to a different miniseries, update the badge too.

### 7. RLS admin access
Admin write policies on community data use your UUID:
```
19410e64-d610-4fab-9c26-d24fafc94696
```
If you ever need another admin, add their UUID to the policies or create a proper admin role.

---

## Useful Diagnostic Queries

```sql
-- Items with no poster
SELECT id, title, tmdb_id, poster_path, extra_data->>'cover_url' AS book_cover
FROM community_items 
WHERE poster_path IS NULL AND (extra_data->>'cover_url') IS NULL AND tmdb_id IS NOT NULL;

-- Orphaned items (no miniseries — should never happen)
SELECT id, title FROM community_items WHERE miniseries_id IS NULL;

-- Community item counts
SELECT cp.name, COUNT(ci.id) AS items
FROM community_pages cp
JOIN community_miniseries cm ON cm.community_id = cp.id
JOIN community_items ci ON ci.miniseries_id = cm.id
GROUP BY cp.name ORDER BY items DESC;

-- Badge readiness check
SELECT b.name, b.miniseries_id, 
  (SELECT COUNT(*) FROM community_items WHERE miniseries_id = b.miniseries_id) AS item_count
FROM badges b WHERE b.is_active = true;

-- Duplicate tmdb_id across miniseries (cross-community, expected)
SELECT tmdb_id, COUNT(*), array_agg(DISTINCT title)
FROM community_items 
WHERE tmdb_id IS NOT NULL
GROUP BY tmdb_id HAVING COUNT(*) > 1;

-- User progress completeness for a community
SELECT cp.name, 
  COUNT(ci.id) AS total_items,
  COUNT(cup.id) FILTER (WHERE cup.status = 'completed') AS completed
FROM community_pages cp
JOIN community_miniseries cm ON cm.community_id = cp.id
JOIN community_items ci ON ci.miniseries_id = cm.id
LEFT JOIN community_user_progress cup ON cup.item_id = ci.id AND cup.user_id = '19410e64-d610-4fab-9c26-d24fafc94696'
GROUP BY cp.name;
```

---

## Quick Reference: Media Type → Fields

| Field | film | book | game | show |
|-------|------|------|------|------|
| media_type | `'film'` | `'book'` | `'game'` | `'show'` |
| tmdb_id | ✅ required | ❌ | ❌ | ❌ |
| tmdb_tv_id | ❌ | ❌ | ❌ | ✅ required |
| poster_path | TMDB path | ❌ | ❌ | TMDB path |
| extra_data.cover_url | ❌ | ✅ full URL | ✅ full URL | ❌ |
| extra_data.rawg_id | ❌ | ❌ | ✅ | ❌ |
| isbn | ❌ | ✅ optional | ❌ | ❌ |
| creator | director | author | developer | ❌ |
| year | release year | pub year | release year | first air year |
| episode_url | audio link | ❌ | ❌ | ❌ |
| rss_guid | RSS dedup | ❌ | ❌ | ❌ |
| air_date | ep publish | ❌ | ❌ | ❌ |

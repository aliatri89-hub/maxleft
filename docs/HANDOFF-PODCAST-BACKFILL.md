# Podcast Backfill Handoff — March 22, 2026

## Goal
Backfill full episode archives for **The Filmcast**, **How Did This Get Made?**, and **Film Junk** using the Podcast Index API, then wire up "Listen on MANTL" in their communities.

## What Was Done This Session

### Infrastructure Built
- **`backfill-episodes` edge function** — pulls full episode archives from Podcast Index API, dedupes, inserts, runs reverse matching. Already deployed on Supabase.
- **`approve_ingest_matches` SQL function** — now does 5 things atomically on approval: approve → create media rows → link media_id → propagate episode_url to community_items (filmography tab only) → fire notifications.
- **`recently_covered_films` + `browse_covered_films`** — fixed to join by tmdb_id (not media_id) so all covered films show in search.
- **Podcast Index API credentials** already set as Supabase secrets (`PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET`).
- **`itunes_id` column** added to `podcasts` table with IDs seeded.

### Listen on MANTL Wired Into All Custom Modals
These custom log modals now have `useEpisodeMatch` + the gold `#F5C518` player button:
- ✅ Rewatchables (`RewatchablesLogModal.jsx`)
- ✅ HDTGM (`HDTGMLogModal.jsx`)
- ✅ GetPlayed (`GetPlayedLogModal.jsx`)
- ✅ Big Picture (`BigPictureLogModal.jsx`)
- ✅ Filmspotting (`FilmspottingLogModal.jsx`)

These use the shared `CommunityLogModal` which already had it:
- ✅ Blank Check
- ✅ Now Playing
- ✅ Film Junk

### Rewatchables Backfill Complete
- 452 episodes pulled from Podcast Index (was 237)
- 330 of 391 community items now have "Listen on MANTL"
- 61 remaining are title mismatches (sequels, multi-film episodes)

## Current State of Target Podcasts

| Podcast | Slug | iTunes ID | Episodes in DB | Community Items | Items w/ Audio | Gap |
|---------|------|-----------|---------------|----------------|---------------|-----|
| The Filmcast | `filmcast` | 281400220 | 489 | 0 (no community) | 0 | No community page — feed-only podcast |
| HDTGM | `hdtgm` | 409287913 | 290 | 380 | 197 | 183 items need audio |
| Film Junk | `filmjunk` | 164164018 | 67 | 382 | 4 | 378 items need audio |

**Note:** Filmcast has no community page (0 community_items). It's a feed-only podcast — episodes show in search/browse coverage but there's no community tab to wire "Listen on MANTL" into. Backfill still helps search coverage.

## Step-by-Step Backfill Process

### Step 1: Run Backfill Curls
The edge function and Podcast Index credentials are already deployed. Just run:

```bash
# HDTGM
curl -X POST https://api.mymantl.app/functions/v1/backfill-episodes \
  -H "Content-Type: application/json" \
  -d '{"podcast_slug": "hdtgm", "max_episodes": 1000}'

# Film Junk
curl -X POST https://api.mymantl.app/functions/v1/backfill-episodes \
  -H "Content-Type: application/json" \
  -d '{"podcast_slug": "filmjunk", "max_episodes": 1000}'

# Filmcast (feed-only, no community — still helps search coverage)
curl -X POST https://api.mymantl.app/functions/v1/backfill-episodes \
  -H "Content-Type: application/json" \
  -d '{"podcast_slug": "filmcast", "max_episodes": 1000}'
```

Each will take 30-90 seconds. Response shows `new_episodes_inserted` and `matches_generated`.

### Step 2: Review Matches in Ingest Queue
The `reverse_match_episode` function auto-generates matches but many will be wrong or missing. Go to Feed → Inbox tab (admin) and batch approve/reject/re-match.

### Step 3: Smart-Quote Title Matching (SQL)
The `reverse_match_episode` function misses a LOT because podcast titles include guest names. After the backfill, run this SQL to catch exact title matches that the reverse matcher missed.

**Important:** This only works for podcasts where episode titles contain the film title in smart quotes (curly quotes). Rewatchables uses this format. HDTGM also uses it. Film Junk and Filmcast do NOT — they use different title formats.

For HDTGM and any quote-formatted podcasts:
```sql
-- 1. Create podcast_episode_films for smart-quote title matches
INSERT INTO podcast_episode_films (episode_id, tmdb_id, confidence_score, admin_reviewed)
SELECT DISTINCT ON (pe.id, ci.tmdb_id)
  pe.id, ci.tmdb_id, 1.0, true
FROM community_items ci
JOIN community_miniseries cm ON cm.id = ci.miniseries_id
JOIN community_pages cp ON cp.id = cm.community_id
JOIN podcasts p ON p.community_page_id = cp.id
JOIN podcast_episodes pe ON pe.podcast_id = p.id
WHERE cp.slug = 'TARGET_SLUG_HERE'
  AND ci.episode_url IS NULL
  AND pe.audio_url IS NOT NULL
  AND (cm.tab_key IS NULL OR cm.tab_key = 'filmography')
  AND LOWER(substring(pe.title from E'\u2018([^\u2019]+)\u2019')) = LOWER(ci.title)
  AND NOT EXISTS (
    SELECT 1 FROM podcast_episode_films pef WHERE pef.episode_id = pe.id AND pef.tmdb_id = ci.tmdb_id
  )
ORDER BY pe.id, ci.tmdb_id;

-- 2. Backfill media_id
UPDATE podcast_episode_films pef
SET media_id = m.id
FROM media m
WHERE m.tmdb_id = pef.tmdb_id AND m.media_type = 'film'
  AND pef.media_id IS NULL AND pef.admin_reviewed = true;

-- 3. Populate episode_url on community_items
UPDATE community_items ci
SET
  episode_url = pe.audio_url,
  extra_data = COALESCE(ci.extra_data, '{}'::jsonb)
    || jsonb_build_object(
         'episode_url', pe.audio_url,
         'episode_title', pe.title,
         'episode_date', pe.air_date::text,
         'episode_duration', pe.duration_seconds::text
       )
FROM community_miniseries cm
JOIN community_pages cp ON cp.id = cm.community_id
JOIN podcasts p ON p.community_page_id = cp.id
JOIN podcast_episodes pe ON pe.podcast_id = p.id
WHERE ci.miniseries_id = cm.id
  AND cp.slug = 'TARGET_SLUG_HERE'
  AND ci.episode_url IS NULL
  AND pe.audio_url IS NOT NULL
  AND (cm.tab_key IS NULL OR cm.tab_key = 'filmography')
  AND LOWER(substring(pe.title from E'\u2018([^\u2019]+)\u2019')) = LOWER(ci.title);
```

Replace `TARGET_SLUG_HERE` with `hdtgm` or whichever podcast you're backfilling.

### Step 4: Verify
```sql
SELECT 
  COUNT(*) FILTER (WHERE ci.episode_url IS NOT NULL) AS has_ep,
  COUNT(*) FILTER (WHERE ci.episode_url IS NULL) AS missing_ep,
  COUNT(*) AS total
FROM community_items ci
JOIN community_miniseries cm ON cm.id = ci.miniseries_id
JOIN community_pages cp ON cp.id = cm.community_id
WHERE cp.slug = 'TARGET_SLUG_HERE';
```

## Known Issues & Future Work

### Title Matching Limitations
- **Smart-quote matching** only works for podcasts that wrap film titles in curly quotes (e.g., `'Alien'` With Paul Scheer...). Rewatchables and HDTGM use this format.
- **Film Junk** uses a different format (episode numbers, no quotes). Will need a custom matching approach — possibly ILIKE with the community_item title against the episode title.
- **Reverse matcher mismatches** — sometimes matches to wrong TMDB film (e.g., "Alive" 1993 matched to a different "Alive"). The ingest review queue's re-match ↻ button handles these one-by-one.
- **Sequel gaps** — community has "Die Hard" but episode is "Die Hard 2". These can't be auto-matched.

### Awards/Patreon Tab Protection
The `approve_ingest_matches` function only propagates episode_url to `filmography` tab items. Awards and Patreon tabs are excluded. This is important for Blank Check which has distinct tabs.

### RSSSyncTool Sunset
The old `RSSSyncTool` writes directly to `community_items` but bypasses `podcast_episode_films`, so search/feed never sees those episodes. Consider removing it now that the ingest pipeline handles everything.

### Remaining Orphan Media
~111 approved `podcast_episode_films` entries still have no `media` table row because no `tmdb_title_index` entry exists. A future improvement: have `ingest-rss` or `backfill-episodes` call the TMDB API to create media rows for unknown films during matching.

## Key File Locations
- Edge function: `supabase/functions/backfill-episodes/index.ts`
- Ingest function: `supabase/functions/ingest-rss/index.ts`
- Ingest review UI: `src/components/feed/IngestReviewTool.jsx`
- Episode matching hook: `src/hooks/community/useEpisodeMatch.js`
- Shared log modal: `src/components/community/shared/CommunityLogModal.jsx`
- Supabase project: `gfjobhkofftvmluocxyw`

## Architecture Summary
```
Podcast Index API → backfill-episodes edge function
                         ↓
Daily RSS cron → ingest-rss edge function
                         ↓
                   podcast_episodes (raw episodes)
                         ↓
                   reverse_match_episode() + smart-quote SQL
                         ↓
                   podcast_episode_films (episode↔film links)
                         ↓
                   approve_ingest_matches() [admin approval]
                         ↓
              ┌──────────┼──────────────┐
              ↓          ↓              ↓
         media rows   community_items   notifications
         (search)     (episode_url)     (push)
                         ↓
                   useEpisodeMatch hook
                         ↓
                   "Listen on MANTL" badge
```

-- ═══════════════════════════════════════════════════════════════════
-- EPISODE URL RECONCILIATION
-- Goal: Ensure community_items.episode_url always matches
--        podcast_episodes.audio_url (the canonical source of truth)
-- ═══════════════════════════════════════════════════════════════════

-- ═══ STEP 1: DIAGNOSTIC — see the current state ═══════════════════
-- How many community items have episode_url set?

SELECT
  c.community_id,
  com.name AS community_name,
  count(*) AS items_with_episode_url
FROM community_items c
JOIN communities com ON com.id = c.community_id
WHERE c.episode_url IS NOT NULL
GROUP BY c.community_id, com.name
ORDER BY items_with_episode_url DESC;


-- ═══ STEP 2: FIND MISMATCHES ══════════════════════════════════════
-- Community items where episode_url doesn't match any podcast_episodes.audio_url.
-- These are the rows where the URL was set from a different RSS fetch
-- or an older redirect chain, not from the canonical podcast_episodes row.

SELECT
  c.id AS item_id,
  c.title AS item_title,
  com.name AS community_name,
  c.episode_url AS current_url,
  pe.audio_url AS canonical_url,
  pe.title AS episode_title,
  CASE
    WHEN pe.audio_url IS NULL THEN 'NO_MATCH_IN_PODCAST_EPISODES'
    WHEN c.episode_url = pe.audio_url THEN 'MATCH'
    ELSE 'MISMATCH'
  END AS status
FROM community_items c
JOIN communities com ON com.id = c.community_id
-- Join through the bridge: community_items.tmdb_id → podcast_episode_films → podcast_episodes
LEFT JOIN podcast_episode_films pef
  ON pef.tmdb_id = c.tmdb_id
LEFT JOIN podcast_episodes pe
  ON pe.id = pef.episode_id
WHERE c.episode_url IS NOT NULL
  AND c.tmdb_id IS NOT NULL
  -- Only show mismatches and unmatched
  AND (pe.audio_url IS NULL OR c.episode_url != pe.audio_url)
ORDER BY com.name, c.title;


-- ═══ STEP 3: FIND ORPHAN URLs ════════════════════════════════════
-- Community items with episode_url set but the URL doesn't exist
-- anywhere in podcast_episodes. These are URLs from manual RSS fetches
-- or scrapers that bypassed the ingest pipeline.

SELECT
  c.id AS item_id,
  c.title AS item_title,
  com.name AS community_name,
  c.episode_url AS orphan_url
FROM community_items c
JOIN communities com ON com.id = c.community_id
WHERE c.episode_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM podcast_episodes pe
    WHERE pe.audio_url = c.episode_url
  )
ORDER BY com.name, c.title;


-- ═══ STEP 4: FIX MISMATCHES ══════════════════════════════════════
-- For community items where:
--   1. episode_url is set
--   2. There IS a matching podcast_episode via tmdb_id bridge
--   3. But the URLs differ
-- → Update community_items.episode_url AND extra_data.episode_url
--    to match podcast_episodes.audio_url
--
-- ⚠️  RUN STEPS 1-3 FIRST to understand scope before executing this.
-- ⚠️  This is safe — it only updates the URL string, not the linkage.

/*
WITH corrections AS (
  SELECT DISTINCT ON (c.id)
    c.id AS item_id,
    pe.audio_url AS correct_url
  FROM community_items c
  JOIN podcast_episode_films pef ON pef.tmdb_id = c.tmdb_id
  JOIN podcast_episodes pe ON pe.id = pef.episode_id
  WHERE c.episode_url IS NOT NULL
    AND c.tmdb_id IS NOT NULL
    AND c.episode_url != pe.audio_url
    AND pe.audio_url IS NOT NULL
  ORDER BY c.id, pe.id DESC  -- prefer newest episode if multiple matches
)
UPDATE community_items ci
SET
  episode_url = cor.correct_url,
  extra_data = CASE
    WHEN ci.extra_data IS NOT NULL AND ci.extra_data ? 'episode_url'
    THEN jsonb_set(ci.extra_data, '{episode_url}', to_jsonb(cor.correct_url))
    ELSE ci.extra_data
  END
FROM corrections cor
WHERE ci.id = cor.item_id;
*/

-- ═══ STEP 5: VERIFY ══════════════════════════════════════════════
-- After running Step 4, re-run Step 3. Orphan count should drop.
-- Remaining orphans are URLs that were never ingested into podcast_episodes
-- (e.g. manually pasted Patreon URLs, or from podcasts not in the ingest pipeline).
-- Those are fine to leave as-is — they still work as direct audio links.

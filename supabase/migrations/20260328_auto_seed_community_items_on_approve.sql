-- ════════════════════════════════════════════════════════════════
-- Auto-seed community_items on ingest approve
-- ════════════════════════════════════════════════════════════════
-- For communities like The Rewatchables where items aren't pre-seeded,
-- this creates a new community_item when approving an ingest match
-- and routes it to the correct genre shelf using TMDB primary genre.
--
-- Genre mapping (TMDB primary → shelf title):
--   Action, Adventure, War, Western  → Action & Adventure
--   Comedy, Romance, Family          → Comedy
--   Crime, Thriller, Mystery         → Crime & Thriller
--   Horror                           → Horror
--   Science Fiction, Fantasy         → Sci-Fi & Fantasy
--   Animation                        → Animation
--   Documentary, Music               → Documentary & Music
--   Drama, History, TV Movie         → Drama (fallback)
-- ════════════════════════════════════════════════════════════════

-- 1. Helper: map TMDB primary genre → Rewatchables shelf title
CREATE OR REPLACE FUNCTION public.tmdb_genre_to_shelf(p_genre text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE split_part(COALESCE(p_genre, ''), ', ', 1)
    -- Action & Adventure
    WHEN 'Action'          THEN 'Action & Adventure'
    WHEN 'Adventure'       THEN 'Action & Adventure'
    WHEN 'War'             THEN 'Action & Adventure'
    WHEN 'Western'         THEN 'Action & Adventure'
    -- Comedy
    WHEN 'Comedy'          THEN 'Comedy'
    WHEN 'Romance'         THEN 'Comedy'
    WHEN 'Family'          THEN 'Comedy'
    -- Crime & Thriller
    WHEN 'Crime'           THEN 'Crime & Thriller'
    WHEN 'Thriller'        THEN 'Crime & Thriller'
    WHEN 'Mystery'         THEN 'Crime & Thriller'
    -- Horror
    WHEN 'Horror'          THEN 'Horror'
    -- Sci-Fi & Fantasy
    WHEN 'Science Fiction' THEN 'Sci-Fi & Fantasy'
    WHEN 'Fantasy'         THEN 'Sci-Fi & Fantasy'
    -- Animation
    WHEN 'Animation'       THEN 'Animation'
    -- Documentary & Music
    WHEN 'Documentary'     THEN 'Documentary & Music'
    WHEN 'Music'           THEN 'Documentary & Music'
    -- Drama (catch-all)
    WHEN 'Drama'           THEN 'Drama'
    WHEN 'History'         THEN 'Drama'
    WHEN 'TV Movie'        THEN 'Drama'
    -- Fallback
    ELSE 'Drama'
  END;
$$;


-- 2. Updated approve_ingest_matches with auto-seed step
CREATE OR REPLACE FUNCTION public.approve_ingest_matches(mapping_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  approved_count    int;
  community_count   int;
  media_count       int;
  media_created     int;
  items_created     int := 0;
  new_mappings      jsonb;
  internal_secret   text;
BEGIN
  -- 1. Mark matches as reviewed
  UPDATE podcast_episode_films
  SET admin_reviewed = true
  WHERE id = ANY(mapping_ids)
    AND admin_reviewed = false;
  GET DIAGNOSTICS approved_count = ROW_COUNT;

  -- 2. Create media rows for films that don't have one yet
  INSERT INTO media (media_type, tmdb_id, title, year)
  SELECT DISTINCT ON (ti.tmdb_id)
    'film', ti.tmdb_id, ti.title, ti.year
  FROM podcast_episode_films pef
  JOIN tmdb_title_index ti ON ti.tmdb_id = pef.tmdb_id
  WHERE pef.id = ANY(mapping_ids)
    AND NOT EXISTS (
      SELECT 1 FROM media m WHERE m.tmdb_id = pef.tmdb_id AND m.media_type = 'film'
    )
  ORDER BY ti.tmdb_id;
  GET DIAGNOSTICS media_created = ROW_COUNT;

  -- 3. Backfill media_id
  UPDATE podcast_episode_films pef
  SET media_id = m.id
  FROM media m
  WHERE pef.id = ANY(mapping_ids)
    AND pef.media_id IS NULL
    AND m.tmdb_id = pef.tmdb_id
    AND m.media_type = 'film';
  GET DIAGNOSTICS media_count = ROW_COUNT;

  -- 4. Propagate episode data to EXISTING community_items
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
  FROM podcast_episode_films pef
  JOIN podcast_episodes pe ON pe.id = pef.episode_id
  JOIN podcasts p ON p.id = pe.podcast_id
  JOIN community_pages cp ON cp.id = p.community_page_id
  JOIN community_miniseries cm ON cm.community_id = cp.id
  WHERE pef.id = ANY(mapping_ids)
    AND pef.admin_reviewed = true
    AND ci.miniseries_id = cm.id
    AND ci.tmdb_id = pef.tmdb_id
    AND ci.episode_url IS NULL
    AND (cm.tab_key IS NULL OR cm.tab_key = 'filmography');
  GET DIAGNOSTICS community_count = ROW_COUNT;

  -- ═══════════════════════════════════════════════════════════
  -- 5. AUTO-SEED: Create community_items for films that have
  --    NO existing item in the community's genre shelves.
  --    Routes to the correct shelf via TMDB primary genre.
  -- ═══════════════════════════════════════════════════════════
  INSERT INTO community_items (
    miniseries_id, media_type, title, year, tmdb_id,
    poster_path, backdrop_path, media_id, episode_id,
    episode_url, sort_order, extra_data
  )
  SELECT DISTINCT ON (pef.tmdb_id)
    shelf.id,                           -- target genre shelf
    'film',
    COALESCE(m.title, ti.title),
    COALESCE(m.year, ti.year),
    pef.tmdb_id,
    m.poster_path,
    m.backdrop_path,
    m.id,                               -- media_id
    pef.episode_id,                     -- link to the episode
    pe.audio_url,                       -- episode audio
    COALESCE(m.year, ti.year, 9999),    -- sort by release year
    jsonb_build_object(
      'episode_url',      pe.audio_url,
      'episode_title',    pe.title,
      'episode_date',     pe.air_date::text,
      'episode_duration', pe.duration_seconds::text,
      'auto_seeded',      true
    )
  FROM podcast_episode_films pef
  JOIN podcast_episodes pe ON pe.id = pef.episode_id
  JOIN podcasts p ON p.id = pe.podcast_id
  JOIN community_pages cp ON cp.id = p.community_page_id
  -- Get film data
  LEFT JOIN media m ON m.tmdb_id = pef.tmdb_id AND m.media_type = 'film'
  LEFT JOIN tmdb_title_index ti ON ti.tmdb_id = pef.tmdb_id
  -- Find the correct genre shelf in this community
  JOIN community_miniseries shelf
    ON shelf.community_id = cp.id
    AND shelf.title = tmdb_genre_to_shelf(m.genre)
    AND (shelf.tab_key IS NULL OR shelf.tab_key = 'filmography')
  WHERE pef.id = ANY(mapping_ids)
    AND pef.admin_reviewed = true
    -- Only for films that DON'T already have a community_item in this community
    AND NOT EXISTS (
      SELECT 1
      FROM community_items existing
      JOIN community_miniseries es ON es.id = existing.miniseries_id
      WHERE es.community_id = cp.id
        AND existing.tmdb_id = pef.tmdb_id
    )
  ORDER BY pef.tmdb_id;
  GET DIAGNOSTICS items_created = ROW_COUNT;

  -- 6. Build new_mappings payload
  SELECT jsonb_agg(jsonb_build_object(
    'episode_id', pef.episode_id::text,
    'tmdb_id',    pef.tmdb_id
  ))
  INTO new_mappings
  FROM podcast_episode_films pef
  WHERE pef.id = ANY(mapping_ids)
    AND pef.admin_reviewed = true;

  -- 7. Fire notify-new-coverage via pg_net
  IF new_mappings IS NOT NULL AND jsonb_array_length(new_mappings) > 0 THEN
    SELECT value INTO internal_secret FROM app_config WHERE key = 'internal_webhook_secret';

    PERFORM net.http_post(
      'https://gfjobhkofftvmluocxyw.supabase.co/functions/v1/notify-new-coverage',
      jsonb_build_object('new_mappings', new_mappings),
      '{}'::jsonb,
      jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || internal_secret
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'approved',                approved_count,
    'notifications_queued',    COALESCE(jsonb_array_length(new_mappings), 0),
    'community_items_updated', community_count,
    'community_items_created', items_created,
    'media_ids_linked',        media_count,
    'media_created',           media_created
  );
END;
$function$;

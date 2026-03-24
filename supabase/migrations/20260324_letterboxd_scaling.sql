-- ============================================================
-- Letterboxd sync scaling: smart polling + conditional requests
-- ============================================================
-- Adds columns to support:
--   1. ETag/conditional requests (skip unchanged RSS feeds)
--   2. Tiered polling (active/moderate/dormant users)
--   3. Tracking last sync time for dispatcher logic
-- ============================================================

-- ETag from last RSS fetch — used with If-None-Match header
-- to get 304 (not modified) responses and skip unchanged feeds
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS letterboxd_etag text;

-- Last-Modified header from last RSS fetch — used with If-Modified-Since
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS letterboxd_last_modified text;

-- Timestamp of the last successful sync (regardless of whether new films were found)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS letterboxd_last_synced_at timestamptz;

-- Computed sync tier based on activity:
--   'active'   = logged a film in last 7 days   → sync every 30 min
--   'moderate' = logged a film in last 30 days  → sync every 2 hours
--   'dormant'  = no activity in 30+ days        → sync every 6 hours
-- Defaults to 'active' so new users get frequent syncs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS letterboxd_sync_tier text DEFAULT 'active'
  CHECK (letterboxd_sync_tier IN ('active', 'moderate', 'dormant'));

-- Index for the dispatcher query: quickly find users due for sync
CREATE INDEX IF NOT EXISTS idx_profiles_letterboxd_sync
  ON profiles (letterboxd_sync_tier, letterboxd_last_synced_at)
  WHERE letterboxd_username IS NOT NULL;

-- ============================================================
-- Function to refresh sync tiers based on recent logging activity
-- Called by the dispatcher before selecting users to sync
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_letterboxd_sync_tiers()
RETURNS void
LANGUAGE sql
AS $$
  UPDATE profiles
  SET letterboxd_sync_tier = CASE
    -- Active: has a film log in the last 7 days
    WHEN EXISTS (
      SELECT 1 FROM user_media_logs uml
      JOIN media m ON m.id = uml.media_id AND m.media_type = 'film'
      WHERE uml.user_id = profiles.id
        AND uml.watched_at > now() - interval '7 days'
    ) THEN 'active'
    -- Moderate: has a film log in the last 30 days
    WHEN EXISTS (
      SELECT 1 FROM user_media_logs uml
      JOIN media m ON m.id = uml.media_id AND m.media_type = 'film'
      WHERE uml.user_id = profiles.id
        AND uml.watched_at > now() - interval '30 days'
    ) THEN 'moderate'
    -- Dormant: no recent activity
    ELSE 'dormant'
  END
  WHERE letterboxd_username IS NOT NULL;
$$;

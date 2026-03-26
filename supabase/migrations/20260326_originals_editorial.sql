-- ════════════════════════════════════════════════════════════════
-- MANTL ORIGINALS — Editorial Blurbs & Author Support
-- Add author field to originals_posts.
-- Per-film blurbs use existing extra_data jsonb on community_items:
--   extra_data.editorial_blurb  (text, markdown)
--   extra_data.blurb_author     (text, e.g. "Ali")
-- ════════════════════════════════════════════════════════════════

-- Add author to shelf-level posts
ALTER TABLE originals_posts
  ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Ali';

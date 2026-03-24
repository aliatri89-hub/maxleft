-- ════════════════════════════════════════════════════════════════
-- MANTL ORIGINALS — Schema + Seed Data
-- Run against Supabase project gfjobhkofftvmluocxyw
-- ════════════════════════════════════════════════════════════════

-- ── 1. originals_posts table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS originals_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  body TEXT NOT NULL,          -- markdown
  miniseries_id UUID REFERENCES community_miniseries(id),
  published_at TIMESTAMPTZ,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE originals_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read originals_posts"
  ON originals_posts FOR SELECT USING (true);

CREATE POLICY "Admin write originals_posts"
  ON originals_posts FOR ALL
  USING (auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696');

-- ── 2. Community page row ─────────────────────────────────────
INSERT INTO community_pages (slug, name, description, tagline, theme_config, launched, sort_order)
VALUES (
  'originals',
  'MANTL Originals',
  'Curated film shelves with editorial context. Free for everyone.',
  'MANTL Originals',
  '{
    "community_type": "originals",
    "accent": "#e94560",
    "hosts": [],
    "tabs": []
  }'::jsonb,
  true,
  0
)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Miniseries (5 launch shelves) ─────────────────────────
-- We need the community_id, so grab it first
DO $$
DECLARE
  v_community_id UUID;
  v_ms1 UUID; -- Best Year in Film
  v_ms2 UUID; -- Road Movies
  v_ms3 UUID; -- Tom Clancy Films
  v_ms4 UUID; -- The Movie Was Better
  v_ms5 UUID; -- The System Is Rigged
BEGIN
  SELECT id INTO v_community_id FROM community_pages WHERE slug = 'originals';

  IF v_community_id IS NULL THEN
    RAISE EXCEPTION 'Originals community not found';
  END IF;

  -- ── Miniseries ──
  INSERT INTO community_miniseries (id, community_id, title, description, sort_order)
  VALUES (gen_random_uuid(), v_community_id, 'Best Year in Film', 'Ali picks his favorite year in film and makes the case.', 1)
  RETURNING id INTO v_ms1;

  INSERT INTO community_miniseries (id, community_id, title, description, sort_order)
  VALUES (gen_random_uuid(), v_community_id, 'Road Movies', 'A curated shelf of road movies no algorithm would ever surface.', 2)
  RETURNING id INTO v_ms2;

  INSERT INTO community_miniseries (id, community_id, title, description, sort_order)
  VALUES (gen_random_uuid(), v_community_id, 'Tom Clancy Films', 'The Clancy franchise across four decades and three Jack Ryans.', 3)
  RETURNING id INTO v_ms3;

  INSERT INTO community_miniseries (id, community_id, title, description, sort_order)
  VALUES (gen_random_uuid(), v_community_id, 'The Movie Was Better', 'Everyone says the book was better. Sometimes they''re wrong.', 4)
  RETURNING id INTO v_ms4;

  INSERT INTO community_miniseries (id, community_id, title, description, sort_order)
  VALUES (gen_random_uuid(), v_community_id, 'The System Is Rigged', 'Late-stage capitalism on film. Hollywood keeps making them, nothing changes.', 5)
  RETURNING id INTO v_ms5;

  -- ── Seed items: Road Movies ──
  INSERT INTO community_items (miniseries_id, title, year, tmdb_id, sort_order) VALUES
    (v_ms2, 'Mad Max 2: The Road Warrior', 1981, 8810, 1),
    (v_ms2, 'Breakdown', 1997, 10466, 2),
    (v_ms2, 'Joy Ride', 2001, 10059, 3),
    (v_ms2, 'Black Dog', 1998, 36874, 4),
    (v_ms2, 'Mad Max: Fury Road', 2015, 76341, 5);

  -- ── Seed items: Tom Clancy Films ──
  INSERT INTO community_items (miniseries_id, title, year, tmdb_id, sort_order) VALUES
    (v_ms3, 'The Hunt for Red October', 1990, 1669, 1),
    (v_ms3, 'Patriot Games', 1992, 9651, 2),
    (v_ms3, 'Clear and Present Danger', 1994, 9444, 3),
    (v_ms3, 'The Sum of All Fears', 2002, 9648, 4),
    (v_ms3, 'Jack Ryan: Shadow Recruit', 2014, 137094, 5);

  -- ── Seed items: The System Is Rigged ──
  INSERT INTO community_items (miniseries_id, title, year, tmdb_id, sort_order) VALUES
    (v_ms5, 'Wall Street', 1987, 381, 1),
    (v_ms5, 'Boiler Room', 2000, 12621, 2),
    (v_ms5, 'The Wolf of Wall Street', 2013, 106646, 3),
    (v_ms5, 'The Big Short', 2015, 318846, 4),
    (v_ms5, 'Margin Call', 2011, 50839, 5),
    (v_ms5, 'Sorry to Bother You', 2018, 424781, 6),
    (v_ms5, 'Parasite', 2019, 496243, 7),
    (v_ms5, 'Nightcrawler', 2014, 242582, 8),
    (v_ms5, 'The Florida Project', 2017, 399106, 9),
    (v_ms5, 'Network', 1976, 1882, 10),
    (v_ms5, 'RoboCop', 1987, 5548, 11),
    (v_ms5, 'They Live', 1988, 8337, 12),
    (v_ms5, 'Michael Clayton', 2007, 2309, 13);

  -- ── Badges (one per miniseries, item_set_completion type) ──
  INSERT INTO badges (community_id, name, description, badge_type, criteria, is_active) VALUES
    (v_community_id, 'Best Year in Film', 'Watched every film from the Best Year shelf.', 'item_set_completion', json_build_object('miniseries_id', v_ms1)::jsonb, true),
    (v_community_id, 'Road Warrior', 'Completed the Road Movies shelf.', 'item_set_completion', json_build_object('miniseries_id', v_ms2)::jsonb, true),
    (v_community_id, 'Jack Ryan Completionist', 'Watched every Tom Clancy film.', 'item_set_completion', json_build_object('miniseries_id', v_ms3)::jsonb, true),
    (v_community_id, 'The Movie Was Better', 'Completed the Movie Was Better shelf.', 'item_set_completion', json_build_object('miniseries_id', v_ms4)::jsonb, true),
    (v_community_id, 'System Breaker', 'Watched every film on The System Is Rigged shelf.', 'item_set_completion', json_build_object('miniseries_id', v_ms5)::jsonb, true);

  RAISE NOTICE 'MANTL Originals seeded. community_id: %, shelves: %, %, %, %, %',
    v_community_id, v_ms1, v_ms2, v_ms3, v_ms4, v_ms5;
END $$;

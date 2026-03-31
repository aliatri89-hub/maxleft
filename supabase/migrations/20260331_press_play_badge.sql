-- Press Play: global gimme badge awarded on first MyMantl visit
-- Shows as filler on the badge shelf; falls off when user earns 3+ real community badges
INSERT INTO badges (community_id, name, plaque_name, description, tagline, progress_tagline, badge_type, criteria, image_url, accent_color, celebration_theme, sort_order, is_active)
VALUES (
  NULL,               -- global, not tied to any community
  'Press Play',
  'PRESS PLAY',
  'Followed your first podcast on MANTL.',
  'Another Reason to Press Play',
  NULL,               -- no progress state, instant earn
  'onboarding',
  NULL,               -- no criteria, hardcoded award
  NULL,               -- image TBD
  '#EF9F27',
  'flicker',
  0,
  true
);

-- Press Play: global gimme badge awarded on first MyMantl visit
-- Shows as filler on the badge shelf; falls off when user earns 3+ real community badges

-- Expand badge_type check to include 'onboarding'
ALTER TABLE badges DROP CONSTRAINT badges_badge_type_check;
ALTER TABLE badges ADD CONSTRAINT badges_badge_type_check
  CHECK (badge_type = ANY (ARRAY['miniseries_completion','community_completion','milestone','cross_community','combo','item_set_completion','onboarding']));

INSERT INTO badges (community_id, name, plaque_name, description, tagline, progress_tagline, badge_type, image_url, accent_color, celebration_theme, sort_order, is_active)
VALUES (
  NULL,               -- global, not tied to any community
  'Press Play',
  'PRESS PLAY',
  'Followed your first podcast on MANTL.',
  'Another Reason to Press Play',
  NULL,               -- no progress state, instant earn
  'onboarding',
  NULL,               -- image TBD
  '#EF9F27',
  'flicker',
  0,
  true
);

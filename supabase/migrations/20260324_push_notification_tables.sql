-- Push notification infrastructure tables
-- 1. push_notification_log — dedup + history of sent notifications
-- 2. user_notification_preferences — per-user notification controls

-- ══════════════════════════════════════════════════════════════
-- push_notification_log
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS push_notification_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notif_type    text NOT NULL,          -- 'new_coverage', future: 'badge_earned', etc.
  ref_key       text NOT NULL,          -- dedup key, e.g. "coverage:<episode_id>:<tmdb_id>"
  title         text,
  body          text,
  payload       jsonb,
  sent_at       timestamptz DEFAULT now(),
  tapped_at     timestamptz             -- set when user taps the notification (future)
);

CREATE INDEX idx_push_log_dedup ON push_notification_log (user_id, ref_key);
CREATE INDEX idx_push_log_user  ON push_notification_log (user_id, sent_at DESC);

ALTER TABLE push_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON push_notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- user_notification_preferences
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_coverage      boolean DEFAULT true,     -- notify when a podcast covers a logged film
  favorites_only    boolean DEFAULT false,     -- if true, only notify for favorited podcasts
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences"
  ON user_notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

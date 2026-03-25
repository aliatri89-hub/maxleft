-- ═══════════════════════════════════════════════════════════════
-- user_notifications — universal in-app notification inbox
-- Works for ALL users regardless of push/device token status.
-- push_notification_log remains for push delivery dedup.
-- ═══════════════════════════════════════════════════════════════

create table user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notif_type text not null,             -- 'new_coverage', 'watched_coverage', 'badge_earned', 'badge_progress', etc.
  title text not null,
  body text not null,
  image_url text,                       -- podcast artwork, badge image, etc.
  payload jsonb not null default '{}',  -- route, tmdb_id, badge_id, etc. (same shape as push data payloads)
  ref_key text,                         -- dedup key (same pattern as push_notification_log)
  seen_at timestamptz,                  -- null = unread, timestamp = seen
  created_at timestamptz not null default now()
);

-- Fast unread count for bell badge
create index idx_user_notifications_user_unseen
  on user_notifications (user_id, seen_at) where seen_at is null;

-- Inbox list query (newest first)
create index idx_user_notifications_user_created
  on user_notifications (user_id, created_at desc);

-- Dedup: one row per user+ref_key (mirrors push_notification_log pattern)
create unique index idx_user_notifications_dedup
  on user_notifications (user_id, ref_key) where ref_key is not null;

-- ═══════════════════════════════════════════════════════════════
-- RLS — users read/update own, inserts are service_role only
-- ═══════════════════════════════════════════════════════════════

alter table user_notifications enable row level security;

create policy "Users can read own notifications"
  on user_notifications for select using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on user_notifications for update using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 30-day retention cleanup (daily at 03:00 UTC)
-- ═══════════════════════════════════════════════════════════════

select cron.schedule(
  'clean-old-notifications',
  '0 3 * * *',
  $$delete from user_notifications where created_at < now() - interval '30 days'$$
);

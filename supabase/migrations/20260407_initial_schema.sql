-- ═══════════════════════════════════════════════════════════════
-- Max Left — Initial Schema
-- ═══════════════════════════════════════════════════════════════

-- ── Profiles ─────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Podcasts ─────────────────────────────────────────────────
create table podcasts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  rss_url text,
  artwork_url text,
  website_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table podcasts enable row level security;
create policy "Podcasts are public" on podcasts for select using (true);

-- ── Podcast Episodes ─────────────────────────────────────────
create table podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_id uuid not null references podcasts(id) on delete cascade,
  title text not null,
  audio_url text,
  air_date date,
  rss_guid text,
  duration_seconds int,
  description text,
  created_at timestamptz not null default now(),
  unique (podcast_id, rss_guid)
);

alter table podcast_episodes enable row level security;
create policy "Episodes are public" on podcast_episodes for select using (true);

create index idx_episodes_podcast_date on podcast_episodes (podcast_id, air_date desc);
create index idx_episodes_air_date on podcast_episodes (air_date desc);
create index idx_episodes_rss_guid on podcast_episodes (podcast_id, rss_guid);

-- ── News Articles ────────────────────────────────────────────
create table news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  rss_url text not null,
  website_url text,
  active boolean not null default true,
  sort_order int not null default 0
);

alter table news_sources enable row level security;
create policy "News sources are public" on news_sources for select using (true);

create table news_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references news_sources(id) on delete cascade,
  title text not null,
  url text not null unique,
  description text,
  image_url text,
  pub_date timestamptz,
  rss_guid text,
  created_at timestamptz not null default now()
);

alter table news_articles enable row level security;
create policy "Articles are public" on news_articles for select using (true);

create index idx_articles_pub_date on news_articles (pub_date desc);
create index idx_articles_source on news_articles (source_id, pub_date desc);

-- ── Push Notifications ───────────────────────────────────────
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table push_tokens enable row level security;
create policy "Users manage own push tokens" on push_tokens for all using (auth.uid() = user_id);

-- ── User Notifications (in-app inbox) ───────────────────────
create table user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notif_type text not null,
  title text not null,
  body text not null,
  image_url text,
  payload jsonb not null default '{}',
  ref_key text,
  seen_at timestamptz,
  created_at timestamptz not null default now()
);

alter table user_notifications enable row level security;
create policy "Users read own notifications" on user_notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on user_notifications for update using (auth.uid() = user_id);

create unique index idx_notif_dedup on user_notifications (user_id, ref_key) where ref_key is not null;
create index idx_notif_user_unseen on user_notifications (user_id, seen_at) where seen_at is null;
create index idx_notif_user_created on user_notifications (user_id, created_at desc);

-- 30-day cleanup
select cron.schedule(
  'clean-old-notifications',
  '0 3 * * *',
  $$delete from user_notifications where created_at < now() - interval '30 days'$$
);

-- ── Ingest Log ───────────────────────────────────────────────
create table ingest_log (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  podcast_id uuid references podcasts(id),
  podcast_slug text,
  episodes_in_feed int default 0,
  new_episodes_inserted int default 0,
  errors jsonb
);

alter table ingest_log enable row level security;
-- service role only — no public policy needed


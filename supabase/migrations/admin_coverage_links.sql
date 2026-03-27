-- admin_coverage_links
-- Manually curated external podcast coverage links for films.
-- Admin-only, attached to films by tmdb_id.

create table if not exists admin_coverage_links (
  id           uuid primary key default gen_random_uuid(),
  tmdb_id      integer not null,
  film_title   text    not null,
  poster_path  text,
  podcast_name text    not null,
  episode_title text,
  episode_url  text,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists admin_coverage_links_tmdb_id_idx
  on admin_coverage_links (tmdb_id);

-- Public read (sleeve queries this without auth context)
alter table admin_coverage_links enable row level security;

create policy "public read" on admin_coverage_links
  for select using (true);

create policy "admin write" on admin_coverage_links
  for all using (
    auth.uid() = '19410e64-d610-4fab-9c26-d24fafc94696'
  );

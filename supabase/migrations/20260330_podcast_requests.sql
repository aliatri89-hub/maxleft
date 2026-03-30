-- ════════════════════════════════════════════════
-- PODCAST REQUESTS — user-submitted community suggestions
-- ════════════════════════════════════════════════

create table if not exists podcast_requests (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete set null,
  podcast_name  text not null,
  podcast_url   text,            -- optional: Apple/Spotify/RSS link
  note          text,            -- optional: why they want it
  upvotes       int default 1,   -- seed at 1 (the requester)
  status        text default 'pending' check (status in ('pending', 'approved', 'declined', 'launched')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Index for quick lookups
create index if not exists idx_podcast_requests_status on podcast_requests(status);
create index if not exists idx_podcast_requests_user on podcast_requests(user_id);

-- RLS: anyone authed can insert, read all, but only update their own
alter table podcast_requests enable row level security;

create policy "Anyone can view requests"
  on podcast_requests for select
  using (true);

create policy "Authed users can insert"
  on podcast_requests for insert
  with check (auth.uid() = user_id);

-- Upvote table — tracks who upvoted what (prevents duplicates)
create table if not exists podcast_request_upvotes (
  request_id  uuid references podcast_requests(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (request_id, user_id)
);

alter table podcast_request_upvotes enable row level security;

create policy "Anyone can view upvotes"
  on podcast_request_upvotes for select
  using (true);

create policy "Authed users can upvote"
  on podcast_request_upvotes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own upvote"
  on podcast_request_upvotes for delete
  using (auth.uid() = user_id);

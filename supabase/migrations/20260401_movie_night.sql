-- ═══════════════════════════════════════════════════════════════
-- Movie Night — schema, RLS, match function
-- ═══════════════════════════════════════════════════════════════

-- ── Sessions ──

create table if not exists movie_night_sessions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  creator_id    uuid references auth.users(id) not null,
  partner_id    uuid references auth.users(id),
  genre_id      int,          -- TMDB genre id; null = any
  genre_name    text,
  stack         jsonb not null default '[]'::jsonb,  -- [{tmdb_id, title, year, poster_path, overview}]
  creator_done  boolean not null default false,
  partner_done  boolean not null default false,
  created_at    timestamptz default now()
);

alter table movie_night_sessions enable row level security;

-- Creator + partner can read their own sessions
create policy "mn_sess_select" on movie_night_sessions for select using (
  creator_id = auth.uid() or partner_id = auth.uid()
);

-- Anyone authed can read a session by code (for joining) if partner slot is open
create policy "mn_sess_select_join" on movie_night_sessions for select using (
  partner_id is null
);

-- Authed users can create sessions
create policy "mn_sess_insert" on movie_night_sessions for insert with check (
  creator_id = auth.uid()
);

-- Creator can update their own session (mark done)
-- Partner can join (set partner_id) or mark done
create policy "mn_sess_update" on movie_night_sessions for update using (
  creator_id = auth.uid() or partner_id = auth.uid() or partner_id is null
);

-- ── Swipes ──

create table if not exists movie_night_swipes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references movie_night_sessions(id) on delete cascade not null,
  user_id     uuid references auth.users(id) not null,
  tmdb_id     int not null,
  choice      boolean not null,  -- true = yes, false = no
  created_at  timestamptz default now(),
  unique(session_id, user_id, tmdb_id)
);

alter table movie_night_swipes enable row level security;

-- Users can insert their own swipes
create policy "mn_swipe_insert" on movie_night_swipes for insert with check (
  user_id = auth.uid()
);

-- Users can read their own swipes only
create policy "mn_swipe_select" on movie_night_swipes for select using (
  user_id = auth.uid()
);

-- ── Indexes ──

create index if not exists idx_mn_sessions_code on movie_night_sessions (code);
create index if not exists idx_mn_sessions_creator on movie_night_sessions (creator_id);
create index if not exists idx_mn_swipes_session on movie_night_swipes (session_id, user_id);

-- ── Match function (security definer — can read across users) ──

create or replace function movie_night_matches(p_session_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_session  record;
  v_matches  jsonb;
begin
  -- Load session
  select * into v_session
  from movie_night_sessions
  where id = p_session_id;

  if v_session is null then
    return jsonb_build_object('error', 'session_not_found');
  end if;

  -- Caller must be creator or partner
  if auth.uid() != v_session.creator_id and auth.uid() != v_session.partner_id then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  -- Both must be done
  if not v_session.creator_done or not v_session.partner_done then
    return jsonb_build_object('ready', false);
  end if;

  -- Find matching tmdb_ids (both swiped yes)
  select coalesce(jsonb_agg(c.tmdb_id order by c.created_at), '[]'::jsonb)
  into v_matches
  from movie_night_swipes c
  join movie_night_swipes p
    on p.session_id = c.session_id
    and p.tmdb_id = c.tmdb_id
    and p.user_id = v_session.partner_id
    and p.choice = true
  where c.session_id = p_session_id
    and c.user_id = v_session.creator_id
    and c.choice = true;

  return jsonb_build_object('ready', true, 'matches', coalesce(v_matches, '[]'::jsonb));
end;
$$;

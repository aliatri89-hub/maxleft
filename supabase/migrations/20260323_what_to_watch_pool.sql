-- what_to_watch_pool
-- Returns up to 20 unwatched films covered by the user's favorite podcasts.
-- Prioritises: multi-podcast coverage > recent episodes > random.
-- Excludes anything the user already has in user_media_logs (any status).

create or replace function what_to_watch_pool(p_user_id uuid, p_limit int default 20)
returns table (
  tmdb_id   int,
  title     text,
  year      int,
  poster_path text,
  backdrop_path text,
  overview  text,
  vote_average numeric,
  genre     text,
  podcast_count bigint,
  latest_episode_at timestamptz
)
language sql stable
as $$
  select
    m.tmdb_id,
    m.title,
    m.year,
    m.poster_path,
    m.backdrop_path,
    m.overview,
    m.vote_average,
    m.genre,
    count(distinct pe.podcast_id) as podcast_count,
    max(pe.published_at)          as latest_episode_at
  from podcast_episode_films pef
  join podcast_episodes pe  on pe.id = pef.episode_id
  join user_podcast_favorites upf on upf.podcast_id = pe.podcast_id
                                  and upf.user_id = p_user_id
  join media m on m.tmdb_id = pef.tmdb_id
            and m.media_type = 'film'
  where m.poster_path is not null
    -- exclude films user has already logged
    and not exists (
      select 1 from user_media_logs uml
      join media m2 on m2.id = uml.media_id
      where uml.user_id = p_user_id
        and m2.tmdb_id = pef.tmdb_id
        and m2.media_type = 'film'
    )
  group by m.tmdb_id, m.title, m.year, m.poster_path, m.backdrop_path,
           m.overview, m.vote_average, m.genre
  order by
    count(distinct pe.podcast_id) desc,  -- most coverage first
    max(pe.published_at) desc nulls last, -- then recency
    random()                              -- sprinkle randomness
  limit p_limit;
$$;

-- Batch podcast coverage for activity feed cards.
-- Returns distinct (tmdb_id, podcast_id) pairs for a set of films.
-- Same data pipe as browse feeds: podcast_episode_films → podcast_episodes.
-- Client filters to user's favorites for pills; full set drives headphone icon.

create or replace function get_podcast_coverage_for_feed(p_tmdb_ids int[])
returns table (tmdb_id int, podcast_id uuid)
language sql stable
as $$
  select distinct pef.tmdb_id, pe.podcast_id
  from podcast_episode_films pef
  join podcast_episodes pe on pe.id = pef.episode_id
  where pef.tmdb_id = any(p_tmdb_ids);
$$;

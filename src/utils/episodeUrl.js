/**
 * episodeUrl.js — Single conversion point for episode → audio player format.
 *
 * The audio player expects { guid, title, enclosureUrl, community, artwork, description }.
 * Episodes arrive from different sources with different field names:
 *
 *   podcast_episodes table  → audio_url
 *   community_items table   → episode_url / extra_data.episode_url
 *   rss-sync edge function  → enclosureUrl
 *   localStorage recents    → enclosureUrl
 *
 * This helper resolves all of them into one shape. Every component that calls
 * playEpisode() or addToQueue() should use this instead of hand-rolling the mapping.
 *
 * Usage:
 *   import { toPlayerEpisode } from "../utils/episodeUrl";
 *   const ep = toPlayerEpisode(rawEp, { community: "Blank Check" });
 *   if (ep) playEpisode(ep);
 */

/**
 * Resolve the canonical audio URL from any episode-shaped object.
 * Priority: audio_url (DB canonical) → episode_url → extra_data.episode_url → enclosureUrl (player/RSS)
 */
export function resolveAudioUrl(ep) {
  if (!ep) return null;
  return (
    ep.audio_url ||
    ep.episode_url ||
    ep.extra_data?.episode_url ||
    ep.enclosureUrl ||
    null
  );
}

/**
 * Build a player-ready episode object from any source.
 *
 * @param {Object} ep       — raw episode from DB, RSS, community item, or recents
 * @param {Object} overrides — optional { guid, community, artwork, description }
 * @returns {Object|null}    — { guid, title, enclosureUrl, community, artwork, description } or null
 */
export function toPlayerEpisode(ep, overrides = {}) {
  const url = resolveAudioUrl(ep);
  if (!url) return null;

  // Gate: if episode is flagged dead, don't offer playback
  const status = ep.audio_status || ep.extra_data?.audio_status || null;
  if (status === 'dead' || status === 'paywalled') return null;

  return {
    guid:
      overrides.guid ||
      ep.episode_id ||
      ep.id ||
      ep.guid ||
      `fallback-${resolveAudioUrl(ep)}`,
    // podcast_episodes.id when available — used for dead audio reporting
    episodeId:
      overrides.episodeId ||
      ep.podcast_episode_id ||
      ep.episode_id ||
      null,
    title:
      overrides.title ||
      ep.episode_title ||
      ep.title ||
      "Episode",
    enclosureUrl: url,
    community:
      overrides.community ||
      ep.podcast_name ||
      ep.community ||
      null,
    artwork:
      overrides.artwork ||
      ep.podcast_artwork_url ||
      ep.artwork ||
      ep.image ||
      null,
    description:
      overrides.description ||
      ep.episode_description ||
      ep.description ||
      null,
  };
}

import { useMemo } from "react";
import { useAudioPlayer } from "../../components/community/shared/AudioPlayerProvider";

/**
 * useEpisodeMatch — finds and returns a matching podcast episode for a community item.
 *
 * Matches via seeded episode_url from extra_data or item column.
 * All episodes are seeded through the data pipeline — no RSS fuzzy matching needed.
 *
 * Usage:
 *   const { matchedEpisode, isThisEpPlaying, playEpisode } = useEpisodeMatch(item, "Blank Check");
 *
 * @param {Object} item — community_items row (title, extra_data, id)
 * @param {string} communityName — display name for the episode (e.g. "Blank Check", "Now Playing")
 */

export function useEpisodeMatch(item, communityName) {
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();

  const matchedEpisode = useMemo(() => {
    const seeded = item?.extra_data?.episode_url || item?.episode_url;
    if (!seeded) return null;
    return {
      guid: `seeded-${item.id}`,
      title: item.extra_data?.episode_title || `${communityName}: ${item.title}`,
      enclosureUrl: seeded,
      community: communityName,
      artwork: item.extra_data?.episode_artwork || null,
      description: item.extra_data?.episode_description || null,
    };
  }, [item?.extra_data, item?.episode_url, item?.id, item?.title, communityName]);

  const isThisEpPlaying = !!(currentEp && matchedEpisode && (
    currentEp.guid === matchedEpisode.guid ||
    currentEp.enclosureUrl === matchedEpisode.enclosureUrl
  ));

  return { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying };
}

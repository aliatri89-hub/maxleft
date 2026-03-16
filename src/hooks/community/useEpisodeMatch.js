import { useMemo } from "react";
import { useAudioPlayer } from "../../components/community/shared/AudioPlayerProvider";

/**
 * useEpisodeMatch — finds and returns a matching podcast episode for a community item.
 *
 * Two-stage matching:
 *   1. Seeded episode_url from extra_data or item column (covers the full catalog)
 *   2. Fuzzy match against loaded RSS episodes (covers recent ~30)
 *      - Franchise number matching prevents "Scream" → "Scream 7"
 *      - Word-boundary fallback for partial title matches
 *
 * Usage:
 *   const { matchedEpisode, isThisEpPlaying, playEpisode } = useEpisodeMatch(item, "Blank Check");
 *
 * @param {Object} item — community_items row (title, extra_data, id)
 * @param {string} communityName — display name for the episode (e.g. "Blank Check", "Now Playing")
 */

// ── Helpers (defined outside hook to avoid re-creation) ──────

const normalize = (s) => (s || "").toLowerCase()
  .replace(/['']/g, "")
  .replace(/[:\-–—,.!?()[\]"]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Extract franchise numbers (not years) from a string
const getNumbers = (s) => (s.match(/\d+/g) || []).map(Number).filter(n => n < 100);

// Check if franchise numbers are compatible:
// - If film has numbers (2, 3, 7 etc), episode must have same
// - If film has NO numbers, episode must also have none (prevents "Scream" → "Scream 7")
const numbersMatch = (filmNums, epNums) => {
  if (filmNums.length === 0 && epNums.length === 0) return true;
  if (filmNums.length === 0 && epNums.length > 0) return false;
  return filmNums.every(n => epNums.includes(n));
};

export function useEpisodeMatch(item, communityName) {
  const { episodes: playerEpisodes, play: playEpisode, currentEp, isPlaying } = useAudioPlayer();

  const matchedEpisode = useMemo(() => {
    // Priority 1: Seeded episode_url from extra_data or item column
    const seeded = item?.extra_data?.episode_url || item?.episode_url;
    if (seeded) {
      return {
        guid: `seeded-${item.id}`,
        title: item.extra_data?.episode_title || `${communityName}: ${item.title}`,
        enclosureUrl: seeded,
        community: communityName,
      };
    }

    // Priority 2: Fuzzy match against loaded RSS episodes
    if (!item?.title || playerEpisodes.length === 0) return null;

    const filmTitle = normalize(item.title);
    if (filmTitle.length < 2) return null;
    const filmTitleNoYear = filmTitle.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
    const filmNums = getNumbers(filmTitleNoYear);

    // Strategy 1: Episode title contains the full film title, numbers match
    let match = playerEpisodes.find(ep => {
      const epTitle = normalize(ep.title);
      const epNums = getNumbers(epTitle);
      return epTitle.includes(filmTitleNoYear) && numbersMatch(filmNums, epNums);
    });
    if (match) return { ...match, community: communityName };

    // Strategy 2: Word-boundary match
    try {
      const escaped = filmTitleNoYear.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`);
      match = playerEpisodes.find(ep => {
        const epTitle = normalize(ep.title);
        const epNums = getNumbers(epTitle);
        return re.test(epTitle) && numbersMatch(filmNums, epNums);
      });
      if (match) return { ...match, community: communityName };
    } catch {}

    return null;
  }, [item?.title, item?.extra_data, item?.episode_url, item?.id, playerEpisodes, communityName]);

  const isThisEpPlaying = !!(currentEp && matchedEpisode && (
    currentEp.guid === matchedEpisode.guid ||
    currentEp.enclosureUrl === matchedEpisode.enclosureUrl
  ));

  return { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying };
}

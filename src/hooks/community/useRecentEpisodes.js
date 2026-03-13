import { useState, useEffect, useMemo, useRef } from "react";

/**
 * useRecentEpisodes — Maps recent podcast episodes to community items.
 *
 * Caches matched items in localStorage so repeat visits render instantly.
 * Fresh data swaps in silently when episodes + allItems are both ready.
 * Only shows loading state on true first visit (no cache).
 */
const CACHE_KEY = "mantl_recent_episodes";

// Minimal fields for card rendering
function slimItem(item) {
  return {
    id: item.id,
    title: item.title,
    year: item.year || null,
    tmdb_id: item.tmdb_id || null,
    media_type: item.media_type || "film",
    creator: item.creator || null,
    poster_path: item.poster_path || null,
    extra_data: item.extra_data || null,
    miniseries_id: item.miniseries_id || null,
  };
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].item?.id) return parsed;
  } catch {}
  return null;
}

function writeCache(key, matched) {
  try {
    // Cache item data + episode title (for display, not full episode object)
    const slim = matched.map((m) => ({
      item: slimItem(m.item),
      episodeTitle: m.episode?.title || null,
    }));
    localStorage.setItem(key, JSON.stringify(slim));
  } catch {}
}

export function useRecentEpisodes(episodes = [], allItems = [], limit = 10, communitySlug = "") {
  // Community-specific cache key prevents NPP/BC/etc from stomping each other
  const cacheKey = communitySlug ? `${CACHE_KEY}_${communitySlug}` : CACHE_KEY;

  // Initialize from cache
  const [cachedItems, setCachedItems] = useState(() => readCache(cacheKey));

  // Derive fresh matches (same fuzzy logic as before)
  const freshMatched = useMemo(() => {
    if (episodes.length === 0 || allItems.length === 0) return null;

    const normalize = (str) =>
      (str || "")
        .toLowerCase()
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        .replace(/[^a-z0-9' ]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const itemByEpisodeTitle = new Map();
    const itemsByNormalizedTitle = new Map();

    for (const item of allItems) {
      const epTitle = item.extra_data?.episode_title;
      if (epTitle) {
        itemByEpisodeTitle.set(normalize(epTitle), item);
      }
      const normTitle = normalize(item.title);
      if (normTitle && !itemsByNormalizedTitle.has(normTitle)) {
        itemsByNormalizedTitle.set(normTitle, item);
      }
    }

    const matched = [];
    const usedItemIds = new Set();

    for (const episode of episodes) {
      if (matched.length >= limit) break;
      const normEpTitle = normalize(episode.title);

      // Skip non-film episodes: roundups, awards, intros, meta episodes
      const SKIP_PREFIXES = [
        "critical darlings",
        "introducing",
        "the blank check awards",
        "annual blank check awards",
        "march madness",
      ];
      if (SKIP_PREFIXES.some(p => normEpTitle.startsWith(p))) continue;

      // Strip "with [guest name]" suffix (Blank Check convention: "Movie with Guest")
      // Also handles "feat.", "featuring", "ft."
      const normEpTitleNoGuest = normEpTitle
        .replace(/\s+(?:with|feat\.?|featuring|ft\.?)\s+.+$/i, "")
        .trim();

      let item = itemByEpisodeTitle.get(normEpTitle);

      // Confidence check: prevents short titles from false-matching inside longer strings.
      // "ali" must not match "alien3...", "old" must not match "oldboy...", etc.
      const isConfidentMatch = (filmTitle, epTitle) => {
        if (filmTitle.length >= 10) return true;                      // long titles are safe

        // For titles < 10 chars, require word-boundary match at start of episode
        if (epTitle.startsWith(filmTitle)) {
          const after = epTitle.charAt(filmTitle.length);
          if (after === "" || after === " ") return true;             // full word at start
        }

        // Medium titles (5-9 chars) can pass if they're a big chunk of the ep title
        if (filmTitle.length >= 5 && filmTitle.length / epTitle.length > 0.5) return true;

        return false;
      };

      // Word-boundary substring check: filmTitle must appear as complete word(s) in epTitle
      const includesAsWord = (haystack, needle) => {
        const idx = haystack.indexOf(needle);
        if (idx === -1) return false;
        const before = idx === 0 ? " " : haystack.charAt(idx - 1);
        const after = haystack.charAt(idx + needle.length) || " ";
        return before === " " && (after === " " || after === "");
      };

      // Strategy 1: substring match on full episode title (longest title wins)
      if (!item) {
        const candidates = Array.from(itemsByNormalizedTitle.entries())
          .filter(([title]) => includesAsWord(normEpTitle, title) && isConfidentMatch(title, normEpTitle))
          .sort((a, b) => b[0].length - a[0].length);
        if (candidates.length > 0) item = candidates[0][1];
      }

      // Strategy 2: match against guest-stripped title (handles "Movie with Guest" → "Movie")
      // Require residual to be at least 6 chars to avoid "old", "ali", "here" false positives
      if (!item && normEpTitleNoGuest !== normEpTitle && normEpTitleNoGuest.length >= 6) {
        const candidates = Array.from(itemsByNormalizedTitle.entries())
          .filter(([title]) =>
            (includesAsWord(normEpTitleNoGuest, title) || includesAsWord(title, normEpTitleNoGuest))
            && isConfidentMatch(title, normEpTitleNoGuest)
          )
          .sort((a, b) => b[0].length - a[0].length);
        if (candidates.length > 0) item = candidates[0][1];
      }

      // Strategy 3: strip episode prefix (e.g. "Ep 12: Title"), then word-boundary match
      // Require at least 6 chars after stripping to avoid tiny residual matches
      if (!item) {
        const stripped = normEpTitleNoGuest
          .replace(/^(episode|ep\.?)\s*\d+\s*[:–—-]\s*/i, "")
          .trim();
        if (stripped.length >= 6) {
          for (const [normTitle, candidate] of itemsByNormalizedTitle) {
            if ((includesAsWord(normTitle, stripped) || includesAsWord(stripped, normTitle))
              && isConfidentMatch(normTitle, stripped)) {
              item = candidate;
              break;
            }
          }
        }
      }

      if (item && !usedItemIds.has(item.id)) {
        usedItemIds.add(item.id);
        matched.push({ item, episode });
      }
    }

    return matched.length > 0 ? matched : null;
  }, [episodes, allItems, limit]);

  // When fresh data arrives, update cache
  const prevFresh = useRef(null);
  useEffect(() => {
    if (freshMatched && freshMatched !== prevFresh.current) {
      prevFresh.current = freshMatched;
      writeCache(cacheKey, freshMatched);
      setCachedItems(null);
    }
  }, [freshMatched]);

  // Resolve cached items: use full item objects from allItems if available,
  // fall back to cached slim objects
  const recentEpisodeItems = useMemo(() => {
    if (freshMatched) return freshMatched;
    if (!cachedItems) return [];

    // Try to resolve cached IDs to full allItems objects (for fresh cover URLs etc)
    if (allItems.length > 0) {
      const itemMap = new Map(allItems.map((i) => [i.id, i]));
      return cachedItems
        .map((c) => {
          const fullItem = itemMap.get(c.item.id);
          return { item: fullItem || c.item, episode: { title: c.episodeTitle } };
        })
        .filter((c) => c.item);
    }

    // allItems not loaded yet — use cached slim objects directly
    return cachedItems.map((c) => ({ item: c.item, episode: { title: c.episodeTitle } }));
  }, [freshMatched, cachedItems, allItems]);

  const loading = recentEpisodeItems.length === 0 && allItems.length > 0 && episodes.length === 0;

  return { recentEpisodeItems, loading };
}

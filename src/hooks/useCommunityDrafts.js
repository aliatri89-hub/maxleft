import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../supabase";

/**
 * useCommunityDrafts — data hook for Big Picture draft tracker.
 *
 * Fetches all drafts + picks for a community, grouped by draft type.
 * Returns structured data for the CommunityDraftsTab component.
 *
 * Usage:
 *   const { drafts, picks, loading, error, getDraft } = useCommunityDrafts(communityId);
 */

export function useCommunityDrafts(communityId) {
  const [drafts, setDrafts] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch all drafts + picks for this community ────────────
  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch all drafts
        const { data: draftRows, error: draftErr } = await supabase
          .from("community_drafts")
          .select("*")
          .eq("community_id", communityId)
          .order("sort_order", { ascending: true });

        if (draftErr) throw draftErr;

        // 2. Fetch all picks (with range to handle large datasets)
        const { data: pickRows, error: pickErr } = await supabase
          .from("community_draft_picks")
          .select("*")
          .eq("community_id", communityId)
          .order("sort_order", { ascending: true })
          .range(0, 4999);

        if (pickErr) throw pickErr;

        if (!cancelled) {
          setDrafts(draftRows || []);
          setPicks(pickRows || []);
        }
      } catch (e) {
        console.error("[useCommunityDrafts] Fetch error:", e);
        if (!cancelled) setError(e.message || "Failed to load drafts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [communityId]);

  // ─── Group drafts by type ──────────────────────────────────
  const draftsByType = useMemo(() => {
    const groups = {
      year: [],
      theme: [],
      genre: [],
      actor_director: [],
      auction: [],
    };

    drafts.forEach((d) => {
      const type = d.draft_type || "year";
      if (groups[type]) groups[type].push(d);
      else groups[type] = [d];
    });

    // Sort year drafts by draft_year descending (most recent first)
    groups.year.sort((a, b) => (b.draft_year || 0) - (a.draft_year || 0));

    return groups;
  }, [drafts]);

  // ─── Available draft types (only those with data) ──────────
  const availableTypes = useMemo(() => {
    return Object.entries(draftsByType)
      .filter(([, list]) => list.length > 0)
      .map(([type]) => type);
  }, [draftsByType]);

  // ─── Get structured data for a single draft ─────────────────
  const getDraft = useCallback((draftId) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return null;

    const draftPicks = picks.filter((p) => p.draft_id === draftId);

    // Group picks by category (preserving category order from draft.categories)
    const categoryOrder = draft.categories || [];
    const categorized = {};

    draftPicks.forEach((p) => {
      const cat = p.category || "Uncategorized";
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(p);
    });

    // Sort categories: use draft.categories order, then any extras
    const sortedCategories = [];
    categoryOrder.forEach((cat) => {
      if (categorized[cat]) {
        sortedCategories.push({ category: cat, picks: categorized[cat] });
        delete categorized[cat];
      }
    });
    // Add any remaining categories not in the defined order
    Object.entries(categorized).forEach(([cat, catPicks]) => {
      sortedCategories.push({ category: cat, picks: catPicks });
    });

    // Group picks by host for scoreboard
    const hostStats = {};
    draftPicks.forEach((p) => {
      if (!hostStats[p.host]) hostStats[p.host] = { total: 0, picks: [] };
      hostStats[p.host].total++;
      hostStats[p.host].picks.push(p);
    });

    // Unique movies (for overall seen stats)
    const uniqueMovies = new Map();
    draftPicks.forEach((p) => {
      const key = p.tmdb_id ? `tmdb:${p.tmdb_id}` : `title:${p.title}:${p.movie_year}`;
      if (!uniqueMovies.has(key)) {
        uniqueMovies.set(key, {
          title: p.title,
          movieYear: p.movie_year,
          tmdbId: p.tmdb_id,
          posterPath: p.poster_path,
        });
      }
    });

    return {
      draft,
      categories: sortedCategories,
      hostStats,
      uniqueMovies: [...uniqueMovies.values()],
      totalPicks: draftPicks.length,
    };
  }, [drafts, picks]);

  // ─── Filmography: all movies across all drafts, grouped by decade ──
  const filmography = useMemo(() => {
    if (picks.length === 0) return { decades: [], allMovies: [], totalUnique: 0 };

    // Deduplicate by title+movieYear, track which drafts/hosts picked each
    const movieMap = new Map();
    picks.forEach((p) => {
      const key = p.tmdb_id ? `tmdb:${p.tmdb_id}` : `title:${p.title}:${p.movie_year}`;
      if (!movieMap.has(key)) {
        movieMap.set(key, {
          title: p.title,
          movieYear: p.movie_year,
          tmdbId: p.tmdb_id,
          posterPath: p.poster_path,
          draftIds: new Set(),
          hosts: new Set(),
        });
      }
      const m = movieMap.get(key);
      m.draftIds.add(p.draft_id);
      m.hosts.add(p.host);
      // Keep best poster
      if (!m.posterPath && p.poster_path) m.posterPath = p.poster_path;
      if (!m.tmdbId && p.tmdb_id) m.tmdbId = p.tmdb_id;
    });

    // Convert Sets and group by decade
    const decadeMap = {};
    movieMap.forEach((m) => {
      const movie = {
        ...m,
        draftCount: m.draftIds.size,
        hostCount: m.hosts.size,
        hosts: [...m.hosts],
        draftIds: [...m.draftIds],
      };
      const decade = Math.floor((m.movieYear || 2000) / 10) * 10;
      const label = `${decade}s`;
      if (!decadeMap[label]) decadeMap[label] = { decade, label, movies: [] };
      decadeMap[label].movies.push(movie);
    });

    // Sort decades descending, movies within each by draftCount desc then year desc
    const decades = Object.values(decadeMap)
      .sort((a, b) => b.decade - a.decade)
      .map((d) => ({
        ...d,
        movies: d.movies.sort((a, b) =>
          b.draftCount - a.draftCount || b.movieYear - a.movieYear
        ),
      }));

    return {
      decades,
      allMovies: [...movieMap.values()],
      totalUnique: movieMap.size,
    };
  }, [picks]);

  return {
    drafts,
    picks,
    draftsByType,
    availableTypes,
    getDraft,
    filmography,
    loading,
    error,
  };
}

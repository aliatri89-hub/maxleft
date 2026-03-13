import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";

/**
 * useCommunityAwards — fetches all awards picks for a community.
 * Returns data grouped by year → category → host picks.
 */
export function useCommunityAwards(communityId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from("community_awards_picks")
          .select("*")
          .eq("community_id", communityId)
          .order("year", { ascending: false })
          .order("category_sort")
          .order("sort_order")
          .range(0, 4999);

        if (err) throw err;
        if (!cancelled) setPicks(data || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [communityId]);

  // ─── Derived structures ────────────────────────────────────

  /** All available years, descending */
  const years = useMemo(() => {
    const set = new Set(picks.map(p => p.year));
    return [...set].sort((a, b) => b - a);
  }, [picks]);

  /** 
   * Get structured data for a specific year:
   * { standard: [{ category, categorySort, picks: { griffin, david, joe } }],
   *   ben: [{ category, categorySort, picks: { ben } }] }
   * 
   * Each host's picks = [{ title, subtitle, tmdb_id, is_winner, sort_order }]
   */
  const getYear = (year) => {
    const yearPicks = picks.filter(p => p.year === year);
    
    // Group by category
    const categoryMap = {};
    yearPicks.forEach(p => {
      const key = p.category;
      if (!categoryMap[key]) {
        categoryMap[key] = {
          category: p.category,
          categoryGroup: p.category_group,
          categorySort: p.category_sort,
          picks: {},
        };
      }
      if (!categoryMap[key].picks[p.host]) {
        categoryMap[key].picks[p.host] = [];
      }
      categoryMap[key].picks[p.host].push({
        title: p.title,
        subtitle: p.subtitle,
        tmdbId: p.tmdb_id,
        posterPath: p.poster_path,
        isWinner: p.is_winner,
        sortOrder: p.sort_order,
      });
    });

    const all = Object.values(categoryMap).sort((a, b) => a.categorySort - b.categorySort);
    
    return {
      standard: all.filter(c => c.categoryGroup === "standard"),
      ben: all.filter(c => c.categoryGroup === "ben"),
    };
  };

  return { picks, years, getYear, loading, error };
}

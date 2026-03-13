import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

/**
 * useCommunityLists — fetches ranked lists for a community.
 *
 * Expects Supabase tables:
 *
 * community_lists:
 *   id            uuid PK
 *   community_id  uuid FK → community_pages.id
 *   name          text     (e.g. "Top 100 of the 21st Century")
 *   slug          text
 *   year          int      (year the list was created)
 *   sort_order    int      (display order)
 *
 * community_list_items:
 *   id            uuid PK
 *   list_id       uuid FK → community_lists.id
 *   host          text     (sean / jay / frank)
 *   rank          int
 *   title         text
 *   tmdb_id       int
 *   poster_path   text
 *
 * Returns:
 *   lists    — [{id, name, slug, year, sort_order}]
 *   getList  — (listId) => { items: [...] }
 *   loading  — boolean
 *   error    — string | null
 */
export function useCommunityLists(communityId) {
  const [lists, setLists] = useState([]);
  const [itemsByList, setItemsByList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!communityId) { setLoading(false); return; }

    let cancelled = false;

    async function fetchLists() {
      try {
        setLoading(true);

        const { data: listsData, error: listsErr } = await supabase
          .from("community_lists")
          .select("id, name, slug, year, sort_order")
          .eq("community_id", communityId)
          .order("sort_order", { ascending: true });

        if (listsErr) throw listsErr;
        if (cancelled) return;
        if (!listsData || listsData.length === 0) {
          setLists([]);
          setLoading(false);
          return;
        }

        setLists(listsData);

        const listIds = listsData.map(l => l.id);
        const { data: itemsData, error: itemsErr } = await supabase
          .from("community_list_items")
          .select("id, list_id, host, rank, title, tmdb_id, poster_path")
          .in("list_id", listIds)
          .order("rank", { ascending: true });

        if (itemsErr) throw itemsErr;
        if (cancelled) return;

        const grouped = {};
        (itemsData || []).forEach(item => {
          if (!grouped[item.list_id]) grouped[item.list_id] = [];
          grouped[item.list_id].push(item);
        });

        setItemsByList(grouped);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load lists");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLists();
    return () => { cancelled = true; };
  }, [communityId]);

  const getList = useCallback((listId) => {
    return { items: itemsByList[listId] || [] };
  }, [itemsByList]);

  return { lists, getList, loading, error };
}

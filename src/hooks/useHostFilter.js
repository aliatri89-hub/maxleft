import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabase";

/**
 * useHostFilter — shared hook for community host/guest filtering
 *
 * Fetches community_guests + community_item_guests, builds a client-side
 * lookup, and provides multi-select host filtering for any community
 * that has guest data seeded.
 *
 * Multi-host = intersection: selecting Bill + Sean shows only
 * episodes where BOTH appeared together.
 */
export default function useHostFilter(communityId) {
  const [hosts, setHosts] = useState([]);
  const [itemGuestMap, setItemGuestMap] = useState({});
  const [selectedHostIds, setSelectedHostIds] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!communityId) return;
    let cancelled = false;

    async function fetchHostData() {
      // 1. Fetch guests for this community
      const { data: guests, error: gErr } = await supabase
        .from("community_guests")
        .select("id, name, slug, photo_url")
        .eq("community_id", communityId);

      if (gErr || cancelled) return;

      // 2. Fetch all item-guest links for these guests
      const guestIds = guests.map((g) => g.id);
      if (guestIds.length === 0) {
        if (!cancelled) setLoaded(true);
        return;
      }

      // Supabase default limit is 1000; we may have more links
      const { data: links, error: lErr } = await supabase
        .from("community_item_guests")
        .select("item_id, guest_id")
        .in("guest_id", guestIds)
        .range(0, 4999);

      if (lErr || cancelled) return;

      // 3. Build item→guests lookup and count per guest
      const map = {};
      const countMap = {};

      for (const link of links) {
        if (!map[link.item_id]) map[link.item_id] = new Set();
        map[link.item_id].add(link.guest_id);
        countMap[link.guest_id] = (countMap[link.guest_id] || 0) + 1;
      }

      // 4. Merge counts, sort by count DESC
      const enriched = guests
        .map((g) => ({ ...g, itemCount: countMap[g.id] || 0 }))
        .filter((g) => g.itemCount > 0)
        .sort((a, b) => b.itemCount - a.itemCount);

      if (!cancelled) {
        setHosts(enriched);
        setItemGuestMap(map);
        setLoaded(true);
      }
    }

    fetchHostData();
    return () => { cancelled = true; };
  }, [communityId]);

  const toggleHost = useCallback((hostId) => {
    setSelectedHostIds((prev) => {
      const next = new Set(prev);
      if (next.has(hostId)) next.delete(hostId);
      else next.add(hostId);
      return next;
    });
  }, []);

  const clearHosts = useCallback(() => {
    setSelectedHostIds(new Set());
  }, []);

  /** Returns true if item passes the current host filter */
  const passesHostFilter = useCallback(
    (itemId) => {
      if (selectedHostIds.size === 0) return true;
      const guests = itemGuestMap[itemId];
      if (!guests) return false;
      for (const hId of selectedHostIds) {
        if (!guests.has(hId)) return false;
      }
      return true;
    },
    [selectedHostIds, itemGuestMap]
  );

  /** First names of selected hosts, joined with & */
  const selectedHostNames = useMemo(() => {
    if (selectedHostIds.size === 0) return "";
    return hosts
      .filter((h) => selectedHostIds.has(h.id))
      .map((h) => h.name.split(" ")[0])
      .join(" & ");
  }, [selectedHostIds, hosts]);

  return {
    hosts,
    selectedHostIds,
    toggleHost,
    clearHosts,
    passesHostFilter,
    selectedHostNames,
    hasHostData: loaded && hosts.length > 0,
  };
}

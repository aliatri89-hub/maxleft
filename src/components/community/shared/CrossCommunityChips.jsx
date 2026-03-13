import { useState, useEffect } from "react";
import { supabase } from "../../../supabase";

/**
 * CrossCommunityChips — shows which other subscribed communities contain this item.
 *
 * Appears in the log modal between streaming/overview and rating.
 * Tapping a chip navigates to that community screen.
 *
 * Uses three flat queries instead of nested PostgREST joins for reliability:
 *   1. community_items → find all items with this tmdb_id
 *   2. community_miniseries → get which communities those belong to
 *   3. community_pages → get display info for matched communities
 *
 * Props:
 *   tmdbId                  — the item's tmdb_id (universal cross-community key)
 *   currentCommunityId      — the community the modal is open in (excluded from results)
 *   communitySubscriptions  — Set of community IDs the user follows
 *   onNavigateCommunity     — (slug) => void — navigates to that community
 */
export default function CrossCommunityChips({
  tmdbId,
  currentCommunityId,
  communitySubscriptions,
  onNavigateCommunity,
}) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmdbId || !communitySubscriptions?.size) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      try {
        // Step 1: find all community_items with this tmdb_id
        const { data: items, error: itemsErr } = await supabase
          .from("community_items")
          .select("id, miniseries_id")
          .eq("tmdb_id", tmdbId);

        if (cancelled || itemsErr || !items?.length) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Step 2: get the miniseries those items belong to → community_id
        const miniseriesIds = [...new Set(items.map(i => i.miniseries_id))];
        const { data: series, error: seriesErr } = await supabase
          .from("community_miniseries")
          .select("id, community_id")
          .in("id", miniseriesIds);

        if (cancelled || seriesErr || !series?.length) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Step 3: deduplicate community IDs, exclude current, filter to subscribed
        const communityIds = [...new Set(series.map(s => s.community_id))]
          .filter(id => id !== currentCommunityId && communitySubscriptions.has(id));

        if (communityIds.length === 0) {
          if (!cancelled) { setMatches([]); setLoading(false); }
          return;
        }

        // Step 4: get display info for matched communities
        const { data: communities, error: comErr } = await supabase
          .from("community_pages")
          .select("id, name, slug, theme_config")
          .in("id", communityIds);

        if (cancelled) return;

        if (!comErr && communities) {
          setMatches(communities.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            accent: c.theme_config?.accent || "#e94560",
          })));
        }
      } catch (err) {
        console.error("CrossCommunityChips error:", err);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tmdbId, currentCommunityId, communitySubscriptions]);

  // Don't render anything if no matches
  if (loading || matches.length === 0) return null;

  return (
    <div style={{
      marginTop: 12,
      marginBottom: 4,
    }}>
      {/* Label */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        Also in
      </div>

      {/* Horizontal scroll of chips */}
      <div
        className="cross-chips-scroll"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingBottom: 4,
        }}
      >
        <style>{`.cross-chips-scroll::-webkit-scrollbar { display: none; }`}</style>
        {matches.map((community) => (
          <button
            key={community.id}
            onClick={(e) => {
              e.stopPropagation();
              onNavigateCommunity?.(community.slug, tmdbId);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 20,
              border: `1.5px solid ${community.accent}`,
              background: `${community.accent}18`,
              cursor: "pointer",
              flexShrink: 0,
              WebkitTapHighlightColor: "transparent",
              transition: "transform 0.1s, background 0.15s",
            }}
            onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
            onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {/* Accent dot */}
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: community.accent,
              boxShadow: `0 0 6px ${community.accent}66`,
            }} />

            {/* Community name */}
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: community.accent,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              {community.name}
            </span>

            {/* Arrow */}
            <span style={{
              fontSize: 10,
              color: `${community.accent}88`,
              lineHeight: 1,
            }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

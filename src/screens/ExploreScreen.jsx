import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

export default function ExploreScreen({
  session,
  onOpenCommunity,
  isActive,
  communitySubscriptions,
  onSubscribe,
  onUnsubscribe,
  subscriptionsLoaded,
}) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  // Stable sorted order — only re-sorts on tab activation or fresh load, not on toggle
  const [sortedIds, setSortedIds] = useState([]);
  const lastSortedSubs = useRef(null);

  useEffect(() => {
    if (!isActive) return;
    // Skip re-fetch if we already have data — communities rarely change
    if (communities.length > 0) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_pages")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!cancelled && !error) setCommunities(data || []);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isActive]);

  // Re-sort when communities load or tab becomes active (but NOT on subscription toggle)
  useEffect(() => {
    if (!communities.length || !subscriptionsLoaded) return;

    // Only re-sort if subscriptions actually changed since last sort
    const subsKey = communitySubscriptions ? [...communitySubscriptions].sort().join(",") : "";
    if (subsKey === lastSortedSubs.current && sortedIds.length > 0) return;

    const followed = communities.filter(c => communitySubscriptions?.has(c.id));
    const unfollowed = communities.filter(c => !communitySubscriptions?.has(c.id) && !c.theme_config?.coming_soon);
    const comingSoon = communities.filter(c => c.theme_config?.coming_soon);

    setSortedIds([
      ...followed.map(c => c.id),
      "__divider__",
      ...unfollowed.map(c => c.id),
      ...comingSoon.map(c => c.id),
    ]);
    lastSortedSubs.current = subsKey;
  }, [communities, subscriptionsLoaded]); // intentionally omitting communitySubscriptions

  // Build a lookup
  const communityMap = {};
  for (const c of communities) communityMap[c.id] = c;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      paddingTop: 20,
    }}>
      {/* Header */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>
          Explore
        </div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Podcast communities &amp; watchlists
        </div>
      </div>

      {/* Community Cards */}
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
            Loading communities...
          </div>
        ) : communities.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
            No communities yet — stay tuned!
          </div>
        ) : sortedIds.map((id) => {
          if (id === "__divider__") {
            // Only show divider if there are unfollowed communities below
            const hasUnfollowed = communities.some(c =>
              !communitySubscriptions?.has(c.id) && !c.theme_config?.coming_soon
            );
            if (!hasUnfollowed) return null;
            return (
              <div key="divider" style={{
                fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.2)",
                textTransform: "uppercase", letterSpacing: 2,
                padding: "20px 4px 10px",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
                Discover More
              </div>
            );
          }

          const c = communityMap[id];
          if (!c) return null;
          const isSub = communitySubscriptions?.has(c.id);

          return (
            <CommunityCard
              key={c.id}
              community={c}
              onOpen={() => onOpenCommunity(c.slug)}
              isSubscribed={isSub}
              subscriptionsLoaded={subscriptionsLoaded}
              onToggleSubscription={() => {
                if (isSub) onUnsubscribe?.(c.id);
                else onSubscribe?.(c.id);
              }}
            />
          );
        })}
      </div>

      {/* Coming Soon teaser */}
      <div style={{ padding: "24px 16px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>
          More communities coming soon
        </div>
      </div>
    </div>
  );
}

function CommunityCard({ community, onOpen, isSubscribed, subscriptionsLoaded, onToggleSubscription }) {
  const theme = community.theme_config || {};
  const comingSoon = theme.coming_soon === true;
  const accent = theme.accent || "#e94560";
  const showFull = !subscriptionsLoaded || isSubscribed || comingSoon;

  return (
    <div style={{
      width: "100%",
      background: theme.primary || "var(--bg-card)",
      borderRadius: showFull ? 16 : 12,
      overflow: "hidden",
      marginBottom: showFull ? 12 : 8,
      textAlign: "left",
      boxShadow: showFull ? "var(--shadow-card)" : "none",
      opacity: comingSoon ? 0.6 : showFull ? 1 : 0.7,
      transition: "all 0.35s ease, opacity 0.25s ease",
    }}>
      {/* Gradient bar */}
      <div style={{
        height: showFull ? 4 : 3,
        background: `linear-gradient(90deg, ${accent}, ${theme.secondary || "#C4734F"})`,
        transition: "height 0.35s ease",
      }} />

      <div style={{
        padding: showFull ? "16px 18px 18px" : "0 16px",
        maxHeight: showFull ? 200 : 0,
        opacity: showFull ? 1 : 0,
        overflow: "hidden",
        transition: "all 0.35s ease, opacity 0.2s ease",
      }}>
        {/* Title row with subscription toggle */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={comingSoon ? undefined : onOpen}
            disabled={comingSoon}
            style={{
              background: "none", border: "none", padding: 0,
              cursor: comingSoon ? "default" : "pointer",
              textAlign: "left", flex: 1, minWidth: 0,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{
              fontSize: 18, fontWeight: 800, color: "#fff",
              fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
              letterSpacing: "0.02em", lineHeight: 1.2,
            }}>
              {community.name}
            </div>
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6, lineHeight: 1.4,
              whiteSpace: "pre-line",
            }}>
              {community.description}
            </div>
          </button>

          {subscriptionsLoaded && !comingSoon && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSubscription(); }}
              style={{
                background: `${accent}22`,
                border: `1.5px solid ${accent}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, color: accent,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.03em", textTransform: "uppercase",
              }}>
                Following
              </span>
            </button>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={comingSoon ? undefined : onOpen}
          disabled={comingSoon}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 14, padding: "7px 16px",
            background: comingSoon ? "rgba(255,255,255,0.08)" : accent,
            borderRadius: 20, fontSize: 13, fontWeight: 700,
            color: comingSoon ? "rgba(255,255,255,0.4)" : "#fff",
            border: "none", cursor: comingSoon ? "default" : "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {comingSoon ? "Coming Soon" : "Explore →"}
        </button>
      </div>

      {/* Compact row — visible when unfollowed */}
      <div style={{
        padding: !showFull ? "12px 16px" : "0 16px",
        maxHeight: !showFull ? 60 : 0,
        opacity: !showFull ? 1 : 0,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        transition: "all 0.35s ease, opacity 0.2s ease 0.1s",
      }}>
        <button
          onClick={onOpen}
          style={{
            background: "none", border: "none", padding: 0,
            cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0,
            WebkitTapHighlightColor: "transparent",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: accent, flexShrink: 0, opacity: 0.6,
          }} />
          <div style={{
            fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.55)",
            fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
            letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {community.name}
          </div>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleSubscription(); }}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            borderRadius: 8, padding: "6px 12px",
            cursor: "pointer", flexShrink: 0,
            transition: "all 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.03em", textTransform: "uppercase",
          }}>
            Follow
          </span>
        </button>
      </div>
    </div>
  );
}

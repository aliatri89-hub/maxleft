import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (!isActive) return;
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

  // Only show communities the user is following
  const isDev = new URLSearchParams(window.location.search).has("dev");

  // Only show followed communities (or all in dev mode)
  const followedCommunities = isDev
    ? communities
    : communities.filter(c => communitySubscriptions?.has(c.id));

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
        ) : (
          <>
            {followedCommunities.map((c) => (
              <CommunityCard
                key={c.id}
                community={c}
                onOpen={() => onOpenCommunity(c.slug)}
                isSubscribed={true}
                subscriptionsLoaded={subscriptionsLoaded}
                onToggleSubscription={() => onUnsubscribe?.(c.id)}
              />
            ))}

            {/* Coming Soon teaser */}
            <div style={{
              background: "var(--bg-card)",
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              marginTop: 8,
              border: "1px solid var(--border-subtle)",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🎙️</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 18, color: "var(--text-primary)",
                letterSpacing: "0.02em", textTransform: "uppercase",
                marginBottom: 8,
              }}>
                More communities coming soon
              </div>
              <div style={{
                fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5,
              }}>
                New podcast communities are added regularly. Stay tuned.
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

function CommunityCard({ community, onOpen, isSubscribed, subscriptionsLoaded, onToggleSubscription }) {
  const theme = community.theme_config || {};
  const accent = theme.accent || "#e94560";

  return (
    <div style={{
      width: "100%",
      background: theme.primary || "var(--bg-card)",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 12,
      textAlign: "left",
      boxShadow: "var(--shadow-card)",
    }}>
      {/* Gradient bar */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, ${accent}, ${theme.secondary || "#C4734F"})`,
      }} />

      <div style={{ padding: "16px 18px 18px" }}>
        {/* Title row with subscription toggle */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={onOpen}
            style={{
              background: "none", border: "none", padding: 0,
              cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0,
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

          {subscriptionsLoaded && (
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
          onClick={onOpen}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 14, padding: "7px 16px",
            background: accent,
            borderRadius: 20, fontSize: 13, fontWeight: 700,
            color: "#fff",
            border: "none", cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Explore →
        </button>
      </div>
    </div>
  );
}

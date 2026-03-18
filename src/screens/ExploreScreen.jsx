import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// Podcast artwork by community slug
// TODO: move to community_pages.image_url column when ready
const PODCAST_ART = {
  "blankcheck": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bb/82/cf/bb82cfa4-0bf8-bbe8-b5a6-407702ab1764/mza_4979053321172937662.jpeg/540x540bb.webp",
  "nowplaying": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/30/57/26/305726f4-a910-986d-af15-9d9630b96722/mza_632554795848485854.jpg/540x540bb.webp",
};

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
  const isDev = new URLSearchParams(window.location.search).has("dev");

  useEffect(() => {
    if (!isActive) return;
    if (communities.length > 0) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const query = supabase
        .from("community_pages")
        .select("*")
        .order("sort_order", { ascending: true });

      // In dev mode, show everything; otherwise only launched communities
      if (!isDev) query.eq("launched", true);

      const { data, error } = await query;
      if (!cancelled && !error) setCommunities(data || []);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isActive]);

  // Only show communities the user is following
  // Split launched communities into followed and unfollowed
  const followedCommunities = isDev
    ? communities
    : communities.filter(c => communitySubscriptions?.has(c.id));

  const unfollowedCommunities = isDev
    ? []
    : communities.filter(c => !communitySubscriptions?.has(c.id));

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      paddingTop: 20,
    }}>
      {/* Header */}
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{
          fontSize: 26, color: "var(--text-primary)",
          fontFamily: "'Permanent Marker', cursive",
        }}>
          Explore
        </div>
        <div style={{
          fontSize: 11, color: "var(--text-faint)", marginTop: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
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

            {/* Unfollowed but launched communities */}
            {unfollowedCommunities.length > 0 && (
              <>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 500,
                  fontSize: 9,
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "16px 4px 8px",
                }}>
                  More communities
                </div>
                {unfollowedCommunities.map((c) => (
                  <CommunityCard
                    key={c.id}
                    community={c}
                    onOpen={() => onOpenCommunity(c.slug)}
                    isSubscribed={false}
                    subscriptionsLoaded={subscriptionsLoaded}
                    onToggleSubscription={() => onSubscribe?.(c.id)}
                  />
                ))}
              </>
            )}

            {/* Coming Soon teaser */}
            <div style={{
              background: "var(--bg-card)",
              borderRadius: 16,
              padding: "32px 24px",
              textAlign: "center",
              marginTop: 8,
              border: "1px solid var(--border-subtle)",
            }}>
              <div style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 18, color: "var(--text-primary)",
                marginBottom: 8,
              }}>
                More communities coming soon
              </div>
              <div style={{
                fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                New podcast communities are added regularly.
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
  const artworkUrl = PODCAST_ART[community.slug] || null;

  return (
    <div style={{
      width: "100%",
      background: theme.primary || "var(--bg-card)",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 12,
      textAlign: "left",
      boxShadow: "var(--shadow-card)",
      position: "relative",
      opacity: isSubscribed ? 1 : 0.55,
      transition: "opacity 0.3s ease",
    }}>
      {/* Accent line */}
      <div style={{
        height: 3,
        background: accent,
      }} />

      {/* Subtle ruled-line texture */}
      <div style={{
        position: "absolute", top: 3, left: 0, right: 0, bottom: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(255,255,255,0.015) 22px, rgba(255,255,255,0.015) 23px)",
        pointerEvents: "none",
        borderRadius: "0 0 16px 16px",
      }} />

      <div style={{ padding: "16px 18px 18px", position: "relative" }}>
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
              fontSize: 20, color: "#fff",
              fontFamily: "'Permanent Marker', cursive",
              lineHeight: 1.15,
            }}>
              {community.name}
            </div>
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 6, lineHeight: 1.5,
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.02em",
              whiteSpace: "pre-line",
            }}>
              {community.description}
            </div>
          </button>

          {subscriptionsLoaded && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSubscription(); }}
              style={{
                background: isSubscribed ? `${accent}22` : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${isSubscribed ? accent : "rgba(255,255,255,0.15)"}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: isSubscribed ? accent : "rgba(255,255,255,0.6)",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.03em", textTransform: "uppercase",
              }}>
                {isSubscribed ? "Following" : "+ Follow"}
              </span>
            </button>
          )}
        </div>

        {/* Bottom row: CTA (followed only) */}
        {isSubscribed && (
        <div style={{ marginTop: 14 }}>
          <button
            onClick={onOpen}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 16px",
              background: accent,
              borderRadius: 20, fontSize: 13,
              color: "#fff",
              fontFamily: "'Permanent Marker', cursive",
              border: "none", cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Explore →
          </button>
        </div>
        )}

        {/* Podcast artwork — absolutely positioned so it doesn't affect card height */}
        {isSubscribed && artworkUrl && (
          <img
            src={artworkUrl}
            alt={community.name}
            style={{
              position: "absolute", bottom: 14, right: 14,
              width: 80, height: 80,
              borderRadius: 14,
              objectFit: "cover",
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
              border: `1.5px solid ${accent}44`,
            }}
          />
        )}
      </div>
    </div>
  );
}

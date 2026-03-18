import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// Podcast artwork by community slug
// TODO: move to community_pages.image_url column when ready
const PODCAST_ART = {
  "blankcheck": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bb/82/cf/bb82cfa4-0bf8-bbe8-b5a6-407702ab1764/mza_4979053321172937662.jpeg/540x540bb.webp",
  "nowplaying": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/30/57/26/305726f4-a910-986d-af15-9d9630b96722/mza_632554795848485854.jpg/540x540bb.webp",
};

// ════════════════════════════════════════════════
// EXPLORE SCREEN — Community hub with progress gaps
// ════════════════════════════════════════════════

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
  const [stats, setStats] = useState({}); // keyed by community id
  const isDev = new URLSearchParams(window.location.search).has("dev");
  const userId = session?.user?.id;

  // ── Fetch communities ──
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

      if (!isDev) query.eq("launched", true);

      const { data, error } = await query;
      if (!cancelled && !error) setCommunities(data || []);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isActive]);

  // ── Fetch stats for all communities ──
  const [statsLoading, setStatsLoading] = useState(false);
  useEffect(() => {
    if (!isActive || communities.length === 0) return;
    // Don't re-fetch if we already have stats
    if (Object.keys(stats).length > 0) return;
    let cancelled = false;

    (async () => {
      setStatsLoading(true);
      const communityIds = communities.map(c => c.id);
      const result = {};

      // Initialize
      communityIds.forEach(id => {
        result[id] = {
          totalSeries: 0, completedSeries: 0,
          totalBadges: 0, earnedBadges: 0,
          badgeDetails: [],
        };
      });

      try {
        // 1. Miniseries + badges in parallel
        const [seriesRes, badgesRes] = await Promise.all([
          supabase.from("community_miniseries")
            .select("id, community_id")
            .in("community_id", communityIds),
          supabase.from("badges")
            .select("id, community_id, name, accent_color, image_url, sort_order")
            .in("community_id", communityIds)
            .eq("is_active", true)
            .order("sort_order"),
        ]);

        if (cancelled) return;

        const allSeries = seriesRes.data || [];
        const allBadges = badgesRes.data || [];

        const seriesByCommunity = {};
        allSeries.forEach(s => {
          if (!seriesByCommunity[s.community_id]) seriesByCommunity[s.community_id] = [];
          seriesByCommunity[s.community_id].push(s.id);
        });
        communityIds.forEach(id => {
          result[id].totalSeries = (seriesByCommunity[id] || []).length;
        });

        const badgesByCommunity = {};
        allBadges.forEach(b => {
          if (!badgesByCommunity[b.community_id]) badgesByCommunity[b.community_id] = [];
          badgesByCommunity[b.community_id].push(b);
        });
        communityIds.forEach(id => {
          result[id].totalBadges = (badgesByCommunity[id] || []).length;
        });

        // 2. User-specific: earned badges + items in parallel
        if (userId) {
          const allBadgeIds = allBadges.map(b => b.id);
          const BATCH = 200;

          // Only compute series completion for FOLLOWED communities (the heavy part)
          const followedIds = new Set(
            communityIds.filter(id => communitySubscriptions?.has(id))
          );
          const followedSeriesIds = allSeries
            .filter(s => followedIds.has(s.community_id))
            .map(s => s.id);

          // Kick off earned badges + followed item fetches in parallel
          const earnedPromise = allBadgeIds.length > 0
            ? supabase.from("user_badges").select("badge_id").eq("user_id", userId).in("badge_id", allBadgeIds)
            : Promise.resolve({ data: [] });

          const itemBatches = [];
          for (let i = 0; i < followedSeriesIds.length; i += BATCH) {
            const batch = followedSeriesIds.slice(i, i + BATCH);
            itemBatches.push(
              supabase.from("community_items").select("id, miniseries_id").in("miniseries_id", batch)
            );
          }

          const [earnedRes, ...itemResults] = await Promise.all([earnedPromise, ...itemBatches]);
          if (cancelled) return;

          // Process earned badges
          const earnedSet = new Set((earnedRes.data || []).map(r => r.badge_id));
          communityIds.forEach(id => {
            const communityBadges = badgesByCommunity[id] || [];
            result[id].earnedBadges = communityBadges.filter(b => earnedSet.has(b.id)).length;
            result[id].badgeDetails = communityBadges.map(b => ({
              id: b.id, name: b.name, earned: earnedSet.has(b.id),
              accent_color: b.accent_color, image_url: b.image_url,
            }));
          });

          // Process items
          const allItems = [];
          itemResults.forEach(res => {
            if (res.data) allItems.push(...res.data);
          });

          const itemsByMs = {};
          allItems.forEach(item => {
            if (!itemsByMs[item.miniseries_id]) itemsByMs[item.miniseries_id] = [];
            itemsByMs[item.miniseries_id].push(item.id);
          });

          // Fetch user progress — parallel batches
          const allItemIds = allItems.map(it => it.id);
          const progressBatches = [];
          for (let i = 0; i < allItemIds.length; i += BATCH) {
            const batch = allItemIds.slice(i, i + BATCH);
            progressBatches.push(
              supabase.from("community_user_progress").select("item_id").eq("user_id", userId).in("item_id", batch)
            );
          }

          const progressResults = await Promise.all(progressBatches);
          if (cancelled) return;

          const userProgress = new Set();
          progressResults.forEach(res => {
            (res.data || []).forEach(r => userProgress.add(r.item_id));
          });

          // Compute completed series per community
          communityIds.forEach(cid => {
            const seriesIds = seriesByCommunity[cid] || [];
            let completed = 0;
            seriesIds.forEach(sid => {
              const items = itemsByMs[sid] || [];
              if (items.length > 0 && items.every(itemId => userProgress.has(itemId))) {
                completed++;
              }
            });
            result[cid].completedSeries = completed;
          });
        } else {
          // No user — badge details without earned state
          communityIds.forEach(id => {
            result[id].badgeDetails = (badgesByCommunity[id] || []).map(b => ({
              id: b.id, name: b.name, earned: false,
              accent_color: b.accent_color, image_url: b.image_url,
            }));
          });
        }
      } catch (err) {
        console.error("[Explore] Stats fetch error:", err);
      }

      if (!cancelled) {
        setStats(result);
        setStatsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isActive, communities, userId]);

  // Split followed / unfollowed
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
          Communities
        </div>
        <div style={{
          fontSize: 11, color: "var(--text-faint)", marginTop: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          Track films, earn badges, complete series
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
                stats={stats[c.id]}
                onOpen={() => onOpenCommunity(c.slug)}
                isSubscribed={true}
                subscriptionsLoaded={subscriptionsLoaded}
                onToggleSubscription={() => onUnsubscribe?.(c.id)}
              />
            ))}

            {unfollowedCommunities.length > 0 && (
              <>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 500, fontSize: 9,
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
                    stats={stats[c.id]}
                    onOpen={() => onOpenCommunity(c.slug)}
                    isSubscribed={false}
                    subscriptionsLoaded={subscriptionsLoaded}
                    onToggleSubscription={() => onSubscribe?.(c.id)}
                  />
                ))}
              </>
            )}

            {/* Coming Soon */}
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


// ════════════════════════════════════════════════
// COMMUNITY CARD
// ════════════════════════════════════════════════
function CommunityCard({ community, stats, onOpen, isSubscribed, subscriptionsLoaded, onToggleSubscription }) {
  const theme = community.theme_config || {};
  const accent = theme.accent || "#e94560";
  const artworkUrl = PODCAST_ART[community.slug] || null;
  const statsLoaded = !!stats;
  const s = stats || { totalSeries: 0, completedSeries: 0, totalBadges: 0, earnedBadges: 0, badgeDetails: [] };
  const seriesPct = s.totalSeries > 0 ? Math.round((s.completedSeries / s.totalSeries) * 100) : 0;

  // Split badge pips into rows of 10
  const badgeRows = [];
  for (let i = 0; i < s.badgeDetails.length; i += 10) {
    badgeRows.push(s.badgeDetails.slice(i, i + 10));
  }

  return (
    <div
      onClick={onOpen}
      style={{
        width: "100%",
        background: theme.primary || "var(--bg-card)",
        borderRadius: 16, overflow: "hidden",
        marginBottom: 10, textAlign: "left",
        position: "relative", cursor: "pointer",
      }}
    >
      {/* Accent stripe */}
      <div style={{ height: 3, background: accent }} />

      <div style={{ padding: "16px 18px 18px", position: "relative" }}>
        {/* Top row: artwork + name + follow button */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            {/* Podcast artwork or fallback initials */}
            {artworkUrl ? (
              <img
                src={artworkUrl}
                alt={community.name}
                style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  objectFit: "cover",
                  border: `1.5px solid ${accent}44`,
                }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${accent}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 16, color: accent,
              }}>
                {getSlugAbbrev(community.slug)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: "'Permanent Marker', cursive",
                fontSize: 18, color: "#fff", lineHeight: 1.15,
              }}>
                {community.name}
              </div>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2,
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {community.description?.split("\n")[0]}
              </div>
            </div>
          </div>

          {subscriptionsLoaded && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSubscription(); }}
              style={{
                background: isSubscribed ? `${accent}22` : "rgba(255,255,255,0.06)",
                border: `1.5px solid ${isSubscribed ? accent : "rgba(255,255,255,0.15)"}`,
                borderRadius: 8, padding: "6px 10px",
                cursor: "pointer", flexShrink: 0,
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

        {/* ── Joined: series progress + badge pips ── */}
        {isSubscribed && (
          <div style={{
            marginTop: 16,
            opacity: statsLoaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}>
            {/* Series stat — centered over progress bar */}
            {s.totalSeries > 0 && (
              <div style={{ textAlign: "center" }}>
                <div>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 26, color: accent, lineHeight: 1,
                  }}>
                    {s.completedSeries}
                  </span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600, fontSize: 16, color: "rgba(255,255,255,0.3)",
                  }}>
                    {" / "}{s.totalSeries}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2,
                }}>
                  Series complete
                </div>

                {/* Progress bar */}
                <div style={{
                  height: 12, borderRadius: 2,
                  border: `1.5px solid ${accent}66`,
                  background: "rgba(255,255,255,0.04)",
                  marginTop: 10, overflow: "hidden",
                  padding: 2,
                }}>
                  <div style={{
                    height: "100%", borderRadius: 1,
                    width: `${seriesPct}%`,
                    background: accent,
                    transition: "width 0.6s ease",
                  }} />
                </div>
                <div style={{
                  textAlign: "right", marginTop: 4,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, color: accent,
                }}>
                  {seriesPct}%
                </div>
              </div>
            )}

            {/* Badge pips */}
            {s.badgeDetails.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9, color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  textAlign: "center", marginBottom: 8,
                }}>
                  Badges
                </div>
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6,
                }}>
                  {badgeRows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{
                      display: "flex", gap: 6, justifyContent: "center",
                    }}>
                      {row.map(b => (
                        <div
                          key={b.id}
                          title={b.name}
                          style={{
                            width: 20, height: 20, borderRadius: "50%",
                            background: b.earned
                              ? accent
                              : "rgba(255,255,255,0.03)",
                            border: b.earned
                              ? "2px solid #fff"
                              : "1.5px dashed rgba(255,255,255,0.1)",
                            transition: "all 0.3s ease",
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Unjoined: game scope ── */}
        {!isSubscribed && (
          <div style={{
            display: "flex", gap: 16, marginTop: 14,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 14, fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            opacity: statsLoaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}>
            {s.totalSeries > 0 && (
              <span>
                <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{s.totalSeries}</span>
                {" "}series
              </span>
            )}
            {s.totalBadges > 0 && (
              <span>
                <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{s.totalBadges}</span>
                {" "}badges
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// ── Helpers ──
function getSlugAbbrev(slug) {
  const map = {
    blankcheck: "BC", nowplaying: "NP", bigpicture: "BP",
    filmjunk: "FJ", hdtgm: "HD", filmspotting: "FS",
    rewatchables: "RW", chapo: "CT", getplayed: "GP",
  };
  return map[slug] || (slug || "").slice(0, 2).toUpperCase();
}

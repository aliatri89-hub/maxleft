import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import CommunityTapeCard from "../components/community/shared/CommunityTapeCard";
import CommunitySleeveSheet from "../components/community/shared/CommunitySleeveSheet";

// Podcast artwork by community slug
// TODO: move to community_pages.image_url column when ready
const PODCAST_ART = {
  "blankcheck": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/bb/82/cf/bb82cfa4-0bf8-bbe8-b5a6-407702ab1764/mza_4979053321172937662.jpeg/540x540bb.webp",
  "nowplaying": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/30/57/26/305726f4-a910-986d-af15-9d9630b96722/mza_632554795848485854.jpg/540x540bb.webp",
};

// ════════════════════════════════════════════════
// EXPLORE SCREEN — VHS tape shelf with sleeve discovery
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
  const [stats, setStats] = useState({}); // lightweight: series + badge counts
  const [sleeveOpen, setSleeveOpen] = useState(null); // community object or null
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

  // ── Fetch lightweight stats (series + badge counts, series completion for followed) ──
  useEffect(() => {
    if (!isActive || communities.length === 0) return;
    if (Object.keys(stats).length > 0) return;
    let cancelled = false;

    (async () => {
      const communityIds = communities.map(c => c.id);
      const result = {};
      communityIds.forEach(id => {
        result[id] = { totalSeries: 0, completedSeries: 0, totalBadges: 0 };
      });

      try {
        const [seriesRes, badgesRes] = await Promise.all([
          supabase.from("community_miniseries")
            .select("id, community_id")
            .in("community_id", communityIds),
          supabase.from("badges")
            .select("id, community_id")
            .in("community_id", communityIds)
            .eq("is_active", true),
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
          badgesByCommunity[b.community_id].push(b.id);
        });
        communityIds.forEach(id => {
          result[id].totalBadges = (badgesByCommunity[id] || []).length;
        });

        // Series completion — only for followed communities
        if (userId) {
          const followedIds = new Set(
            communityIds.filter(id => communitySubscriptions?.has(id))
          );
          const followedSeriesIds = allSeries
            .filter(s => followedIds.has(s.community_id))
            .map(s => s.id);

          if (followedSeriesIds.length > 0) {
            const BATCH = 200;
            const itemBatches = [];
            for (let i = 0; i < followedSeriesIds.length; i += BATCH) {
              const batch = followedSeriesIds.slice(i, i + BATCH);
              itemBatches.push(
                supabase.from("community_items").select("id, miniseries_id").in("miniseries_id", batch)
              );
            }

            const itemResults = await Promise.all(itemBatches);
            if (cancelled) return;

            const allItems = [];
            itemResults.forEach(res => {
              if (res.data) allItems.push(...res.data);
            });

            const itemsByMs = {};
            allItems.forEach(item => {
              if (!itemsByMs[item.miniseries_id]) itemsByMs[item.miniseries_id] = [];
              itemsByMs[item.miniseries_id].push(item.id);
            });

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
          }
        }
      } catch (err) {
        console.error("[Explore] Stats fetch error:", err);
      }

      if (!cancelled) setStats(result);
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

  // Sleeve handlers
  const openSleeve = (community) => setSleeveOpen(community);
  const closeSleeve = () => setSleeveOpen(null);

  const handleFollowFromSleeve = (communityId) => {
    onSubscribe?.(communityId);
  };

  const handleUnfollowFromSleeve = (communityId) => {
    onUnsubscribe?.(communityId);
  };

  const handleNavigateFromSleeve = (slug) => {
    closeSleeve();
    onOpenCommunity(slug);
  };

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

      {/* Tape shelf */}
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 13 }}>
            Loading communities...
          </div>
        ) : (
          <>
            {/* Followed tapes */}
            {followedCommunities.map((c) => {
              const theme = c.theme_config || {};
              const accent = theme.accent || "#e94560";
              const art = PODCAST_ART[c.slug] || null;
              return (
                <CommunityTapeCard
                  key={c.id}
                  community={c}
                  isSubscribed={true}
                  artworkUrl={art}
                  accent={accent}
                  stats={stats[c.id]}
                  onTap={() => onOpenCommunity(c.slug)}
                  onLongPress={() => openSleeve(c)}
                />
              );
            })}

            {/* More communities label */}
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
                {unfollowedCommunities.map((c) => {
                  const theme = c.theme_config || {};
                  const accent = theme.accent || "#e94560";
                  const art = PODCAST_ART[c.slug] || null;
                  return (
                    <CommunityTapeCard
                      key={c.id}
                      community={c}
                      isSubscribed={false}
                      artworkUrl={art}
                      accent={accent}
                      stats={stats[c.id]}
                      onTap={() => openSleeve(c)}
                    />
                  );
                })}
              </>
            )}

            {/* Coming soon */}
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

      {/* Sleeve sheet — shared instance for any community */}
      {sleeveOpen && (
        <CommunitySleeveSheet
          community={sleeveOpen}
          open={!!sleeveOpen}
          onClose={closeSleeve}
          artworkUrl={PODCAST_ART[sleeveOpen.slug] || null}
          accent={sleeveOpen.theme_config?.accent || "#e94560"}
          stats={stats[sleeveOpen.id]}
          isSubscribed={communitySubscriptions?.has(sleeveOpen.id)}
          onFollow={() => handleFollowFromSleeve(sleeveOpen.id)}
          onUnfollow={() => handleUnfollowFromSleeve(sleeveOpen.id)}
          onNavigate={() => handleNavigateFromSleeve(sleeveOpen.slug)}
          subscriptionsLoaded={subscriptionsLoaded}
        />
      )}
    </div>
  );
}

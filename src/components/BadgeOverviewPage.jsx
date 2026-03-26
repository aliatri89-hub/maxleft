import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import BadgeDetailScreen from "./community/shared/BadgeDetailScreen";

/**
 * BadgeOverviewPage — Cross-community badge hub.
 *
 * Shows ALL badge progress across every subscribed community in one place.
 * Lives in the Games tab as a full-screen overlay.
 *
 * Props:
 *   userId               — current user ID
 *   onClose              — () => void
 *   onNavigateCommunity  — (slug) => void — tap in-progress badge → jump to community
 */
export default function BadgeOverviewPage({ userId, onClose, onNavigateCommunity }) {
  const [communities, setCommunities] = useState([]);    // [{ id, title, slug, accent_color, image_url }]
  const [allBadges, setAllBadges] = useState([]);         // badges with community info
  const [earnedIds, setEarnedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});      // { [badgeId]: { current, total } }
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);

  // ── Fetch all data ──
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        // 1. Get subscribed communities with details
        const { data: subRows } = await supabase
          .from("user_community_subscriptions")
          .select("community_id, community_pages!inner(id, name, slug, logo_url, theme_config)")
          .eq("user_id", userId);

        if (cancelled) return;
        const comms = (subRows || []).map(r => ({
          id: r.community_pages.id,
          title: r.community_pages.name,
          slug: r.community_pages.slug,
          accent_color: r.community_pages.theme_config?.accent || "#ff6a00",
          image_url: r.community_pages.logo_url,
        }));
        setCommunities(comms);

        if (comms.length === 0) { setLoading(false); return; }

        const communityIds = comms.map(c => c.id);

        // 2. Get all active badges across communities
        const { data: badgeRows } = await supabase
          .from("badges")
          .select("id, name, image_url, accent_color, community_id, badge_type, miniseries_id, media_type_filter, progress_tagline, sort_order, is_active")
          .in("community_id", communityIds)
          .eq("is_active", true)
          .order("sort_order");

        if (cancelled) return;
        setAllBadges(badgeRows || []);

        // 3. Get earned badges
        const { data: earnedRows } = await supabase
          .from("user_badges")
          .select("badge_id")
          .eq("user_id", userId);

        if (cancelled) return;
        setEarnedIds(new Set((earnedRows || []).map(r => r.badge_id)));

        // 4. Compute progress for all unearned badges
        const earnedSet = new Set((earnedRows || []).map(r => r.badge_id));
        const unearnedBadges = (badgeRows || []).filter(b => !earnedSet.has(b.id));
        const progressEntries = {};

        // ── Miniseries completion badges ──
        const miniseriesBadges = unearnedBadges.filter(b => b.badge_type === "miniseries_completion" && b.miniseries_id);
        if (miniseriesBadges.length > 0) {
          const miniseriesIds = [...new Set(miniseriesBadges.map(b => b.miniseries_id))];

          const { data: itemRows } = await supabase
            .from("community_items")
            .select("id, miniseries_id, media_type, tmdb_id")
            .in("miniseries_id", miniseriesIds);

          if (cancelled) return;

          const allTmdbIds = [...new Set((itemRows || []).map(i => i.tmdb_id).filter(Boolean))];
          let completedRows = [];
          if (allTmdbIds.length > 0) {
            const { data: cRows } = await supabase
              .from("community_user_progress")
              .select("item_id, community_items!inner(tmdb_id, media_type)")
              .eq("user_id", userId)
              .eq("status", "completed")
              .in("community_items.tmdb_id", allTmdbIds);
            completedRows = cRows || [];
          }

          if (cancelled) return;
          const completedTmdbSet = new Set(completedRows.map(c => c.community_items?.tmdb_id));

          for (const badge of miniseriesBadges) {
            const badgeItems = (itemRows || []).filter(i =>
              i.miniseries_id === badge.miniseries_id
              && (!badge.media_type_filter || i.media_type === badge.media_type_filter)
            );
            const requiredTmdbIds = [...new Set(badgeItems.map(i => i.tmdb_id).filter(Boolean))];
            const current = requiredTmdbIds.filter(id => completedTmdbSet.has(id)).length;
            progressEntries[badge.id] = { current, total: requiredTmdbIds.length };
          }
        }

        // ── Item set completion badges ──
        const itemSetBadges = unearnedBadges.filter(b => b.badge_type === "item_set_completion");
        if (itemSetBadges.length > 0) {
          const itemSetBadgeIds = itemSetBadges.map(b => b.id);

          const { data: biRows } = await supabase
            .from("badge_items")
            .select("badge_id, community_items!inner(tmdb_id, media_type)")
            .in("badge_id", itemSetBadgeIds);

          if (cancelled) return;

          const badgeItemsMap = {};
          for (const row of (biRows || [])) {
            if (!badgeItemsMap[row.badge_id]) badgeItemsMap[row.badge_id] = [];
            badgeItemsMap[row.badge_id].push(row.community_items?.tmdb_id);
          }

          const allItemSetTmdbIds = [...new Set(Object.values(badgeItemsMap).flat().filter(Boolean))];
          let itemSetCompleted = [];
          if (allItemSetTmdbIds.length > 0) {
            const { data: cRows } = await supabase
              .from("community_user_progress")
              .select("item_id, community_items!inner(tmdb_id)")
              .eq("user_id", userId)
              .eq("status", "completed")
              .in("community_items.tmdb_id", allItemSetTmdbIds);
            itemSetCompleted = cRows || [];
          }

          if (cancelled) return;
          const completedItemSetTmdbIds = new Set(itemSetCompleted.map(c => c.community_items?.tmdb_id));

          for (const badge of itemSetBadges) {
            const requiredTmdbIds = [...new Set((badgeItemsMap[badge.id] || []).filter(Boolean))];
            const current = requiredTmdbIds.filter(id => completedItemSetTmdbIds.has(id)).length;
            progressEntries[badge.id] = { current, total: requiredTmdbIds.length };
          }
        }

        if (!cancelled) {
          setProgressMap(progressEntries);
          setLoading(false);
        }
      } catch (err) {
        console.error("[BadgeOverview] Error:", err);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  // ── Group badges by community, sorted by most progress ──
  const communityGroups = useMemo(() => {
    if (!allBadges.length) return [];

    const groups = communities.map(comm => {
      const badges = allBadges.filter(b => b.community_id === comm.id);
      const earned = badges.filter(b => earnedIds.has(b.id));
      const inProgress = badges.filter(b => {
        if (earnedIds.has(b.id)) return false;
        const p = progressMap[b.id];
        return p && p.current > 0;
      });
      const available = badges.filter(b => {
        if (earnedIds.has(b.id)) return false;
        const p = progressMap[b.id];
        return !p || p.current === 0;
      });

      // Sort in-progress by % descending
      inProgress.sort((a, b) => {
        const pA = progressMap[a.id] ? progressMap[a.id].current / progressMap[a.id].total : 0;
        const pB = progressMap[b.id] ? progressMap[b.id].current / progressMap[b.id].total : 0;
        return pB - pA;
      });

      // Community-level progress score for sorting
      const totalEarned = earned.length;
      const totalProgress = inProgress.reduce((sum, b) => {
        const p = progressMap[b.id];
        return sum + (p ? p.current / p.total : 0);
      }, 0);

      return {
        community: comm,
        earned,
        inProgress,
        available,
        badges,
        score: totalEarned * 10 + totalProgress, // weight earned heavily
      };
    });

    // Sort: communities with most progress first
    groups.sort((a, b) => b.score - a.score);
    return groups.filter(g => g.badges.length > 0);
  }, [communities, allBadges, earnedIds, progressMap]);

  // ── Badge detail drill-down ──
  if (selectedBadge) {
    return (
      <BadgeDetailScreen
        badge={selectedBadge}
        userId={userId}
        earnedAt={earnedIds.has(selectedBadge.id) ? new Date().toISOString() : null}
        onClose={() => setSelectedBadge(null)}
      />
    );
  }

  // Total counts
  const totalBadges = allBadges.length;
  const totalEarned = allBadges.filter(b => earnedIds.has(b.id)).length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0f0d0b",
      overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Barlow+Condensed:wght@600;700;800&family=IBM+Plex+Mono:wght@400;700&family=Bebas+Neue&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes bo-fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bo-itemIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        .bo-card {
          transition: transform 0.15s ease;
        }
        .bo-card:active {
          transform: scale(0.93) !important;
        }
      `}</style>

      {/* ── Sticky Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(15,13,11,0.95)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "#c9a84c",
          fontSize: 15, cursor: "pointer", padding: "4px 8px 4px 0",
          fontWeight: 600, fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          ← Back
        </button>
        <div style={{
          fontSize: 14, fontWeight: 700, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          flex: 1, textAlign: "center",
          letterSpacing: "0.03em", textTransform: "uppercase",
        }}>
          All Badges
        </div>
        <div style={{ width: 48 }} />
      </div>

      <div style={{
        maxWidth: 480, margin: "0 auto",
        padding: "20px 16px 80px",
        animation: "bo-fadeIn 0.35s ease-out",
      }}>
        {/* ── Summary ── */}
        {!loading && totalBadges > 0 && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36, color: "#f5f0e8", lineHeight: 1,
            }}>
              {totalEarned}<span style={{ color: "#ffffff25", fontSize: 22 }}>/{totalBadges}</span>
            </div>
            <div style={{
              fontSize: 10, color: "#ffffff30",
              textTransform: "uppercase", letterSpacing: 2.5,
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: 4,
            }}>
              Badges Earned
            </div>
            <div style={{
              fontSize: 12, color: "#ffffff25",
              fontFamily: "'Barlow Condensed', sans-serif",
              marginTop: 12,
              lineHeight: 1.4,
              maxWidth: 280,
              margin: "12px auto 0",
            }}>
              No checklists here. Badge names hint at the collection — discovering what counts is part of the fun.
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            color: "#ffffff20", fontSize: 13,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Loading badges…
          </div>
        )}

        {/* ── Community Groups ── */}
        {!loading && communityGroups.map((group, gi) => {
          const { community: comm, earned, inProgress, available } = group;
          const accent = comm.accent_color || "#ff6a00";
          const commEarned = earned.length;
          const commTotal = group.badges.length;

          return (
            <div key={comm.id} style={{
              marginBottom: 40,
              animation: `bo-fadeIn 0.35s ${gi * 0.08}s ease-out both`,
            }}>
              {/* Community header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 16, paddingLeft: 2,
              }}>
                {comm.image_url && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    overflow: "hidden", flexShrink: 0,
                    border: `1.5px solid ${accent}40`,
                  }}>
                    <img src={comm.image_url} alt="" style={{
                      width: "100%", height: "100%", objectFit: "cover",
                    }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 16, fontWeight: 700, color: accent,
                    letterSpacing: "0.02em",
                    lineHeight: 1.2,
                  }}>
                    {comm.title}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10, color: "#ffffff25",
                    letterSpacing: 1,
                  }}>
                    {commEarned}/{commTotal} earned
                  </div>
                </div>
                <button
                  onClick={() => onNavigateCommunity?.(comm.slug)}
                  style={{
                    background: `${accent}12`,
                    border: `1px solid ${accent}25`,
                    borderRadius: 8,
                    padding: "4px 10px",
                    color: accent,
                    fontSize: 10,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 600,
                    letterSpacing: 1,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  View
                </button>
              </div>

              {/* Earned row */}
              {earned.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 9, color: "#22c55e60",
                    textTransform: "uppercase", letterSpacing: 2,
                    marginBottom: 10, paddingLeft: 4,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    Earned
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 14,
                  }}>
                    {earned.map((badge, idx) => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned
                        progress={null}
                        accent={badge.accent_color || accent}
                        delay={(gi * 0.08) + (idx * 0.04)}
                        onTap={() => setSelectedBadge(badge)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress row */}
              {inProgress.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 9, color: "#ffffff20",
                    textTransform: "uppercase", letterSpacing: 2,
                    marginBottom: 10, paddingLeft: 4,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    In Progress
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 14,
                  }}>
                    {inProgress.map((badge, idx) => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned={false}
                        progress={progressMap[badge.id]}
                        accent={badge.accent_color || accent}
                        delay={(gi * 0.08) + ((earned.length + idx) * 0.04)}
                        onTap={() => onNavigateCommunity?.(comm.slug)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Available row */}
              {available.length > 0 && (
                <div>
                  <div style={{
                    fontSize: 9, color: "#ffffff15",
                    textTransform: "uppercase", letterSpacing: 2,
                    marginBottom: 10, paddingLeft: 4,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    Available
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 14,
                  }}>
                    {available.map((badge, idx) => (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        isEarned={false}
                        progress={progressMap[badge.id]}
                        accent={badge.accent_color || accent}
                        delay={(gi * 0.08) + ((earned.length + inProgress.length + idx) * 0.04)}
                        onTap={() => onNavigateCommunity?.(comm.slug)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Empty state ── */}
        {!loading && communityGroups.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            animation: "bo-fadeIn 0.4s ease-out",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎬</div>
            <div style={{
              fontSize: 15, color: "#ffffff40",
              fontFamily: "'Barlow Condensed', sans-serif",
              lineHeight: 1.4,
            }}>
              Start logging films in your communities to earn badges!
            </div>
            <div style={{
              fontSize: 11, color: "#ffffff20",
              fontFamily: "'IBM Plex Mono', monospace",
              marginTop: 8,
            }}>
              Subscribe to a podcast community to get started.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── BadgeCard (same pattern as BadgePage, compact for overview) ──

function BadgeCard({ badge, isEarned, progress, accent, delay, onTap }) {
  const current = progress?.current || 0;
  const total = progress?.total || 1;
  const pct = isEarned ? 1 : (total > 0 ? current / total : 0);

  // Blur scales inversely with progress: 20px at 0%, 6px near completion
  const blurAmount = isEarned ? 0 : Math.round(20 - (pct * 14));

  // SVG progress ring
  const size = 80;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div
      className="bo-card"
      onClick={onTap}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        cursor: "pointer",
        animation: `bo-itemIn 0.3s ${delay}s ease-out both`,
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size} height={size}
          style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={isEarned ? `${accent}30` : "#ffffff08"}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={isEarned ? accent : `${accent}80`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>

        <div style={{
          position: "absolute",
          top: strokeWidth + 3,
          left: strokeWidth + 3,
          width: size - (strokeWidth + 3) * 2,
          height: size - (strokeWidth + 3) * 2,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#1a1a2e",
        }}>
          {badge.image_url ? (
            <img
              src={badge.image_url}
              alt={badge.name}
              loading="lazy"
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: isEarned ? "none" : `blur(${blurAmount}px) brightness(0.5)`,
                transform: "scale(1.1)",
                transition: "filter 0.3s",
              }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: isEarned
                ? `radial-gradient(circle, ${accent}30, ${accent}10)`
                : "#1a1a2e",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              🏆
            </div>
          )}
        </div>

        {/* Earned check */}
        {isEarned && (
          <div style={{
            position: "absolute", bottom: -1, right: -1,
            width: 20, height: 20, borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid #0f0d0b",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: "#fff", fontWeight: 700,
          }}>
            ✓
          </div>
        )}

        {/* Fraction overlay */}
        {!isEarned && current > 0 && (
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            background: "#1a1a2e",
            border: `1px solid ${accent}40`,
            borderRadius: 6,
            padding: "1px 5px",
            fontSize: 9, fontWeight: 700,
            color: `${accent}cc`,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            {current}/{total}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 8,
        fontSize: 10,
        fontWeight: 600,
        color: isEarned ? "#ffffffcc" : "#ffffff35",
        textAlign: "center",
        lineHeight: 1.2,
        maxWidth: size + 4,
        fontFamily: "'Barlow Condensed', sans-serif",
        letterSpacing: "0.02em",
      }}>
        {badge.name}
      </div>

      {/* Progress tagline for in-progress */}
      {!isEarned && badge.progress_tagline && current > 0 && (
        <div style={{
          fontSize: 8,
          color: "#ffffff20",
          fontFamily: "'IBM Plex Mono', monospace",
          marginTop: 2,
          textAlign: "center",
          maxWidth: size + 8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {badge.progress_tagline}
        </div>
      )}
    </div>
  );
}

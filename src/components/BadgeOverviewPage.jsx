import { t } from "../theme";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { supabase } from "../supabase";
import BadgeDetailScreen from "./community/shared/BadgeDetailScreen";

/**
 * BadgeOverviewPage — Cross-community badge hub.
 *
 * Shows ALL badge progress across every subscribed community in one place.
 * Lives in the Games tab as a full-screen overlay.
 *
 * Communities are collapsed by default — tap to expand and see badges.
 * Scales to 10+ communities × 20 badges each without performance issues.
 *
 * Props:
 *   userId               — current user ID
 *   onClose              — () => void
 *   onNavigateCommunity  — (slug) => void — tap in-progress badge → jump to community
 */
export default function BadgeOverviewPage({ userId, onClose, onNavigateCommunity }) {
  const [communities, setCommunities] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [earnedIds, setEarnedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleCommunity = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Fetch all data via single RPC ──
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_badge_overview", { p_user_id: userId });

        if (cancelled) return;
        if (error) throw error;

        const result = data || {};
        setCommunities(result.communities || []);
        setAllBadges(result.badges || []);
        setEarnedIds(new Set(result.earned_ids || []));
        setProgressMap(result.progress || {});
      } catch (err) {
        console.error("[BadgeOverview] Error:", err);
      } finally {
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

      inProgress.sort((a, b) => {
        const pA = progressMap[a.id] ? progressMap[a.id].current / progressMap[a.id].total : 0;
        const pB = progressMap[b.id] ? progressMap[b.id].current / progressMap[b.id].total : 0;
        return pB - pA;
      });

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
        score: totalEarned * 10 + totalProgress,
      };
    });

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
      background: t.bgPrimary,
      overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      <style>{`
        @keyframes bo-fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bo-itemIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bo-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .bo-card {
          transition: transform 0.15s ease;
        }
        .bo-card:active {
          transform: scale(0.93) !important;
        }
        .bo-comm-header {
          transition: background 0.15s ease;
        }
        .bo-comm-header:active {
          background: rgba(255,255,255,0.04) !important;
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
          fontWeight: 600, fontFamily: t.fontDisplay,
        }}>
          ← Back
        </button>
        <div style={{
          fontSize: 14, fontWeight: 700, color: t.textPrimary,
          fontFamily: t.fontDisplay,
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
              fontFamily: t.fontHeadline,
              fontSize: 36, color: t.cream, lineHeight: 1,
            }}>
              {totalEarned}<span style={{ color: t.textFaint, fontSize: 22 }}>/{totalBadges}</span>
            </div>
            <div style={{
              fontSize: 10, color: t.textFaint,
              textTransform: "uppercase", letterSpacing: 2.5,
              fontFamily: t.fontBody,
              marginTop: 4,
            }}>
              Badges Earned
            </div>
            <div style={{
              fontSize: 12, color: t.textFaint,
              fontFamily: t.fontDisplay,
              marginTop: 12,
              lineHeight: 1.4,
              maxWidth: 280,
              margin: "12px auto 0",
            }}>
              Badge names are clues.<br />Log films to discover and collect.
            </div>
          </div>
        )}

        {/* ── Skeleton Loading ── */}
        {loading && (
          <div style={{ animation: "bo-fadeIn 0.3s ease-out" }}>
            {/* Summary skeleton */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <SkeletonBlock width={100} height={36} style={{ margin: "0 auto" }} />
              <SkeletonBlock width={80} height={10} style={{ margin: "8px auto 0" }} />
              <SkeletonBlock width={200} height={12} style={{ margin: "14px auto 0" }} />
            </div>
            {/* Community row skeletons */}
            {[0, 1, 2].map(i => (
              <SkeletonCommunityRow key={i} delay={i * 0.06} />
            ))}
          </div>
        )}

        {/* ── Community Groups (collapsed by default) ── */}
        {!loading && communityGroups.map((group, gi) => {
          const { community: comm, earned, inProgress, available } = group;
          const accent = comm.accent_color || "#ff6a00";
          const commEarned = earned.length;
          const commTotal = group.badges.length;
          const isExpanded = expandedIds.has(comm.id);

          return (
            <div key={comm.id} style={{
              marginBottom: 12,
              animation: `bo-fadeIn 0.35s ${gi * 0.06}s ease-out both`,
            }}>
              {/* ── Community header (always visible, tap to expand) ── */}
              <div
                className="bo-comm-header"
                onClick={() => toggleCommunity(comm.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: isExpanded ? "rgba(255,255,255,0.03)" : "transparent",
                  border: `1px solid ${isExpanded ? `${accent}20` : "rgba(255,255,255,0.04)"}`,
                }}
              >
                {/* Community logo */}
                {comm.image_url && (
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    overflow: "hidden", flexShrink: 0,
                    border: `1.5px solid ${accent}40`,
                  }}>
                    <img loading="lazy" src={comm.image_url} alt="" style={{
                      width: "100%", height: "100%", objectFit: "cover",
                    }} />
                  </div>
                )}

                {/* Title + counts */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 15, fontWeight: 700, color: accent,
                    letterSpacing: "0.02em",
                    lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {comm.title}
                  </div>
                  <div style={{
                    fontFamily: t.fontBody,
                    fontSize: 10, color: t.textFaint,
                    letterSpacing: 1,
                    marginTop: 2,
                  }}>
                    {commEarned}/{commTotal} earned
                    {inProgress.length > 0 && (
                      <span style={{ color: `${accent}80` }}>
                        {" "}· {inProgress.length} in progress
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini progress bar */}
                <div style={{
                  width: 40, height: 3, borderRadius: 2,
                  background: "#ffffff08", overflow: "hidden",
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: `${commTotal > 0 ? (commEarned / commTotal) * 100 : 0}%`,
                    height: "100%",
                    background: accent,
                    borderRadius: 2,
                    transition: "width 0.4s ease",
                  }} />
                </div>

                {/* Chevron */}
                <div style={{
                  color: t.textFaint, fontSize: 12,
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  flexShrink: 0,
                  lineHeight: 1,
                }}>
                  ▾
                </div>
              </div>

              {/* ── Expanded badge grid ── */}
              {isExpanded && (
                <div style={{
                  padding: "16px 8px 8px",
                  animation: "bo-fadeIn 0.25s ease-out",
                }}>
                  {/* View community button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onNavigateCommunity?.(comm.slug); }}
                      style={{
                        background: `${accent}12`,
                        border: `1px solid ${accent}25`,
                        borderRadius: 8,
                        padding: "4px 10px",
                        color: accent,
                        fontSize: 10,
                        fontFamily: t.fontBody,
                        fontWeight: 600,
                        letterSpacing: 1,
                        cursor: "pointer",
                        textTransform: "uppercase",
                      }}
                    >
                      View Community
                    </button>
                  </div>

                  {/* Earned row */}
                  {earned.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{
                        fontSize: 9, color: "#22c55e60",
                        textTransform: "uppercase", letterSpacing: 2,
                        marginBottom: 10, paddingLeft: 4,
                        fontFamily: t.fontDisplay,
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
                            delay={idx * 0.04}
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
                        fontSize: 9, color: t.textFaint,
                        textTransform: "uppercase", letterSpacing: 2,
                        marginBottom: 10, paddingLeft: 4,
                        fontFamily: t.fontDisplay,
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
                            delay={(earned.length + idx) * 0.04}
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
                        fontFamily: t.fontDisplay,
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
                            delay={(earned.length + inProgress.length + idx) * 0.04}
                            onTap={() => onNavigateCommunity?.(comm.slug)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
              fontSize: 15, color: t.textFaint,
              fontFamily: t.fontDisplay,
              lineHeight: 1.4,
            }}>
              Start logging films in your communities to earn badges!
            </div>
            <div style={{
              fontSize: 11, color: t.textFaint,
              fontFamily: t.fontBody,
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


// ── Skeleton components ──

function SkeletonBlock({ width, height, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: "linear-gradient(90deg, #ffffff06 25%, #ffffff10 50%, #ffffff06 75%)",
      backgroundSize: "200% 100%",
      animation: "bo-shimmer 1.8s ease-in-out infinite",
      ...style,
    }} />
  );
}

function SkeletonCommunityRow({ delay = 0 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 12px", marginBottom: 12,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.04)",
      animation: `bo-fadeIn 0.3s ${delay}s ease-out both`,
    }}>
      <SkeletonBlock width={32} height={32} style={{ borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <SkeletonBlock width={120} height={14} />
        <SkeletonBlock width={70} height={9} style={{ marginTop: 6 }} />
      </div>
      <SkeletonBlock width={40} height={3} style={{ borderRadius: 2, flexShrink: 0 }} />
      <SkeletonBlock width={12} height={12} style={{ borderRadius: 3, flexShrink: 0 }} />
    </div>
  );
}


// ── BadgeCard (memoized — only re-renders when props actually change) ──

const BadgeCard = memo(function BadgeCard({ badge, isEarned, progress, accent, delay, onTap }) {
  const current = progress?.current || 0;
  const total = progress?.total || 1;
  const pct = isEarned ? 1 : (total > 0 ? current / total : 0);

  const blurAmount = isEarned ? 0 : Math.round(20 - (pct * 14));

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
          background: t.bgCard,
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
                : t.bgCard,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              🏆
            </div>
          )}
        </div>

        {isEarned && (
          <div style={{
            position: "absolute", bottom: -1, right: -1,
            width: 20, height: 20, borderRadius: "50%",
            background: "#22c55e",
            border: "2px solid #0f0d0b",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: t.textPrimary, fontWeight: 700,
          }}>
            ✓
          </div>
        )}

        {!isEarned && current > 0 && (
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            background: t.bgCard,
            border: `1px solid ${accent}40`,
            borderRadius: 6,
            padding: "1px 5px",
            fontSize: 9, fontWeight: 700,
            color: `${accent}cc`,
            fontFamily: t.fontDisplay,
          }}>
            {current}/{total}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 8,
        fontSize: 10,
        fontWeight: 600,
        color: isEarned ? t.textSecondary : "#ffffff35",
        textAlign: "center",
        lineHeight: 1.2,
        maxWidth: size + 4,
        fontFamily: t.fontDisplay,
        letterSpacing: "0.02em",
      }}>
        {badge.name}
      </div>

      {!isEarned && badge.progress_tagline && current > 0 && (
        <div style={{
          fontSize: 8,
          color: t.textFaint,
          fontFamily: t.fontBody,
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
});

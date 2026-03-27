import { t } from "../../../theme";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase";
import BadgeCelebration from "./BadgeCelebration";

/**
 * BadgeDetailScreen — Full-screen badge detail view.
 *
 * Shows the badge, earned date, and the full item journey with
 * individual completion dates. Tap the badge to replay the celebration.
 *
 * Props:
 *   badge      — badge row from Supabase
 *   userId     — current user ID
 *   earnedAt   — ISO string of when badge was earned (from user_badges)
 *   onClose    — () => void
 */
export default function BadgeDetailScreen({ badge: badgeProp, userId, earnedAt, onClose }) {
  const [items, setItems] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [replayCelebration, setReplayCelebration] = useState(false);
  const [badge, setBadge] = useState(badgeProp);
  const accent = badge.accent_color || "#ff6a00";

  // ── Resolve full badge row if miniseries_id is missing ──────
  useEffect(() => {
    if (badgeProp.miniseries_id || !badgeProp.id) return;
    let cancelled = false;

    (async () => {
      const { data: fullBadge, error } = await supabase
        .from("badges")
        .select("*")
        .eq("id", badgeProp.id)
        .single();

      if (!cancelled && fullBadge) {
        setBadge({ ...badgeProp, ...fullBadge });
      }
      if (error) console.error("[BadgeDetail] Badge fetch error:", error.message);
    })();

    return () => { cancelled = true; };
  }, [badgeProp]);

  // ── Load items + user progress ────────────────────────────
  useEffect(() => {
    if (!badge.miniseries_id || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Fetch items in this miniseries (filtered by media_type if badge specifies)
      let itemQuery = supabase
        .from("community_items")
        .select("id, title, year, sort_order, tmdb_id, media_type")
        .eq("miniseries_id", badge.miniseries_id);
      if (badge.media_type_filter) itemQuery = itemQuery.eq("media_type", badge.media_type_filter);
      const { data: itemRows } = await itemQuery.order("sort_order");

      if (cancelled) return;

      // Fetch user progress — cross-community by tmdb_id (matches useBadges logic)
      const tmdbIds = (itemRows || []).map(i => i.tmdb_id).filter(Boolean);
      const { data: progressRows } = tmdbIds.length > 0
        ? await supabase
            .from("community_user_progress")
            .select("item_id, completed_at, rating, status, updated_at, community_items!inner(tmdb_id)")
            .eq("user_id", userId)
            .eq("status", "completed")
            .in("community_items.tmdb_id", tmdbIds)
        : { data: [] };

      if (cancelled) return;

      // Map completed tmdb_ids back to this badge's item_ids
      const completedTmdbSet = new Set(
        (progressRows || [])
          .filter(r => r.status !== "skipped")
          .map(r => r.community_items?.tmdb_id)
          .filter(Boolean)
      );

      // For each completed tmdb_id, find the best progress row (prefer highest rating, most recent)
      const tmdbToProgress = {};
      for (const row of (progressRows || [])) {
        const tid = row.community_items?.tmdb_id;
        if (!tid || row.status === "skipped") continue;
        if (!tmdbToProgress[tid] || (row.rating && (!tmdbToProgress[tid].rating || row.rating > tmdbToProgress[tid].rating))) {
          tmdbToProgress[tid] = row;
        }
      }

      const pMap = {};
      for (const item of (itemRows || [])) {
        if (item.tmdb_id && completedTmdbSet.has(item.tmdb_id)) {
          const best = tmdbToProgress[item.tmdb_id];
          pMap[item.id] = {
            completed_at: best?.completed_at,
            updated_at: best?.updated_at,
            rating: best?.rating,
          };
        }
      }

      setItems(itemRows || []);
      setProgressMap(pMap);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [badge.miniseries_id, userId]);

  const completedCount = items.filter(i => progressMap[i.id]).length;
  const totalCount = items.length;
  const isComplete = completedCount === totalCount && totalCount > 0;

  // Format date nicely
  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Format earned date
  const earnedDateStr = earnedAt ? formatDate(earnedAt) : "Just now";

  // Sort items by sort_order (already sorted from query, but just in case)
  const sortedItems = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));


  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0a0600",
      overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Barlow+Condensed:wght@600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes badgeDetailFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgeGlow {
          0%, 100% { box-shadow: 0 0 30px ${accent}20, 0 0 60px ${accent}08; }
          50% { box-shadow: 0 0 40px ${accent}30, 0 0 80px ${accent}12; }
        }
        .badge-detail-item {
          transition: background 0.15s;
        }
        .badge-detail-item:active {
          background: ${accent}12 !important;
        }
      `}</style>

      {/* Replay celebration */}
      {replayCelebration && (
        <BadgeCelebration
          badge={badge}
          onClose={() => setReplayCelebration(false)}
        />
      )}

      {/* Header bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(10,6,0,0.92)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        padding: "12px 16px",
        display: "flex", alignItems: "center",
        borderBottom: `1px solid ${accent}10`,
      }}>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: accent,
          fontSize: 15, cursor: "pointer", padding: "4px 8px 4px 0",
          fontWeight: 600, fontFamily: t.fontDisplay,
        }}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
      </div>

      <div style={{
        maxWidth: 480, margin: "0 auto", padding: "24px 16px 60px",
        animation: "badgeDetailFadeIn 0.4s ease-out",
      }}>
        {/* ── Badge hero ─────────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingBottom: 28, marginBottom: 24,
          borderBottom: `1px solid ${accent}12`,
        }}>
          {/* Tappable badge image */}
          <div
            onClick={isComplete ? () => setReplayCelebration(true) : undefined}
            style={{
              width: 140, height: 140, borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${accent}70`,
              cursor: isComplete ? "pointer" : "default",
              animation: isComplete ? "badgeGlow 3s ease-in-out infinite" : "none",
              position: "relative",
              transition: "transform 0.2s",
            }}
            onMouseEnter={isComplete ? (e => e.currentTarget.style.transform = "scale(1.05)") : undefined}
            onMouseLeave={isComplete ? (e => e.currentTarget.style.transform = "scale(1)") : undefined}
          >
            {badge.image_url ? (
              <img
                src={badge.image_url}
                alt={badge.name}
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  filter: isComplete
                    ? "none"
                    : `blur(${Math.round(20 - ((totalCount > 0 ? completedCount / totalCount : 0) * 14))}px) brightness(0.5)`,
                  transform: isComplete ? "none" : "scale(1.15)",
                  transition: "filter 0.4s, transform 0.4s",
                }}
              />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: `radial-gradient(circle, ${accent}25, ${accent}08)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 56,
              }}>🏆</div>
            )}
            {/* Replay hint overlay */}
            {isComplete && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 100%)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                paddingBottom: 10,
              }}>
                <span style={{
                  fontSize: 9, color: "#ffffff50",
                  letterSpacing: 1.5, textTransform: "uppercase",
                  fontWeight: 600,
                }}>
                  tap to replay
                </span>
              </div>
            )}
          </div>

          {/* Badge name */}
          <div style={{
            marginTop: 20, textAlign: "center",
          }}>
            <div style={{
              fontSize: 28, fontWeight: 700, color: t.textPrimary,
              fontFamily: "'Playfair Display', serif",
              lineHeight: 1.15,
            }}>
              {badge.name}
            </div>
            {isComplete && badge.tagline && (
              <div style={{
                fontSize: 14, color: `${accent}aa`, fontStyle: "italic",
                fontFamily: "'Playfair Display', serif",
                marginTop: 8,
              }}>
                {badge.tagline}
              </div>
            )}
            {!isComplete && badge.progress_tagline && (
              <div style={{
                fontSize: 13, color: "#ffffff45", fontStyle: "italic",
                fontFamily: "'Playfair Display', serif",
                marginTop: 8,
              }}>
                {badge.progress_tagline}
              </div>
            )}
          </div>

          {/* Earned date + stats */}
          <div style={{
            marginTop: 16, display: "flex", gap: 20,
            alignItems: "center",
          }}>
            {isComplete && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#ffffff30", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>
                  Earned
                </div>
                <div style={{ fontSize: 13, color: t.green, fontWeight: 600 }}>
                  {earnedDateStr}
                </div>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#ffffff30", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>
                Films
              </div>
              <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>
                {completedCount}/{totalCount}
              </div>
            </div>

          </div>
        </div>

        {/* ── Progress bar ───────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            height: 5, borderRadius: 3,
            background: "#ffffff08", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              background: isComplete
                ? `linear-gradient(90deg, #22c55e, #16a34a)`
                : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
              borderRadius: 3,
              transition: "width 0.6s ease",
            }} />
          </div>
        </div>

        {/* ── Film journey list ──────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 10, color: "#ffffff30",
            textTransform: "uppercase", letterSpacing: 2,
            marginBottom: 14, paddingLeft: 2,
            fontFamily: t.fontDisplay,
          }}>
            The Journey
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#ffffff20" }}>
              Loading...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {sortedItems.map((item, idx) => {
                const prog = progressMap[item.id];
                const isLogged = !!prog;
                const stars = prog?.rating;

                return (
                  <div
                    key={item.id}
                    className="badge-detail-item"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 12px",
                      borderRadius: 8,
                      background: isLogged ? `${accent}06` : "transparent",
                      position: "relative",
                    }}
                  >
                    {/* Timeline connector */}
                    {idx < sortedItems.length - 1 && (
                      <div style={{
                        position: "absolute",
                        left: 26, top: 36,
                        width: 1, height: "calc(100% - 12px)",
                        background: isLogged ? `${accent}25` : "#ffffff08",
                      }} />
                    )}

                    {/* Status dot */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      border: `2px solid ${isLogged ? accent : "#ffffff15"}`,
                      background: isLogged ? `${accent}25` : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      color: isLogged ? accent : "#ffffff20",
                      flexShrink: 0,
                      zIndex: 1,
                      transition: "all 0.3s",
                    }}>
                      {isLogged ? "✓" : idx + 1}
                    </div>

                    {/* Film info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: isLogged ? "#ffffffdd" : "#ffffff40",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {isComplete || isLogged ? item.title : (
                          <span style={{
                            display: "inline-block",
                            width: `${60 + (item.title?.length || 8) % 40}%`,
                            height: 12,
                            borderRadius: 4,
                            background: "#ffffff0a",
                            verticalAlign: "middle",
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, color: "#ffffff25", marginTop: 2,
                      }}>
                        {item.year}
                      </div>
                    </div>

                    {/* Star rating */}
                    {stars && (
                      <div style={{
                        fontSize: 12, color: t.gold,
                        fontWeight: 600, flexShrink: 0,
                        display: "flex", alignItems: "center", gap: 2,
                      }}>
                        <span style={{ fontSize: 11 }}>★</span>
                        <span>{stars}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Badge description — only shown when earned ──── */}
        {isComplete && badge.description && (
          <div style={{
            padding: "16px",
            background: `${accent}06`,
            border: `1px solid ${accent}10`,
            borderRadius: 10,
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 13, color: "#ffffff50",
              lineHeight: 1.6, fontStyle: "italic",
            }}>
              {badge.description}
            </div>
          </div>
        )}

        {/* ── Replay button ──────────────────────────────── */}
        {isComplete && (
          <button
            onClick={() => setReplayCelebration(true)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: `${accent}12`,
              border: `1px solid ${accent}25`,
              color: accent,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: t.fontDisplay,
              letterSpacing: 0.5,
            }}
          >
            Replay Celebration
          </button>
        )}
      </div>
    </div>
  );
}

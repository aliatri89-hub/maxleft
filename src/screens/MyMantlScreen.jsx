import { t } from "../theme";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { useShelves } from "../contexts/ShelvesProvider";
import BadgeShelf from "../components/shelf/BadgeShelf";
import ShelfModals from "../components/modals/ShelfModals";

const accent = "#EF9F27";

function renderStars(rating) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <span style={{ fontSize: 13, color: accent, letterSpacing: 1.5 }}>
      {"★".repeat(full)}
      {hasHalf && <span style={{ display: "inline-block", width: "0.55em", overflow: "hidden", verticalAlign: "top" }}>★</span>}
    </span>
  );
}

function parseDiaryDate(dateStr) {
  if (!dateStr) return { month: "", day: "" };
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return { month: months[d.getMonth()], day: d.getDate() };
}

/** ── Stats Ribbon ── */
function StatsRibbon({ userId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc("get_mantl_stats", { p_user_id: userId })
      .then(({ data }) => { if (data) setStats(data); });
  }, [userId]);

  const watchlistValue = stats
    ? stats.watchlist_total > 0
      ? `${stats.watchlist_followed_through}/${stats.watchlist_total}`
      : "—"
    : "—";

  const items = [
    { value: stats ? stats.total_films.toLocaleString() : "—", label: "FILMS" },
    { value: stats ? stats.badges_earned.toString() : "—", label: "BADGES" },
    { value: watchlistValue, label: "WATCHLIST" },
    { value: stats ? stats.series_completed.toString() : "—", label: "SERIES" },
  ];

  return (
    <div style={{
      display: "flex", justifyContent: "space-around",
      padding: "14px 12px",
      background: "#080706",
      borderTop: "0.5px solid rgba(255,255,255,0.04)",
      borderBottom: "0.5px solid rgba(255,255,255,0.04)",
      margin: 0,
    }}>
      {items.map((s) => (
        <div key={s.label} style={{ textAlign: "center", flex: 1 }}>
          <div style={{
            fontFamily: t.fontSerif, fontWeight: 900,
            fontSize: 20, lineHeight: 1,
            color: t.textSecondary,
          }}>
            {s.value}
          </div>
          <div style={{
            fontSize: 8, letterSpacing: 2,
            color: "var(--text-faint)",
            fontFamily: "var(--font-mono)",
            fontWeight: 300, marginTop: 4,
          }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function MyMantlScreen({ profile, onShelfIt, session, pushNav, removeNav, onRefresh, onUpdateProfile, onToast, letterboxdSyncing, isActive }) {
  const { shelves, shelvesLoaded } = useShelves();

  // ── Trigger state (controls which modal/overlay is open) ──
  const [viewingItem, setViewingItem] = useState(null);
  const [diaryShelf, setDiaryShelf] = useState(null);

  // ── Back gesture navigation ──
  useEffect(() => {
    if (viewingItem && pushNav) pushNav("viewItem", () => setViewingItem(null));
    else if (!viewingItem && removeNav) removeNav("viewItem");
  }, [!!viewingItem]);
  useEffect(() => {
    if (diaryShelf && pushNav) pushNav("diary", () => setDiaryShelf(null));
    else if (!diaryShelf && removeNav) removeNav("diary");
  }, [!!diaryShelf]);

  const movies = shelves.movies || [];
  const recentMovies = movies.slice(0, 5);

  // Count films this week for diary header
  const weekCount = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return movies.filter(m => m.watchedAt && new Date(m.watchedAt) >= weekAgo).length;
  }, [movies]);

  return (
    <div className="shelf-home" style={{
      background: "var(--bg-primary)",
      height: "calc(100dvh - 52px - 64px)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>

      <style>{`
        @keyframes hearth-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes hearth-flicker {
          0%, 100% { opacity: 0.25; transform: scaleX(1) scaleY(1); }
          25% { opacity: 0.4; transform: scaleX(1.02) scaleY(1.04); }
          50% { opacity: 0.3; transform: scaleX(0.98) scaleY(0.97); }
          75% { opacity: 0.35; transform: scaleX(1.01) scaleY(1.02); }
        }
        @keyframes ember-rise {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          12% { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(-80px) scale(0.2) translateX(8px); }
        }
      `}</style>

      {/* ── Badge Shelf Hero ── */}
      <BadgeShelf session={session} isActive={isActive} />

      {/* ── Stats Ribbon ── */}
      <StatsRibbon userId={session?.user?.id} />

      {/* ── Fireplace Hearth ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", marginTop: 0 }}>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

          {/* Left stone column */}
          <div style={{
            width: 22, flexShrink: 0,
            background: "linear-gradient(90deg, #2e2518 0%, #251e14 30%, #1c1710 70%, #161210 100%)",
            borderLeft: "0.5px solid rgba(255,255,255,0.05)",
            position: "relative",
            boxShadow: "inset -6px 0 12px rgba(0,0,0,0.5)",
          }}>
            {/* Stone blocks */}
            {Array.from({ length: 24 }, (_, i) => {
              const t = 4 + i * 16;
              const isWide = i % 2 === 0;
              return (
                <div key={i} style={{
                  position: "absolute", top: t, left: isWide ? 2 : 5,
                  width: isWide ? 17 : 12, height: isWide ? 10 : 7,
                  borderRadius: 1,
                  background: `rgba(255,255,255,${0.012 + (i % 3) * 0.006})`,
                  border: "0.5px solid rgba(255,255,255,0.03)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.015), inset 0 -1px 0 rgba(0,0,0,0.2)",
                }} />
              );
            })}
            {/* Inner edge shadow */}
            <div style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: 8,
              background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.3))",
              pointerEvents: "none",
            }} />
          </div>

          {/* Hearth opening */}
          <div style={{
            flex: 1,
            background: "radial-gradient(ellipse at center 120%, #12100c 0%, #0a0908 40%, #060505 100%)",
            borderTop: "2px solid #1a1510",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Soot stain at top */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 40,
              background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
              pointerEvents: "none", zIndex: 1,
            }} />

            {/* Side shadow vignette — left */}
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0, width: 30,
              background: "linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 100%)",
              pointerEvents: "none", zIndex: 1,
            }} />
            {/* Side shadow vignette — right */}
            <div style={{
              position: "absolute", top: 0, right: 0, bottom: 0, width: 30,
              background: "linear-gradient(270deg, rgba(0,0,0,0.4) 0%, transparent 100%)",
              pointerEvents: "none", zIndex: 1,
            }} />

            {/* Multi-layer ember glow */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
              background: "radial-gradient(ellipse at center bottom, rgba(200,100,20,0.14) 0%, rgba(200,80,10,0.06) 30%, transparent 70%)",
              animation: "hearth-glow 4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -8, left: "10%", right: "10%", height: 60,
              background: "radial-gradient(ellipse, rgba(234,88,12,0.18) 0%, rgba(200,60,10,0.06) 50%, transparent 80%)",
              animation: "hearth-flicker 2.5s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {/* Warm ambient wash on bottom half */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
              background: "radial-gradient(ellipse at center bottom, rgba(180,90,20,0.04) 0%, transparent 60%)",
              pointerEvents: "none",
            }} />

            {/* Rising ember particles */}
            {[
              { left: "22%", delay: "0s", size: 3 },
              { left: "45%", delay: "1.4s", size: 2 },
              { left: "68%", delay: "0.7s", size: 3 },
              { left: "35%", delay: "2.1s", size: 2 },
              { left: "58%", delay: "0.3s", size: 2 },
              { left: "50%", delay: "1.8s", size: 2 },
              { left: "30%", delay: "0.9s", size: 3 },
            ].map((e, i) => (
              <div key={i} style={{
                position: "absolute", bottom: 0, left: e.left,
                width: e.size, height: e.size, borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 ${e.size * 3}px ${e.size}px ${accent}55`,
                opacity: 0,
                animation: `ember-rise 3.5s ease-out ${e.delay} infinite`,
                pointerEvents: "none",
              }} />
            ))}

            {/* ── Diary Header ── */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "14px 16px 6px",
              position: "relative", zIndex: 2,
            }}>
              <div style={{
                fontFamily: t.fontSerif, fontWeight: 700,
                fontSize: 15, color: "var(--text-faint)",
                letterSpacing: 1,
              }}>
                Diary
              </div>
              {weekCount > 0 && (
                <div style={{
                  fontSize: 9, color: "var(--text-faint)",
                  fontFamily: "var(--font-mono)", letterSpacing: 1,
                  fontWeight: 300,
                }}>
                  THIS WEEK: {weekCount}
                </div>
              )}
            </div>

            {recentMovies.length > 0 ? (
              <>
                {/* Diary entries */}
                <div style={{ padding: "0 12px 0", position: "relative", zIndex: 2 }}>
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: "0.5px solid rgba(255,255,255,0.04)",
                  }}>
                    {recentMovies.map((movie, i) => {
                      const { month, day } = parseDiaryDate(movie.watchedAt);
                      return (
                        <div
                          key={movie.id}
                          onClick={() => setViewingItem({ ...movie, shelfType: "movies" })}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px",
                            borderBottom: i < recentMovies.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none",
                            cursor: "pointer", transition: "background 0.15s",
                            position: "relative",
                          }}
                        >
                          {/* Stacked date */}
                          <div style={{
                            minWidth: 38, flexShrink: 0, textAlign: "center",
                          }}>
                            <div style={{
                              fontFamily: "var(--font-mono)", fontSize: 9,
                              color: "var(--text-faint)", letterSpacing: "0.04em",
                              fontWeight: 300, lineHeight: 1,
                            }}>
                              {month}
                            </div>
                            <div style={{
                              fontFamily: t.fontSerif, fontWeight: 700,
                              fontSize: 18, color: t.textMuted,
                              lineHeight: 1.1,
                            }}>
                              {day}
                            </div>
                          </div>

                          {/* Poster */}
                          {movie.cover && (
                            <div style={{
                              width: 34, height: 50, borderRadius: 3, overflow: "hidden",
                              flexShrink: 0, background: t.bgElevated,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                            }}>
                              <img src={movie.cover} alt="" style={{
                                width: "100%", height: "100%", objectFit: "cover", display: "block",
                              }} loading="lazy" />
                            </div>
                          )}

                          {/* Title + year */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: "var(--font-display)", fontSize: 14,
                              fontWeight: 600, color: t.textSecondary,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {movie.title}
                            </div>
                            {movie.year && (
                              <div style={{
                                fontFamily: "var(--font-mono)", fontSize: 10,
                                color: "var(--text-faint)", fontWeight: 300,
                                marginTop: 1,
                              }}>
                                {movie.year}{movie.director ? ` · ${movie.director}` : ""}
                              </div>
                            )}
                          </div>

                          {/* Stars */}
                          <div style={{ flexShrink: 0 }}>
                            {renderStars(movie.rating)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom row: See all + Add */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "flex-end",
                  gap: 10, padding: "12px 12px",
                  position: "relative", zIndex: 2,
                }}>
                  {movies.length > 5 && (
                    <div
                      onClick={() => setDiaryShelf("movies")}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontFamily: "var(--font-mono)", fontSize: 11,
                        fontWeight: 500, letterSpacing: "0.04em",
                        color: `${accent}cc`, background: `${accent}0a`,
                        border: `1px solid ${accent}20`,
                        borderRadius: 20, padding: "6px 14px",
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <span>See all {movies.length.toLocaleString()}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <button
                    onClick={() => onShelfIt("movie")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: "var(--font-mono)", fontSize: 11,
                      fontWeight: 600, letterSpacing: "0.04em",
                      color: "var(--bg-card, #0f0d0b)", background: accent,
                      border: "none", borderRadius: 5,
                      padding: "5px 12px", cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                  >+ Add</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: 14,
                  color: "var(--text-muted)", fontStyle: "italic",
                }}>No films yet</div>
              </div>
            )}
          </div>

          {/* Right stone column */}
          <div style={{
            width: 22, flexShrink: 0,
            background: "linear-gradient(90deg, #161210 0%, #1c1710 30%, #251e14 70%, #2e2518 100%)",
            borderRight: "0.5px solid rgba(255,255,255,0.05)",
            position: "relative",
            boxShadow: "inset 6px 0 12px rgba(0,0,0,0.5)",
          }}>
            {Array.from({ length: 24 }, (_, i) => {
              const t = 4 + i * 16;
              const isWide = i % 2 === 0;
              return (
                <div key={i} style={{
                  position: "absolute", top: t, right: isWide ? 2 : 5,
                  width: isWide ? 17 : 12, height: isWide ? 10 : 7,
                  borderRadius: 1,
                  background: `rgba(255,255,255,${0.012 + (i % 3) * 0.006})`,
                  border: "0.5px solid rgba(255,255,255,0.03)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.015), inset 0 -1px 0 rgba(0,0,0,0.2)",
                }} />
              );
            })}
            {/* Inner edge shadow */}
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0, width: 8,
              background: "linear-gradient(270deg, transparent, rgba(0,0,0,0.3))",
              pointerEvents: "none",
            }} />
          </div>

        </div>
      </div>

      {/* ── All Modals (portaled to body so slider transform doesn't break fixed positioning) ── */}
      {createPortal(
        <ShelfModals
          diaryShelf={diaryShelf} setDiaryShelf={setDiaryShelf}
          viewingItem={viewingItem} setViewingItem={setViewingItem}
          shelves={shelves} profile={profile} session={session}
          onRefresh={onRefresh} onToast={onToast}
          onShelfIt={onShelfIt} onUpdateProfile={onUpdateProfile}
        />,
        document.body
      )}

    </div>
  );
}

export default MyMantlScreen;

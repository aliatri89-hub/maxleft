import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
function StatsRibbon({ movies }) {
  const stats = useMemo(() => {
    const total = movies.length;
    const thisYear = movies.filter(m => {
      if (!m.watchedAt) return false;
      return new Date(m.watchedAt).getFullYear() === new Date().getFullYear();
    }).length;

    const rated = movies.filter(m => m.rating);
    const avg = rated.length > 0
      ? (rated.reduce((s, m) => s + m.rating, 0) / rated.length).toFixed(1)
      : "—";

    // Simple streak: count consecutive days from today backwards
    let streak = 0;
    if (movies.length > 0) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const daySet = new Set();
      movies.forEach(m => {
        if (m.watchedAt) {
          const d = new Date(m.watchedAt);
          d.setHours(0,0,0,0);
          daySet.add(d.getTime());
        }
      });
      let check = new Date(today);
      while (daySet.has(check.getTime())) {
        streak++;
        check.setDate(check.getDate() - 1);
      }
    }

    return { total, thisYear, avg, streak };
  }, [movies]);

  const items = [
    { value: stats.total.toLocaleString(), label: "FILMS" },
    { value: stats.thisYear.toString(), label: new Date().getFullYear().toString() },
    { value: stats.streak > 0 ? `${stats.streak}d` : "—", label: "STREAK", highlight: stats.streak >= 3 },
    { value: `★ ${stats.avg}`, label: "AVG" },
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
            fontFamily: "'Playfair Display', serif", fontWeight: 900,
            fontSize: 20, lineHeight: 1,
            color: s.highlight ? accent : "rgba(255,255,255,0.85)",
            textShadow: s.highlight ? `0 0 12px ${accent}44` : "none",
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

function ShelfHome({ profile, shelves, shelvesLoaded, onShelfIt, session, pushNav, removeNav, onRefresh, onUpdateProfile, onToast, letterboxdSyncing, goodreadsSyncing, steamSyncing, isActive }) {

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
  const recentMovies = movies.slice(0, 6);

  // Count films this week for diary header
  const weekCount = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return movies.filter(m => m.watchedAt && new Date(m.watchedAt) >= weekAgo).length;
  }, [movies]);

  return (
    <div className="shelf-home" style={{
      background: "var(--bg-primary)",
      minHeight: "100vh",
      paddingBottom: 100,
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
      <BadgeShelf session={session} profile={profile} onUpdateProfile={onUpdateProfile} onToast={onToast} />

      {/* ── Stats Ribbon ── */}
      <StatsRibbon movies={movies} />

      {/* ── Fireplace Hearth ── */}
      <div style={{ padding: 0, marginTop: 0 }}>
        <div style={{ display: "flex" }}>

          {/* Left stone column */}
          <div style={{
            width: 16, flexShrink: 0,
            background: "linear-gradient(90deg, #2a211a 0%, #221c14 40%, #1a1510 100%)",
            borderLeft: "0.5px solid rgba(255,255,255,0.04)",
            position: "relative",
          }}>
            {[6,22,38,54,70,86,102,118,134,150,170,190,210,230,250,270,290,310,330].map((t, i) => (
              <div key={i} style={{
                position: "absolute", top: t, left: i % 2 === 0 ? 2 : 4,
                width: i % 2 === 0 ? 11 : 8, height: i % 2 === 0 ? 7 : 5,
                borderRadius: 1,
                background: "rgba(255,255,255,0.015)",
                border: "0.5px solid rgba(255,255,255,0.025)",
              }} />
            ))}
          </div>

          {/* Hearth opening */}
          <div style={{
            flex: 1,
            background: "#080706",
            borderTop: "2px solid #1a1510",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Multi-layer ember glow */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
              background: "radial-gradient(ellipse at center bottom, rgba(200,100,20,0.10) 0%, rgba(200,80,10,0.04) 40%, transparent 70%)",
              animation: "hearth-glow 4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -8, left: "15%", right: "15%", height: 40,
              background: "radial-gradient(ellipse, rgba(234,88,12,0.14) 0%, transparent 70%)",
              animation: "hearth-flicker 2.5s ease-in-out infinite",
              pointerEvents: "none",
            }} />

            {/* Rising ember particles (CSS-only) */}
            {[
              { left: "22%", delay: "0s", size: 3 },
              { left: "45%", delay: "1.4s", size: 2 },
              { left: "68%", delay: "0.7s", size: 3 },
              { left: "35%", delay: "2.1s", size: 2 },
              { left: "58%", delay: "0.3s", size: 2 },
            ].map((e, i) => (
              <div key={i} style={{
                position: "absolute", bottom: 0, left: e.left,
                width: e.size, height: e.size, borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 ${e.size * 2}px ${e.size}px ${accent}44`,
                opacity: 0,
                animation: `ember-rise 3.5s ease-out ${e.delay} infinite`,
                pointerEvents: "none",
              }} />
            ))}

            {/* ── Diary Header ── */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              padding: "14px 12px 6px",
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontWeight: 700,
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
                <div style={{ padding: "0 8px 0" }}>
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
                              fontFamily: "'Playfair Display', serif", fontWeight: 700,
                              fontSize: 18, color: "rgba(255,255,255,0.35)",
                              lineHeight: 1.1,
                            }}>
                              {day}
                            </div>
                          </div>

                          {/* Poster */}
                          {movie.cover && (
                            <div style={{
                              width: 34, height: 50, borderRadius: 3, overflow: "hidden",
                              flexShrink: 0, background: "rgba(255,255,255,0.04)",
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
                              fontWeight: 600, color: "rgba(255,255,255,0.75)",
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
                  gap: 10, padding: "12px 8px",
                }}>
                  {movies.length > 6 && (
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
            width: 16, flexShrink: 0,
            background: "linear-gradient(90deg, #1a1510 0%, #221c14 60%, #2a211a 100%)",
            borderRight: "0.5px solid rgba(255,255,255,0.04)",
            position: "relative",
          }}>
            {[6,22,38,54,70,86,102,118,134,150,170,190,210,230,250,270,290,310,330].map((t, i) => (
              <div key={i} style={{
                position: "absolute", top: t, right: i % 2 === 0 ? 2 : 4,
                width: i % 2 === 0 ? 11 : 8, height: i % 2 === 0 ? 7 : 5,
                borderRadius: 1,
                background: "rgba(255,255,255,0.015)",
                border: "0.5px solid rgba(255,255,255,0.025)",
              }} />
            ))}
          </div>

        </div>

        {/* Hearth floor */}
        <div style={{
          height: 8, margin: 0,
          background: "linear-gradient(180deg, #1a1510, #0f0d0b)",
          border: "0.5px solid rgba(255,255,255,0.03)",
          borderTop: "none",
        }} />
      </div>

      {/* ── All Modals (portaled to body so slider transform doesn't break fixed positioning) ── */}
      {createPortal(
        <ShelfModals
          addingCountry={false} setAddingCountry={() => {}}
          viewingCountry={null} setViewingCountry={() => {}}
          showPassportMap={false} setShowPassportMap={() => {}}
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

export default ShelfHome;

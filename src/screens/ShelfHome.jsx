import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import BadgeShelf from "../components/shelf/BadgeShelf";
import ShelfModals from "../components/modals/ShelfModals";

const accent = "#EF9F27";

function renderStars(rating) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <span style={{ fontSize: 12, color: "var(--accent-gold)", letterSpacing: 1 }}>
      {"★".repeat(full)}
      {hasHalf && <span style={{ display: "inline-block", width: "0.55em", overflow: "hidden", verticalAlign: "top" }}>★</span>}
    </span>
  );
}

function formatDiaryDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
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

  return (
    <div className="shelf-home" style={{
      background: "var(--bg-primary)",
      minHeight: "100vh",
      paddingBottom: 100,
    }}>

      {/* ── Badge Shelf Hero ── */}
      <BadgeShelf session={session} profile={profile} onUpdateProfile={onUpdateProfile} onToast={onToast} />

      {/* ── Fireplace Hearth ── */}
      <div style={{ padding: "0 16px", marginTop: -2 }}>
        <div style={{ display: "flex" }}>

          {/* Left stone column */}
          <div style={{
            width: 16, flexShrink: 0,
            background: "linear-gradient(90deg, #2a211a 0%, #221c14 40%, #1a1510 100%)",
            borderLeft: "0.5px solid rgba(255,255,255,0.04)",
            position: "relative",
          }}>
            {[6,22,38,54,70,86,102,118,134,150,170,190,210,230].map((t, i) => (
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
            {/* Ember glow */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 60,
              background: "radial-gradient(ellipse at center bottom, rgba(200,100,20,0.08) 0%, rgba(200,80,10,0.03) 40%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Top spacer */}
            <div style={{ height: 10 }} />

            {recentMovies.length > 0 ? (
              <>
                {/* Diary entries */}
                <div style={{ padding: "0 8px" }}>
                  <div style={{
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: "0.5px solid rgba(255,255,255,0.04)",
                  }}>
                    {recentMovies.map((movie, i) => (
                      <div
                        key={movie.id}
                        onClick={() => setViewingItem({ ...movie, shelfType: "movies" })}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px",
                          borderBottom: i < recentMovies.length - 1 ? "0.5px solid rgba(255,255,255,0.04)" : "none",
                          cursor: "pointer", transition: "background 0.15s",
                        }}
                      >
                        <div style={{
                          fontFamily: "var(--font-mono)", fontSize: 11,
                          color: "var(--text-faint)", minWidth: 42,
                          letterSpacing: "0.02em", fontWeight: 400, flexShrink: 0,
                        }}>
                          {formatDiaryDate(movie.watchedAt)}
                        </div>
                        {movie.cover && (
                          <div style={{
                            width: 24, height: 34, borderRadius: 2, overflow: "hidden",
                            flexShrink: 0, background: "rgba(255,255,255,0.04)",
                          }}>
                            <img src={movie.cover} alt="" style={{
                              width: "100%", height: "100%", objectFit: "cover", display: "block",
                            }} loading="lazy" />
                          </div>
                        )}
                        <div style={{
                          flex: 1, minWidth: 0,
                          fontFamily: "var(--font-display)", fontSize: 14,
                          fontWeight: 600, color: "rgba(255,255,255,0.75)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {movie.title}
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {renderStars(movie.rating)}
                        </div>
                      </div>
                    ))}
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
                      <span>See all {movies.length}</span>
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
            {[6,22,38,54,70,86,102,118,134,150,170,190,210,230].map((t, i) => (
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
          height: 8, margin: "0 16px",
          background: "linear-gradient(180deg, #1a1510, #0f0d0b)",
          borderRadius: "0 0 4px 4px",
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

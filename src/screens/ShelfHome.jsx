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
      <BadgeShelf session={session} />

      {/* ── Diary Section ── */}
      <div style={{ padding: "0 16px", marginTop: 8 }}>
        {/* Count + Sync + Add row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 14, paddingBottom: 14, flexWrap: "wrap",
        }}>
            {movies.length > 0 && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--text-faint)", letterSpacing: "0.08em",
              }}>{movies.length} logged</span>
            )}
            {profile.letterboxd_username && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10,
                color: letterboxdSyncing ? "var(--accent-terra)" : "var(--accent-green)",
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: letterboxdSyncing ? "var(--accent-terra)" : "var(--accent-green)",
                  boxShadow: letterboxdSyncing ? "none" : "0 0 6px rgba(74,222,128,0.35)",
                }} />
                <span style={{ fontFamily: "var(--font-mono)" }}>{letterboxdSyncing ? "syncing" : "synced"}</span>
              </span>
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

        {recentMovies.length > 0 ? (
          <>
            {/* Diary entries */}
            <div style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
            }}>
              {recentMovies.map((movie, i) => (
                <div
                  key={movie.id}
                  onClick={() => setViewingItem({ ...movie, shelfType: "movies" })}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px",
                    borderBottom: i < recentMovies.length - 1 ? "0.5px solid var(--border-subtle)" : "none",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: "var(--text-faint)", minWidth: 44,
                    letterSpacing: "0.02em", fontWeight: 400, flexShrink: 0,
                  }}>
                    {formatDiaryDate(movie.watchedAt)}
                  </div>
                  {movie.cover && (
                    <div style={{
                      width: 28, height: 40, borderRadius: 3, overflow: "hidden",
                      flexShrink: 0, background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${accent}12`,
                    }}>
                      <img src={movie.cover} alt="" style={{
                        width: "100%", height: "100%", objectFit: "cover", display: "block",
                      }} loading="lazy" />
                    </div>
                  )}
                  <div style={{
                    flex: 1, minWidth: 0,
                    fontFamily: "var(--font-display)", fontSize: 14,
                    fontWeight: 600, color: "var(--text-secondary)",
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

            {/* See full diary */}
            {movies.length > 6 && (
              <div style={{ textAlign: "center", paddingTop: 14 }}>
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
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 14,
              color: "var(--text-muted)", fontStyle: "italic",
            }}>No films yet</div>
          </div>
        )}
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

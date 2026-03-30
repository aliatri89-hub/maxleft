import { t } from "../../theme";
import { useState } from "react";
import ItemDetailModal from "./ItemDetailModal";

/**
 * ShelfModals — Renders all shelf-related modals/overlays.
 *
 * Receives "trigger" props (what's open + closers) from MyMantlScreen.
 * Manages all internal modal state (forms, editing, confirming, etc).
 */
export default function ShelfModals({
  // Trigger state (controlled by parent)
  diaryShelf, setDiaryShelf,
  viewingItem, setViewingItem,
  // Data
  shelves, profile, session,
  // Callbacks
  onRefresh, onToast, onShelfIt, onUpdateProfile,
}) {
  // Diary state
  const [diaryView, setDiaryView] = useState("diary");
  const [diarySort, setDiarySort] = useState("date-desc");
  const [diarySearch, setDiarySearch] = useState("");
  const [diaryDecade, setDiaryDecade] = useState(null);
  const [diaryRatingFilter, setDiaryRatingFilter] = useState(null);
  const [diaryYear, setDiaryYear] = useState(null);
  const [diaryLimit, setDiaryLimit] = useState(50);

  const shelfConfig = {
    movies: { icon: "🎬", label: "Movies", modalCat: "movie" },
    shows: { icon: "📺", label: "Shows", modalCat: "show" },
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <>
        {"★".repeat(full)}
        {hasHalf && <span style={{ display: "inline-block", width: "0.55em", overflow: "hidden", verticalAlign: "top" }}>★</span>}
      </>
    );
  };

  return (
    <>

      {/* ══ Diary / See All Overlay ══ */}
      {diaryShelf && (() => {
        const cfg = shelfConfig[diaryShelf];
        const allItems = shelves[diaryShelf] || [];
        const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const accent = "#EF9F27";

        // ── Filtering pipeline ──
        let items = [...allItems];

        // Search filter
        if (diarySearch.trim()) {
          const q = diarySearch.toLowerCase().trim();
          items = items.filter(i =>
            (i.title || "").toLowerCase().includes(q) ||
            (i.director || "").toLowerCase().includes(q)
          );
        }

        // Decade / year filter (by release year)
        if (diaryDecade !== null) {
          if (diaryYear !== null) {
            items = items.filter(i => i.year === diaryYear);
          } else {
            items = items.filter(i => i.year >= diaryDecade && i.year < diaryDecade + 10);
          }
        }

        // Rating filter
        if (diaryRatingFilter === "rated") {
          items = items.filter(i => i.rating > 0);
        } else if (diaryRatingFilter === "unrated") {
          items = items.filter(i => !i.rating || i.rating === 0);
        } else if (typeof diaryRatingFilter === "number") {
          items = items.filter(i => {
            const r = i.rating || 0;
            return r >= diaryRatingFilter && r < diaryRatingFilter + 0.5;
          });
        }

        // ── Compute available decades from full unfiltered set ──
        const decades = [...new Set(allItems.filter(i => i.year).map(i => Math.floor(i.year / 10) * 10))].sort((a, b) => b - a);

        // Years within selected decade
        const yearsInDecade = diaryDecade !== null
          ? [...new Set(allItems.filter(i => i.year >= diaryDecade && i.year < diaryDecade + 10).map(i => i.year))].sort((a, b) => b - a)
          : [];

        // ── Grouping + sorting ──
        let sortedGroups;
        if (diarySort === "rating" || diarySort === "rating-asc") {
          const isAsc = diarySort === "rating-asc";
          const grouped = {};
          const unrated = [];
          items.forEach(item => {
            const r = item.rating > 0 ? Math.round(item.rating) : 0;
            const dateStr = item.watchedAt || item.createdAt;
            const enriched = { ...item, _date: dateStr ? new Date(dateStr) : null };
            if (r === 0) { unrated.push(enriched); return; }
            const key = isAsc ? `${r}` : `${5 - r}`;
            const label = `${"★".repeat(r)} · ${r} star${r !== 1 ? "s" : ""}`;
            if (!grouped[key]) grouped[key] = { label, items: [] };
            grouped[key].items.push(enriched);
          });
          sortedGroups = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => (b._date || 0) - (a._date || 0)),
            }));
        } else if (diarySort === "alpha") {
          const grouped = {};
          items.forEach(item => {
            const dateStr = item.watchedAt || item.createdAt;
            const d = dateStr ? new Date(dateStr) : null;
            const letter = (item.title || "?")[0].toUpperCase();
            const key = /[A-Z]/.test(letter) ? letter : "#";
            if (!grouped[key]) grouped[key] = { label: key, items: [] };
            grouped[key].items.push({ ...item, _date: d });
          });
          sortedGroups = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => (a.title || "").localeCompare(b.title || "")),
            }));
        } else {
          const grouped = {};
          items.forEach(item => {
            const dateStr = item.watchedAt || item.createdAt;
            const d = dateStr ? new Date(dateStr) : null;
            const key = d ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}` : "undated";
            const label = d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "Undated";
            if (!grouped[key]) grouped[key] = { label, items: [] };
            grouped[key].items.push({ ...item, _date: d });
          });
          const dateAsc = diarySort === "date-asc";
          const undatedGroup = grouped["undated"];
          delete grouped["undated"];
          sortedGroups = Object.entries(grouped)
            .sort(([a], [b]) => dateAsc ? a.localeCompare(b) : b.localeCompare(a))
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => dateAsc ? (a._date || Infinity) - (b._date || Infinity) : (b._date || 0) - (a._date || 0)),
            }));
          if (undatedGroup) sortedGroups.push(undatedGroup);
        }

        return (
          <div className="item-detail-overlay" onClick={(e) => e.target === e.currentTarget && setDiaryShelf(null)}>
            <div className="item-detail-sheet" style={{ maxHeight: "92vh" }}>
              <div className="modal-handle" />
              <button className="item-detail-close" onClick={() => { setDiaryShelf(null); setDiarySearch(""); setDiaryDecade(null); setDiaryYear(null); setDiaryRatingFilter(null); setDiaryLimit(50); }}>← Close</button>

              {/* ── Header ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{
                    fontFamily: t.fontSerif, fontWeight: 900, fontSize: 24,
                    color: accent, letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    {cfg?.label}
                  </div>
                  <div style={{ display: "flex", background: `${accent}0a`, border: `1px solid ${accent}18`, borderRadius: 8, overflow: "hidden" }}>
                    <button className="mono" onClick={() => setDiaryView("diary")}
                      style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                        background: diaryView === "diary" ? `${accent}20` : "transparent",
                        color: diaryView === "diary" ? accent : "var(--text-muted)" }}>
                      List
                    </button>
                    <button className="mono" onClick={() => setDiaryView("grid")}
                      style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                        background: diaryView === "grid" ? `${accent}20` : "transparent",
                        color: diaryView === "grid" ? accent : "var(--text-muted)" }}>
                      Grid
                    </button>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                  {items.length === allItems.length ? `${allItems.length} total` : `${items.length} of ${allItems.length}`}
                </div>
              </div>

              {/* ── Search bar ── */}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="6" cy="6" r="4.5" stroke="var(--text-faint)" strokeWidth="1.5" />
                  <path d="M9.5 9.5L12.5 12.5" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  value={diarySearch}
                  onChange={e => setDiarySearch(e.target.value)}
                  placeholder={`Search ${allItems.length} ${cfg?.label?.toLowerCase() || "items"}...`}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 12px 10px 34px",
                    fontFamily: "var(--font-body)", fontSize: 13,
                    color: "var(--text-primary)",
                    background: `${accent}06`,
                    border: `1px solid ${accent}18`,
                    borderRadius: 10, outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = `${accent}40`}
                  onBlur={e => e.target.style.borderColor = `${accent}18`}
                />
                {diarySearch && (
                  <div onClick={() => setDiarySearch("")} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    cursor: "pointer", fontSize: 16, color: "var(--text-faint)", lineHeight: 1,
                  }}>×</div>
                )}
              </div>

              {/* ── Sort pills ── */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {[
                  { key: "date-desc", label: "Newest" },
                  { key: "date-asc", label: "Oldest" },
                  { key: "rating", label: "★ High" },
                  { key: "rating-asc", label: "★ Low" },
                  { key: "alpha", label: "A–Z" },
                ].map(s => (
                  <button key={s.key} className="mono" onClick={() => setDiarySort(s.key)}
                    style={{
                      padding: "5px 12px", fontSize: 10, borderRadius: 20, cursor: "pointer",
                      background: diarySort === s.key ? `${accent}20` : "transparent",
                      color: diarySort === s.key ? accent : "var(--text-muted)",
                      border: `1px solid ${diarySort === s.key ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
                      transition: "all 0.15s",
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ── Decade filter pills ── */}
              {decades.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {diaryDecade !== null && (
                      <button className="mono" onClick={() => { setDiaryDecade(null); setDiaryYear(null); }}
                        style={{
                          padding: "5px 10px", fontSize: 10, borderRadius: 20, cursor: "pointer",
                          background: "rgba(255,80,80,0.1)", color: "#ff6b6b",
                          border: "1px solid rgba(255,80,80,0.2)", transition: "all 0.15s",
                        }}>
                        × Clear
                      </button>
                    )}
                    {decades.map(d => (
                      <button key={d} className="mono" onClick={() => { setDiaryDecade(diaryDecade === d ? null : d); setDiaryYear(null); }}
                        style={{
                          padding: "5px 10px", fontSize: 10, borderRadius: 20, cursor: "pointer",
                          background: diaryDecade === d ? `${accent}20` : "transparent",
                          color: diaryDecade === d ? accent : "var(--text-faint)",
                          border: `1px solid ${diaryDecade === d ? `${accent}40` : "rgba(255,255,255,0.06)"}`,
                          transition: "all 0.15s",
                        }}>
                        {d}s
                      </button>
                    ))}
                  </div>
                  {diaryDecade !== null && yearsInDecade.length > 1 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      <button className="mono" onClick={() => setDiaryYear(null)}
                        style={{
                          padding: "4px 9px", fontSize: 9, borderRadius: 16, cursor: "pointer",
                          background: diaryYear === null ? `${accent}15` : "transparent",
                          color: diaryYear === null ? accent : "var(--text-faint)",
                          border: `1px solid ${diaryYear === null ? `${accent}30` : "rgba(255,255,255,0.05)"}`,
                        }}>
                        All
                      </button>
                      {yearsInDecade.map(y => (
                        <button key={y} className="mono" onClick={() => setDiaryYear(diaryYear === y ? null : y)}
                          style={{
                            padding: "4px 9px", fontSize: 9, borderRadius: 16, cursor: "pointer",
                            background: diaryYear === y ? `${accent}15` : "transparent",
                            color: diaryYear === y ? accent : "var(--text-faint)",
                            border: `1px solid ${diaryYear === y ? `${accent}30` : "rgba(255,255,255,0.05)"}`,
                          }}>
                          {y}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Rating filter ── */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { key: "rated", label: "Rated" },
                  { key: "unrated", label: "Unrated" },
                  { key: 5, label: "★★★★★" },
                  { key: 4, label: "★★★★" },
                  { key: 3, label: "★★★" },
                  { key: 2, label: "★★" },
                  { key: 1, label: "★" },
                ].map(f => (
                  <button key={f.key} className="mono" onClick={() => setDiaryRatingFilter(diaryRatingFilter === f.key ? null : f.key)}
                    style={{
                      padding: "5px 10px", fontSize: typeof f.key === "number" ? 11 : 10, borderRadius: 20, cursor: "pointer",
                      background: diaryRatingFilter === f.key ? `${accent}20` : "transparent",
                      color: diaryRatingFilter === f.key ? accent : "var(--text-faint)",
                      border: `1px solid ${diaryRatingFilter === f.key ? `${accent}40` : "rgba(255,255,255,0.06)"}`,
                      letterSpacing: typeof f.key === "number" ? 1 : "0.04em",
                      transition: "all 0.15s",
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* ── Empty state ── */}
              {items.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>
                    No matches
                  </div>
                  <button className="mono" onClick={() => { setDiarySearch(""); setDiaryDecade(null); setDiaryYear(null); setDiaryRatingFilter(null); }}
                    style={{
                      padding: "6px 16px", fontSize: 11, borderRadius: 20, cursor: "pointer",
                      background: `${accent}15`, color: accent,
                      border: `1px solid ${accent}30`,
                    }}>
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Grid View */}
              {diaryView === "grid" && items.length > 0 && (() => {
                let gridItems = [...items];
                if (diarySort === "rating" || diarySort === "rating-asc") {
                  gridItems = gridItems.filter(i => i.rating > 0);
                  gridItems.sort((a, b) => diarySort === "rating-asc" ? (a.rating || 0) - (b.rating || 0) : (b.rating || 0) - (a.rating || 0));
                } else if (diarySort === "alpha") {
                  gridItems.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
                } else {
                  gridItems.sort((a, b) => {
                    const dA = new Date(a.watchedAt || a.createdAt || 0);
                    const dB = new Date(b.watchedAt || b.createdAt || 0);
                    return diarySort === "date-asc" ? dA - dB : dB - dA;
                  });
                }
                const totalGrid = gridItems.length;
                const cappedGrid = gridItems.slice(0, diaryLimit);
                return (
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {cappedGrid.map((item, i) => (
                      <div key={i} style={{ cursor: "pointer" }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                        <div style={{
                          aspectRatio: "2/3", borderRadius: 6, overflow: "hidden",
                          border: `1px solid ${accent}12`,
                          background: item.cover ? `url(${item.cover}) center/cover` : "rgba(255,255,255,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {!item.cover && <span style={{ fontSize: 24 }}>{cfg?.icon}</span>}
                        </div>
                        {item.rating > 0 && (
                          <div style={{ fontSize: 10, color: accent, marginTop: 3, letterSpacing: 1 }}>
                            {renderStars(item.rating)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {totalGrid > diaryLimit && (
                    <div style={{ textAlign: "center", paddingTop: 20 }}>
                      <button className="mono" onClick={() => setDiaryLimit(prev => prev + 50)}
                        style={{
                          padding: "8px 20px", fontSize: 11, borderRadius: 20, cursor: "pointer",
                          background: `${accent}12`, color: accent,
                          border: `1px solid ${accent}30`, transition: "all 0.15s",
                        }}>
                        Show more ({totalGrid - diaryLimit} remaining)
                      </button>
                    </div>
                  )}
                </div>
                );
              })()}

              {/* Diary View */}
              {diaryView === "diary" && items.length > 0 && (() => {
                let runningCount = 0;
                const cappedGroups = [];
                for (const group of sortedGroups) {
                  if (runningCount >= diaryLimit) break;
                  const remaining = diaryLimit - runningCount;
                  const slicedItems = group.items.slice(0, remaining);
                  cappedGroups.push({ ...group, items: slicedItems });
                  runningCount += slicedItems.length;
                }
                const totalDiary = sortedGroups.reduce((sum, g) => sum + g.items.length, 0);

                return (
                <div style={{ paddingBottom: 20 }}>
                  {cappedGroups.map((group, gi) => (
                    <div key={gi} style={{ marginBottom: 20 }}>
                      <div style={{
                        fontFamily: t.fontSerif, fontWeight: 700, fontSize: 13,
                        color: `${accent}90`, marginBottom: 10, letterSpacing: "0.04em",
                        paddingBottom: 6,
                        borderBottom: `1px solid ${accent}12`,
                      }}>
                        {group.label}
                      </div>
                      {group.items.map((item, i) => {
                        const day = item._date ? item._date.getDate() : null;
                        return (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}>
                            <div className="mono" style={{ width: 28, fontSize: 13, fontWeight: 600, color: "var(--text-dim)", textAlign: "center", flexShrink: 0 }}>
                              {day || "—"}
                            </div>
                            <div style={{
                              width: 36, height: 54, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                              border: `1px solid ${accent}10`,
                              background: item.cover ? `url(${item.cover}) center/cover` : "rgba(255,255,255,0.06)",
                              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                              {!item.cover && <span style={{ fontSize: 14 }}>{cfg?.icon}</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                              <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.title}
                              </div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>
                                {item.director || ""}{item.year ? ` · ${item.year}` : ""}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: "right" }}>
                              {item.rating > 0 && (
                                <div style={{ fontSize: 11, color: accent, letterSpacing: 1 }}>
                                  {renderStars(item.rating)}
                                </div>
                              )}
                              {item.source === "letterboxd" && (
                                <div style={{ display: "flex", gap: 2, justifyContent: "flex-end", marginTop: 2 }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E054" }} />
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#40BCF4" }} />
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF8000" }} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {totalDiary > diaryLimit && (
                    <div style={{ textAlign: "center", paddingTop: 10 }}>
                      <button className="mono" onClick={() => setDiaryLimit(prev => prev + 50)}
                        style={{
                          padding: "8px 20px", fontSize: 11, borderRadius: 20, cursor: "pointer",
                          background: `${accent}12`, color: accent,
                          border: `1px solid ${accent}30`, transition: "all 0.15s",
                        }}>
                        Show more ({totalDiary - diaryLimit} remaining)
                      </button>
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          </div>
        );
      })()}


      {/* ══ Item Detail Modal (dark) ══ */}
      {viewingItem && (
        <ItemDetailModal
          item={viewingItem}
          session={session}
          profile={profile}
          onClose={() => setViewingItem(null)}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      )}

    </>
  );
}

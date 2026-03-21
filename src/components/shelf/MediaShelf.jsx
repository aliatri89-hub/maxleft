const SHELF_CONFIG = {
  books: { label: "Books", emptyText: "No books yet", modalCat: "book" },
  movies: { label: "Movies", emptyText: "No films yet", modalCat: "movie" },
  shows: { label: "Shows", emptyText: "No shows yet", modalCat: "show" },
  games: { label: "Games", emptyText: "No games yet", modalCat: "game" },
};

function renderStars(rating) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <>
      {"★".repeat(full)}
      {hasHalf && <span style={{ display: "inline-block", width: "0.55em", overflow: "hidden", verticalAlign: "top" }}>★</span>}
    </>
  );
}

// ── Poster width drives everything ──
const PW = 130;
const PH = 190;
const accent = "#EF9F27";

const S = {
  section: { padding: "0 16px", marginBottom: 36 },
  headerWrap: { textAlign: "center", padding: "0 0 18px" },
  sharpieLabel: {
    fontFamily: "'Permanent Marker', cursive",
    fontSize: 22, color: accent,
    letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1,
  },
  sharpieLabelHero: {
    fontFamily: "'Permanent Marker', cursive",
    fontSize: 28, color: accent,
    letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1,
  },
  shelfEdge: {
    height: 1, margin: "10px 0 12px",
    background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
  },
  countRow: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 14, flexWrap: "wrap",
  },
  counter: {
    fontFamily: "var(--font-mono)", fontSize: 11,
    color: "var(--text-faint)", letterSpacing: "0.08em", fontWeight: 400,
  },
  addBtn: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: "var(--font-mono)", fontSize: 11,
    fontWeight: 600, letterSpacing: "0.04em",
    color: "var(--bg-card, #0f0d0b)", background: accent,
    border: "none", borderRadius: 5,
    padding: "5px 12px", cursor: "pointer",
    transition: "opacity 0.15s",
  },
  empty: { textAlign: "center", padding: "40px 16px" },
  emptyText: {
    fontFamily: "var(--font-body)", fontSize: 14,
    color: "var(--text-muted)", fontStyle: "italic",
  },
  itemsRow: {
    display: "flex", gap: 14, overflowX: "auto",
    paddingBottom: 8, paddingTop: 4,
    scrollbarWidth: "none", msOverflowStyle: "none",
  },
  item: { flexShrink: 0, width: PW, cursor: "pointer" },
  coverFrame: {
    width: PW, height: PH, borderRadius: 6,
    border: `1px solid ${accent}22`, background: "rgba(255,255,255,0.02)",
    overflow: "hidden", position: "relative",
    transition: "border-color 0.25s, transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)",
  },
  coverImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  coverPlaceholder: {
    width: "100%", height: "100%",
    background: "rgba(255,255,255,0.04)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: {
    fontFamily: "var(--font-display)", fontSize: 13,
    fontWeight: 600, color: "rgba(255,255,255,0.75)",
    marginTop: 8, lineHeight: 1.25,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  stars: { fontSize: 12, color: "var(--accent-gold)", marginTop: 4, letterSpacing: 1 },
  tag: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    fontWeight: 600, padding: "3px 8px",
    borderRadius: "var(--radius-full)",
    marginTop: 6, display: "inline-block", letterSpacing: "0.04em",
  },
  progress: {
    width: PW, height: 3, borderRadius: 2, marginTop: 6,
    background: "rgba(255,255,255,0.08)", overflow: "hidden",
  },
  syncDot: (active) => ({
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10,
    color: active ? "var(--accent-terra)" : "var(--accent-green)",
  }),
  syncIndicator: (active) => ({
    width: 7, height: 7, borderRadius: "50%",
    background: active ? "var(--accent-terra)" : "var(--accent-green)",
    boxShadow: active ? "none" : "0 0 6px rgba(74,222,128,0.35)",
  }),
  seeAll: {
    textAlign: "center", paddingTop: 16,
    fontFamily: "'Permanent Marker', cursive", fontSize: 14,
    letterSpacing: "0.04em",
    color: `${accent}80`, cursor: "pointer",
  },
};

export default function MediaShelf({ shelfKey, items, profile, onShelfIt, onViewItem, onOpenDiary, letterboxdSyncing, steamSyncing, isHero }) {
  const cfg = SHELF_CONFIG[shelfKey];
  if (!cfg) return null;

  const syncIndicator = shelfKey === "movies" && profile.letterboxd_username ? (
    <span style={S.syncDot(letterboxdSyncing)}>
      <span style={S.syncIndicator(letterboxdSyncing)} />
      <span style={{ fontFamily: "var(--font-mono)" }}>{letterboxdSyncing ? "syncing" : "synced"}</span>
    </span>
  ) : shelfKey === "games" && profile.steam_id ? (
    <span style={S.syncDot(steamSyncing)}>
      <span style={S.syncIndicator(steamSyncing)} />
      <span style={{ fontFamily: "var(--font-mono)" }}>{steamSyncing ? "syncing" : "synced"}</span>
    </span>
  ) : null;

  return (
    <div style={isHero ? { ...S.section, paddingTop: 14 } : S.section}>

      {/* ── Shelf header — sharpie label + centered count + sync ── */}
      <div style={S.headerWrap}>
        <div style={isHero ? S.sharpieLabelHero : S.sharpieLabel}>
          {cfg.label}
        </div>
        <div style={S.shelfEdge} />
        {items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={S.counter}>{items.length} logged</span>
            {syncIndicator}
          </div>
        )}
      </div>

      {/* ── Poster row — tape-sleeve frames ── */}
      {items.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyText}>{cfg.emptyText}</div>
          <button style={{ ...S.addBtn, marginTop: 16 }} onClick={() => onShelfIt(cfg.modalCat)}>+ Add</button>
        </div>
      ) : (
        <>
          <div style={S.itemsRow} className="hide-scrollbar">
            {items.slice(0, 8).map((item, i) => (
              <div style={S.item} key={i} onClick={() => onViewItem({ ...item, shelfType: shelfKey })}>
                <div style={S.coverFrame}>
                  {item.cover ? (
                    <img src={item.cover} alt="" style={S.coverImg} loading="lazy" />
                  ) : (
                    <div style={S.coverPlaceholder} />
                  )}
                </div>
                <div style={S.title}>{item.title}</div>
                {item.isReading ? (
                  <>
                    <div style={{ ...S.tag, background: "var(--accent-green-dim)", color: "var(--accent-green)" }}>Reading</div>
                    {item.totalPages > 0 && (
                      <div style={S.progress}>
                        <div style={{ height: "100%", width: `${Math.min(100, ((item.currentPage || 0) / item.totalPages) * 100)}%`, background: "var(--accent-green)", borderRadius: 2 }} />
                      </div>
                    )}
                  </>
                ) : item.isWatching ? (
                  <>
                    <div style={{ ...S.tag, background: "var(--accent-terra-dim)", color: "var(--accent-terra)" }}>S{item.currentSeason}E{item.currentEpisode}</div>
                    {item.totalEpisodes > 0 && (
                      <div style={S.progress}>
                        <div style={{ height: "100%", width: `${Math.min(100, ((item.episodesWatched || 0) / item.totalEpisodes) * 100)}%`, background: "var(--accent-terra)", borderRadius: 2 }} />
                      </div>
                    )}
                  </>
                ) : item.isPlaying ? (
                  <div style={{ ...S.tag, background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)" }}>Playing</div>
                ) : item.isBeat ? (
                  <div style={{ ...S.tag, background: "var(--accent-green-dim)", color: "var(--accent-green)" }}>Beat</div>
                ) : item.status === "completed" ? (
                  <div style={{ ...S.tag, background: "rgba(255,255,255,0.04)", color: "var(--text-faint)" }}>Backlog</div>
                ) : item.rating ? (
                  <div style={S.stars}>{renderStars(item.rating)}</div>
                ) : null}
              </div>
            ))}

            {/* + Add as last card in the scroll row */}
            <div
              style={{
                flexShrink: 0, width: PW, cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}
              onClick={() => onShelfIt(cfg.modalCat)}
            >
              <div style={{
                width: PW, height: PH, borderRadius: 6,
                border: `1.5px dashed ${accent}30`,
                background: `${accent}06`,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 8, transition: "border-color 0.2s, background 0.2s",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: accent, display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1, color: "var(--bg-card, #0f0d0b)", fontWeight: 700 }}>+</span>
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: `${accent}90`, fontWeight: 600,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>Add</span>
              </div>
            </div>
          </div>

          {/* ── See all / Diary — modern pill row ── */}
          {items.length > 0 && (
            <div style={{
              display: "flex", justifyContent: "flex-end",
              paddingTop: 14, paddingRight: 2,
            }}>
              <div
                onClick={() => onOpenDiary(shelfKey)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  fontWeight: 500, letterSpacing: "0.04em",
                  color: `${accent}cc`,
                  background: `${accent}0a`,
                  border: `1px solid ${accent}20`,
                  borderRadius: 20, padding: "6px 14px",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <span>{items.length > 8 ? `See all ${items.length}` : "Diary"}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const SHELF_CONFIG = {
  books: { icon: "📖", label: "Bookshelf", emptyText: "No books yet", modalCat: "book" },
  movies: { icon: "🎬", label: "Movies", emptyText: "No films yet", modalCat: "movie" },
  shows: { icon: "📺", label: "Shows", emptyText: "No shows yet", modalCat: "show" },
  games: { icon: "🎮", label: "Games", emptyText: "No games yet", modalCat: "game" },
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
const PW = 140;
const PH = 200;

const S = {
  section: { padding: "0 16px", marginBottom: 28 },
  labelRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 0 14px",
  },
  label: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 20, color: "var(--text-primary)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "flex", alignItems: "center", gap: 8,
  },
  count: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--text-faint)", fontWeight: 400,
    letterSpacing: "0.04em",
  },
  addBtn: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-green)", fontWeight: 600,
    cursor: "pointer", letterSpacing: "0.02em",
  },
  empty: {
    textAlign: "center", padding: "40px 16px",
  },
  emptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  emptyText: {
    fontFamily: "var(--font-serif)", fontSize: 14,
    color: "var(--text-muted)", fontStyle: "italic",
  },
  itemsRow: {
    display: "flex", gap: 16, overflowX: "auto",
    paddingBottom: 6,
    scrollbarWidth: "none", msOverflowStyle: "none",
  },
  item: {
    flexShrink: 0, width: PW, cursor: "pointer",
  },
  cover: {
    width: PW, height: PH, borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    backgroundSize: "cover", backgroundPosition: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25), 0 10px 30px rgba(0,0,0,0.2)",
    transition: "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.25s",
  },
  title: {
    fontFamily: "var(--font-display)", fontSize: 13,
    fontWeight: 600, color: "rgba(255,255,255,0.75)",
    marginTop: 10, lineHeight: 1.25,
    overflow: "hidden", textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  stars: {
    fontSize: 12, color: "var(--accent-gold)", marginTop: 3,
    letterSpacing: 1,
  },
  tag: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    fontWeight: 600, padding: "2px 7px",
    borderRadius: "var(--radius-full)",
    marginTop: 5, display: "inline-block",
    letterSpacing: "0.04em",
  },
  progress: {
    width: PW, height: 3, borderRadius: 2, marginTop: 5,
    background: "rgba(255,255,255,0.08)", overflow: "hidden",
  },
  syncDot: (active) => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    marginLeft: 8, fontSize: 10,
    color: active ? "var(--accent-terra)" : "var(--accent-green)",
  }),
  syncIndicator: (active) => ({
    width: 7, height: 7, borderRadius: "50%",
    background: active ? "var(--accent-terra)" : "var(--accent-green)",
    boxShadow: active ? "none" : "0 0 6px rgba(74,222,128,0.35)",
  }),
  seeAll: {
    textAlign: "center", paddingTop: 14,
    fontFamily: "var(--font-display)", fontSize: 14,
    fontWeight: 600, letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.35)", cursor: "pointer",
  },
};

export default function MediaShelf({ shelfKey, items, profile, onShelfIt, onViewItem, onOpenDiary, letterboxdSyncing, steamSyncing }) {
  const cfg = SHELF_CONFIG[shelfKey];
  if (!cfg) return null;

  return (
    <div style={S.section}>
      {/* Header row */}
      <div style={S.labelRow}>
        <div style={S.label}>
          {cfg.icon} {cfg.label}
          {items.length > 0 && <span style={S.count}>{items.length}</span>}
          {shelfKey === "movies" && profile.letterboxd_username && (
            <span style={S.syncDot(letterboxdSyncing)}>
              <span style={S.syncIndicator(letterboxdSyncing)} />
              <span style={{ fontFamily: "var(--font-mono)" }}>{letterboxdSyncing ? "syncing" : "synced"}</span>
            </span>
          )}
          {shelfKey === "games" && profile.steam_id && (
            <span style={S.syncDot(steamSyncing)}>
              <span style={S.syncIndicator(steamSyncing)} />
              <span style={{ fontFamily: "var(--font-mono)" }}>{steamSyncing ? "syncing" : "synced"}</span>
            </span>
          )}
        </div>
        <div style={S.addBtn} onClick={() => onShelfIt(cfg.modalCat)}>+ Add</div>
      </div>

      {/* Posters — no container card, just posters on the page */}
      {items.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>{cfg.icon}</div>
          <div style={S.emptyText}>{cfg.emptyText}</div>
        </div>
      ) : (
        <>
          <div style={S.itemsRow} className="hide-scrollbar">
            {items.slice(0, 8).map((item, i) => (
              <div style={S.item} key={i} onClick={() => onViewItem({ ...item, shelfType: shelfKey })}>
                <div style={item.cover ? { ...S.cover, backgroundImage: `url(${item.cover})` } : S.cover} />
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
                  <div style={{ ...S.tag, background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)" }}>🎮 Playing</div>
                ) : item.isBeat ? (
                  <div style={{ ...S.tag, background: "var(--accent-green-dim)", color: "var(--accent-green)" }}>✓ Beat</div>
                ) : item.status === "completed" ? (
                  <div style={{ ...S.tag, background: "rgba(255,255,255,0.04)", color: "var(--text-faint)" }}>Backlog</div>
                ) : item.rating ? (
                  <div style={S.stars}>{renderStars(item.rating)}</div>
                ) : null}
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div style={S.seeAll} onClick={() => onOpenDiary(shelfKey)}>
              {items.length > 8 ? `See all ${items.length}` : "Diary"} →
            </div>
          )}
        </>
      )}
    </div>
  );
}

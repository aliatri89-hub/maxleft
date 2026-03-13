import { formatDate } from "../../utils/helpers";

const S = {
  section: { padding: "0 16px", marginBottom: 28 },
  sectionBleed: { padding: 0, marginBottom: 28 },
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
  },
  addBtn: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-green)", fontWeight: 600, cursor: "pointer",
  },

  /* ── Empty state ── */
  empty: { textAlign: "center", padding: "40px 16px" },
  emptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  emptyText: {
    fontFamily: "var(--font-serif)", fontSize: 14,
    color: "var(--text-muted)", fontStyle: "italic",
  },
  emptyCta: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--accent-green)", cursor: "pointer", marginTop: 10,
  },

  /* ── Hero trophy (most recent) ── */
  hero: {
    position: "relative",
    overflow: "hidden", cursor: "pointer",
    minHeight: 260,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    marginBottom: 12,
  },
  heroImg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "brightness(0.85) saturate(1.15)",
  },
  heroFallback: {
    position: "absolute", inset: 0,
    background: "rgba(255,255,255,0.03)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 48,
  },
  heroContent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    zIndex: 1, padding: "24px 20px 18px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)",
  },
  heroTitle: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 22, color: "#fff",
    textTransform: "uppercase", letterSpacing: "0.03em",
    lineHeight: 1.15,
    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  heroResult: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-gold)", marginTop: 5,
    fontWeight: 600, letterSpacing: "0.02em",
  },
  heroDate: {
    fontFamily: "var(--font-mono)", fontSize: 11,
    color: "rgba(255,255,255,0.6)", marginTop: 3,
    letterSpacing: "0.04em",
  },

  /* ── Secondary trophies (3-up row) ── */
  row: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  thumb: {
    position: "relative", borderRadius: 10,
    overflow: "hidden", cursor: "pointer",
    aspectRatio: "3/4",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.2)",
  },
  thumbImg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "brightness(0.8) saturate(1.1)",
  },
  thumbFallback: {
    position: "absolute", inset: 0,
    background: "rgba(255,255,255,0.03)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24,
  },
  thumbContent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    zIndex: 1, padding: "16px 10px 10px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 65%, transparent 100%)",
  },
  thumbTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 11, color: "#fff",
    textTransform: "uppercase", letterSpacing: "0.02em",
    lineHeight: 1.2,
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  thumbResult: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    color: "var(--accent-gold)", marginTop: 2,
    fontWeight: 600,
  },
  thumbDate: {
    fontFamily: "var(--font-mono)", fontSize: 8,
    color: "rgba(255,255,255,0.5)", marginTop: 1,
  },

  /* ── See all ── */
  seeAll: {
    textAlign: "center", paddingTop: 14,
    fontFamily: "var(--font-display)", fontSize: 14,
    fontWeight: 600, letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.35)", cursor: "pointer",
  },
};

export default function TrophyShelf({ trophies, onViewEvent, onAddTrophy, onOpenTrophyCase }) {
  if (!trophies) return null;

  const sorted = [...trophies].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  const hero = sorted[0] || null;
  const rest = sorted.slice(1, 4);

  return (
    <div style={S.sectionBleed}>
      <div style={{ padding: "0 16px" }}>
        <div style={S.labelRow}>
          <div style={S.label}>
            🏆 Trophy Case
            {trophies.length > 0 && <span style={S.count}>{trophies.length}</span>}
          </div>
          <div style={S.addBtn} onClick={onAddTrophy}>+ Add</div>
        </div>
      </div>

      {trophies.length === 0 ? (
        <div style={{ padding: "0 16px" }}>
          <div style={S.empty}>
            <div style={S.emptyIcon}>🏆</div>
            <div style={S.emptyText}>Your trophy case is empty</div>
            <div style={S.emptyCta} onClick={onAddTrophy}>Add a trophy</div>
          </div>
        </div>
      ) : (
        <>
          {/* Hero — most recent trophy, full-bleed */}
          {hero && (
            <div style={S.hero} onClick={() => onViewEvent({ ...hero, _isTrophy: true })}>
              {hero.locationImage ? (
                <div style={{ ...S.heroImg, backgroundImage: `url(${hero.locationImage})`, backgroundPosition: `${(hero.photoPosition || "50 50").split(" ").join("% ")}%` }} />
              ) : (
                <div style={S.heroFallback}>{hero.emoji || "🏆"}</div>
              )}
              <div style={S.heroContent}>
                <div style={S.heroTitle}>{hero.title}</div>
                {hero.result && <div style={S.heroResult}>🏅 {hero.result}</div>}
                {hero.completedAt && <div style={S.heroDate}>{formatDate(hero.completedAt)}</div>}
              </div>
            </div>
          )}

          {/* Secondary trophies — 3-up row, padded */}
          {rest.length > 0 && (
            <div style={{ ...S.row, padding: "0 16px" }}>
              {rest.map((item, i) => (
                <div style={S.thumb} key={i} onClick={() => onViewEvent({ ...item, _isTrophy: true })}>
                  {item.locationImage ? (
                    <div style={{ ...S.thumbImg, backgroundImage: `url(${item.locationImage})`, backgroundPosition: `${(item.photoPosition || "50 50").split(" ").join("% ")}%` }} />
                  ) : (
                    <div style={S.thumbFallback}>{item.emoji || "🏆"}</div>
                  )}
                  <div style={S.thumbContent}>
                    <div style={S.thumbTitle}>{item.title}</div>
                    {item.result && <div style={S.thumbResult}>🏅 {item.result}</div>}
                    {item.completedAt && <div style={S.thumbDate}>{formatDate(item.completedAt)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {trophies.length > 4 && (
            <div style={S.seeAll} onClick={onOpenTrophyCase}>See all {trophies.length} →</div>
          )}
        </>
      )}
    </div>
  );
}

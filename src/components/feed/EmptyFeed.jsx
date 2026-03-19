// ════════════════════════════════════════════════
// EMPTY STATE
// ════════════════════════════════════════════════
function EmptyFeed({ onNavigateCommunity }) {
  const starters = [
    {
      emoji: "🎙️",
      label: "Explore a community",
      desc: "Dive into Now Playing, Blank Check, Film Junk, and more — track what each podcast covers.",
      action: () => onNavigateCommunity?.("nowplaying"),
      actionLabel: "Browse communities",
      accent: "#60a5fa",
    },
    {
      emoji: "📽️",
      label: "Log your first film",
      desc: "Watched something recently? Log it, rate it, start building your collection.",
      accent: "var(--accent-terra, #c97c5d)",
    },
    {
      emoji: "📦",
      label: "Import from Letterboxd",
      desc: "Already tracking on Letterboxd? Import your history and hit the ground running.",
      accent: "#34d399",
    },
  ];

  return (
    <div style={{ padding: "40px 16px 20px" }}>
      {/* Welcome header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>📡</div>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19,
          color: "var(--text-primary, #e8ecf4)", marginBottom: 6, lineHeight: 1.3,
        }}>
          Your feed starts here
        </div>
        <div style={{
          fontFamily: "var(--font-body)", fontSize: 13,
          color: "var(--text-muted, #8892a8)", lineHeight: 1.5,
          maxWidth: 280, margin: "0 auto",
        }}>
          Log films, track series, earn badges — everything shows up in your feed.
        </div>
      </div>

      {/* Starter action cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {starters.map((s, i) => (
          <div
            key={i}
            onClick={s.action || undefined}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "16px 18px",
              background: "var(--bg-card, #1a1714)",
              borderRadius: 14,
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.06))",
              cursor: s.action ? "pointer" : "default",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle accent glow */}
            <div style={{
              position: "absolute", top: -20, left: -20,
              width: 80, height: 80, borderRadius: "50%",
              background: s.accent, opacity: 0.06, filter: "blur(30px)",
              pointerEvents: "none",
            }} />

            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${s.accent}15`,
              border: `1px solid ${s.accent}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              {s.emoji}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                color: "var(--text-primary, #e8ecf4)", marginBottom: 2,
              }}>
                {s.label}
              </div>
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 12,
                color: "var(--text-muted, #8892a8)", lineHeight: 1.4,
              }}>
                {s.desc}
              </div>
            </div>

            {s.action && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--text-faint, #5a6480)" strokeWidth="2" strokeLinecap="round"
                style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
-e 
export default EmptyFeed;

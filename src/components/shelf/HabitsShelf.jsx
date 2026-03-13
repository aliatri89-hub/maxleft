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
  },
  trackBtn: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-green)", fontWeight: 600, cursor: "pointer",
  },
};

export default function HabitsShelf({ challengeShelf, onOpenChallenge }) {
  if (!challengeShelf?.habits?.length) return null;

  const allDone = challengeShelf.todayDone >= challengeShelf.habits.length;
  const pct = (challengeShelf.todayDone / challengeShelf.habits.length) * 100;

  return (
    <div style={S.section} onClick={onOpenChallenge} role="button">
      <div style={S.labelRow}>
        <div style={S.label}>🔥 Habits</div>
        <div style={S.trackBtn}>Track →</div>
      </div>

      {/* Today progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: allDone ? "var(--accent-green)" : "var(--accent-terra)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
          {challengeShelf.todayDone}/{challengeShelf.habits.length} today
        </span>
      </div>

      {/* Habit rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {challengeShelf.habits.map(h => (
          <div key={h.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 18, width: 26, textAlign: "center" }}>{h.emoji}</span>
            <span style={{
              fontFamily: "var(--font-body)", fontWeight: 600,
              fontSize: 14, flex: 1, color: "var(--text-secondary)",
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{h.name}</span>
            {h.weekDots && (
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                {h.weekDots.map((status, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: status === "done" ? "var(--accent-green)"
                      : status === "rest" ? "var(--accent-gold)"
                      : status === "today" ? "rgba(74,222,128,0.2)"
                      : status === "future" ? "transparent"
                      : "rgba(233,69,96,0.35)",
                    border: status === "today" ? "1.5px solid var(--accent-green)"
                      : status === "future" ? "1px solid rgba(255,255,255,0.08)"
                      : "none",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
            )}
            {h.streak > 0 ? (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: h.streak >= 7 ? "var(--accent-gold)" : "var(--text-muted)",
                fontWeight: h.streak >= 7 ? 700 : 400, flexShrink: 0,
              }}>
                🔥{h.streak}
              </span>
            ) : (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>—</span>
            )}
          </div>
        ))}
      </div>

      {/* Day counter */}
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 10,
        color: "var(--text-faint)", marginTop: 12,
        textAlign: "center", letterSpacing: "0.05em",
      }}>
        Day {challengeShelf.activeDays}{challengeShelf.bestStreak >= 7 ? ` · Best streak: ${challengeShelf.bestStreak}d 🔥` : ""}
      </div>
    </div>
  );
}

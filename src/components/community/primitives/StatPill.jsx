/**
 * StatPill — Compact stat display with colored dot indicator.
 *
 * Used in community hero sections alongside ProgressRing.
 *
 * Props:
 *   label — text label (e.g., "Seen", "Unseen")
 *   value — display value (e.g., "143/425", 282)
 *   color — dot indicator color
 */
export default function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.04)",
      borderRadius: 20,
      padding: "6px 14px",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: color, flexShrink: 0,
      }} />
      <div style={{ fontSize: 12, color: "#bbb", minWidth: 40 }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: "#fff",
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>{value}</div>
    </div>
  );
}

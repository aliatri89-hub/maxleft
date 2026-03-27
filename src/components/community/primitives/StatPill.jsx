import { t } from "../../../theme";
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
      background: t.bgElevated,
      borderRadius: 20,
      padding: "6px 14px",
      border: `1px solid ${t.borderSubtle}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: color, flexShrink: 0,
      }} />
      <div style={{ fontSize: 12, color: t.textSecondary, minWidth: 40 }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: t.textPrimary,
        fontFamily: t.fontDisplay,
      }}>{value}</div>
    </div>
  );
}

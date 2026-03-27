import { t } from "../../../theme";
/**
 * CyclePill — 3-state media filter pill (solo / hide / all / dimmed)
 *
 * States:
 *   "all"    — neutral, full opacity
 *   "solo"   — highlighted, colored border/background
 *   "hide"   — strikethrough, dimmed
 *   "dimmed" — dimmed (another type is solo'd, this one is a bystander)
 *
 * Used by community hero components to cycle media filters.
 */
export default function CyclePill({ label, value, color, state, onClick, readOnly }) {
  const isHidden = state === "hide";
  const isDimmed = state === "dimmed";
  const isSolo = state === "solo";

  return (
    <div
      onClick={readOnly ? undefined : onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: isSolo ? `${color}15` : (isHidden || isDimmed) ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        borderRadius: 20, padding: "6px 14px",
        border: isSolo
          ? `1px solid ${color}44`
          : isHidden
            ? "1px solid rgba(255,255,255,0.03)"
            : `1px solid ${t.borderSubtle}`,
        cursor: readOnly ? "default" : "pointer",
        transition: "all 0.2s",
        opacity: (isHidden || isDimmed) ? 0.35 : 1,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
      }}
    >
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: isHidden ? t.textFaint : color,
        flexShrink: 0, transition: "background 0.2s",
        boxShadow: isSolo ? `0 0 6px ${color}60` : "none",
      }} />
      <div style={{ fontSize: 12, color: isHidden ? t.textFaint : isSolo ? "#ccc" : t.textMuted, minWidth: 40 }}>
        {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: isHidden ? t.textFaint : t.textPrimary,
        fontFamily: t.fontDisplay,
        textDecoration: isHidden ? "line-through" : "none",
        transition: "color 0.2s",
      }}>
        {value}
      </div>
    </div>
  );
}

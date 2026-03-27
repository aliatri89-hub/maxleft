import { t } from "../theme";
/**
 * InitialAvatar — colored circle with username initial.
 * Deterministic color based on username hash so it's consistent across sessions.
 *
 * Usage: <InitialAvatar username="ali" size={32} />
 * Drop in anywhere you'd show the 👤 fallback.
 */

const PALETTE = [
  "#E06C75", // rose
  "#E5C07B", // gold
  "#61AFEF", // sky
  "#C678DD", // violet
  "#56B6C2", // teal
  "#98C379", // sage
  "#D19A66", // amber
  "#BE5046", // terra
  "#7C8FA6", // slate
  "#C75B3F", // mantl terracotta
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export default function InitialAvatar({ username, size = 32, style = {} }) {
  const letter = (username || "?")[0].toUpperCase();
  const color = PALETTE[hashCode(username || "?") % PALETTE.length];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: t.fontDisplay,
      fontWeight: 800,
      fontSize: size * 0.48,
      color: t.textPrimary,
      textTransform: "uppercase",
      letterSpacing: "0.02em",
      lineHeight: 1,
      flexShrink: 0,
      userSelect: "none",
      ...style,
    }}>
      {letter}
    </div>
  );
}

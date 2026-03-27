import { t } from "../../../theme";
/**
 * ProgressRing — Shared SVG progress ring used across community tabs.
 *
 * Displays a circular progress indicator with percentage text.
 * Turns green at 100% with glow effect.
 *
 * Props:
 *   pct    — percentage (0–100)
 *   accent — theme color for the ring stroke
 *   size   — diameter in px (default 110)
 */
export default function ProgressRing({ pct, accent, size = 110 }) {
  const strokeWidth = size >= 100 ? 7 : 6;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2 - (size >= 100 ? 4 : 2);
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const isComplete = pct >= 100;
  const color = isComplete ? t.green : accent;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={accent} strokeWidth={strokeWidth} opacity={0.12}
        />
        {pct > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: isComplete ? "drop-shadow(0 0 4px rgba(74,222,128,0.4))" : "none",
            }}
          />
        )}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontSize: size >= 100 ? 26 : 20,
          fontWeight: 800,
          color: isComplete ? t.green : t.textPrimary,
          fontFamily: t.fontDisplay,
          lineHeight: 1,
        }}>{Math.round(pct)}%</div>
        <div style={{
          fontSize: 9, color: t.textSecondary,
          marginTop: 2, letterSpacing: "0.04em",
        }}>{isComplete ? "complete!" : "seen"}</div>
      </div>
    </div>
  );
}

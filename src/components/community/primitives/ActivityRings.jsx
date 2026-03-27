import { t } from "../../../theme";
/**
 * ActivityRings — Concentric SVG donut rings for community hero sections.
 *
 * Renders 1–3 rings depending on which media types are active:
 *   outer  → films (always present)
 *   middle → books (when bookPct is non-null)
 *   inner  → games or commentary (when gamePct is non-null)
 *
 * Turns green at 100% with glow effect.
 *
 * Props:
 *   filmPct     — film completion percentage (0–100), always shown
 *   bookPct     — book completion percentage, or null to hide ring
 *   gamePct     — game/commentary completion percentage, or null to hide ring
 *   displayPct  — the number shown in the center (usually filmPct)
 *   ringColors  — optional [filmColor, bookColor, gameColor] override
 *                 defaults to ["#e94560", "#facc15", "#a78bfa"]
 */
export default function ActivityRings({ filmPct, bookPct, gamePct, displayPct, ringColors }) {
  const strokeWidth = 7;
  const gap = 4;
  const size = 130;
  const cx = size / 2;
  const cy = size / 2;

  const hasBooks = bookPct !== null;
  const hasGames = gamePct !== null;

  const colors = ringColors || ["#e94560", "#facc15", "#a78bfa"];

  const outerR = 52;
  const rings = [{ r: outerR, pct: filmPct, color: colors[0] }];

  if (hasBooks && hasGames) {
    const middleR = outerR - strokeWidth - gap;
    const innerR = middleR - strokeWidth - gap;
    rings.push({ r: middleR, pct: bookPct, color: colors[1] });
    rings.push({ r: innerR, pct: gamePct, color: colors[2] });
  } else if (hasBooks) {
    rings.push({ r: outerR - strokeWidth - gap, pct: bookPct, color: colors[1] });
  } else if (hasGames) {
    rings.push({ r: outerR - strokeWidth - gap, pct: gamePct, color: colors[2] });
  }

  const isComplete = displayPct >= 100;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => (
          <Ring
            key={i}
            cx={cx} cy={cy} r={ring.r}
            pct={ring.pct}
            strokeWidth={strokeWidth}
            color={ring.color}
            bgOpacity={0.12}
          />
        ))}
      </svg>

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontSize: 26, fontWeight: 800,
          color: isComplete ? t.green : t.textPrimary,
          fontFamily: t.fontDisplay,
          lineHeight: 1,
        }}>
          {displayPct}%
        </div>
        <div style={{
          fontSize: 9, color: t.textSecondary,
          marginTop: 2, letterSpacing: "0.04em",
        }}>
          {isComplete ? "complete!" : "seen"}
        </div>
      </div>
    </div>
  );
}

/* ── Single ring arc ─────────────────────────────────────── */

function Ring({ cx, cy, r, pct, strokeWidth, color, bgOpacity }) {
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const isComplete = pct >= 100;

  return (
    <>
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth} opacity={bgOpacity}
      />
      {pct > 0 && (
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={isComplete ? t.green : color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: isComplete ? "drop-shadow(0 0 4px rgba(74,222,128,0.4))" : "none",
          }}
        />
      )}
    </>
  );
}

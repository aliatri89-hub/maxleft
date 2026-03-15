/**
 * StarRating — Reusable half-star rating input for dark theme.
 * Supports tap on left/right half of each star for 0.5 increments.
 * Tap the same value to clear back to 0.
 *
 * Props:
 *   value       — number (0–5, supports .5 increments)
 *   onChange    — (newValue: number) => void
 *   size        — "sm" | "md" | "lg" (default "md")
 *   label       — string (optional, e.g. "Your Rating")
 *   showValue   — boolean (default true) — show "3.5 / 5" text
 *   disabled    — boolean (default false)
 *   color       — string (default "#facc15") — star color when active
 *
 * Usage:
 *   <StarRating value={rating} onChange={setRating} />
 *   <StarRating value={rating} onChange={setRating} size="lg" label="Rate This Film" />
 */
export default function StarRating({
  value = 0,
  onChange,
  size = "md",
  label,
  showValue = true,
  disabled = false,
  color = "#facc15",
}) {
  const sizes = {
    sm: { star: 24, font: 20, gap: 1, labelSize: 9 },
    md: { star: 36, font: 28, gap: 2, labelSize: 10 },
    lg: { star: 44, font: 34, gap: 4, labelSize: 11 },
  };
  const s = sizes[size] || sizes.md;

  const handleClick = (starNum, isLeftHalf) => {
    if (disabled) return;
    const newVal = isLeftHalf ? starNum - 0.5 : starNum;
    onChange(value === newVal ? 0 : newVal);
  };

  return (
    <div>
      {label && (
        <div style={{
          fontSize: s.labelSize,
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}>
          {label}
        </div>
      )}

      <div style={{
        display: "flex",
        gap: s.gap,
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
      }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isFull = value >= n;
          const isHalf = !isFull && value >= n - 0.5;
          return (
            <div
              key={n}
              style={{
                fontSize: s.font,
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: s.star,
                height: s.star,
                cursor: disabled ? "default" : "pointer",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                color: isFull || isHalf ? color : "#444",
              }}
            >
              {/* Left half zone */}
              <div
                onClick={() => handleClick(n, true)}
                style={{
                  position: "absolute",
                  top: 0, bottom: 0, left: 0,
                  width: "50%",
                  zIndex: 1,
                }}
              />
              {/* Right half zone */}
              <div
                onClick={() => handleClick(n, false)}
                style={{
                  position: "absolute",
                  top: 0, bottom: 0, right: 0,
                  width: "50%",
                  zIndex: 1,
                }}
              />
              {isFull ? "★" : isHalf ? (
                <span style={{ position: "relative", display: "inline-block", width: "1em", height: "1em" }}>
                  <span style={{ position: "absolute", inset: 0, color, overflow: "hidden", width: "0.5em" }}>★</span>
                  <span style={{ position: "absolute", inset: 0, color: "#444" }}>☆</span>
                </span>
              ) : "☆"}
            </div>
          );
        })}

        {showValue && value > 0 && (
          <span style={{
            fontSize: s.labelSize + 2,
            color,
            marginLeft: 8,
            fontWeight: 600,
          }}>
            {value} / 5
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * CommunityLoadingScreen — VHS-branded loading screen per community.
 * Shows community name + M▶NTL play button in community accent color.
 *
 * Props:
 *   slug  — community slug (used to look up name + accent color)
 */

const COMMUNITY_BRANDS = {
  "nowplaying":    { name: "Now Playing Podcast", accent: "#F5C518" },
  "blankcheck":    { name: "Blank Check",         accent: "#8B5CF6" },
  "bigpicture":    { name: "The Big Picture",     accent: "#00A86B" },
  "filmjunk":      { name: "Film Junk",           accent: "#78C044" },
  "hdtgm":         { name: "HDTGM",               accent: "#4A9BB5" },
  "filmspotting":  { name: "Filmspotting",        accent: "#475569" },
  "rewatchables":  { name: "The Rewatchables",    accent: "#1DB954" },
  "chapo":         { name: "Movie Mindset",       accent: "#D32F2F" },
  "getplayed":     { name: "Get Played",          accent: "#e91e8c" },
};

const DEFAULT_BRAND = { name: "MANTL", accent: "#C4734F" };

export default function CommunityLoadingScreen({ slug }) {
  const brand = COMMUNITY_BRANDS[slug] || DEFAULT_BRAND;
  const { name, accent } = brand;
  const isDefault = !COMMUNITY_BRANDS[slug];

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };
  const rgb = hexToRgb(accent);

  const uid = `cl-${slug || "default"}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0d0b",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }} />

      {/* Community name */}
      {!isDefault && (
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: accent,
          position: "relative",
          zIndex: 1,
          marginBottom: 14,
          opacity: 0,
          animation: `${uid}-up 0.5s ease forwards`,
        }}>
          {name}
        </div>
      )}

      {/* M▶NTL wordmark */}
      <div style={{
        display: "flex",
        alignItems: "center",
        opacity: 0,
        position: "relative",
        zIndex: 1,
        animation: `${uid}-up 0.5s ease 0.15s forwards`,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontSize: 48,
          lineHeight: 0.85, letterSpacing: "0.02em",
          color: "#f5f0eb",
        }}>M</span>

        {/* VHS play button */}
        <div style={{
          position: "relative",
          width: 33, height: 37,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 -1px",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `rgba(${rgb},0.1)`,
            border: `1.5px solid rgba(${rgb},0.25)`,
            borderRadius: 4,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3)",
          }} />
          <div style={{
            width: 0, height: 0,
            borderStyle: "solid",
            borderWidth: "9px 0 9px 16px",
            borderColor: `transparent transparent transparent ${accent}`,
            marginLeft: 3,
            position: "relative", zIndex: 1,
            animation: `${uid}-glow 2.5s ease-in-out 0.8s infinite`,
          }} />
        </div>

        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontSize: 48,
          lineHeight: 0.85, letterSpacing: "0.02em",
          color: "#f5f0eb",
        }}>NTL</span>
      </div>

      {/* Accent line */}
      <div style={{
        height: 3,
        background: accent,
        borderRadius: 2,
        marginTop: 8,
        width: 0,
        position: "relative",
        zIndex: 1,
        animation: `${uid}-line 0.6s ease 0.35s forwards`,
      }} />

      {/* Tagline */}
      <div style={{
        fontFamily: "'Lora', serif",
        fontStyle: "italic",
        fontSize: 13,
        color: "#8a7e72",
        marginTop: 18,
        letterSpacing: "0.02em",
        position: "relative",
        zIndex: 1,
        opacity: 0,
        animation: `${uid}-up 0.5s ease 0.55s forwards`,
      }}>
        {isDefault ? "Another reason to press play" : "Loading..."}
      </div>

      <style>{`
        @keyframes ${uid}-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ${uid}-line {
          from { width: 0; }
          to   { width: 52px; }
        }
        @keyframes ${uid}-glow {
          0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 4px rgba(${rgb},0.15)); }
          50%      { opacity: 1; filter: drop-shadow(0 0 10px rgba(${rgb},0.35)); }
        }
      `}</style>
    </div>
  );
}

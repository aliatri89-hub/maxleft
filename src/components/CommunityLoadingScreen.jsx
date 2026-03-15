/**
 * CommunityLoadingScreen — branded loading screen per community.
 * Uses the play-button animation from the app splash, tinted to each community's accent.
 *
 * Props:
 *   slug  — community slug (used to look up name + accent color)
 */

const COMMUNITY_BRANDS = {
  "nowplaying":    { name: "Now Playing Podcast", accent: "#F5C518" },
  "blankcheck":    { name: "Blank Check",         accent: "#8B5CF6" },
  "bigpicture":    { name: "The Big Picture",     accent: "#e94560" },
  "filmjunk":      { name: "Film Junk",           accent: "#78C044" },
  "hdtgm":         { name: "HDTGM",               accent: "#4A9BB5" },
  "filmspotting":  { name: "Filmspotting",        accent: "#4ade80" },
  "rewatchables":  { name: "The Rewatchables",    accent: "#1DB954" },
  "chapo":         { name: "Movie Mindset",       accent: "#D32F2F" },
  "getplayed":     { name: "Get Played",          accent: "#e91e8c" },
};

const DEFAULT_BRAND = { name: "Community", accent: "#C4734F" };

export default function CommunityLoadingScreen({ slug }) {
  const brand = COMMUNITY_BRANDS[slug] || DEFAULT_BRAND;
  const { name, accent } = brand;

  // Build rgba versions for ring/ripple
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };
  const rgb = hexToRgb(accent);

  const uniqueId = `cl-${slug || "default"}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Community name */}
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: 28,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "#f5f0eb",
        opacity: 0,
        animation: `${uniqueId}-up 0.5s ease forwards`,
      }}>
        {name}
      </div>

      {/* Accent line */}
      <div style={{
        height: 3,
        background: accent,
        borderRadius: 2,
        marginTop: 6,
        width: 0,
        animation: `${uniqueId}-line 0.6s ease 0.2s forwards`,
      }} />

      {/* Play button */}
      <div style={{
        position: "relative",
        width: 48,
        height: 48,
        marginTop: 32,
        opacity: 0,
        animation: `${uniqueId}-up 0.5s ease 0.4s forwards`,
      }}>
        {/* Ripple */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `1.5px solid rgba(${rgb},0.25)`,
          animation: `${uniqueId}-ripple 2s ease-out 0.9s infinite`,
        }} />
        {/* Ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `2px solid rgba(${rgb},0.35)`,
          animation: `${uniqueId}-ring 2s ease-in-out 0.9s infinite`,
        }} />
        {/* Button */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: `rgba(${rgb},0.12)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Triangle */}
          <div style={{
            width: 0, height: 0,
            borderStyle: "solid",
            borderWidth: "8px 0 8px 14px",
            borderColor: `transparent transparent transparent ${accent}`,
            marginLeft: 3,
            opacity: 0.85,
            animation: `${uniqueId}-glow 2s ease-in-out 0.9s infinite`,
          }} />
        </div>
      </div>

      <style>{`
        @keyframes ${uniqueId}-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ${uniqueId}-line {
          from { width: 0; }
          to   { width: 44px; }
        }
        @keyframes ${uniqueId}-ring {
          0%, 100% { border-color: rgba(${rgb},0.2); transform: scale(1); }
          50%      { border-color: rgba(${rgb},0.5); transform: scale(1.06); }
        }
        @keyframes ${uniqueId}-ripple {
          0%   { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes ${uniqueId}-glow {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

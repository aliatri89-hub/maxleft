/**
 * ListenOnBadges — Podcast platform deep links (Spotify, Apple, Podbean, Patreon, etc.)
 *
 * Each community passes its own platforms config. The component renders
 * the appropriate icon + label for each platform.
 *
 * Props:
 *   title         — item title (used to build search URLs)
 *   communityName — podcast name (used in search query)
 *   platforms     — array of { type, url? } where type is "spotify"|"apple"|"podbean"|"patreon"
 *                   For "patreon", url is required. For search-based platforms, url is auto-built.
 *   isPatreon     — if true, shows the patreon badge (legacy compat — or use platforms with type:"patreon")
 *   compact       — smaller sizing for inline usage
 */

// ── Platform icon SVGs ───────────────────────────────────────

const PLATFORM_ICONS = {
  spotify: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1DB954">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  apple: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#A855F7">
      <path d="M5.34 0A5.328 5.328 0 000 5.34v13.32A5.328 5.328 0 005.34 24h13.32A5.328 5.328 0 0024 18.66V5.34A5.328 5.328 0 0018.66 0H5.34zm6.525 2.568c2.336 0 4.448.902 6.056 2.587 1.224 1.272 1.912 2.619 2.264 4.392.12.6-.12 1.2-.6 1.5-.48.3-1.14.18-1.5-.3-.18-.36-.24-.78-.36-1.14-.36-1.2-.96-2.16-1.92-2.94-1.32-1.08-2.82-1.5-4.5-1.26-2.28.36-3.84 1.62-4.8 3.66-.36.78-.54 1.62-.54 2.52 0 1.56.42 2.94 1.38 4.2.3.36.3.96 0 1.32-.36.36-.96.42-1.32.06-.42-.36-.78-.78-1.08-1.26-.9-1.38-1.32-2.94-1.38-4.62-.06-2.1.54-3.96 1.8-5.58 1.56-2.04 3.66-3.18 6.48-3.12zm.12 4.32c1.44.06 2.7.6 3.72 1.68.78.84 1.2 1.8 1.38 2.94.06.6-.24 1.08-.78 1.26-.54.12-1.08-.12-1.26-.72-.12-.36-.18-.72-.36-1.08-.6-1.2-1.62-1.74-2.94-1.74-1.62.06-2.76.84-3.3 2.4-.18.48-.24 1.02-.18 1.56.06.66.18 1.32.48 1.92.06.12.12.3.12.42.06.54-.18 1.02-.66 1.2-.54.18-1.08 0-1.32-.48-.42-.84-.66-1.74-.78-2.7-.18-1.56.18-2.94 1.02-4.2.96-1.38 2.34-2.22 4.02-2.46.3-.06.54-.06.84-.06zm-.12 4.44c1.26 0 2.22 1.02 2.22 2.22 0 .9-.54 1.62-1.32 2.01l.48 4.38c.06.54-.36 1.02-.9 1.08h-.96c-.54-.06-.96-.54-.9-1.08l.48-4.38c-.78-.42-1.32-1.14-1.32-2.01.02-1.2.98-2.22 2.22-2.22z"/>
    </svg>
  ),
  podbean: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#6CBB3C">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6c4.638 0 8.4 3.762 8.4 8.4 0 4.638-3.762 8.4-8.4 8.4-4.638 0-8.4-3.762-8.4-8.4 0-4.638 3.762-8.4 8.4-8.4zm0 2.4a6 6 0 100 12 6 6 0 000-12zm0 2.4a3.6 3.6 0 110 7.2 3.6 3.6 0 010-7.2z"/>
    </svg>
  ),
  patreon: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF424D">
      <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
    </svg>
  ),
};

const PLATFORM_LABELS = {
  spotify: "Spotify",
  apple: "Apple",
  podbean: "Podbean",
  patreon: "Patreon",
};

export default function ListenOnBadges({ title, communityName, platforms = [], isPatreon, compact }) {
  const shortName = communityName.split(/\s+with\s+/i)[0] || communityName;
  const searchQuery = encodeURIComponent(`${shortName} ${title}`);

  // Build URLs for search-based platforms
  const getUrl = (platform) => {
    if (platform.url) return platform.url;
    switch (platform.type) {
      case "spotify": return `https://open.spotify.com/search/${searchQuery}`;
      case "apple": return `https://podcasts.apple.com/search?term=${searchQuery}`;
      case "podbean": return `https://www.podbean.com/premium-podcast/nowplayingpodcast`;
      default: return "#";
    }
  };

  const badgeStyle = compact ? {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    textDecoration: "none",
    transition: "background 0.15s",
    WebkitTapHighlightColor: "transparent",
  } : {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    textDecoration: "none",
    transition: "background 0.15s",
    WebkitTapHighlightColor: "transparent",
  };

  const labelStyle = {
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    whiteSpace: "nowrap",
  };

  const iconSize = compact ? 12 : 16;

  // Filter: only show patreon badge when isPatreon is true
  const visiblePlatforms = platforms.filter(p =>
    p.type !== "patreon" || isPatreon
  );

  return (
    <div style={{ marginTop: compact ? 8 : 0, marginBottom: compact ? 0 : 14 }}>
      {!compact && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: "#888",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 8,
        }}>Listen On</div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {visiblePlatforms.map((platform) => {
          const Icon = PLATFORM_ICONS[platform.type];
          const label = platform.label || PLATFORM_LABELS[platform.type] || platform.type;
          const url = getUrl(platform);
          if (!Icon) return null;

          return (
            <a key={platform.type} href={url} target="_blank" rel="noopener noreferrer" style={badgeStyle}>
              <Icon size={iconSize} />
              <span style={labelStyle}>{label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

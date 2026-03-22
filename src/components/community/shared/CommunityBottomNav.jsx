/**
 * CommunityBottomNav — fixed bottom tab bar for multi-page communities.
 *
 * Uses the same .nav-bar / .nav-item / .nav-icon / .nav-label CSS classes
 * as the main app navbar. Community accent is piped through --nav-accent.
 *
 * Props:
 *   tabs        – array: [{ key, label, icon? }]
 *   activeTab   – current tab key
 *   onTabChange – callback(key)
 *   accent      – community accent color (e.g. "#e94560")
 */

// ── SVG Icon Map ────────────────────────────────────────────
// All icons: 20×20, viewBox 0 0 24 24, stroke="currentColor"

const ICON_SVG = {
  filmography: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2"/>
      <line x1="2" y1="8" x2="22" y2="8"/>
      <line x1="7" y1="3" x2="7" y2="8"/>
      <line x1="12" y1="3" x2="12" y2="8"/>
      <line x1="17" y1="3" x2="17" y2="8"/>
    </svg>
  ),
  lists: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  awards: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H3V4h3"/><path d="M18 9h3V4h-3"/>
      <path d="M6 4h12v7a6 6 0 0 1-12 0V4z"/>
      <line x1="12" y1="17" x2="12" y2="20"/>
      <line x1="8" y1="20" x2="16" y2="20"/>
    </svg>
  ),
  playalong: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="12" rx="2"/>
      <circle cx="9" cy="14" r="2"/>
      <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/>
      <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
    </svg>
  ),
  gameslop: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14l-2 12H7L5 7z"/>
      <path d="M4 7h16"/>
      <path d="M10 11v4"/><path d="M14 11v4"/>
    </svg>
  ),
  genre: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  arcade: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <circle cx="9" cy="12" r="3"/>
      <line x1="9" y1="10" x2="9" y2="14"/>
      <line x1="7" y1="12" x2="11" y2="12"/>
      <circle cx="16" cy="10.5" r="1" fill="currentColor" stroke="none"/>
      <circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),
  books: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/>
    </svg>
  ),
  patreon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18V6a2 2 0 0 1 2-2h4a5 5 0 0 1 0 10H5"/>
      <circle cx="18" cy="8" r="3"/>
      <line x1="3" y1="22" x2="3" y2="18"/>
    </svg>
  ),
  drafts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
};

// Map common emojis to key names
const EMOJI_TO_KEY = {
  "🎬": "filmography",
  "📋": "lists",
  "🏆": "awards",
  "🎮": "playalong",
  "🪣": "gameslop",
  "🎧": "patreon",
};

// Fallback icon
const FALLBACK_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

function getIcon(tabKey, iconStr) {
  if (ICON_SVG[tabKey]) return ICON_SVG[tabKey];
  const mappedKey = EMOJI_TO_KEY[iconStr];
  if (mappedKey && ICON_SVG[mappedKey]) return ICON_SVG[mappedKey];
  return FALLBACK_ICON;
}

export default function CommunityBottomNav({ tabs, activeTab, onTabChange, accent = "#e94560" }) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <div className="nav-bar" style={{ "--nav-accent": accent }}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            className={`nav-item${isActive ? " active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            <div className="nav-icon">
              {getIcon(tab.key, tab.icon)}
            </div>
            <div className="nav-label">{tab.label}</div>
          </button>
        );
      })}
    </div>
  );
}

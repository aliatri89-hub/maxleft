import { useMemo } from "react";

/**
 * CommunityBottomNav — fixed bottom tab bar for multi-page communities.
 * 
 * Props:
 *   tabs     – array from theme_config.tabs: [{ key, label, icon }]
 *   activeTab – current tab key
 *   onTabChange(key) – callback
 *   accent   – community accent color (e.g. "#e94560")
 */

const DEFAULT_ICONS = {
  filmography: "🎬",
  patreon: "🎧",
  awards: "🏆",
};

export default function CommunityBottomNav({ tabs, activeTab, onTabChange, accent = "#e94560" }) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      zIndex: 50,
      background: "rgba(10,10,20,0.92)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "6px 0 4px",
        maxWidth: 480,
        margin: "0 auto",
      }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const icon = tab.icon || DEFAULT_ICONS[tab.key] || "📌";

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                position: "relative",
              }}
            >
              {/* Active indicator line */}
              {isActive && (
                <div style={{
                  position: "absolute",
                  top: -1,
                  left: "20%",
                  right: "20%",
                  height: 2,
                  borderRadius: 1,
                  background: accent,
                  boxShadow: `0 0 8px ${accent}40`,
                }} />
              )}

              <div style={{
                fontSize: 18,
                lineHeight: 1,
                filter: isActive ? "none" : "grayscale(0.6)",
                opacity: isActive ? 1 : 0.5,
                transition: "all 0.2s",
              }}>
                {icon}
              </div>

              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? accent : "rgba(255,255,255,0.35)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                transition: "color 0.2s",
                whiteSpace: "nowrap",
              }}>
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

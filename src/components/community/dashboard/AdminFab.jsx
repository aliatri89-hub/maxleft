import { useState } from "react";

/**
 * AdminFab — Floating admin menu button.
 *
 * Tap to expand a mini-menu with admin actions.
 * Only renders if the current user is in the admin list.
 *
 * Props:
 *   userId       – current session user id
 *   accent       – community accent color
 *   onAddItem    – () => void — open the AddItemTool
 *   onRSSSync    – () => void — open the RSSSyncTool (optional)
 *   bottomOffset – pixels from bottom (default 80, above bottom nav)
 */

const ADMIN_IDS = [
  "19410e64-d610-4fab-9c26-d24fafc94696", // ali
];

export default function AdminFab({ userId, accent = "#e94560", onAddItem, onRSSSync, bottomOffset = 80 }) {
  const [open, setOpen] = useState(false);

  if (!userId || !ADMIN_IDS.includes(userId)) return null;

  const actions = [
    { key: "add", label: "Add Item", icon: "＋", onClick: onAddItem },
    ...(onRSSSync ? [{ key: "rss", label: "RSS Sync", icon: "📡", onClick: onRSSSync }] : []),
  ];

  // If only one action, skip the menu — just fire directly
  if (actions.length === 1) {
    return (
      <button
        onClick={actions[0].onClick}
        aria-label={actions[0].label}
        style={fabStyle(accent, bottomOffset)}
      >
        {actions[0].icon}
      </button>
    );
  }

  return (
    <>
      {/* Backdrop when menu is open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 49, background: "transparent" }}
        />
      )}

      {/* Action buttons (fly out above FAB) */}
      {open && actions.map((action, idx) => (
        <button
          key={action.key}
          onClick={() => { setOpen(false); action.onClick(); }}
          style={{
            position: "fixed", right: 16,
            bottom: bottomOffset + 60 + idx * 52,
            zIndex: 51, height: 40, borderRadius: 20,
            background: "#1e1e2a",
            border: `1.5px solid ${accent}60`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            color: "#fff", fontSize: 12, fontWeight: 700,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.03em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 14px 0 10px", cursor: "pointer",
            animation: `fab-pop 0.15s ease ${idx * 0.05}s both`,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 16 }}>{action.icon}</span>
          {action.label}
        </button>
      ))}

      {/* Main FAB button */}
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="Admin menu"
        style={{
          ...fabStyle(accent, bottomOffset),
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease, box-shadow 0.15s",
        }}
      >
        ＋
      </button>

      <style>{`
        @keyframes fab-pop {
          from { transform: scale(0.5) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function fabStyle(accent, bottomOffset) {
  return {
    position: "fixed", right: 16, bottom: bottomOffset, zIndex: 50,
    width: 52, height: 52, borderRadius: "50%",
    background: accent, border: "none",
    boxShadow: `0 4px 20px ${accent}60, 0 2px 8px rgba(0,0,0,0.4)`,
    color: "#fff", fontSize: 26, fontWeight: 300,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", WebkitTapHighlightColor: "transparent",
  };
}

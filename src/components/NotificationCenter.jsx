import { useEffect } from "react";
import { tapLight } from "../utils/haptics";

/**
 * NotificationCenter — right slide panel showing notification inbox.
 * Groups notifications by day (Today, Yesterday, date).
 * Tapping a notification calls onNavigate with the payload for routing.
 * Marks all as seen on open via onOpen callback.
 *
 * Uses .notif-panel CSS classes (already defined in App.css + shell-dark.css).
 */
export default function NotificationCenter({ notifications, onClose, onNavigate, onOpen }) {
  // Mark all seen on mount
  useEffect(() => {
    onOpen?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = groupByDay(notifications);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 299,
          animation: "notifFadeIn 0.2s ease",
        }}
      />

      {/* Panel */}
      <div className="notif-panel">
        {/* Header */}
        <div className="notif-panel-header" style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}>
          <div className="notif-panel-title">Notifications</div>
          <div className="notif-panel-close" onClick={onClose}>✕</div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {notifications.length === 0 ? (
            <div style={{
              padding: "48px 20px",
              textAlign: "center",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: "var(--text-faint)",
              letterSpacing: "0.04em",
            }}>
              No notifications yet
            </div>
          ) : (
            grouped.map(({ label, items }) => (
              <div key={label}>
                {/* Day header */}
                <div style={{
                  padding: "12px 20px 6px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--text-faint)",
                }}>
                  {label}
                </div>

                {items.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item${!notif.seen_at ? " unread" : ""}`}
                    onClick={() => {
                      tapLight();
                      onNavigate(notif.payload);
                      onClose();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Avatar / artwork */}
                    <div className="notif-item-avatar">
                      {notif.image_url ? (
                        <img src={notif.image_url} alt="" />
                      ) : (
                        notifIcon(notif.notif_type)
                      )}
                    </div>

                    {/* Text */}
                    <div className="notif-item-text">
                      {notif.body}
                    </div>

                    {/* Time */}
                    <div className="notif-item-time">
                      {relativeTime(notif.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes notifFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ── Helpers ──

function notifIcon(type) {
  switch (type) {
    case "new_coverage":
    case "watched_coverage":
      return "🎧";
    case "badge_earned":
      return "🏆";
    case "badge_progress":
      return "📊";
    case "badge_digest":
      return "🎯";
    case "episode_drop":
      return "🎙️";
    default:
      return "🔔";
  }
}

function relativeTime(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(notifications) {
  const groups = new Map();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  for (const notif of notifications) {
    const dateStr = new Date(notif.created_at).toDateString();
    let label;
    if (dateStr === todayStr) label = "Today";
    else if (dateStr === yesterdayStr) label = "Yesterday";
    else label = new Date(notif.created_at).toLocaleDateString("en-US", {
      month: "long", day: "numeric",
    });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(notif);
  }

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

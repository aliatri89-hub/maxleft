import { t } from "../theme";
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
              fontFamily: t.fontBody,
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
                  fontFamily: t.fontBody,
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
                        <img loading="lazy" src={notif.image_url} alt="" />
                      ) : (
                        notifIcon(notif.notif_type)
                      )}
                    </div>

                    {/* Text */}
                    <div className="notif-item-text">
                      {notif.title && (
                        <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 13 }}>
                          {notif.title}
                        </div>
                      )}
                      <div style={{ opacity: notif.title ? 0.65 : 1 }}>
                        {notif.body}
                      </div>
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
  const s = { width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case "new_coverage":
    case "watched_coverage":
      return <svg viewBox="0 0 24 24" style={s}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>;
    case "badge_earned":
      return <svg viewBox="0 0 24 24" style={s}><path d="M6 9a6 6 0 1 0 12 0A6 6 0 0 0 6 9z"/><path d="M12 15l-3.5 6.5L12 19l3.5 2.5L12 15z"/></svg>;
    case "badge_progress":
    case "badge_digest":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z"/></svg>;
    case "episode_drop":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
    default:
      return <svg viewBox="0 0 24 24" style={s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
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

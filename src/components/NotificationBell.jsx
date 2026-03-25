import { tapLight } from "../utils/haptics";

/**
 * NotificationBell — bell icon with unread badge.
 * Uses .notif-bell CSS classes (already defined in App.css + shell-dark.css).
 */
export default function NotificationBell({ unreadCount, onClick }) {
  return (
    <div
      className="notif-bell"
      onClick={() => { tapLight(); onClick(); }}
    >
      <span className="notif-bell-icon">
        <svg viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </span>
      {unreadCount > 0 && (
        <span className="notif-bell-badge">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </div>
  );
}

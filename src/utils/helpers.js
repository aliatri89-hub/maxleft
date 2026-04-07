// ─── SHARED HELPERS ──────────────────────────────────────────

/**
 * Convert a date-only string (e.g. "2026-03-15") to a full ISO timestamp.
 * If the date is today → use the current time (so same-day logs sort correctly).
 * If the date is in the past → use noon UTC (we only have date precision).
 */
export const toLogTimestamp = (dateStr) => {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return new Date().toISOString();
  return new Date(dateStr + "T12:00:00Z").toISOString();
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function fmtDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

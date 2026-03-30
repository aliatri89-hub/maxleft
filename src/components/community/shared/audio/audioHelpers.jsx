/**
 * audioHelpers.jsx
 * Pure constants and utility functions for the audio player.
 * No state, no hooks, no side effects.
 */

import { t } from "../../../../theme";

// ── Constants ────────────────────────────────────────────────

export { t };

export const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
export const STORAGE_KEY = "mantl_audio_state";
export const RECENTS_KEY = "mantl_audio_recents";
export const ACCENT = "#F5C518";
export const SAVE_INTERVAL = 5000;
export const BOOKMARK_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
export const MAX_RECENTS = 20;
export const SLEEP_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "End of episode", minutes: -1 },
];
export const STALL_TIMEOUT = 15000; // 15s before showing stall error

// ── Text helpers ─────────────────────────────────────────────

export function stripHtml(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, "")
    .trim();
}

// Markers that signal promo content
export const PROMO_RE =
  /\b(Join our Patreon|Follow us|Be sure to (?:follow|subscribe)|Learn more about your ad|Thanks to our SPONSOR|This episode is (?:brought to you|sponsored)|Go to hdtgm|Watch this episode on)/i;

// Markers that signal the start of shownotes / useful content after promos
export const SHOWNOTES_RE =
  /\b(Shownotes|Show notes|Timestamps|Weekly Plugs|What we.ve been watching|Featured Review|Chapters|Segments|Topics)/i;

export function cleanDescription(raw) {
  if (!raw) return null;
  let text = stripHtml(raw);

  const promoMatch = PROMO_RE.exec(text);
  if (promoMatch) {
    const before = text.slice(0, promoMatch.index).trim();
    const after = text.slice(promoMatch.index);

    const shownotesMatch = SHOWNOTES_RE.exec(after);
    const hasTimecodes = /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(after);

    if (shownotesMatch) {
      text = before + "\n\n" + after.slice(shownotesMatch.index).trim();
    } else if (hasTimecodes) {
      text = before + "\n\n" + after.trim();
    } else {
      text = before;
    }
  }

  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

// ── Timecode helpers ─────────────────────────────────────────

export const TIMECODE_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g;

export function parseTimecodeSeconds(match) {
  const parts = match.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

/**
 * Parse timecodes (e.g. 1:23:45, 45:30) in text and return React elements
 * with tappable spans that call onSeek(seconds).
 */
export function renderWithTimecodes(text, onSeek) {
  if (!text || !onSeek) return text;
  const parts = [];
  let last = 0;
  let m;
  const re = new RegExp(TIMECODE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const sec = parseTimecodeSeconds(m[0]);
    const tc = m[0];
    parts.push(
      <span
        key={`tc-${m.index}`}
        onClick={(e) => { e.stopPropagation(); onSeek(sec); }}
        style={{
          color: ACCENT,
          fontFamily: t.fontMono,
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "underline",
          textDecorationColor: `${ACCENT}44`,
          textUnderlineOffset: 2,
        }}
      >
        {tc}
      </span>
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ── Time formatting ──────────────────────────────────────────

export function fmt(sec) {
  if (!sec || !isFinite(sec)) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

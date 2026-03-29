/**
 * decodeEntities.js
 *
 * Decodes HTML entities commonly found in RSS feed text.
 * Used ONLY for display-layer data (episode titles, descriptions).
 * NEVER use on movie/game titles that flow into sync or dedup logic.
 */

const ENTITY_MAP = {
  "&amp;":  "&",
  "&lt;":   "<",
  "&gt;":   ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;":  "'",
  "&#x27;": "'",
  "&#38;":  "&",
  "&#60;":  "<",
  "&#62;":  ">",
  "&#34;":  '"',
};

const ENTITY_RE = /&(?:amp|lt|gt|quot|apos|#39|#x27|#38|#60|#62|#34);/gi;

export default function decodeEntities(str) {
  if (!str || typeof str !== "string") return str;
  return str.replace(ENTITY_RE, (match) => ENTITY_MAP[match.toLowerCase()] || match);
}

// ─── STATIC DATA & CONSTANTS ─────────────────────────────────

export const DEFAULT_ENABLED_SHELVES = { passport: true, books: true, movies: true, shows: true, games: true };
export const DEFAULT_SHELF_ORDER = ["passport", "books", "movies", "shows", "games"];

export const VISIT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const formatVisitDate = (month, year) => {
  if (month && year) return `${VISIT_MONTHS[month - 1]} ${year}`;
  if (year) return `${year}`;
  if (month) return VISIT_MONTHS[month - 1];
  return "";
};

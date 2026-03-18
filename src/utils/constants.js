// ─── STATIC DATA & CONSTANTS ─────────────────────────────────

export const DEFAULT_ENABLED_SHELVES = { passport: true, books: true, movies: true, shows: true, games: true };
export const DEFAULT_SHELF_ORDER = ["passport", "books", "movies", "shows", "games"];

export const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

export const GROUP_TYPE_CONFIG = {
  bookclub: { emoji: "📖", label: "Book Club", shelves: ["books"] },
  watchparty: { emoji: "🎬", label: "Watch Party", shelves: ["movies", "shows"] },
};

export const VISIT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const formatVisitDate = (month, year) => {
  if (month && year) return `${VISIT_MONTHS[month - 1]} ${year}`;
  if (year) return `${year}`;
  if (month) return VISIT_MONTHS[month - 1];
  return "";
};

// ─── FIVESEVEN CHALLENGE CONSTANTS ──────────────────────────
export const HABITS = [
  { id: 1, name: "Train for an Event", sub: "45 min · train for something real", icon: "🏁" },
  { id: 3, name: "No Alcohol", sub: "Zero drinks today", icon: "🍷" },
  { id: 4, name: "Read", sub: "10 pages", icon: "📖" },
  { id: 5, name: "Meditate", sub: "5 minutes", icon: "🧘" },
  { id: 6, name: "Follow a Diet", sub: "Your rules", icon: "🥗" },
  { id: 7, name: "Learn", sub: "15 min · whatever moves you", icon: "🎓" },
];

export const TIERS = [
  { name: "Overachiever", pct: 110, icon: "💎" },
  { name: "Complete", pct: 100, icon: "🏆" },
  { name: "So Close", pct: 80, icon: "🔥" },
  { name: "Building", pct: 50, icon: "🧱" },
  { name: "Fresh Start", pct: 0, icon: "🌱" },
];

export const getTargetDays = (activeDays) => Math.ceil(activeDays * 5 / 7);
export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

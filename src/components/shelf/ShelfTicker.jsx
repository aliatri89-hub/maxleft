import { useState, useEffect, useRef, useMemo } from "react";

/**
 * ShelfTicker — airport-arrivals-board style stat ticker
 * Cycles through dynamic micro-stats derived from shelf data.
 * Sits at the top of the shelf tab as a lightweight visual anchor.
 */

function getThisMonthCount(items, dateField) {
  if (!items?.length) return 0;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return items.filter((it) => {
    const d = it[dateField];
    if (!d) return false;
    const dt = new Date(d);
    return dt.getFullYear() === y && dt.getMonth() === m;
  }).length;
}

export default function ShelfTicker({ shelves, shelvesLoaded, profile }) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState("in");
  const timerRef = useRef(null);

  // ── Build stat lines from shelf data ──
  const stats = useMemo(() => {
    if (!shelvesLoaded) return [];
    const lines = [];

    // Totals (only non-zero)
    const movies = (shelves.movies || []).length;
    const books = (shelves.books || []).filter((b) => !b.isReading).length;
    const games = (shelves.games || []).length;
    const shows = (shelves.shows || []).length;

    if (movies) lines.push(`${movies} film${movies !== 1 ? "s" : ""} logged`);
    if (books) lines.push(`${books} book${books !== 1 ? "s" : ""} read`);
    if (games) lines.push(`${games} game${games !== 1 ? "s" : ""} tracked`);
    if (shows) lines.push(`${shows} show${shows !== 1 ? "s" : ""} tracked`);

    // This month
    const filmsThisMonth = getThisMonthCount(shelves.movies, "watchedAt");
    const booksThisMonth = getThisMonthCount(
      (shelves.books || []).filter((b) => !b.isReading),
      "finishedAt"
    );
    if (filmsThisMonth > 0)
      lines.push(
        `${filmsThisMonth} film${filmsThisMonth !== 1 ? "s" : ""} this month`
      );
    if (booksThisMonth > 0)
      lines.push(
        `${booksThisMonth} book${booksThisMonth !== 1 ? "s" : ""} this month`
      );

    // Currently active
    const reading = (shelves.books || []).find((b) => b.isReading);
    const watching = (shelves.shows || []).find((s) => s.isWatching);
    const playing = (shelves.games || []).find((g) => g.isPlaying);

    if (reading) lines.push(`Reading: ${reading.title}`);
    if (watching) lines.push(`Watching: ${watching.title}`);
    if (playing) lines.push(`Playing: ${playing.title}`);

    return lines;
  }, [shelves, shelvesLoaded]);

  // ── Cycle timer ──
  useEffect(() => {
    if (stats.length <= 1) return;
    timerRef.current = setInterval(() => {
      setFade("out");
      setTimeout(() => {
        setIndex((i) => (i + 1) % stats.length);
        setFade("in");
      }, 350);
    }, 3400);
    return () => clearInterval(timerRef.current);
  }, [stats.length]);

  // Reset index if stats change
  useEffect(() => {
    setIndex(0);
  }, [stats.length]);

  if (!shelvesLoaded || stats.length === 0) return null;

  return (
    <div
      style={{
        padding: "18px 20px 14px",
        textAlign: "center",
      }}
    >
      {/* Greeting */}
      {profile?.username && (
        <div
          style={{
            fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
            fontWeight: 800,
            fontSize: 22,
            color: "var(--text-primary, #fff)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 6,
            lineHeight: 1.2,
          }}
        >
          {profile.username}'s shelf
        </div>
      )}

      {/* Ticker line */}
      <div
        style={{
          height: 22,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          key={index}
          style={{
            fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted, rgba(255,255,255,0.5))",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: fade === "in" ? 1 : 0,
            transform: fade === "in" ? "translateY(0)" : "translateY(-8px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
        >
          {stats[index]}
        </div>
      </div>

      {/* Subtle divider */}
      <div
        style={{
          height: 1,
          marginTop: 12,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        }}
      />
    </div>
  );
}

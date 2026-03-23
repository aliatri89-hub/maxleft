// src/features/reel-time/ReelTime.jsx
//
// Full-screen overlay game. Rendered by App.jsx when showReelTime === true.
// Props: session, onBack, onToast
//
import { useState, useCallback } from "react";
import { useReelTime } from "./useReelTime";
import { getPuzzleNumber } from "./reelTimeApi";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getMonthDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// ── Styles ──────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh", background: "#0f0d0b", color: "#f5f0e8",
    fontFamily: "'Special Elite', monospace",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "0 16px 40px", overflow: "auto", WebkitOverflowScrolling: "touch",
  },
  backBtn: {
    position: "absolute", top: 16, left: 16, width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", zIndex: 10, background: "none", border: "none", padding: 0,
  },
  header: {
    textAlign: "center", padding: "20px 0 16px", width: "100%", maxWidth: 420,
    position: "relative",
  },
  title: {
    fontFamily: "'Permanent Marker', cursive", fontSize: 13,
    letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6b", marginBottom: 4,
  },
  year: {
    fontFamily: "'Permanent Marker', cursive", fontSize: 44,
    color: "#f5f0e8", lineHeight: 1, textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
  },
  subtitle: {
    fontFamily: "'Permanent Marker', cursive", fontSize: 11,
    color: "#7cb8e8", marginTop: 4, letterSpacing: 2,
  },
  scoreBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    width: "100%", maxWidth: 420, padding: "10px 16px",
    background: "rgba(124,184,232,0.06)", border: "1px solid rgba(124,184,232,0.12)",
    borderRadius: 8, marginBottom: 16, fontSize: 13,
  },
  scoreLabel: { color: "#8a7e6b" },
  scoreValue: { fontFamily: "'Permanent Marker', cursive", fontSize: 18, color: "#7cb8e8" },
  currentCard: {
    width: "100%", maxWidth: 420, marginBottom: 20,
    animation: "rt-slide-down 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  currentInner: {
    display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
    background: "linear-gradient(135deg, rgba(124,184,232,0.10), rgba(124,184,232,0.03))",
    border: "2px dashed rgba(124,184,232,0.5)", borderRadius: 10,
  },
  currentPoster: {
    width: 52, height: 78, borderRadius: 4, objectFit: "cover",
    flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
  },
  currentLabel: {
    fontSize: 10, textTransform: "uppercase", letterSpacing: 2,
    color: "#7cb8e8", marginBottom: 3,
  },
  currentTitle: {
    fontFamily: "'Permanent Marker', cursive", fontSize: 18,
    color: "#f5f0e8", lineHeight: 1.2,
  },
  currentPrompt: { fontSize: 12, color: "#8a7e6b", marginTop: 5 },
  timeline: { width: "100%", maxWidth: 420, position: "relative" },
  timelineLine: {
    position: "absolute", left: 38, top: 0, bottom: 0, width: 2,
    background: "rgba(124,184,232,0.15)",
  },
  slot: (active) => ({
    position: "relative", height: 44, display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", marginLeft: 30, borderRadius: 8,
    border: `2px dashed ${active ? "rgba(124,184,232,0.5)" : "transparent"}`,
    background: active ? "rgba(124,184,232,0.04)" : "transparent",
    transition: "all 0.15s ease",
  }),
  slotLabel: (active) => ({
    fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5,
    color: active ? "#7cb8e8" : "transparent", transition: "color 0.15s ease",
  }),
  slotDisabled: { height: 8, marginLeft: 30 },
  placed: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
    marginLeft: 6, position: "relative",
  },
  dot: {
    width: 12, height: 12, borderRadius: "50%", background: "#7cb8e8",
    flexShrink: 0, zIndex: 1, marginLeft: 24, boxShadow: "0 0 6px rgba(124,184,232,0.3)",
  },
  placedPoster: {
    width: 40, height: 60, borderRadius: 3, objectFit: "cover",
    flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },
  placedTitle: {
    fontFamily: "'Permanent Marker', cursive", fontSize: 14,
    color: "#f5f0e8", flex: 1, lineHeight: 1.2,
  },
  placedDate: { fontSize: 11, color: "#7cb8e8", flexShrink: 0, whiteSpace: "nowrap" },
  flash: (correct) => ({
    position: "fixed", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    fontFamily: "'Permanent Marker', cursive", fontSize: 48, zIndex: 100,
    pointerEvents: "none", color: correct ? "#4caf50" : "#e74c3c",
    textShadow: `0 0 30px ${correct ? "rgba(76,175,80,0.5)" : "rgba(231,76,60,0.5)"}`,
    animation: "rt-flash 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
  }),
  gameover: {
    width: "100%", maxWidth: 420, textAlign: "center", padding: "28px 20px",
    background: "rgba(124,184,232,0.05)", border: "1px solid rgba(124,184,232,0.12)",
    borderRadius: 12, marginBottom: 20, animation: "rt-fade-in 0.5s ease",
  },
  gameoverLabel: {
    fontSize: 11, textTransform: "uppercase", letterSpacing: 3, color: "#8a7e6b", marginBottom: 6,
  },
  gameoverScore: {
    fontFamily: "'Permanent Marker', cursive", fontSize: 52, color: "#7cb8e8", lineHeight: 1,
  },
  gameoverMax: { fontSize: 13, color: "#8a7e6b", marginTop: 4 },
  gameoverMsg: { fontSize: 15, color: "#f5f0e8", marginTop: 14, lineHeight: 1.5 },
  shareBtn: {
    marginTop: 18, padding: "11px 28px", background: "#7cb8e8", color: "#0f0d0b",
    border: "none", borderRadius: 8, fontFamily: "'Permanent Marker', cursive",
    fontSize: 15, cursor: "pointer",
  },
  nextTimer: { fontSize: 12, color: "#8a7e6b", marginTop: 10 },
  loading: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0f0d0b", color: "#8a7e6b", fontFamily: "'Special Elite', monospace",
    fontSize: 15,
  },
  errorWrap: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#0f0d0b",
    color: "#8a7e6b", fontFamily: "'Special Elite', monospace", fontSize: 15,
    padding: 32, textAlign: "center",
  },
  placementDots: {
    display: "flex", gap: 6, justifyContent: "center", marginTop: 10,
  },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Special+Elite&display=swap');
@keyframes rt-slide-down { from { opacity: 0; transform: translateY(-24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes rt-flash { 0% { opacity: 0; transform: translate(-50%,-50%) scale(0.5); } 20% { opacity: 1; transform: translate(-50%,-50%) scale(1.1); } 60% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(0.8) translateY(-20px); } }
@keyframes rt-fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
`;

// ── Component ────────────────────────────────────────────────

export default function ReelTime({ session, onBack, onToast }) {
  const userId = session?.user?.id;
  const {
    puzzle, result, loading, error, hasPlayed,
    placedMovies, currentMovie, currentMovieIndex, currentPlacementNum,
    score, maxScore, totalPlacements, placementResults, gamePhase, lastPlacement,
    placeMovie, getShareText, getTimeUntilNext, getPlacementValue,
  } = useReelTime(userId);

  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const text = getShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        onToast?.("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      });
    } else if (navigator.share) {
      navigator.share({ text });
    }
  }, [getShareText, onToast]);

  // Loading
  if (loading) {
    return (
      <div style={S.loading}>
        <style>{CSS}</style>
        Loading puzzle...
      </div>
    );
  }

  // Error
  if (error || !puzzle) {
    return (
      <div style={S.errorWrap}>
        <style>{CSS}</style>
        <div>{error || "No puzzle available."}</div>
        <button onClick={onBack} style={{ ...S.shareBtn, marginTop: 20 }}>Back</button>
      </div>
    );
  }

  const puzzleNum = getPuzzleNumber(puzzle.date);
  const diffStars = "★".repeat(puzzle.difficulty);
  const timeUntil = getTimeUntilNext();
  const isPlaying = gamePhase === "playing";
  const isDone = gamePhase === "done";

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* Back button */}
      <button onClick={onBack} style={S.backBtn}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M13 4L7 10L13 16" stroke="#8a7e6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>Reel Time #{puzzleNum}</div>
        <div style={S.year}>{puzzle.year}</div>
        <div style={S.subtitle}>{diffStars} &nbsp; {puzzle.movieCount} films</div>
      </div>

      {/* Score bar */}
      <div style={S.scoreBar}>
        <span style={S.scoreLabel}>
          {isDone ? "Final Score" : `Film ${Math.min(currentMovieIndex + 1, puzzle.movies.length)} of ${puzzle.movies.length}`}
        </span>
        <span style={S.scoreValue}>{isDone ? (result?.score ?? score) : score} / {maxScore}</span>
      </div>

      {/* Current movie card */}
      {isPlaying && currentMovie && (
        <div style={S.currentCard} key={currentMovie.id}>
          <div style={S.currentInner}>
            {currentMovie.poster && (
              <img style={S.currentPoster} src={currentMovie.poster} alt={currentMovie.title}
                onError={(e) => { e.target.style.display = "none"; }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={S.currentLabel}>Place this film</div>
              <div style={S.currentTitle}>{currentMovie.title}</div>
              <div style={S.currentPrompt}>Worth {getPlacementValue(currentPlacementNum)} pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Game over */}
      {isDone && (
        <div style={S.gameover}>
          <div style={S.gameoverLabel}>Game Over</div>
          <div style={S.gameoverScore}>{result?.score ?? score}</div>
          <div style={S.gameoverMax}>out of {maxScore} points</div>
          <div style={S.placementDots}>
            {placementResults.map((r, i) => (
              <div key={i} style={{
                width: 16, height: 16, borderRadius: 4,
                background: r ? "#4caf50" : "#e74c3c",
                opacity: 0.8,
              }} />
            ))}
          </div>
          <div style={S.gameoverMsg}>
            {(result?.perfect || placementResults.every(Boolean))
              ? "Perfect timeline. You nailed every placement."
              : (result?.score ?? score) >= maxScore * 0.7
                ? "Nice work, solid timeline instincts."
                : "Tough one! Come back tomorrow."}
          </div>
          <button onClick={handleShare} style={S.shareBtn}>
            {copied ? "Copied!" : "Share Result"}
          </button>
          <div style={S.nextTimer}>
            Next puzzle in {timeUntil.hours}h {timeUntil.minutes}m
          </div>
        </div>
      )}

      {/* Result flash */}
      {lastPlacement && (
        <div style={S.flash(lastPlacement.correct)} key={lastPlacement.movieId + lastPlacement.correct}>
          {lastPlacement.correct ? `+${lastPlacement.points}` : "✗"}
        </div>
      )}

      {/* Timeline */}
      <div style={S.timeline}>
        <div style={S.timelineLine} />

        {placedMovies.map((movie, i) => (
          <div key={`row-${movie.id}`}>
            {/* Slot before */}
            {isPlaying ? (
              <div
                style={S.slot(hoveredSlot === i)}
                onClick={() => placeMovie(i)}
                onMouseEnter={() => setHoveredSlot(i)}
                onMouseLeave={() => setHoveredSlot(null)}
                onTouchStart={() => setHoveredSlot(i)}
                onTouchEnd={() => { placeMovie(i); setHoveredSlot(null); }}
              >
                <span style={S.slotLabel(hoveredSlot === i)}>Place here</span>
              </div>
            ) : (
              <div style={S.slotDisabled} />
            )}

            {/* Placed movie */}
            <div style={S.placed}>
              <div style={S.dot} />
              {movie.poster && (
                <img style={S.placedPoster} src={movie.poster} alt={movie.title}
                  onError={(e) => { e.target.style.display = "none"; }} />
              )}
              <span style={S.placedTitle}>{movie.title}</span>
              <span style={S.placedDate}>{movie.display_date || getMonthDay(movie.release_date)}</span>
            </div>
          </div>
        ))}

        {/* Final slot after last movie */}
        {isPlaying ? (
          <div
            style={S.slot(hoveredSlot === placedMovies.length)}
            onClick={() => placeMovie(placedMovies.length)}
            onMouseEnter={() => setHoveredSlot(placedMovies.length)}
            onMouseLeave={() => setHoveredSlot(null)}
            onTouchStart={() => setHoveredSlot(placedMovies.length)}
            onTouchEnd={() => { placeMovie(placedMovies.length); setHoveredSlot(null); }}
          >
            <span style={S.slotLabel(hoveredSlot === placedMovies.length)}>Place here</span>
          </div>
        ) : (
          <div style={S.slotDisabled} />
        )}
      </div>
    </div>
  );
}

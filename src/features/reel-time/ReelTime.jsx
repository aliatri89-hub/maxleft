// src/features/reel-time/ReelTime.jsx
//
// Full-screen overlay game. Rendered by App.jsx when showReelTime === true.
// Props: session, onBack, onToast
//
import { useState, useCallback, useRef, useEffect } from "react";
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
    fontFamily: "'IBM Plex Mono', monospace",
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
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
    letterSpacing: 3, textTransform: "uppercase", color: "#8a7e6b", marginBottom: 4,
  },
  year: {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 2,
    color: "#f5f0e8", lineHeight: 1, textShadow: "2px 2px 0 rgba(0,0,0,0.5)",
  },
  subtitle: {
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
    color: "#7cb8e8", marginTop: 4, letterSpacing: 2,
  },
  scoreBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    width: "100%", maxWidth: 420, padding: "10px 16px",
    background: "rgba(124,184,232,0.06)", border: "1px solid rgba(124,184,232,0.12)",
    borderRadius: 8, marginBottom: 16, fontSize: 13,
  },
  scoreLabel: { color: "#8a7e6b" },
  scoreValue: { fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: "#7cb8e8" },

  // Current movie card — static position (fades when dragging)
  currentCard: {
    width: "100%", maxWidth: 420, marginBottom: 20,
    animation: "rt-slide-down 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  currentInner: {
    display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
    background: "linear-gradient(135deg, rgba(124,184,232,0.10), rgba(124,184,232,0.03))",
    border: "2px dashed rgba(124,184,232,0.5)", borderRadius: 10,
    userSelect: "none", touchAction: "none",
  },
  currentPoster: {
    width: 52, height: 78, borderRadius: 4, objectFit: "cover",
    flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  },
  currentLabel: {
    fontSize: 10, textTransform: "uppercase", letterSpacing: 2,
    color: "#7cb8e8", marginBottom: 3,
  },
  currentTitle: {
    fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18,
    color: "#f5f0e8", lineHeight: 1.2,
  },
  currentPrompt: { fontSize: 12, color: "#8a7e6b", marginTop: 5 },

  // Drag ghost — follows finger
  dragGhost: (x, y) => ({
    position: "fixed", left: 0, top: 0,
    transform: `translate(${x}px, ${y}px) scale(1.04)`,
    width: "calc(100% - 48px)", maxWidth: 404,
    zIndex: 200, pointerEvents: "none",
    opacity: 0.92, filter: "drop-shadow(0 8px 24px rgba(124,184,232,0.35))",
    marginLeft: 24,
  }),

  timeline: { width: "100%", maxWidth: 420, position: "relative" },
  timelineLine: {
    position: "absolute", left: 38, top: 0, bottom: 0, width: 2,
    background: "rgba(124,184,232,0.15)",
  },
  slot: (active, dragOver) => ({
    position: "relative", height: dragOver ? 56 : 44,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", marginLeft: 30, borderRadius: 8,
    border: `2px dashed ${(active || dragOver) ? "rgba(124,184,232,0.6)" : "rgba(124,184,232,0.12)"}`,
    background: dragOver
      ? "rgba(124,184,232,0.12)"
      : active ? "rgba(124,184,232,0.04)" : "transparent",
    transition: "all 0.2s ease",
  }),
  slotLabel: (active, dragOver) => ({
    fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5,
    color: (active || dragOver) ? "#7cb8e8" : "rgba(124,184,232,0.25)",
    transition: "color 0.15s ease",
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
    fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14,
    color: "#f5f0e8", flex: 1, lineHeight: 1.2,
  },
  placedDate: { fontSize: 11, color: "#7cb8e8", flexShrink: 0, whiteSpace: "nowrap" },
  timelineLabel: {
    display: "flex", flexDirection: "column", alignItems: "center",
    fontSize: 10, textTransform: "uppercase", letterSpacing: 2,
    color: "rgba(124,184,232,0.4)", fontFamily: "'IBM Plex Mono', monospace",
    padding: "6px 0", marginLeft: 30,
  },
  flash: (correct) => ({
    position: "fixed", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, letterSpacing: 2, zIndex: 100,
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
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 60, letterSpacing: 2, color: "#7cb8e8", lineHeight: 1,
  },
  gameoverMax: { fontSize: 13, color: "#8a7e6b", marginTop: 4 },
  gameoverMsg: { fontSize: 15, color: "#f5f0e8", marginTop: 14, lineHeight: 1.5 },
  shareBtn: {
    marginTop: 18, padding: "11px 28px", background: "#7cb8e8", color: "#0f0d0b",
    border: "none", borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
    fontSize: 15, cursor: "pointer",
  },
  nextTimer: { fontSize: 12, color: "#8a7e6b", marginTop: 10 },
  loading: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0f0d0b", color: "#8a7e6b", fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 15,
  },
  errorWrap: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#0f0d0b",
    color: "#8a7e6b", fontFamily: "'IBM Plex Mono', monospace", fontSize: 15,
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

  const [copied, setCopied] = useState(false);

  // ── Drag state ──
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [activeSlot, setActiveSlot] = useState(null);
  const slotRefs = useRef([]);
  const cardRef = useRef(null);
  const timelineRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Keep slot refs array sized
  const slotCount = placedMovies.length + 1;
  useEffect(() => {
    slotRefs.current = slotRefs.current.slice(0, slotCount);
  }, [slotCount]);

  // Find closest slot to a Y coordinate — returns null if above timeline (cancel zone)
  const findActiveSlot = useCallback((clientY) => {
    // Cancel zone: if finger is above the timeline, don't target any slot
    const tlRect = timelineRef.current?.getBoundingClientRect();
    if (tlRect && clientY < tlRect.top) return null;

    let closest = null;
    let closestDist = Infinity;
    for (let i = 0; i < slotRefs.current.length; i++) {
      const el = slotRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    return closest;
  }, []);

  // ── Touch drag ──
  const onTouchStart = useCallback((e) => {
    if (gamePhase !== "playing" || !currentMovie) return;
    const touch = e.touches[0];
    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    dragOffsetRef.current = {
      x: touch.clientX - cardRect.left,
      y: touch.clientY - cardRect.top,
    };
    setDragPos({
      x: touch.clientX - dragOffsetRef.current.x,
      y: touch.clientY - dragOffsetRef.current.y,
    });
    setIsDragging(true);
    setActiveSlot(findActiveSlot(touch.clientY));
  }, [gamePhase, currentMovie, findActiveSlot]);

  const onTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    setDragPos({
      x: touch.clientX - dragOffsetRef.current.x,
      y: touch.clientY - dragOffsetRef.current.y,
    });
    setActiveSlot(findActiveSlot(touch.clientY));
  }, [isDragging, findActiveSlot]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (activeSlot !== null) {
      placeMovie(activeSlot);
    }
    setActiveSlot(null);
  }, [isDragging, activeSlot, placeMovie]);

  // ── Mouse drag (desktop) ──
  const onMouseDown = useCallback((e) => {
    if (gamePhase !== "playing" || !currentMovie) return;
    e.preventDefault();
    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    dragOffsetRef.current = {
      x: e.clientX - cardRect.left,
      y: e.clientY - cardRect.top,
    };
    setDragPos({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
    setIsDragging(true);
    setActiveSlot(findActiveSlot(e.clientY));
  }, [gamePhase, currentMovie, findActiveSlot]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      setDragPos({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
      setActiveSlot(findActiveSlot(e.clientY));
    };
    const onUp = () => {
      setIsDragging(false);
      setActiveSlot((slot) => {
        if (slot !== null) placeMovie(slot);
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, findActiveSlot, placeMovie]);

  // Tap fallback
  const handleSlotTap = useCallback((slotIndex) => {
    if (isDragging || gamePhase !== "playing") return;
    placeMovie(slotIndex);
  }, [isDragging, gamePhase, placeMovie]);

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
  const diffStars = "\u2605".repeat(puzzle.difficulty);
  const timeUntil = getTimeUntilNext();
  const isPlaying = gamePhase === "playing";
  const isDone = gamePhase === "done";

  const renderSlot = (index) => {
    if (!isPlaying) return <div style={S.slotDisabled} />;
    const isDragOver = isDragging && activeSlot === index;
    return (
      <div
        ref={(el) => { slotRefs.current[index] = el; }}
        style={S.slot(false, isDragOver)}
        onClick={() => handleSlotTap(index)}
      >
        <span style={S.slotLabel(false, isDragOver)}>
          {isDragOver ? "Drop here" : "Tap to place"}
        </span>
      </div>
    );
  };

  return (
    <div
      style={S.page}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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

      {/* Current movie card — fades when dragging */}
      {isPlaying && currentMovie && (
        <div
          style={{
            ...S.currentCard,
            opacity: isDragging ? 0.25 : 1,
            transition: "opacity 0.15s ease",
          }}
          key={currentMovie.id}
        >
          <div
            ref={cardRef}
            style={S.currentInner}
            onTouchStart={onTouchStart}
            onMouseDown={onMouseDown}
          >
            {currentMovie.poster && (
              <img style={S.currentPoster} src={currentMovie.poster} alt={currentMovie.title}
                onError={(e) => { e.target.style.display = "none"; }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={S.currentLabel}>Drag to place</div>
              <div style={S.currentTitle}>{currentMovie.title}</div>
              <div style={S.currentPrompt}>Worth {getPlacementValue(currentPlacementNum)} pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Drag ghost — fixed, follows finger */}
      {isDragging && currentMovie && (
        <div style={S.dragGhost(dragPos.x, dragPos.y)}>
          <div style={{
            ...S.currentInner,
            border: "2px solid rgba(124,184,232,0.7)",
            background: "linear-gradient(135deg, rgba(124,184,232,0.18), rgba(124,184,232,0.06))",
          }}>
            {currentMovie.poster && (
              <img style={S.currentPoster} src={currentMovie.poster} alt={currentMovie.title}
                onError={(e) => { e.target.style.display = "none"; }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={S.currentLabel}>Drag to place</div>
              <div style={S.currentTitle}>{currentMovie.title}</div>
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
            {/* Gimme dot */}
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: "#4caf50", opacity: 0.8,
            }} />
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
          {lastPlacement.correct ? `+${lastPlacement.points}` : "\u2717"}
        </div>
      )}

      {/* Timeline */}
      <div style={S.timeline} ref={timelineRef}>
        <div style={S.timelineLine} />

        {/* Direction label: Earlier */}
        <div style={S.timelineLabel}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginBottom: 2 }}>
            <path d="M1 5L5 1L9 5" stroke="#7cb8e8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Earlier
        </div>

        {placedMovies.map((movie, i) => (
          <div key={`row-${movie.id}`}>
            {renderSlot(i)}
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

        {renderSlot(placedMovies.length)}

        {/* Direction label: Later */}
        <div style={S.timelineLabel}>
          Later
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginTop: 2 }}>
            <path d="M1 1L5 5L9 1" stroke="#7cb8e8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

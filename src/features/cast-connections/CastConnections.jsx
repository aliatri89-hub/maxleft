import { t } from "../../theme";
// src/features/cast-connections/CastConnections.jsx
//
// Full-screen overlay game. Rendered by App.jsx when showCastConnections === true.
// Props: session, onBack, onToast
//
import { useState, useEffect, useRef } from "react";
import { useCastConnections } from "./useCastConnections";
import { getPuzzleNumber } from "./castConnectionsApi";
import { fetchMovieLogo, getLogoUrl } from "../../utils/communityTmdb";

// ── Confetti ──────────────────────────────────────────────────

function FilmConfetti({ active }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) return;
    const p = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50,
      vx: (Math.random() - 0.5) * 8,
      vy: -(Math.random() * 6 + 3),
      size: Math.random() * 8 + 4,
      color: ["#e8d3a2", "#c9a84c", "#f0ece4", "#8a7e6b", "#d4af37"][Math.floor(Math.random() * 5)],
      delay: Math.random() * 300,
      rotation: Math.random() * 360,
    }));
    setParticles(p);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, overflow: "hidden" }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 1,
            transform: `rotate(${p.rotation}deg)`,
            animation: `cc-confetti-fly 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}ms forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{
        width: 32, height: 32, border: "2px solid #2a2520",
        borderTopColor: "#e8d3a2", borderRadius: "50%",
        animation: "cc-spin 0.8s linear infinite",
      }} />
      <div style={{ marginTop: 16, fontSize: 13, color: t.creamMuted, fontFamily: t.fontBody }}>
        Loading puzzle...
      </div>
    </div>
  );
}

// ── Backdrop Reveal Card ─────────────────────────────────────

function BackdropCard({ movie, color, delay, dimmed, logoUrl }) {
  const hasBackdrop = !!movie.backdrop_path;
  return (
    <div style={{ opacity: dimmed ? 0.65 : 1 }}>
      <div
        className="cc-solved-group"
        style={{
          borderRadius: 12,
          padding: 0,
          textAlign: "center",
          backgroundColor: color,
          overflow: "hidden",
          position: "relative",
          animationDelay: `${delay}s`,
          minHeight: 110,
          display: "flex",
          alignItems: "stretch",
        }}
      >
      {hasBackdrop && (
        <div
          className="cc-backdrop-img"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(https://image.tmdb.org/t/p/w780${movie.backdrop_path})`,
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
            animationDelay: `${delay + 0.3}s`,
          }}
        >
          {/* Warm amber overlay + vignette */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(30,20,10,0.3), rgba(15,13,11,0.75))",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
          }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1 }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={movie.title}
            style={{
              maxWidth: "70%",
              maxHeight: 60,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
              marginBottom: 8,
            }}
            onError={(e) => {
              // Fallback to text if logo fails to load
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}
          />
        ) : null}
        <div style={{
          fontFamily: t.fontHeadline,
          fontSize: 25,
          color: t.textPrimary,
          letterSpacing: 1.5,
          textShadow: "0 2px 4px rgba(0,0,0,0.6), 0 0 16px rgba(0,0,0,0.3)",
          lineHeight: 1.15,
          display: logoUrl ? "none" : "block",
        }}>
          {movie.title} ({movie.year})
        </div>
        <div style={{
          fontSize: 13,
          color: t.textSecondary,
          marginTop: 8,
          letterSpacing: 0.3,
          fontFamily: t.fontBody,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}>
          {movie.actors.map((a) => a.name).join("  •  ")}
        </div>
      </div>
    </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function CastConnections({ session, onBack, onToast, useHook }) {
  const userId = session?.user?.id;
  const hookFn = useHook || useCastConnections;
  const {
    puzzle, result, loading, error,
    allActors, selected, solved, solvedActorNames, solvedActorMovieIdx,
    mistakes, maxMistakes, groupSize,
    gameOver, shaking, revealAll, won, puzzleNumber,
    toggleSelect, submitGuess, shuffleActors, deselectAll,
  } = hookFn(userId);

  const [showConfetti, setShowConfetti] = useState(false);
  const [logos, setLogos] = useState({});
  const [wrongFlash, setWrongFlash] = useState(false);
  const [wrongNames, setWrongNames] = useState([]);
  const [dotPop, setDotPop] = useState(-1);
  const prevMistakes = useRef(mistakes);

  // Track mistake changes → trigger red flash on wrong tiles + dot pop
  useEffect(() => {
    if (mistakes > prevMistakes.current) {
      setWrongNames([...selected]);
      setWrongFlash(true);
      setDotPop(maxMistakes - mistakes); // index of dot that just went dark
      setTimeout(() => { setWrongFlash(false); setWrongNames([]); }, 600);
      setTimeout(() => setDotPop(-1), 500);
    }
    prevMistakes.current = mistakes;
  }, [mistakes]);

  // Fetch movie logos when puzzle loads
  useEffect(() => {
    if (!puzzle?.movies) return;
    let cancelled = false;

    async function loadLogos() {
      const result = {};
      for (const movie of puzzle.movies) {
        if (!movie.tmdb_id) continue;
        // Check cache first
        let url = getLogoUrl(movie.tmdb_id);
        if (!url) {
          url = await fetchMovieLogo(movie.tmdb_id);
        }
        if (url) result[movie.tmdb_id] = url;
      }
      if (!cancelled) setLogos(result);
    }

    loadLogos();
    return () => { cancelled = true; };
  }, [puzzle]);

  useEffect(() => {
    if (won && !result && puzzle && solved.length > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [won]);

  // ── Share ──
  function getShareText() {
    if (!puzzle) return "";
    const pNum = puzzleNumber || "?";
    const solveEmojis = ["🟩", "🟨", "🟪"];
    // Build blocks: colored for solved (in solve order), red for unsolved
    const totalGroups = puzzle.movies.length;
    const blocks = [];
    solved.forEach((_, i) => blocks.push(solveEmojis[i] || "🟩"));
    for (let i = solved.length; i < totalGroups; i++) blocks.push("🟥");
    return `M▶NTL\nCast Connections #${pNum}\n${blocks.join("")}\nmymantl.app/play`;
  }

  function handleShare() {
    const text = getShareText();
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      onToast?.("Copied to clipboard!");
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div style={S.container}>
        <style>{CSS}</style>
        <BackButton onBack={onBack} />
        <LoadingState />
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div style={S.container}>
        <style>{CSS}</style>
        <BackButton onBack={onBack} />
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎞️</div>
          <div style={{ fontSize: 15, color: t.creamMuted, fontFamily: t.fontBody }}>
            {error || "No puzzle available today"}
          </div>
        </div>
      </div>
    );
  }

  // Build reveal card list: solved groups + (on loss) unsolved groups
  const revealMovies = solved.map((idx) => ({
    movie: puzzle.movies[idx],
    color: puzzle.colors[idx] || "#4a7c59",
    dimmed: false,
  }));

  if (revealAll) {
    puzzle.movies.forEach((movie, idx) => {
      if (!solved.includes(idx)) {
        revealMovies.push({
          movie,
          color: puzzle.colors[idx] || "#4a7c59",
          dimmed: true,
        });
      }
    });
  }

  return (
    <div style={S.container}>
      <style>{CSS}</style>
      <FilmConfetti active={showConfetti} />

      {/* Back button */}
      <BackButton onBack={onBack} />

      {/* Header */}
      <div style={{
        textAlign: "center", padding: "24px 0 16px",
      }}>
        <div style={{
          fontFamily: t.fontBody, fontSize: 11,
          letterSpacing: 4, textTransform: "uppercase", color: t.creamMuted, marginBottom: 4,
        }}>
          M▶NTL
        </div>
        <h1 style={{
          fontFamily: t.fontHeadline, fontSize: 34,
          letterSpacing: 2, color: t.cream, lineHeight: 1.1, margin: 0,
        }}>
          Cast Connections
        </h1>
        <div style={{ fontSize: 12, color: t.creamMuted, marginTop: 6, fontFamily: t.fontBody }}>
          {puzzleNumber ? `#${puzzleNumber} · ` : ""}
          {"★".repeat(puzzle.difficulty === "hard" ? 5 : puzzle.difficulty === "medium" ? 4 : 3)}
        </div>
      </div>

      {/* How to play — only shown during active play */}
      {!gameOver && (
        <div style={{
          fontSize: 13, color: t.creamMuted, textAlign: "center",
          fontFamily: t.fontSerif, lineHeight: 1.5,
          marginBottom: 16, padding: "0 8px",
        }}>
          Find three actors who starred in the same film. Select three, then submit.
        </div>
      )}
      {gameOver ? (
        <div className="cc-end-state" style={S.endStateBox}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{won ? "🎬" : "🎞️"}</div>
          <div style={{
            fontFamily: t.fontHeadline, fontSize: 28,
            color: t.cream, letterSpacing: 1,
          }}>
            {won ? "Perfect Take!" : "That's a Wrap"}
          </div>
          <div style={{ fontSize: 13, color: t.creamMuted, marginTop: 6, fontFamily: t.fontBody }}>
            {won
              ? `Solved with ${mistakes === 0 ? "no" : mistakes} mistake${mistakes !== 1 ? "s" : ""}`
              : "Better luck tomorrow"}
          </div>
          <button
            className="cc-btn-primary"
            onClick={handleShare}
            style={{ ...S.btnPrimary, marginTop: 20, padding: "12px 32px", fontSize: 14 }}
          >
            Share Result
          </button>
        </div>
      ) : (
        <>
          {/* 3×3 actor grid */}
          <div style={S.grid}>
            {allActors.map((actor, i) => {
              const isSolved = solvedActorNames.has(actor.name);
              const isSelected = selected.includes(actor.name);
              const isWrong = wrongFlash && wrongNames.includes(actor.name);
              const movieIdx = solvedActorMovieIdx[actor.name];
              const solvedColor = isSolved ? (puzzle.colors[movieIdx] || "#4a7c59") : null;

              return (
                <button
                  key={actor.name}
                  className={`cc-tile${isSolved ? " cc-tile-solved" : ""}${isSelected && !isWrong ? " cc-tile-selected" : ""}${isWrong ? " cc-tile-wrong" : ""}`}
                  onClick={() => toggleSelect(actor.name)}
                  style={{
                    ...S.tile,
                    animationDelay: `${i * 0.04}s`,
                    ...(isSolved ? {
                      background: solvedColor,
                      borderColor: solvedColor,
                      pointerEvents: "none",
                    } : isWrong ? {
                      background: "rgba(180, 60, 50, 0.25)",
                      borderColor: "#b43c32",
                    } : isSelected ? {
                      background: "#2e2518",
                      borderColor: "#e8d3a2",
                    } : {
                      background: t.bgCard,
                      borderColor: "#2a2520",
                    }),
                  }}
                >
                  <span style={{
                    ...S.actorName,
                    color: isSolved ? t.textPrimary : isWrong ? "#e07060" : "#e8d3a2",
                  }}>
                    {(() => {
                      const parts = actor.name.split(" ");
                      if (parts.length === 1) return actor.name;
                      const first = parts.slice(0, -1).join(" ");
                      const last = parts[parts.length - 1];
                      return <>{first}<br />{last}</>;
                    })()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mistakes tracker */}
          <div style={S.mistakesRow}>
            <span style={S.mistakesLabel}>Mistakes remaining:</span>
            <div style={S.dots}>
              {Array.from({ length: maxMistakes }).map((_, i) => {
                const isActive = i < maxMistakes - mistakes;
                const isPopping = dotPop === i;
                return (
                  <div
                    key={i}
                    className={isPopping ? "cc-dot-pop" : ""}
                    style={{
                      ...S.dot,
                      backgroundColor: isActive ? "#e8d3a2" : "#2a2520",
                      transition: "background-color 0.4s ease, transform 0.3s ease",
                      boxShadow: isActive ? "0 0 6px rgba(232,211,162,0.3)" : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div style={S.controls}>
            <button className="cc-btn-secondary" onClick={shuffleActors} style={S.btnSecondary}>
              Shuffle
            </button>
            <button
              className="cc-btn-secondary"
              onClick={deselectAll}
              style={{ ...S.btnSecondary, opacity: selected.length === 0 ? 0.3 : 1 }}
              disabled={selected.length === 0}
            >
              Deselect All
            </button>
            <button
              className="cc-btn-primary"
              onClick={submitGuess}
              style={{ ...S.btnPrimary, opacity: selected.length !== groupSize ? 0.3 : 1 }}
              disabled={selected.length !== groupSize}
            >
              Submit
            </button>
          </div>
        </>
      )}

      {/* ── BACKDROP REVEAL CARDS — below grid ── */}
      {revealMovies.length > 0 && (
        <div style={S.revealArea}>
          {revealMovies.map(({ movie, color, dimmed }, i) => (
            <BackdropCard
              key={movie.tmdb_id}
              movie={movie}
              color={color}
              delay={i * 0.5}
              dimmed={dimmed}
              logoUrl={logos[movie.tmdb_id] || null}
            />
          ))}
        </div>
      )}

      {/* Bottom spacer for safe area */}
      <div style={{ height: "env(safe-area-inset-bottom, 20px)", minHeight: 20 }} />
    </div>
  );
}

// ── Back Button ───────────────────────────────────────────────

function BackButton({ onBack }) {
  return (
    <button onClick={onBack} style={{
      position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: 12,
      width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", zIndex: 20, background: "none", border: "none", padding: 0,
      WebkitTapHighlightColor: "transparent",
    }}>
      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
        <path d="M13 4L7 10L13 16" stroke="#8a7e6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const S = {
  container: {
    fontFamily: t.fontBody,
    background: t.bgPrimary,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 16px",
    paddingTop: "env(safe-area-inset-top, 0px)",
    color: "#e8d3a2",
    position: "relative",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    width: "100%",
    maxWidth: 420,
    marginBottom: 16,
  },
  tile: {
    borderWidth: 2,
    borderStyle: "solid",
    borderRadius: 10,
    padding: "22px 8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 76,
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    fontFamily: "inherit",
    color: "inherit",
    transition: "all 0.2s ease",
  },
  actorName: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mistakesRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  mistakesLabel: {
    fontSize: 11,
    color: t.creamMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: t.fontBody,
  },
  dots: {
    display: "flex",
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
  },
  controls: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
  },
  btnSecondary: {
    fontFamily: t.fontBody,
    fontSize: 12,
    padding: "10px 18px",
    borderRadius: 24,
    border: "1.5px solid #3a3530",
    background: "transparent",
    color: "#e8d3a2",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: 1,
    WebkitTapHighlightColor: "transparent",
    outline: "none",
  },
  btnPrimary: {
    fontFamily: t.fontBody,
    fontSize: 12,
    padding: "10px 22px",
    borderRadius: 24,
    border: "none",
    background: "#e8d3a2",
    color: t.bgPrimary,
    cursor: "pointer",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    WebkitTapHighlightColor: "transparent",
    outline: "none",
  },
  revealArea: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  endStateBox: {
    textAlign: "center",
    width: "100%",
    maxWidth: 420,
    padding: "32px 16px",
    marginBottom: 8,
  },
};

const CSS = `
  @keyframes cc-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes cc-confetti-fly {
    0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
    100% { opacity: 0; transform: translate(var(--vx, 30px), var(--vy, -80px)) rotate(720deg); }
  }

  .cc-solved-group {
    animation: cc-solve-reveal 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes cc-solve-reveal {
    0% { transform: scaleY(0) scaleX(0.95); opacity: 0; }
    50% { transform: scaleY(1.04) scaleX(1.01); }
    100% { transform: scaleY(1) scaleX(1); opacity: 1; }
  }

  .cc-backdrop-img {
    opacity: 0;
    animation: cc-backdrop-fade 0.6s ease forwards;
  }
  @keyframes cc-backdrop-fade {
    from { opacity: 0; transform: scale(1.05); }
    to { opacity: 1; transform: scale(1); }
  }

  .cc-tile-solved {
    animation: cc-tile-lock 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes cc-tile-lock {
    0% { transform: scale(1); }
    35% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .cc-end-state {
    animation: cc-fade-in 0.5s ease;
  }
  @keyframes cc-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Wrong guess — tiles flash red briefly */
  .cc-tile-wrong {
    animation: cc-wrong-flash 0.55s ease forwards;
  }
  @keyframes cc-wrong-flash {
    0% { transform: scale(1); }
    15% { transform: scale(0.94); }
    40% { transform: scale(1.02); border-color: #b43c32; }
    100% { transform: scale(1); }
  }

  /* Selected tile subtle glow pulse */
  .cc-tile-selected {
    animation: cc-select-glow 1.6s ease-in-out infinite;
  }
  @keyframes cc-select-glow {
    0%, 100% { box-shadow: 0 0 0px rgba(232,211,162,0); }
    50% { box-shadow: 0 0 12px rgba(232,211,162,0.25); }
  }

  /* Dot pop when a mistake is made */
  .cc-dot-pop {
    animation: cc-dot-pop-anim 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes cc-dot-pop-anim {
    0% { transform: scale(1); }
    25% { transform: scale(1.5); opacity: 0.7; }
    50% { transform: scale(0.6); }
    100% { transform: scale(1); }
  }

  .cc-tile {
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    animation: cc-tile-enter 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes cc-tile-enter {
    from { opacity: 0; transform: scale(0.85) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .cc-tile:active {
    transform: scale(0.95);
  }

  .cc-btn-primary:active,
  .cc-btn-secondary:active {
    transform: scale(0.96);
  }
`;

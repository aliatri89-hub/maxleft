// src/features/cast-connections/CastConnections.jsx
//
// Full-screen overlay game. Rendered by App.jsx when showCastConnections === true.
// Props: session, onBack, onToast
//
import { useState, useEffect } from "react";
import { useCastConnections } from "./useCastConnections";
import { getPuzzleNumber } from "./castConnectionsApi";

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
      <div style={{ marginTop: 16, fontSize: 13, color: "#8a7e6b", fontFamily: "'IBM Plex Mono', monospace" }}>
        Loading puzzle...
      </div>
    </div>
  );
}

// ── Backdrop Reveal Card ─────────────────────────────────────

function BackdropCard({ movie, color, delay, dimmed }) {
  const hasBackdrop = !!movie.backdrop_path;
  return (
    <div
      className="cc-solved-group"
      style={{
        borderRadius: 12,
        padding: 0,
        textAlign: "center",
        backgroundColor: color,
        overflow: "hidden",
        position: "relative",
        opacity: dimmed ? 0.65 : 1,
        animationDelay: `${delay}s`,
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
            backgroundPosition: "center",
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
      <div style={{ position: "relative", zIndex: 1, padding: "22px 16px" }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 24,
          color: "#fff",
          letterSpacing: 1.5,
          textShadow: "0 2px 4px rgba(0,0,0,0.6), 0 0 16px rgba(0,0,0,0.3)",
          lineHeight: 1.15,
        }}>
          {movie.title} ({movie.year})
        </div>
        <div style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.9)",
          marginTop: 6,
          letterSpacing: 0.3,
          fontFamily: "'IBM Plex Mono', monospace",
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}>
          {movie.actors.map((a) => a.name).join("  •  ")}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export default function CastConnections({ session, onBack, onToast }) {
  const userId = session?.user?.id;
  const {
    puzzle, result, loading, error,
    allActors, selected, solved, solvedActorNames, solvedActorMovieIdx,
    mistakes, maxMistakes, groupSize,
    gameOver, shaking, revealAll, won, puzzleNumber,
    toggleSelect, submitGuess, shuffleActors, deselectAll,
  } = useCastConnections(userId);

  const [showConfetti, setShowConfetti] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  useEffect(() => {
    if (won && !result) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [won]);

  // ── Share ──
  function getShareText() {
    if (!puzzle) return "";
    const pNum = puzzleNumber || "?";
    const mistakeDots = "❌".repeat(mistakes);
    return `Cast Connections #${pNum}\n${won ? "Solved" : "Failed"} ${mistakeDots ? `(${mistakeDots})` : "— no mistakes!"}\n\nmymantl.app`;
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
          <div style={{ fontSize: 15, color: "#8a7e6b", fontFamily: "'IBM Plex Mono', monospace" }}>
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
        opacity: loaded ? 1 : 0, transform: `translateY(${loaded ? 0 : -8}px)`,
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
          letterSpacing: 4, textTransform: "uppercase", color: "#8a7e6b", marginBottom: 4,
        }}>
          M▶NTL
        </div>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 34,
          letterSpacing: 2, color: "#f5f0e8", lineHeight: 1.1, margin: 0,
        }}>
          Cast Connections
        </h1>
        <div style={{ fontSize: 12, color: "#8a7e6b", marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
          {puzzleNumber ? `#${puzzleNumber} · ` : ""}Group the actors by movie
        </div>
      </div>

      {/* ── GRID AREA: actor grid OR end state ── */}
      {gameOver ? (
        <div className="cc-end-state" style={S.endStateBox}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{won ? "🎬" : "🎞️"}</div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 28,
            color: "#f5f0e8", letterSpacing: 1,
          }}>
            {won ? "Perfect Take!" : "That's a Wrap"}
          </div>
          <div style={{ fontSize: 13, color: "#8a7e6b", marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
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
          {/* 3×3 actor grid — solved tiles stay highlighted */}
          <div className={shaking ? "cc-shake" : ""} style={S.grid}>
            {allActors.map((actor) => {
              const isSolved = solvedActorNames.has(actor.name);
              const isSelected = selected.includes(actor.name);
              const movieIdx = solvedActorMovieIdx[actor.name];
              const solvedColor = isSolved ? (puzzle.colors[movieIdx] || "#4a7c59") : null;

              return (
                <button
                  key={actor.name}
                  className={`cc-tile${isSolved ? " cc-tile-solved" : ""}`}
                  onClick={() => toggleSelect(actor.name)}
                  style={{
                    ...S.tile,
                    ...(isSolved ? {
                      background: solvedColor,
                      borderColor: solvedColor,
                      pointerEvents: "none",
                    } : isSelected ? {
                      background: "#2e2518",
                      borderColor: "#e8d3a2",
                    } : {
                      background: "#1a1714",
                      borderColor: "#2a2520",
                    }),
                  }}
                >
                  <span style={{
                    ...S.actorName,
                    color: isSolved ? "#fff" : "#e8d3a2",
                  }}>
                    {actor.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mistakes tracker */}
          <div style={S.mistakesRow}>
            <span style={S.mistakesLabel}>Mistakes remaining:</span>
            <div style={S.dots}>
              {Array.from({ length: maxMistakes }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...S.dot,
                    backgroundColor: i < maxMistakes - mistakes ? "#e8d3a2" : "#2a2520",
                    transition: "background-color 0.3s ease",
                  }}
                />
              ))}
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
              delay={i * 0.12}
              dimmed={dimmed}
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
    fontFamily: "'IBM Plex Mono', monospace",
    background: "#0f0d0b",
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
    color: "#6b6256",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "'IBM Plex Mono', monospace",
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
    fontFamily: "'IBM Plex Mono', monospace",
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
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    padding: "10px 22px",
    borderRadius: 24,
    border: "none",
    background: "#e8d3a2",
    color: "#0f0d0b",
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
    animation: cc-solve-reveal 0.4s ease forwards;
  }
  @keyframes cc-solve-reveal {
    0% { transform: scaleY(0); opacity: 0; }
    60% { transform: scaleY(1.03); }
    100% { transform: scaleY(1); opacity: 1; }
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
    animation: cc-tile-lock 0.35s ease;
  }
  @keyframes cc-tile-lock {
    0% { transform: scale(1); }
    40% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }

  .cc-end-state {
    animation: cc-fade-in 0.5s ease;
  }
  @keyframes cc-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .cc-shake {
    animation: cc-shake-anim 0.5s ease;
  }
  @keyframes cc-shake-anim {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-5px); }
    80% { transform: translateX(5px); }
  }

  .cc-tile {
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .cc-tile:active {
    transform: scale(0.95);
  }

  .cc-btn-primary:active,
  .cc-btn-secondary:active {
    transform: scale(0.96);
  }
`;

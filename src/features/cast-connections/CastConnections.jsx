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

// ── Main Component ────────────────────────────────────────────

export default function CastConnections({ session, onBack, onToast }) {
  const userId = session?.user?.id;
  const {
    puzzle, result, loading, error,
    actors, selected, solved, mistakes, maxMistakes, groupSize,
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
    const squares = [];
    // Build result grid
    const colors = ["🟢", "🟡", "🟣"];
    if (won) {
      solved.forEach((_, i) => squares.push(colors[i % 3]));
    }
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

      {/* Solved groups */}
      <div style={S.solvedArea}>
        {solved.map((movieIdx, i) => {
          const movie = puzzle.movies[movieIdx];
          const color = puzzle.colors[movieIdx] || "#4a7c59";
          return (
            <div
              key={movieIdx}
              className="cc-solved-group"
              style={{ ...S.solvedGroup, backgroundColor: color, animationDelay: `${i * 0.1}s` }}
            >
              <div style={S.solvedTitle}>{movie.title} ({movie.year})</div>
              <div style={S.solvedActors}>
                {movie.actors.map((a) => a.name).join("  •  ")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reveal all on loss */}
      {revealAll && puzzle.movies.map((movie, idx) =>
        solved.includes(idx) ? null : (
          <div
            key={`reveal-${idx}`}
            className="cc-reveal-group"
            style={{
              ...S.solvedGroup,
              backgroundColor: puzzle.colors[idx] || "#4a7c59",
              opacity: 0.7,
              marginBottom: 8,
              maxWidth: 420,
              width: "100%",
              alignSelf: "center",
              animationDelay: `${idx * 0.15}s`,
            }}
          >
            <div style={S.solvedTitle}>{movie.title} ({movie.year})</div>
            <div style={S.solvedActors}>
              {movie.actors.map((a) => a.name).join("  •  ")}
            </div>
          </div>
        )
      )}

      {/* Actor grid */}
      {!revealAll && actors.length > 0 && (
        <div
          className={shaking ? "cc-shake" : ""}
          style={S.grid}
        >
          {actors.map((actor) => {
            const isSelected = selected.includes(actor.name);
            return (
              <button
                key={actor.name}
                className="cc-tile"
                onClick={() => toggleSelect(actor.name)}
                style={{
                  ...S.tile,
                  background: isSelected ? "#2e2518" : "#1a1714",
                  borderColor: isSelected ? "#e8d3a2" : "#2a2520",
                  ...(gameOver ? { pointerEvents: "none", opacity: 0.5 } : {}),
                }}
              >
                <span style={S.actorName}>{actor.name}</span>
              </button>
            );
          })}
        </div>
      )}

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
      {!gameOver && (
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
      )}

      {/* End state */}
      {gameOver && (
        <div className="cc-end-state" style={S.endState}>
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

          {/* Share button */}
          <button
            className="cc-btn-primary"
            onClick={handleShare}
            style={{ ...S.btnPrimary, marginTop: 20, padding: "12px 32px", fontSize: 14 }}
          >
            Share Result
          </button>
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
  solvedArea: {
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 8,
  },
  solvedGroup: {
    borderRadius: 10,
    padding: "14px 16px",
    textAlign: "center",
  },
  solvedTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 20,
    color: "#fff",
    letterSpacing: 1,
    textShadow: "1px 1px 2px rgba(0,0,0,0.4)",
  },
  solvedActors: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    letterSpacing: 0.3,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    width: "100%",
    maxWidth: 420,
    marginBottom: 20,
  },
  tile: {
    background: "#1a1714",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#2a2520",
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
    transition: "all 0.15s ease",
  },
  actorName: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.3,
    color: "#e8d3a2",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mistakesRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
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
  endState: {
    textAlign: "center",
    marginTop: 16,
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

  .cc-reveal-group {
    animation: cc-fade-in 0.4s ease forwards;
  }
  @keyframes cc-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 0.7; transform: translateY(0); }
  }

  .cc-end-state {
    animation: cc-fade-in 0.5s ease;
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
    transition: all 0.15s ease;
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

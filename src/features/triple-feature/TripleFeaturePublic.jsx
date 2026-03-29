import { t } from "../../theme";
// src/features/triple-feature/TripleFeaturePublic.jsx
//
// Ungated, shareable version of Triple Feature.
// Rendered at /play — no auth required.
// Uses localStorage for play tracking, Supabase for puzzle data (anon read).
//
import { useState, useEffect, useRef } from "react";
import { useTripleFeaturePublic } from "./useTripleFeaturePublic";
import { getPuzzleNumber } from "./tripleFeatureApi";

// ── Helpers ──────────────────────────────────────────────────

function formatMoney(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n}M`;
}

function AnimatedNumber({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef();
  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);
  return <span>{display >= 1000 ? `$${(display / 1000).toFixed(1)}B` : `$${display}M`}</span>;
}

// ── Confetti ─────────────────────────────────────────────────

function GoldConfetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 4,
      size: Math.random() * 6 + 2,
      color: ["#d4af37", "#f4d03f", "#ffd700", "#c9a227", "#f0ece4"][Math.floor(Math.random() * 5)],
      life: 1,
      decay: Math.random() * 0.015 + 0.008,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    }));

    let frame;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach((p) => {
        if (p.life <= 0) return;
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (alive) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }} />;
}

// ── Countdown ────────────────────────────────────────────────

function CountdownTimer({ getTimeUntilNext }) {
  const [time, setTime] = useState(getTimeUntilNext());
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeUntilNext()), 60000);
    return () => clearInterval(id);
  }, [getTimeUntilNext]);
  return <span>{time.hours}h {time.minutes}m</span>;
}

// ── Phases ───────────────────────────────────────────────────

const PHASE = { PICKING: 0, REVEALING: 1, RESULT: 2 };

// ── Flavor text ──────────────────────────────────────────────

function getFlavorText(rankScore) {
  if (rankScore === 10) return "Perfect triple. You nailed it.";
  if (rankScore >= 9) return "So close to the top.";
  if (rankScore >= 7) return "Solid instincts.";
  if (rankScore >= 5) return "Not bad — left a little on the table.";
  if (rankScore >= 3) return "Rough night at the box office.";
  return "Oof. Better luck tomorrow.";
}

// ── Main Component ──────────────────────────────────────────

export default function TripleFeaturePublic() {
  const {
    puzzle, result, loading, error, hasPlayed,
    submitPlay, getShareText, getTimeUntilNext,
  } = useTripleFeaturePublic();

  const [selected, setSelected] = useState(new Set());
  const [phase, setPhase] = useState(PHASE.PICKING);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [runningTotal, setRunningTotal] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedArray = Array.from(selected).sort((a, b) => a - b);

  // Jump to result if already played
  useEffect(() => {
    if (hasPlayed && puzzle && result) {
      setPhase(PHASE.RESULT);
      setSelected(new Set(result.selected_indices));
    }
  }, [hasPlayed, puzzle, result]);

  // ── Game actions ────────────────────────────────────────

  const toggleSelect = (idx) => {
    if (phase !== PHASE.PICKING) return;
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else if (next.size < 3) next.add(idx);
    setSelected(next);
  };

  const lockIn = () => {
    if (selected.size !== 3 || !puzzle) return;
    setPhase(PHASE.REVEALING);
    setRevealIndex(0);
    const arr = Array.from(selected).sort((a, b) => a - b);
    submitPlay(arr);
  };

  // Reveal animation
  useEffect(() => {
    if (phase !== PHASE.REVEALING || revealIndex < 0 || revealIndex >= selectedArray.length) return;
    const timer = setTimeout(() => {
      const movieIdx = selectedArray[revealIndex];
      setRunningTotal((prev) => prev + puzzle.movies[movieIdx].gross);
      if (revealIndex < 2) {
        setTimeout(() => setRevealIndex(revealIndex + 1), 1000);
      } else {
        setTimeout(() => setPhase(PHASE.RESULT), 1200);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, revealIndex]);

  // Computed result
  const userTotal = puzzle ? selectedArray.reduce((sum, i) => sum + puzzle.movies[i].gross, 0) : 0;

  const userRank = (() => {
    if (result) return result.rank;
    if (!puzzle || selectedArray.length !== 3) return 0;
    const combos = [];
    for (let i = 0; i < 5; i++)
      for (let j = i + 1; j < 5; j++)
        for (let k = j + 1; k < 5; k++)
          combos.push({ indices: [i, j, k], total: puzzle.movies[i].gross + puzzle.movies[j].gross + puzzle.movies[k].gross });
    const ranked = [...combos].sort((a, b) => b.total - a.total);
    const s = new Set(selectedArray);
    return ranked.findIndex((c) => { const cs = new Set(c.indices); return [...s].every((i) => cs.has(i)); }) + 1;
  })();

  const rankScore = userRank > 0 ? 11 - userRank : 0;

  const shareResult = () => {
    const text = getShareText();
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // ── Loading / Error ─────────────────────────────────────

  if (loading) {
    return (
      <div style={S.page}>
        <Fonts />
        <div style={S.inner}>
          <MantlBrand />
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <div style={S.title}>TRIPLE FEATURE</div>
            <div style={{ fontSize: 14, color: t.creamMuted, marginTop: 12 }}>Loading today's puzzle...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div style={S.page}>
        <Fonts />
        <div style={S.inner}>
          <MantlBrand />
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <div style={S.title}>TRIPLE FEATURE</div>
            <div style={{ fontSize: 14, color: t.creamMuted, marginTop: 12 }}>{error || "No puzzle available today."}</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div style={S.page}>
      <Fonts />

      {/* Ambient glow */}
      <div style={S.glowTL} />
      <div style={S.glowBR} />

      <div style={S.inner}>
        {/* Branding */}
        <MantlBrand />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={S.title}>TRIPLE FEATURE</div>
          <div style={S.subtitle}>Pick the 3 highest grossing films</div>
          <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, fontStyle: "italic" }}>
            Original domestic gross — not adjusted for inflation
          </div>
          {puzzle && (
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
              Puzzle #{getPuzzleNumber(puzzle.date)}
            </div>
          )}
        </div>

        {/* Running total during reveal */}
        {phase === PHASE.REVEALING && (
          <div style={S.runningBox}>
            <div style={S.label}>Running Total</div>
            <div style={S.runningVal}><AnimatedNumber value={runningTotal} /></div>
          </div>
        )}

        {/* ── Movie Grid ──────────────────────────────────── */}
        <div style={S.grid}>
          {(() => {
            const grossRanks = puzzle.movies.map((m, i) => ({ idx: i, gross: m.gross }));
            grossRanks.sort((a, b) => b.gross - a.gross);
            const rankMap = {};
            grossRanks.forEach((m, rank) => { rankMap[m.idx] = rank + 1; });

            return puzzle.movies.map((movie, idx) => {
              const sel = selected.has(idx);
              const revealing = phase === PHASE.REVEALING && selectedArray.indexOf(idx) <= revealIndex && sel;
              const revealed = phase === PHASE.RESULT && sel;
              const rank = rankMap[idx];
              const isTop3 = phase === PHASE.RESULT && rank <= 3;
              const currentReveal = phase === PHASE.REVEALING && selectedArray.indexOf(idx) === revealIndex;
              const notPicked = phase === PHASE.RESULT && !sel;

              return (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  style={{
                    width: "calc((100% - 16px) / 3)",
                    position: "relative", cursor: phase === PHASE.PICKING ? "pointer" : "default",
                    borderRadius: 8, overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                    transform: sel && phase === PHASE.PICKING ? "scale(1.03)" : currentReveal ? "scale(1.06)" : "scale(1)",
                    boxShadow: sel && isTop3 ? "0 0 0 2px #4ade80,0 4px 20px rgba(74,222,128,.4)"
                      : sel ? "0 0 0 2px #d4af37,0 4px 20px rgba(212,175,55,.3)"
                      : isTop3 ? "0 0 0 2px #4ade80,0 4px 20px rgba(74,222,128,.3)"
                      : "0 2px 8px rgba(0,0,0,.3)",
                    opacity: (phase === PHASE.REVEALING || phase === PHASE.RESULT) && !sel && !isTop3 ? 0.3 : 1,
                  }}
                >
                  <div style={{ aspectRatio: "2/3", position: "relative" }}>
                    <img src={movie.poster} alt={movie.title} loading="eager" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

                    {sel && phase === PHASE.PICKING && (
                      <div style={S.check}>✓</div>
                    )}

                    {(revealing || revealed) && (
                      <div style={S.revealOv}>
                        <div style={S.revealGross}>{formatMoney(movie.gross)}</div>
                        {isTop3 && (
                          <div style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: "1px",
                            color: t.green, marginTop: 2,
                          }}>#{rank}</div>
                        )}
                      </div>
                    )}

                    {notPicked && !isTop3 && (
                      <div style={S.dimOv}>
                        <div style={S.dimGross}>{formatMoney(movie.gross)}</div>
                      </div>
                    )}

                    {isTop3 && !sel && (
                      <div style={S.optOv}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.green, textAlign: "center", padding: 4 }}>
                          {formatMoney(movie.gross)}<br /><span style={{ fontSize: 9, opacity: 0.7 }}>#{rank}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "6px 4px", background: "#111118", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.3, color: sel && isTop3 ? t.green : sel ? "#d4af37" : t.textMuted }}>
                      {movie.title}
                    </div>
                    <div style={{ fontSize: 9, color: t.textMuted, marginTop: 1 }}>{movie.year}</div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* ── Picking phase ───────────────────────────────── */}
        {phase === PHASE.PICKING && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 12 }}>
              {selected.size === 0 && "Pick 3 movies"}
              {selected.size === 1 && "Pick 2 more"}
              {selected.size === 2 && "Pick 1 more"}
              {selected.size === 3 && "Ready to lock in!"}
            </div>
            <button
              onClick={lockIn}
              disabled={selected.size !== 3}
              style={{
                ...S.lockBtn,
                background: selected.size === 3 ? "linear-gradient(135deg,#d4af37,#f4d03f)" : "rgba(255,255,255,0.05)",
                color: selected.size === 3 ? "#0a0a0f" : t.textFaint,
                cursor: selected.size === 3 ? "pointer" : "not-allowed",
              }}
            >Lock It In</button>
          </div>
        )}

        {/* ── Result phase ────────────────────────────────── */}
        {phase === PHASE.RESULT && (
          <div style={{ animation: "tf-slideUp 0.5s ease-out", position: "relative" }}>
            <GoldConfetti active={rankScore === 10} />

            <div style={S.resultCard}>
              <div style={{ marginBottom: 6 }}>
                <div style={{
                  fontFamily: t.fontSerif, fontSize: 40, fontWeight: 900, lineHeight: 1,
                  color: rankScore === 10 ? "#d4af37" : rankScore >= 9 ? "#f0ece4" : "var(--text-muted)",
                }}>{rankScore}<span style={{ fontSize: 22, color: t.textMuted }}>/10</span></div>
                <div style={{
                  fontSize: 11, fontWeight: 600, marginTop: 6, fontStyle: "italic",
                  color: rankScore === 10 ? "#d4af37" : rankScore >= 9 ? t.green : rankScore >= 7 ? "#f59e0b" : t.red,
                }}>{getFlavorText(rankScore)}</div>
              </div>

              <div style={{ fontSize: 12, color: t.creamMuted, marginBottom: 2, marginTop: 8 }}>Your box office</div>
              <div style={S.resultTotal}>{formatMoney(result ? result.user_total : userTotal)}</div>
              {rankScore < 10 && (
                <div style={{ fontSize: 12, color: t.creamMuted, marginTop: 2 }}>
                  Best was {formatMoney(puzzle.optimalTotal)}
                </div>
              )}
            </div>

            <button onClick={shareResult} style={S.shareBtn}>
              {copied ? "Copied!" : "Share Result"}
            </button>

            {/* ── Sign-up CTA ──────────────────────────────── */}
            <div style={S.ctaCard}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.cream, marginBottom: 4 }}>
                Want to track your stats & streak?
              </div>
              <div style={{ fontSize: 11, color: t.creamMuted, marginBottom: 12, lineHeight: 1.4 }}>
                Sign up for MANTL to save your scores, compete on leaderboards, and discover what to watch from podcasts you love.
              </div>
              <a href="/signup" style={S.ctaBtn}>
                Create Free Account
              </a>
            </div>

            <div style={{ textAlign: "center", fontSize: 12, color: t.textMuted, marginTop: 12 }}>
              New puzzle in <CountdownTimer getTimeUntilNext={getTimeUntilNext} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes tf-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tf-slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── MANTL Branding (replaces BackButton) ────────────────────

function MantlBrand() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 16, padding: "4px 0",
    }}>
      <a
        href="/"
        style={{
          textDecoration: "none", display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <span style={{
          fontSize: 15, fontWeight: 700, letterSpacing: "2px",
          textTransform: "uppercase", color: t.cream,
          fontFamily: t.fontDisplay,
        }}>MANTL</span>
      </a>
      <a
        href="/signup"
        style={{
          fontSize: 12, fontWeight: 600, color: t.gold,
          textDecoration: "none", padding: "6px 14px",
          border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8,
          transition: "all 0.2s ease",
        }}
      >
        Sign Up
      </a>
    </div>
  );
}

// ── Google Fonts ─────────────────────────────────────────────

function Fonts() {
  return (
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700;900&display=swap"
      rel="stylesheet"
    />
  );
}

// ── Styles ───────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh", minHeight: "100dvh",
    background: "#0a0a0f", color: t.cream,
    fontFamily: t.fontDisplay,
    position: "relative", overflow: "hidden",
    paddingTop: "var(--sat)",
  },
  inner: { maxWidth: 440, margin: "0 auto", padding: "12px 16px 40px" },
  glowTL: {
    position: "fixed", top: "-30%", left: "-20%", width: "70%", height: "70%",
    background: "radial-gradient(circle,rgba(212,175,55,0.06) 0%,transparent 70%)", pointerEvents: "none",
  },
  glowBR: {
    position: "fixed", bottom: "-20%", right: "-10%", width: "50%", height: "50%",
    background: "radial-gradient(circle,rgba(212,175,55,0.04) 0%,transparent 70%)", pointerEvents: "none",
  },
  title: {
    fontFamily: t.fontSerif, fontSize: 28, fontWeight: 900,
    letterSpacing: "-0.5px",
    background: "linear-gradient(135deg,#d4af37,#f4d03f,#d4af37)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    marginBottom: 4,
  },
  subtitle: { fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: t.textMuted, fontWeight: 500 },
  label: { fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: t.creamMuted, marginBottom: 6 },
  targetBox: {
    textAlign: "center", marginBottom: 16, padding: "12px 20px",
    background: "linear-gradient(135deg,rgba(212,175,55,0.1),rgba(212,175,55,0.03))",
    border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12,
  },
  targetVal: { fontFamily: t.fontSerif, fontSize: 38, fontWeight: 900, color: t.gold, lineHeight: 1 },
  runningBox: { textAlign: "center", marginBottom: 20, padding: 10, background: "rgba(212,175,55,0.05)", borderRadius: 8 },
  runningVal: { fontFamily: t.fontSerif, fontSize: 32, fontWeight: 900, color: t.cream },
  grid: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 },
  check: {
    position: "absolute", top: 4, right: 4, width: 22, height: 22,
    borderRadius: "50%", background: "#d4af37", color: "#0a0a0f",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700,
  },
  revealOv: {
    position: "absolute", inset: 0,
    background: "linear-gradient(180deg,rgba(10,10,15,0.4) 0%,rgba(10,10,15,0.92) 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
    padding: "8px 4px", animation: "tf-fadeIn 0.4s ease-out",
  },
  revealGross: { fontFamily: t.fontSerif, fontSize: 18, fontWeight: 900, color: t.gold },
  dimOv: {
    position: "absolute", inset: 0, background: "rgba(10,10,15,0.75)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
    padding: "8px 4px", animation: "tf-fadeIn 0.6s ease-out",
  },
  dimGross: { fontFamily: t.fontSerif, fontSize: 14, fontWeight: 900, color: t.textMuted },
  optOv: {
    position: "absolute", inset: 0, background: "rgba(10,10,15,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  lockBtn: {
    width: "100%", padding: "14px 24px", borderRadius: 10, border: "none",
    fontSize: 15, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
    transition: "all 0.3s ease",
  },
  resultCard: {
    textAlign: "center", padding: "14px 20px",
    background: "linear-gradient(135deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))",
    border: "1px solid rgba(212,175,55,0.15)", borderRadius: 14, marginBottom: 12,
  },
  resultTotal: { fontFamily: t.fontSerif, fontSize: 30, fontWeight: 900, color: t.cream, marginBottom: 2 },
  shareBtn: {
    width: "100%", padding: "13px 16px", borderRadius: 10, border: "none",
    background: "linear-gradient(135deg,#d4af37,#f4d03f)",
    color: "#0a0a0f", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  ctaCard: {
    textAlign: "center", marginTop: 16, padding: "18px 20px",
    background: "linear-gradient(135deg,rgba(212,175,55,0.06),rgba(212,175,55,0.02))",
    border: "1px solid rgba(212,175,55,0.12)", borderRadius: 14,
  },
  ctaBtn: {
    display: "inline-block", padding: "10px 28px", borderRadius: 10,
    background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.3)",
    color: t.gold, fontSize: 13, fontWeight: 700, textDecoration: "none",
    letterSpacing: "0.5px",
  },
};

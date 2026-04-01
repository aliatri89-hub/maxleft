import { t } from "../../theme";
// src/features/movie-night/MovieNight.jsx
//
// Full-screen overlay: "Movie Night" — multiplayer swipe-to-match film picker.
// Two users swipe the same stack privately; matches revealed when both done.
// Props: session, onBack, onToast
//
import { useState, useRef, useCallback, useEffect } from "react";
import { useMovieNight } from "./useMovieNight";
import { useBackGesture } from "../../hooks/useBackGesture";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 10;
const TAP_MAX_MS = 300;
const CREAM = "#f0ebe1";
const DARK = "#0f0d0b";
const GREEN = "#4caf50";
const RED = "#e74c3c";
const AMBER = "#d4af37";
const PURPLE = "#9b59b6";

function haptic() {
  try { navigator?.vibrate?.(8); } catch {}
}

// TMDB genre IDs
const GENRES = [
  { id: null, name: "Any Genre", emoji: "🎬" },
  { id: 28, name: "Action", emoji: "💥" },
  { id: 12, name: "Adventure", emoji: "🗺" },
  { id: 16, name: "Animation", emoji: "✏️" },
  { id: 35, name: "Comedy", emoji: "😂" },
  { id: 80, name: "Crime", emoji: "🔪" },
  { id: 99, name: "Documentary", emoji: "📹" },
  { id: 18, name: "Drama", emoji: "🎭" },
  { id: 14, name: "Fantasy", emoji: "🧙" },
  { id: 27, name: "Horror", emoji: "👻" },
  { id: 9648, name: "Mystery", emoji: "🔍" },
  { id: 10749, name: "Romance", emoji: "💕" },
  { id: 878, name: "Sci-Fi", emoji: "🚀" },
  { id: 53, name: "Thriller", emoji: "😰" },
  { id: 10752, name: "War", emoji: "⚔️" },
  { id: 37, name: "Western", emoji: "🤠" },
];

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════

export default function MovieNight({ session: authSession, onBack, onToast, pushNav, removeNav }) {
  const userId = authSession?.user?.id;
  const {
    phase, role, session, stack, currentIndex, error, loading, matches,
    currentFilm, remaining, total,
    createSession, joinSession, startSwiping, swipeRight, swipeLeft, reset,
  } = useMovieNight(userId);

  const handleClose = useCallback(() => { reset(); onBack(); }, [reset, onBack]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000, background: DARK,
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: t.fontDisplay, paddingTop: "var(--sat)",
    }}>
      <Header onClose={handleClose} phase={phase} remaining={remaining} role={role} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {phase === "setup" && (
          <LobbyScreen userId={userId} onCreateSession={createSession} onJoinSession={joinSession}
            loading={loading} error={error} />
        )}
        {phase === "share" && session && (
          <ShareScreen code={session.code} genreName={session.genre_name} onStart={() => { haptic(); startSwiping(); }} onToast={onToast} />
        )}
        {(phase === "loading" || loading) && phase !== "setup" && <LoadingState />}
        {phase === "swiping" && currentFilm && (
          <SwipeCard film={currentFilm} onSwipeRight={swipeRight} onSwipeLeft={swipeLeft}
            remaining={remaining} total={total} />
        )}
        {phase === "waiting_partner" && (
          <WaitingPartnerScreen code={session?.code} role={role} />
        )}
        {phase === "reveal" && (
          <RevealScreen matches={matches} stack={stack} onClose={handleClose}
            onPlayAgain={() => { reset(); }} onToast={onToast} userId={userId} />
        )}
        {error && phase !== "setup" && (
          <div style={{ padding: 32, textAlign: "center", color: CREAM }}>
            <p style={{ opacity: 0.7 }}>{error}</p>
            <button onClick={reset} style={pillBtnStyle}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════

function Header({ onClose, phase, remaining, role }) {
  return (
    <div style={{
      padding: "12px 16px 10px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: "1px solid rgba(240,235,225,0.08)",
    }}>
      <button onClick={onClose} style={{
        background: "none", border: "none", color: CREAM, fontSize: 16,
        padding: "8px 4px", cursor: "pointer", opacity: 0.7,
      }}>✕</button>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: t.fontHeadline,
          fontSize: 16, color: PURPLE, letterSpacing: 1,
        }}>MOVIE NIGHT</div>
        {phase === "swiping" && (
          <div style={{ fontSize: 11, color: CREAM, opacity: 0.4, marginTop: 2 }}>
            {remaining} left
          </div>
        )}
      </div>
      <div style={{ width: 32 }} />
    </div>
  );
}

// ════════════════════════════════════════════════
// LOBBY — create or join
// ════════════════════════════════════════════════

function LobbyScreen({ userId, onCreateSession, onJoinSession, loading, error }) {
  const [tab, setTab] = useState("create"); // "create" | "join"
  const [genreId, setGenreId] = useState(null);
  const [genreName, setGenreName] = useState(null);
  const [code, setCode] = useState("");

  const handleCreate = useCallback(() => {
    haptic();
    onCreateSession(genreId, genreName);
  }, [genreId, genreName, onCreateSession]);

  const handleJoin = useCallback(() => {
    if (code.trim().length < 4) return;
    haptic();
    onJoinSession(code);
  }, [code, onJoinSession]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Tab toggle */}
      <div style={{
        display: "flex", margin: "16px 20px 0", borderRadius: 10, overflow: "hidden",
        border: `1px solid rgba(240,235,225,0.1)`,
      }}>
        {["create", "join"].map(t2 => (
          <button key={t2} onClick={() => { haptic(); setTab(t2); }} style={{
            flex: 1, padding: "12px 0", fontSize: 14, fontWeight: 700,
            fontFamily: t.fontDisplay, letterSpacing: 0.5, cursor: "pointer",
            border: "none", textTransform: "uppercase",
            background: tab === t2 ? "rgba(155,89,182,0.15)" : "transparent",
            color: tab === t2 ? PURPLE : CREAM,
            opacity: tab === t2 ? 1 : 0.5,
            transition: "all 0.15s ease",
          }}>{t2 === "create" ? "Create" : "Join"}</button>
        ))}
      </div>

      {tab === "create" && (
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 120px" }}>
          <div style={{
            fontFamily: t.fontHeadline, fontSize: 16, letterSpacing: 0.5,
            color: PURPLE, marginBottom: 12,
          }}>PICK A GENRE</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GENRES.map(g => {
              const isOn = genreId === g.id;
              return (
                <button key={g.id ?? "any"} onClick={() => {
                  haptic(); setGenreId(g.id); setGenreName(g.name);
                }} style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  background: isOn ? "rgba(155,89,182,0.15)" : "rgba(240,235,225,0.04)",
                  border: `1.5px solid ${isOn ? PURPLE : "rgba(240,235,225,0.1)"}`,
                  color: isOn ? PURPLE : CREAM, cursor: "pointer",
                  opacity: isOn ? 1 : 0.6, transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{g.emoji}</span>
                  <span>{g.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{
            marginTop: 24, padding: 16, borderRadius: 12,
            background: "rgba(240,235,225,0.03)", border: "1px solid rgba(240,235,225,0.06)",
          }}>
            <div style={{ color: CREAM, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>How it works</div>
            <div style={{ color: CREAM, opacity: 0.5, fontSize: 12, lineHeight: 1.5 }}>
              You and a friend each swipe through the same movies privately.
              When you're both done, only the films you BOTH liked are revealed.
              No negotiation — just matches.
            </div>
          </div>
        </div>
      )}

      {tab === "join" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <div style={{ fontFamily: t.fontHeadline, fontSize: 16, color: PURPLE, letterSpacing: 0.5, marginBottom: 16 }}>
            ENTER CODE
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: "100%", maxWidth: 240, textAlign: "center",
              fontSize: 32, fontWeight: 700, fontFamily: t.fontDisplay,
              letterSpacing: 8, padding: "14px 0",
              background: "rgba(240,235,225,0.04)",
              border: `2px solid ${code.length >= 6 ? PURPLE : "rgba(240,235,225,0.15)"}`,
              borderRadius: 12, color: CREAM, outline: "none",
              transition: "border-color 0.2s ease",
            }}
          />
          <div style={{ marginTop: 12, fontSize: 12, color: CREAM, opacity: 0.4 }}>
            Get the code from whoever created the session
          </div>
          {error && (
            <div style={{ marginTop: 12, fontSize: 13, color: RED }}>{error}</div>
          )}
        </div>
      )}

      {/* Bottom button */}
      <div style={{
        padding: "12px 24px calc(var(--sab) + 12px)",
        borderTop: "1px solid rgba(240,235,225,0.08)",
        display: "flex", justifyContent: "center", background: DARK,
      }}>
        {tab === "create" && (
          <button onClick={handleCreate} disabled={loading} style={{
            background: loading ? "rgba(240,235,225,0.08)" : PURPLE,
            color: loading ? CREAM : "#fff",
            border: "none", borderRadius: 24, padding: "14px 40px",
            fontSize: 17, fontWeight: 700, cursor: loading ? "default" : "pointer",
            fontFamily: t.fontDisplay, letterSpacing: 1,
            opacity: loading ? 0.4 : 1,
          }}>{loading ? "Creating…" : "CREATE SESSION"}</button>
        )}
        {tab === "join" && (
          <button onClick={handleJoin} disabled={code.length < 6 || loading} style={{
            background: code.length >= 6 && !loading ? PURPLE : "rgba(240,235,225,0.08)",
            color: code.length >= 6 ? "#fff" : CREAM,
            border: "none", borderRadius: 24, padding: "14px 40px",
            fontSize: 17, fontWeight: 700, cursor: code.length >= 6 ? "pointer" : "default",
            fontFamily: t.fontDisplay, letterSpacing: 1,
            opacity: code.length >= 6 && !loading ? 1 : 0.4,
          }}>{loading ? "Joining…" : "JOIN"}</button>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// SHARE SCREEN — code + start swiping
// ════════════════════════════════════════════════

function ShareScreen({ code, genreName, onStart, onToast }) {
  const handleCopy = useCallback(() => {
    haptic();
    navigator.clipboard?.writeText(code).then(() => {
      onToast?.("Code copied!");
    }).catch(() => {});
  }, [code, onToast]);

  const handleShare = useCallback(async () => {
    haptic();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Movie Night on MANTL",
          text: `Join my Movie Night! 🍿\nCode: ${code}`,
          url: "https://mymantl.app",
        });
      } catch {}
    } else {
      handleCopy();
    }
  }, [code, handleCopy]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🍿</div>
      <div style={{ fontFamily: t.fontHeadline, fontSize: 20, color: PURPLE, letterSpacing: 1, marginBottom: 4 }}>
        SESSION CREATED
      </div>
      {genreName && (
        <div style={{ fontSize: 13, color: CREAM, opacity: 0.5, marginBottom: 20 }}>{genreName}</div>
      )}

      {/* Code display */}
      <div onClick={handleCopy} style={{
        fontSize: 42, fontWeight: 800, fontFamily: t.fontDisplay,
        letterSpacing: 10, color: CREAM, padding: "16px 28px",
        background: "rgba(240,235,225,0.06)", borderRadius: 16,
        border: "2px solid rgba(155,89,182,0.3)", cursor: "pointer",
        userSelect: "all", WebkitUserSelect: "all",
      }}>{code}</div>

      <div style={{ marginTop: 12, fontSize: 12, color: CREAM, opacity: 0.4, textAlign: "center" }}>
        Tap to copy · share this code with your movie partner
      </div>

      <button onClick={handleShare} style={{
        marginTop: 16, background: "rgba(240,235,225,0.08)", border: "1px solid rgba(240,235,225,0.12)",
        color: CREAM, borderRadius: 20, padding: "10px 24px", fontSize: 14,
        fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
        Share code
      </button>

      {/* Start swiping */}
      <button onClick={onStart} style={{
        marginTop: 32, background: PURPLE, color: "#fff", border: "none",
        borderRadius: 24, padding: "14px 36px", fontSize: 17, fontWeight: 700,
        cursor: "pointer", fontFamily: t.fontDisplay, letterSpacing: 1,
      }}>START SWIPING</button>

      <div style={{ marginTop: 8, fontSize: 11, color: CREAM, opacity: 0.3 }}>
        Your partner can join while you swipe
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// SWIPE CARD — identical physics to Pick a Flick
// ════════════════════════════════════════════════

function SwipeCard({ film, onSwipeRight, onSwipeLeft, remaining, total }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isVertical = useRef(false);
  const hasMoved = useRef(false);
  const touchHandled = useRef(false);
  const [offset, setOffset] = useState(0);
  const [exiting, setExiting] = useState(null);

  useEffect(() => { setOffset(0); setExiting(null); }, [film.tmdb_id]);

  const handleTouchStart = useCallback((e) => {
    isDragging.current = true;
    isVertical.current = false;
    hasMoved.current = false;
    touchHandled.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startTime.current = Date.now();
    currentX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) hasMoved.current = true;
    if (!isVertical.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      isVertical.current = true; isDragging.current = false; setOffset(0); return;
    }
    currentX.current = dx;
    setOffset(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current && !currentX.current) return;
    isDragging.current = false;
    touchHandled.current = true;
    const dx = currentX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? "right" : "left";
      setExiting(dir); haptic();
      setTimeout(() => { dir === "right" ? onSwipeRight() : onSwipeLeft(); }, 250);
    } else { setOffset(0); }
    currentX.current = 0;
  }, [onSwipeRight, onSwipeLeft]);

  const handleBtnLeft = useCallback(() => { haptic(); setExiting("left"); setTimeout(onSwipeLeft, 250); }, [onSwipeLeft]);
  const handleBtnRight = useCallback(() => { haptic(); setExiting("right"); setTimeout(onSwipeRight, 250); }, [onSwipeRight]);

  const rotation = offset * 0.06;
  const opacity = 1 - Math.min(Math.abs(offset) / 300, 0.5);
  const indicatorOpacity = Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1);
  const exitTransform = exiting === "left" ? "translateX(-120vw) rotate(-20deg)"
    : exiting === "right" ? "translateX(120vw) rotate(20deg)"
    : `translateX(${offset}px) rotate(${rotation}deg)`;
  const posterUrl = film.poster_path ? `${TMDB_IMG}/w500${film.poster_path}` : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative" }}>
      {offset < -20 && <div style={{ position: "absolute", top: "25%", left: 24, fontSize: 42, opacity: indicatorOpacity, color: RED, fontWeight: 900, zIndex: 10, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>✕</div>}
      {offset > 20 && <div style={{ position: "absolute", top: "25%", right: 24, fontSize: 42, opacity: indicatorOpacity, color: GREEN, fontWeight: 900, zIndex: 10, textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>✓</div>}

      {/* Card */}
      <div key={film.tmdb_id}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{
          width: "min(280px, 70vw)", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden",
          position: "relative", boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          transform: exitTransform, opacity: exiting ? 0.7 : opacity,
          transition: exiting ? "transform 0.3s ease-out, opacity 0.3s ease-out" : (offset === 0 ? "transform 0.2s ease-out" : "none"),
          userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y",
        }}>
        {posterUrl ? (
          <img src={posterUrl} loading="lazy" alt={film.title} draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1a1612", display: "flex", alignItems: "center", justifyContent: "center", color: CREAM, opacity: 0.4, fontSize: 14, padding: 16, textAlign: "center" }}>{film.title}</div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "40px 16px 16px", display: "flex", alignItems: "flex-end", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: CREAM, fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{film.title}</div>
            <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 4 }}>{film.year}</div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div style={{ marginTop: 14, fontSize: 11, color: CREAM, opacity: 0.3 }}>swipe to decide</div>

      {/* Swipe buttons */}
      <div style={{ display: "flex", gap: 32, marginTop: 16, alignItems: "center" }}>
        <button onClick={handleBtnLeft} style={swipeBtnStyle(RED)}><span style={{ fontSize: 24 }}>✕</span></button>
        <button onClick={handleBtnRight} style={swipeBtnStyle(GREEN)}><span style={{ fontSize: 24 }}>✓</span></button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 3, marginTop: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 240 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: i < total - remaining ? PURPLE : "rgba(240,235,225,0.15)", transition: "background 0.2s" }} />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// WAITING FOR PARTNER
// ════════════════════════════════════════════════

function WaitingPartnerScreen({ code, role }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 600);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, border: "3px solid rgba(155,89,182,0.2)", borderTopColor: PURPLE, borderRadius: "50%", animation: "mn-spin 0.8s linear infinite" }} />
      <style>{`@keyframes mn-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginTop: 20, fontFamily: t.fontHeadline, fontSize: 18, color: PURPLE, letterSpacing: 1 }}>
        YOU'RE DONE!
      </div>
      <div style={{ marginTop: 8, color: CREAM, opacity: 0.5, fontSize: 14 }}>
        Waiting for your partner to finish{dots}
      </div>
      {code && role === "creator" && (
        <div style={{ marginTop: 20, padding: "12px 20px", borderRadius: 12, background: "rgba(240,235,225,0.04)", border: "1px solid rgba(240,235,225,0.08)" }}>
          <div style={{ fontSize: 11, color: CREAM, opacity: 0.3, marginBottom: 4 }}>Session code</div>
          <div style={{ fontSize: 24, fontWeight: 700, fontFamily: t.fontDisplay, letterSpacing: 6, color: CREAM }}>{code}</div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// REVEAL SCREEN
// ════════════════════════════════════════════════

function RevealScreen({ matches, stack, onClose, onPlayAgain, onToast, userId }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const hasMatches = matches && matches.length > 0;

  if (!hasMatches) {
    // Zero matches — cheeky failure state
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 32px", textAlign: "center",
        animation: "mn-fade-in 0.5s ease-out",
      }}>
        <style>{`@keyframes mn-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📼</div>
        <div style={{ fontFamily: t.fontHeadline, fontSize: 22, color: RED, letterSpacing: 1 }}>
          ZERO MATCHES
        </div>
        <div style={{ marginTop: 10, color: CREAM, opacity: 0.6, fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>
          You two have nothing in common cinematically. Consider new friends.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button onClick={onPlayAgain} style={{
            background: PURPLE, color: "#fff", border: "none", borderRadius: 22,
            padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: t.fontDisplay, letterSpacing: 0.5,
          }}>Shuffle the deck</button>
          <button onClick={onClose} style={{
            background: "rgba(240,235,225,0.08)", color: CREAM, border: "none",
            borderRadius: 22, padding: "12px 20px", fontSize: 14, cursor: "pointer",
            opacity: 0.7,
          }}>Close</button>
        </div>
      </div>
    );
  }

  // Has matches!
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      animation: "mn-fade-in 0.5s ease-out",
    }}>
      <style>{`
        @keyframes mn-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mn-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes mn-confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-120px) rotate(720deg); opacity: 0; } }
      `}</style>

      <div style={{ padding: "24px 20px 8px", textAlign: "center" }}>
        <div style={{ fontFamily: t.fontHeadline, fontSize: 24, color: GREEN, letterSpacing: 2 }}>
          {matches.length === 1 ? "IT'S A MATCH!" : `${matches.length} MATCHES!`}
        </div>
        <div style={{ fontSize: 13, color: CREAM, opacity: 0.5, marginTop: 4 }}>
          {matches.length === 1 ? "You both picked this one." : "You both want to see these."}
        </div>

        {/* Confetti particles */}
        <div style={{ position: "relative", height: 0, overflow: "visible" }}>
          {["🎬", "🍿", "🎥", "✨", "🎞", "⭐"].map((emoji, i) => (
            <span key={i} style={{
              position: "absolute",
              left: `${15 + i * 14}%`,
              top: -10,
              fontSize: 18,
              animation: `mn-confetti ${1.2 + i * 0.15}s ease-out ${i * 0.1}s forwards`,
              pointerEvents: "none",
            }}>{emoji}</span>
          ))}
        </div>
      </div>

      {/* Match posters */}
      <div style={{
        flex: 1, overflow: "auto", padding: "16px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
      }}>
        {matches.map((film, i) => (
          <div key={film.tmdb_id} style={{
            animation: `mn-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + i * 0.15}s backwards`,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            {film.poster_path && (
              <img src={`${TMDB_IMG}/w342${film.poster_path}`} alt={film.title} style={{
                width: matches.length === 1 ? 200 : 150, borderRadius: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }} />
            )}
            <div style={{ marginTop: 10, color: CREAM, fontSize: 16, fontWeight: 700, textAlign: "center" }}>
              {film.title}
            </div>
            <div style={{ color: CREAM, opacity: 0.4, fontSize: 12 }}>{film.year}</div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{
        padding: "12px 24px calc(var(--sab) + 12px)",
        borderTop: "1px solid rgba(240,235,225,0.08)",
        display: "flex", justifyContent: "center", gap: 12, background: DARK,
      }}>
        <button onClick={onPlayAgain} style={{
          background: "rgba(240,235,225,0.08)", color: CREAM, border: "none",
          borderRadius: 20, padding: "10px 20px", fontSize: 13, cursor: "pointer", opacity: 0.7,
        }}>Play again</button>
        <button onClick={onClose} style={{
          background: PURPLE, color: "#fff", border: "none", borderRadius: 20,
          padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>Done</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// LOADING
// ════════════════════════════════════════════════

function LoadingState() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "3px solid rgba(155,89,182,0.2)", borderTopColor: PURPLE, borderRadius: "50%", animation: "mn-spin 0.8s linear infinite" }} />
      <style>{`@keyframes mn-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: CREAM, opacity: 0.5, fontSize: 14 }}>Building your stack…</div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Shared styles — same as Pick a Flick
// ════════════════════════════════════════════════

function swipeBtnStyle(color) {
  return {
    width: 56, height: 56, borderRadius: 28, background: "rgba(240,235,225,0.06)",
    border: `2px solid ${color}`, color, fontSize: 20, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

const pillBtnStyle = {
  background: PURPLE, color: "#fff", border: "none", borderRadius: 20,
  padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
};

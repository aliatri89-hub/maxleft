// src/features/what-to-watch/WhatToWatch.jsx
//
// Full-screen overlay: "What to Watch" — swipe-to-narrow film picker.
// Pulls unwatched films covered by favorite podcasts.
// Props: session, onBack, onToast
//
import { useState, useRef, useCallback, useEffect } from "react";
import { useWhatToWatch } from "./useWhatToWatch";
import { useAudioPlayer } from "../../components/community/shared/AudioPlayerProvider";
import { useBackGesture } from "../../hooks/useBackGesture";
import { getEpisodesForFilm } from "../../hooks/community/useBrowseFeed";
import { resolveAudioUrl, toPlayerEpisode } from "../../utils/episodeUrl";
import { supabase } from "../../supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const SWIPE_THRESHOLD = 80;
const TAP_THRESHOLD = 10;
const TAP_MAX_MS = 300;
const CREAM = "#f0ebe1";
const DARK = "#0f0d0b";
const GREEN = "#4caf50";
const RED = "#e74c3c";
const AMBER = "#d4af37";

function haptic() {
  try { navigator?.vibrate?.(8); } catch {}
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════

export default function WhatToWatch({ session, onBack, onToast, pushNav, removeNav }) {
  const userId = session?.user?.id;
  const { play: playEpisode, addToQueue, currentEp, isPlaying } = useAudioPlayer();
  const {
    phase, pool, currentIndex, currentFilm, kept, round,
    selectedFilm, episodes, epLoading, error, remaining, total,
    start, swipeRight, swipeLeft, nextRound, selectFilm, backToSetup, reset,
  } = useWhatToWatch(userId);

  // ── Coverage peek state ──
  const [peekFilm, setPeekFilm] = useState(null);
  const [peekEpisodes, setPeekEpisodes] = useState(null);
  const [peekLoading, setPeekLoading] = useState(false);

  // ── Back gestures ──
  useBackGesture("wtw-peek", !!peekFilm, () => setPeekFilm(null), pushNav, removeNav);

  const handleClose = useCallback(() => { reset(); onBack(); }, [reset, onBack]);

  // ── Peek at coverage (tap a poster) ──
  const handlePeek = useCallback(async (film) => {
    haptic();
    setPeekFilm(film);
    setPeekEpisodes(null);
    setPeekLoading(true);
    try {
      const eps = await getEpisodesForFilm(film.tmdb_id);
      setPeekEpisodes(eps || []);
    } catch { setPeekEpisodes([]); }
    setPeekLoading(false);
  }, []);

  const closePeek = useCallback(() => { setPeekFilm(null); setPeekEpisodes(null); }, []);

  // ── Play/queue helpers ──
  const handlePlay = useCallback((ep) => {
    const url = resolveAudioUrl(ep);
    if (!url) return;
    const playerEp = toPlayerEpisode(ep);
    if (playerEp) playEpisode(playerEp);
  }, [playEpisode]);

  const handleQueue = useCallback((ep) => {
    const url = resolveAudioUrl(ep);
    if (!url) return;
    const playerEp = toPlayerEpisode(ep);
    if (playerEp) { addToQueue(playerEp); onToast?.("Added to queue"); }
  }, [addToQueue, onToast]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000, background: DARK,
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'Barlow Condensed', -apple-system, sans-serif",
    }}>
      <Header onClose={handleClose} round={round} phase={phase} remaining={remaining} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {phase === "setup" && (
          <SetupScreen userId={userId} onStart={start} />
        )}
        {phase === "loading" && <LoadingState />}
        {phase === "empty" && <EmptyState onClose={handleClose} onBack={backToSetup} />}
        {phase === "swiping" && currentFilm && (
          <SwipeCard film={currentFilm} onSwipeRight={swipeRight} onSwipeLeft={swipeLeft}
            onSelect={selectFilm} onPeek={handlePeek} remaining={remaining} total={total} />
        )}
        {phase === "reviewing" && (
          <ReviewGrid films={kept} round={round} onNextRound={nextRound}
            onSelect={selectFilm} onPeek={handlePeek} />
        )}
        {phase === "selected" && selectedFilm && (
          <SelectedScreen film={selectedFilm} episodes={episodes} epLoading={epLoading}
            userId={userId} onPlayEpisode={handlePlay} onQueueEpisode={handleQueue}
            currentEp={currentEp} isPlaying={isPlaying} onToast={onToast}
            onClose={handleClose} onStartOver={() => { closePeek(); backToSetup(); }} />
        )}
        {error && (
          <div style={{ padding: 32, textAlign: "center", color: CREAM }}>
            <p style={{ opacity: 0.7 }}>{error}</p>
            <button onClick={backToSetup} style={pillBtnStyle}>Try Again</button>
          </div>
        )}
      </div>

      {/* Coverage peek sheet */}
      {peekFilm && (
        <CoverageSheet film={peekFilm} episodes={peekEpisodes} loading={peekLoading}
          onClose={closePeek} onSelect={() => { closePeek(); selectFilm(peekFilm); }}
          onPlay={handlePlay} onQueue={handleQueue} currentEp={currentEp} isPlaying={isPlaying} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════

function Header({ onClose, round, phase, remaining }) {
  return (
    <div style={{
      padding: "env(safe-area-inset-top, 12px) 16px 10px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: "1px solid rgba(240,235,225,0.08)",
    }}>
      <button onClick={onClose} style={{
        background: "none", border: "none", color: CREAM, fontSize: 16,
        padding: "8px 4px", cursor: "pointer", opacity: 0.7,
      }}>✕</button>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16, color: AMBER, letterSpacing: 1,
        }}>WHAT TO WATCH</div>
        {phase === "swiping" && (
          <div style={{ fontSize: 11, color: CREAM, opacity: 0.4, marginTop: 2 }}>
            {round > 1 ? `Round ${round} · ` : ""}{remaining} left
          </div>
        )}
      </div>
      <div style={{ width: 32 }} />
    </div>
  );
}

// ════════════════════════════════════════════════
// SWIPE CARD
// ════════════════════════════════════════════════

function SwipeCard({ film, onSwipeRight, onSwipeLeft, onSelect, onPeek, remaining, total }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isVertical = useRef(false);
  const hasMoved = useRef(false);
  const touchHandled = useRef(false); // prevent click from double-firing
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
    const wasTap = !hasMoved.current && (Date.now() - startTime.current) < TAP_MAX_MS;
    if (wasTap) {
      isDragging.current = false; currentX.current = 0; setOffset(0);
      touchHandled.current = true;
      onPeek(film); return;
    }
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
  }, [onSwipeRight, onSwipeLeft, onPeek, film]);

  // Click fallback for tap — fires after touchend on mobile, primary on desktop
  const handleClick = useCallback(() => {
    if (touchHandled.current) { touchHandled.current = false; return; }
    onPeek(film);
  }, [onPeek, film]);

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
        onClick={handleClick}
        style={{
          width: "min(280px, 70vw)", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden",
          position: "relative", boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          transform: exitTransform, opacity: exiting ? 0.7 : opacity,
          transition: exiting ? "transform 0.3s ease-out, opacity 0.3s ease-out" : (offset === 0 ? "transform 0.2s ease-out" : "none"),
          userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y",
        }}>
        {posterUrl ? (
          <img src={posterUrl} alt={film.title} draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#1a1612", display: "flex", alignItems: "center", justifyContent: "center", color: CREAM, opacity: 0.4, fontSize: 14, padding: 16, textAlign: "center" }}>{film.title}</div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "40px 16px 16px", display: "flex", alignItems: "flex-end", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: CREAM, fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{film.title}</div>
            <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 4 }}>
              {film.year}{film.podcast_count > 1 ? ` · ${film.podcast_count} podcasts` : ""}
            </div>
          </div>
          <button
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => { e.stopPropagation(); haptic(); onPeek(film); }}
            onClick={(e) => { e.stopPropagation(); onPeek(film); }}
            style={{
              width: 38, height: 38, borderRadius: 19, flexShrink: 0,
              background: "rgba(240,235,225,0.12)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hints + select */}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontSize: 11, color: CREAM, opacity: 0.3 }}>swipe to decide</div>
        <button onClick={() => { haptic(); onSelect(film); }} style={{
          background: "none", border: `1px solid ${AMBER}`, color: AMBER, borderRadius: 20,
          padding: "8px 20px", fontSize: 13, cursor: "pointer",
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 0.5,
        }}>This one →</button>
      </div>

      {/* Swipe buttons */}
      <div style={{ display: "flex", gap: 32, marginTop: 16, alignItems: "center" }}>
        <button onClick={handleBtnLeft} style={swipeBtnStyle(RED)}><span style={{ fontSize: 24 }}>✕</span></button>
        <button onClick={handleBtnRight} style={swipeBtnStyle(GREEN)}><span style={{ fontSize: 24 }}>✓</span></button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 3, marginTop: 12, flexWrap: "wrap", justifyContent: "center", maxWidth: 240 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: i < total - remaining ? AMBER : "rgba(240,235,225,0.15)", transition: "background 0.2s" }} />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// COVERAGE SHEET — tap a poster to peek at episodes
// ════════════════════════════════════════════════

function CoverageSheet({ film, episodes, loading, onClose, onSelect, onPlay, onQueue, currentEp, isPlaying }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9500, display: "flex", flexDirection: "column" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
      <div style={{
        background: "#1a1612", borderRadius: "16px 16px 0 0", maxHeight: "70vh",
        display: "flex", flexDirection: "column",
        animation: "w2w-slide-up 0.25s ease-out",
      }}>
        <style>{`@keyframes w2w-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Header */}
        <div style={{
          padding: "16px 20px 12px", borderBottom: "1px solid rgba(240,235,225,0.08)",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          {film.poster_path && (
            <img src={`${TMDB_IMG}/w154${film.poster_path}`} alt="" style={{ width: 48, height: 72, borderRadius: 6, objectFit: "cover" }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: CREAM, fontSize: 16, fontWeight: 700 }}>{film.title}</div>
            <div style={{ color: CREAM, opacity: 0.5, fontSize: 12, marginTop: 2 }}>
              {film.year}{film.genre ? ` · ${film.genre}` : ""}
            </div>
          </div>
          <button onClick={onSelect} style={{
            background: AMBER, color: DARK, border: "none", borderRadius: 16,
            padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, flexShrink: 0,
          }}>Pick this</button>
        </div>

        {/* Episodes */}
        <div style={{ flex: 1, overflow: "auto", padding: "4px 0 calc(env(safe-area-inset-bottom, 8px) + 8px)" }}>
          {loading && <div style={{ padding: 24, textAlign: "center", color: CREAM, opacity: 0.4, fontSize: 13 }}>Loading coverage…</div>}
          {!loading && episodes && episodes.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: CREAM, opacity: 0.4, fontSize: 13 }}>No episodes found</div>
          )}
          {episodes && episodes.map((ep, i) => (
            <EpisodeRow key={ep.episode_id || i} ep={ep}
              onPlay={() => onPlay(ep)} onQueue={() => onQueue(ep)}
              isCurrent={currentEp?.id === (ep.episode_id || ep.id)} isPlaying={isPlaying} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// REVIEW GRID
// ════════════════════════════════════════════════

function ReviewGrid({ films, round, onNextRound, onSelect, onPeek }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 8px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, color: AMBER }}>
          {films.length === 2 ? "Final two!" : `${films.length} contenders`}
        </div>
        <div style={{ fontSize: 13, color: CREAM, opacity: 0.4, marginTop: 4 }}>
          Tap to pick · long-press for coverage
        </div>
      </div>

      <div style={{
        flex: 1, overflow: "auto", padding: "8px 16px 16px",
        display: "grid",
        gridTemplateColumns: films.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: 12, alignContent: "start",
      }}>
        {films.map(film => (
          <ReviewPoster key={film.tmdb_id} film={film}
            onSelect={() => { haptic(); onSelect(film); }}
            onPeek={() => onPeek(film)} />
        ))}
      </div>

      {films.length > 2 && (
        <div style={{
          padding: "12px 24px calc(env(safe-area-inset-bottom, 12px) + 12px)",
          borderTop: "1px solid rgba(240,235,225,0.08)",
          display: "flex", justifyContent: "center", background: DARK, flexShrink: 0,
        }}>
          <button onClick={() => { haptic(); onNextRound(); }} style={{
            background: AMBER, color: DARK, border: "none", borderRadius: 24,
            padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 0.5,
          }}>Keep narrowing →</button>
        </div>
      )}
    </div>
  );
}

function ReviewPoster({ film, onSelect, onPeek }) {
  const timerRef = useRef(null);
  const didLongPress = useRef(false);

  const handleTouchStart = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => { didLongPress.current = true; haptic(); onPeek(); }, 500);
  }, [onPeek]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!didLongPress.current) onSelect();
  }, [onSelect]);

  const handleTouchMove = useCallback(() => { clearTimeout(timerRef.current); }, []);

  return (
    <button onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove}
      onClick={(e) => e.preventDefault()}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer",
        borderRadius: 8, overflow: "hidden", position: "relative",
        aspectRatio: "2/3", boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        WebkitUserSelect: "none", userSelect: "none",
      }}>
      <img src={`${TMDB_IMG}/w342${film.poster_path}`} alt={film.title} draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "24px 8px 8px",
      }}>
        <div style={{ color: CREAM, fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{film.title}</div>
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════
// SELECTED SCREEN
// ════════════════════════════════════════════════

function SelectedScreen({ film, episodes, epLoading, userId, onPlayEpisode, onQueueEpisode, currentEp, isPlaying, onToast, onClose, onStartOver }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!userId || saving || saved) return;
    setSaving(true);
    try {
      const coverUrl = film.poster_path ? `${TMDB_IMG}/w342${film.poster_path}` : null;
      const { error } = await supabase.from("wishlist").insert({
        user_id: userId,
        item_type: "movie",
        title: film.title,
        cover_url: coverUrl,
        year: film.year || null,
      });
      if (error) throw error;
      setSaved(true);
      onToast?.("Added to watchlist");
    } catch { onToast?.("Couldn't save — try again"); }
    setSaving(false);
  }, [userId, film, saving, saved, onToast]);

  const posterUrl = film.poster_path ? `${TMDB_IMG}/w500${film.poster_path}` : null;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 0 120px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 24px 16px" }}>
        {posterUrl && <img src={posterUrl} alt={film.title} style={{ width: 180, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }} />}
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: GREEN, marginTop: 16, letterSpacing: 2 }}>TONIGHT'S PICK</div>
        <div style={{ color: CREAM, fontSize: 22, fontWeight: 700, marginTop: 4, textAlign: "center" }}>{film.title}</div>
        <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 4 }}>{film.year}{film.genre ? ` · ${film.genre}` : ""}</div>
        {film.overview && (
          <div style={{ color: CREAM, opacity: 0.5, fontSize: 12, marginTop: 12, lineHeight: 1.5, textAlign: "center", maxWidth: 320 }}>
            {film.overview.length > 200 ? film.overview.slice(0, 200) + "…" : film.overview}
          </div>
        )}
        <button onClick={handleSave} disabled={saving || saved} style={{
          marginTop: 16, background: saved ? "rgba(76,175,80,0.15)" : "rgba(212,175,55,0.12)",
          border: `1px solid ${saved ? GREEN : AMBER}`, color: saved ? GREEN : AMBER,
          borderRadius: 20, padding: "10px 24px", fontSize: 14, fontWeight: 600,
          cursor: saved ? "default" : "pointer", opacity: saving ? 0.5 : 1,
        }}>{saved ? "✓ On watch list" : saving ? "Saving…" : "Add to watch list"}</button>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: AMBER, marginBottom: 12, paddingLeft: 4, letterSpacing: 2 }}>PODCAST COVERAGE</div>
        {epLoading && <div style={{ color: CREAM, opacity: 0.4, fontSize: 13, textAlign: "center", padding: 20 }}>Loading episodes…</div>}
        {!epLoading && episodes && episodes.length === 0 && (
          <div style={{ color: CREAM, opacity: 0.4, fontSize: 13, textAlign: "center", padding: 20 }}>No episodes found</div>
        )}
        {episodes && episodes.map((ep, i) => (
          <EpisodeRow key={ep.episode_id || i} ep={ep}
            onPlay={() => onPlayEpisode(ep)} onQueue={() => onQueueEpisode(ep)}
            isCurrent={currentEp?.id === (ep.episode_id || ep.id)} isPlaying={isPlaying} />
        ))}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "12px 24px calc(env(safe-area-inset-bottom, 16px) + 12px)",
        background: `linear-gradient(transparent, ${DARK} 30%)`,
        display: "flex", justifyContent: "center", gap: 12,
      }}>
        <button onClick={onStartOver} style={{
          background: "rgba(240,235,225,0.08)", color: CREAM, border: "none",
          borderRadius: 20, padding: "10px 20px", fontSize: 13, cursor: "pointer", opacity: 0.7,
        }}>Start over</button>
        <button onClick={onClose} style={{
          background: AMBER, color: DARK, border: "none", borderRadius: 20,
          padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>Done</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// EPISODE ROW
// ════════════════════════════════════════════════

function EpisodeRow({ ep, onPlay, onQueue, isCurrent, isPlaying }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: "1px solid rgba(240,235,225,0.06)" }}>
      {ep.podcast_artwork_url && (
        <img src={ep.podcast_artwork_url} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: CREAM, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ep.episode_title || ep.podcast_name}
        </div>
        <div style={{ color: CREAM, opacity: 0.4, fontSize: 11, marginTop: 2 }}>
          {ep.podcast_name}{ep.podcast_tier === "deep" ? " · deep dive" : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onPlay} style={{
          width: 36, height: 36, borderRadius: 18,
          background: isCurrent ? "rgba(76,175,80,0.15)" : "rgba(240,235,225,0.08)",
          border: "none", color: isCurrent && isPlaying ? GREEN : CREAM,
          fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>{isCurrent && isPlaying ? "❚❚" : "▶"}</button>
        <button onClick={onQueue} style={{
          width: 36, height: 36, borderRadius: 18, background: "rgba(240,235,225,0.08)",
          border: "none", color: CREAM, opacity: 0.6, fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} title="Add to queue">+Q</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// LOADING + EMPTY
// ════════════════════════════════════════════════

// ════════════════════════════════════════════════
// SETUP SCREEN — pick podcasts + pool size
// ════════════════════════════════════════════════

const POOL_SIZES = [10, 20, 30];

function SetupScreen({ userId, onStart }) {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set()); // empty = all
  const [allSelected, setAllSelected] = useState(true);
  const [poolSize, setPoolSize] = useState(20);

  // Load favorite podcasts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_podcast_favorites")
        .select("podcast_id, podcasts(id, name, slug, artwork_url)")
        .eq("user_id", userId);
      if (!cancelled && !error && data) {
        const pods = data
          .map(r => r.podcasts)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));
        setPodcasts(pods);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const togglePodcast = useCallback((id) => {
    setAllSelected(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // If all are now selected, switch to "all" mode
      if (next.size === podcasts.length) {
        setAllSelected(true);
        return new Set();
      }
      // If none selected, switch to "all" mode
      if (next.size === 0) {
        setAllSelected(true);
      }
      return next;
    });
  }, [podcasts.length]);

  const toggleAll = useCallback(() => {
    setAllSelected(true);
    setSelectedIds(new Set());
  }, []);

  const handleGo = useCallback(() => {
    haptic();
    const podcastIds = allSelected ? null : Array.from(selectedIds);
    onStart({ poolSize, podcastIds });
  }, [allSelected, selectedIds, poolSize, onStart]);

  const canGo = allSelected || selectedIds.size > 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 120px" }}>

        {/* Podcasts */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 2,
          color: AMBER, marginBottom: 12, letterSpacing: 0.5,
        }}>PICK YOUR PODCASTS</div>

        {loading && (
          <div style={{ color: CREAM, opacity: 0.4, fontSize: 13, padding: 16, textAlign: "center" }}>
            Loading podcasts…
          </div>
        )}

        {!loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
            {/* All button */}
            <button onClick={toggleAll} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 10,
              background: allSelected ? "rgba(212,175,55,0.15)" : "rgba(240,235,225,0.04)",
              border: `1.5px solid ${allSelected ? AMBER : "rgba(240,235,225,0.1)"}`,
              color: allSelected ? AMBER : CREAM, fontSize: 13, fontWeight: 600,
              cursor: "pointer", opacity: allSelected ? 1 : 0.6,
            }}>All</button>

            {podcasts.map(p => {
              const isOn = !allSelected && selectedIds.has(p.id);
              return (
                <button key={p.id} onClick={() => togglePodcast(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 12px", borderRadius: 10,
                  background: isOn ? "rgba(212,175,55,0.15)" : "rgba(240,235,225,0.04)",
                  border: `1.5px solid ${isOn ? AMBER : "rgba(240,235,225,0.1)"}`,
                  color: isOn ? AMBER : CREAM, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", opacity: isOn || allSelected ? 1 : 0.5,
                  transition: "all 0.15s ease",
                }}>
                  {p.artwork_url && (
                    <img src={p.artwork_url} alt="" style={{
                      width: 24, height: 24, borderRadius: 5, objectFit: "cover",
                    }} />
                  )}
                  <span style={{ whiteSpace: "nowrap" }}>{p.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Pool size */}
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 2,
          color: AMBER, marginBottom: 12, letterSpacing: 0.5,
        }}>HOW MANY TO SWIPE?</div>

        <div style={{ display: "flex", gap: 10 }}>
          {POOL_SIZES.map(size => (
            <button key={size} onClick={() => { haptic(); setPoolSize(size); }} style={{
              flex: 1, padding: "14px 0", borderRadius: 10, fontSize: 20, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              background: poolSize === size ? "rgba(212,175,55,0.15)" : "rgba(240,235,225,0.04)",
              border: `1.5px solid ${poolSize === size ? AMBER : "rgba(240,235,225,0.1)"}`,
              color: poolSize === size ? AMBER : CREAM,
              cursor: "pointer", opacity: poolSize === size ? 1 : 0.5,
              transition: "all 0.15s ease",
            }}>{size}</button>
          ))}
        </div>
      </div>

      {/* Go button */}
      <div style={{
        padding: "12px 24px calc(env(safe-area-inset-bottom, 16px) + 12px)",
        borderTop: "1px solid rgba(240,235,225,0.08)",
        display: "flex", justifyContent: "center", background: DARK,
      }}>
        <button onClick={handleGo} disabled={!canGo} style={{
          background: canGo ? AMBER : "rgba(240,235,225,0.08)",
          color: canGo ? DARK : CREAM,
          border: "none", borderRadius: 24, padding: "14px 40px",
          fontSize: 17, fontWeight: 700, cursor: canGo ? "pointer" : "default",
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1,
          opacity: canGo ? 1 : 0.4,
        }}>LET'S GO</button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, border: "3px solid rgba(212,175,55,0.2)", borderTopColor: AMBER, borderRadius: "50%", animation: "w2w-spin 0.8s linear infinite" }} />
      <style>{`@keyframes w2w-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: CREAM, opacity: 0.5, fontSize: 14 }}>Finding suggestions…</div>
    </div>
  );
}

function EmptyState({ onClose, onBack }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📼</div>
      <div style={{ color: CREAM, fontSize: 16, fontWeight: 600 }}>No films found!</div>
      <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 8, maxWidth: 260 }}>
        Try different podcasts or a larger pool size.
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {onBack && <button onClick={onBack} style={{ ...pillBtnStyle, background: "rgba(240,235,225,0.08)", color: CREAM }}>Change settings</button>}
        <button onClick={onClose} style={pillBtnStyle}>Close</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Shared styles
// ════════════════════════════════════════════════

function swipeBtnStyle(color) {
  return {
    width: 56, height: 56, borderRadius: 28, background: "rgba(240,235,225,0.06)",
    border: `2px solid ${color}`, color, fontSize: 20, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

const pillBtnStyle = {
  background: AMBER, color: DARK, border: "none", borderRadius: 20,
  padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
};

// src/features/what-to-watch/WhatToWatch.jsx
//
// Full-screen overlay: "What to Watch" — swipe-to-narrow film picker.
// Pulls unwatched films covered by favorite podcasts.
// Props: session, onBack, onToast, onPlayEpisode, onQueueEpisode, currentEp, isPlaying
//
import { useState, useRef, useCallback, useEffect } from "react";
import { useWhatToWatch } from "./useWhatToWatch";
import { useAudioPlayer } from "../../components/community/shared/AudioPlayerProvider";
import { resolveAudioUrl, toPlayerEpisode } from "../../utils/episodeUrl";
import { upsertMediaLog } from "../../utils/mediaWrite";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const SWIPE_THRESHOLD = 80;
const CREAM = "#f0ebe1";
const DARK = "#0f0d0b";
const GREEN = "#4caf50";
const RED = "#e74c3c";
const AMBER = "#d4af37";

// ── Haptic helper ──
function tap() {
  try { navigator?.vibrate?.(8); } catch {}
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════

export default function WhatToWatch({ session, onBack, onToast }) {
  const userId = session?.user?.id;
  const { play: playEpisode, addToQueue, currentEp, isPlaying } = useAudioPlayer();
  const {
    phase, pool, currentIndex, currentFilm, kept, round,
    selectedFilm, episodes, epLoading, error, remaining, total,
    start, swipeRight, swipeLeft, nextRound, selectFilm, reset,
  } = useWhatToWatch(userId);

  // Auto-start on mount
  useEffect(() => { if (userId) start(); }, [userId, start]);

  // ── Close handler ──
  const handleClose = useCallback(() => {
    reset();
    onBack();
  }, [reset, onBack]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: DARK,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <Header onClose={handleClose} round={round} phase={phase} remaining={remaining} total={total} />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {phase === "loading" && <LoadingState />}
        {phase === "empty" && <EmptyState onClose={handleClose} />}
        {phase === "swiping" && currentFilm && (
          <SwipeCard
            film={currentFilm}
            onSwipeRight={swipeRight}
            onSwipeLeft={swipeLeft}
            onSelect={selectFilm}
            remaining={remaining}
            total={total}
          />
        )}
        {phase === "reviewing" && (
          <ReviewGrid
            films={kept}
            round={round}
            onNextRound={nextRound}
            onSelect={selectFilm}
          />
        )}
        {phase === "selected" && selectedFilm && (
          <SelectedScreen
            film={selectedFilm}
            episodes={episodes}
            epLoading={epLoading}
            userId={userId}
            onPlayEpisode={playEpisode}
            onQueueEpisode={addToQueue}
            currentEp={currentEp}
            isPlaying={isPlaying}
            onToast={onToast}
            onClose={handleClose}
            onStartOver={() => start()}
          />
        )}
        {error && (
          <div style={{ padding: 32, textAlign: "center", color: CREAM }}>
            <p style={{ opacity: 0.7 }}>{error}</p>
            <button onClick={start} style={pillBtnStyle}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════

function Header({ onClose, round, phase, remaining, total }) {
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
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 16, color: AMBER, letterSpacing: 1,
        }}>WHAT TO WATCH</div>
        {phase === "swiping" && (
          <div style={{ fontSize: 11, color: CREAM, opacity: 0.4, marginTop: 2 }}>
            {round > 1 ? `Round ${round} · ` : ""}{remaining} left
          </div>
        )}
      </div>

      <div style={{ width: 32 }} /> {/* spacer for centering */}
    </div>
  );
}

// ════════════════════════════════════════════════
// SWIPE CARD — the core interaction
// ════════════════════════════════════════════════

function SwipeCard({ film, onSwipeRight, onSwipeLeft, onSelect, remaining, total }) {
  const cardRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isVertical = useRef(false);
  const [offset, setOffset] = useState(0);
  const [exiting, setExiting] = useState(null); // "left" | "right" | null
  const [animKey, setAnimKey] = useState(film.tmdb_id);

  // Reset on new film
  useEffect(() => {
    setOffset(0);
    setExiting(null);
    setAnimKey(film.tmdb_id);
  }, [film.tmdb_id]);

  const handleTouchStart = useCallback((e) => {
    isDragging.current = true;
    isVertical.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Lock direction on first significant move
    if (!isVertical.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      isVertical.current = true;
      isDragging.current = false;
      setOffset(0);
      return;
    }

    currentX.current = dx;
    setOffset(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current && !currentX.current) return;
    isDragging.current = false;

    const dx = currentX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? "right" : "left";
      setExiting(dir);
      tap();
      setTimeout(() => {
        if (dir === "right") onSwipeRight();
        else onSwipeLeft();
      }, 250);
    } else {
      setOffset(0);
    }
    currentX.current = 0;
  }, [onSwipeRight, onSwipeLeft]);

  // Button swipes
  const handleBtnLeft = useCallback(() => {
    tap();
    setExiting("left");
    setTimeout(onSwipeLeft, 250);
  }, [onSwipeLeft]);

  const handleBtnRight = useCallback(() => {
    tap();
    setExiting("right");
    setTimeout(onSwipeRight, 250);
  }, [onSwipeRight]);

  const rotation = offset * 0.06;
  const opacity = 1 - Math.min(Math.abs(offset) / 300, 0.5);
  const indicatorOpacity = Math.min(Math.abs(offset) / SWIPE_THRESHOLD, 1);

  const exitTransform = exiting === "left"
    ? "translateX(-120vw) rotate(-20deg)"
    : exiting === "right"
      ? "translateX(120vw) rotate(20deg)"
      : `translateX(${offset}px) rotate(${rotation}deg)`;

  const posterUrl = film.poster_path ? `${TMDB_IMG}/w500${film.poster_path}` : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative" }}>

      {/* Swipe indicators */}
      {offset < -20 && (
        <div style={{
          position: "absolute", top: "25%", left: 24,
          fontSize: 42, opacity: indicatorOpacity,
          color: RED, fontWeight: 900, zIndex: 10,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}>✕</div>
      )}
      {offset > 20 && (
        <div style={{
          position: "absolute", top: "25%", right: 24,
          fontSize: 42, opacity: indicatorOpacity,
          color: GREEN, fontWeight: 900, zIndex: 10,
          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}>✓</div>
      )}

      {/* The card */}
      <div
        key={animKey}
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "min(280px, 70vw)",
          aspectRatio: "2/3",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          transform: exitTransform,
          opacity: exiting ? 0.7 : opacity,
          transition: exiting
            ? "transform 0.3s ease-out, opacity 0.3s ease-out"
            : (offset === 0 ? "transform 0.2s ease-out" : "none"),
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "pan-y",
        }}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={film.title}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%", background: "#1a1612",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: CREAM, opacity: 0.4, fontSize: 14, padding: 16, textAlign: "center",
          }}>{film.title}</div>
        )}

        {/* Bottom gradient overlay with title */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
          padding: "40px 16px 16px",
        }}>
          <div style={{ color: CREAM, fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
            {film.title}
          </div>
          <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 4 }}>
            {film.year}{film.podcast_count > 1 ? ` · ${film.podcast_count} podcasts` : ""}
          </div>
        </div>
      </div>

      {/* Tap to select hint */}
      <button
        onClick={() => { tap(); onSelect(film); }}
        style={{
          marginTop: 16, background: "none", border: `1px solid ${AMBER}`,
          color: AMBER, borderRadius: 20, padding: "8px 20px",
          fontSize: 13, cursor: "pointer", fontFamily: "'Permanent Marker', cursive",
          letterSpacing: 0.5,
        }}
      >
        This one →
      </button>

      {/* Swipe buttons */}
      <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
        <button onClick={handleBtnLeft} style={swipeBtnStyle(RED)}>
          <span style={{ fontSize: 24 }}>✕</span>
        </button>
        <button onClick={handleBtnRight} style={swipeBtnStyle(GREEN)}>
          <span style={{ fontSize: 24 }}>✓</span>
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 3, marginTop: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 240 }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: 3,
            background: i < total - remaining
              ? (i < total - remaining ? AMBER : CREAM)
              : "rgba(240,235,225,0.15)",
            transition: "background 0.2s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// REVIEW GRID — whittle screen between rounds
// ════════════════════════════════════════════════

function ReviewGrid({ films, round, onNextRound, onSelect }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 8px", textAlign: "center" }}>
        <div style={{
          fontFamily: "'Permanent Marker', cursive", fontSize: 18,
          color: AMBER,
        }}>
          {films.length === 2 ? "Final two!" : `${films.length} contenders`}
        </div>
        <div style={{ fontSize: 13, color: CREAM, opacity: 0.4, marginTop: 4 }}>
          Tap a poster to pick it — or keep narrowing
        </div>
      </div>

      <div style={{
        flex: 1, overflow: "auto", padding: "8px 16px 100px",
        display: "grid",
        gridTemplateColumns: films.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: 12, alignContent: "start",
      }}>
        {films.map(film => (
          <button
            key={film.tmdb_id}
            onClick={() => { tap(); onSelect(film); }}
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              borderRadius: 8, overflow: "hidden", position: "relative",
              aspectRatio: "2/3",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src={`${TMDB_IMG}/w342${film.poster_path}`}
              alt={film.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              padding: "24px 8px 8px",
            }}>
              <div style={{ color: CREAM, fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>
                {film.title}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Keep narrowing button */}
      {films.length > 2 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "16px 24px calc(env(safe-area-inset-bottom, 16px) + 16px)",
          background: `linear-gradient(transparent, ${DARK} 30%)`,
          display: "flex", justifyContent: "center",
        }}>
          <button onClick={() => { tap(); onNextRound(); }} style={{
            background: AMBER, color: DARK, border: "none",
            borderRadius: 24, padding: "12px 28px",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Permanent Marker', cursive", letterSpacing: 0.5,
          }}>
            Keep narrowing →
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// SELECTED SCREEN — film chosen, show episodes
// ════════════════════════════════════════════════

function SelectedScreen({ film, episodes, epLoading, userId, onPlayEpisode, onQueueEpisode, currentEp, isPlaying, onToast, onClose, onStartOver }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveToWatchlist = useCallback(async () => {
    if (!userId || saving || saved) return;
    setSaving(true);
    try {
      await upsertMediaLog(userId, {
        mediaType: "film",
        tmdbId: film.tmdb_id,
        title: film.title,
        year: film.year,
        posterPath: film.poster_path,
        backdropPath: film.backdrop_path,
        status: "want_to_watch",
      });
      setSaved(true);
      onToast?.("Added to watchlist");
    } catch {
      onToast?.("Couldn't save — try again");
    }
    setSaving(false);
  }, [userId, film, saving, saved, onToast]);

  const handlePlay = useCallback((ep) => {
    if (!onPlayEpisode) return;
    const url = resolveAudioUrl(ep);
    if (!url) return;
    const playerEp = toPlayerEpisode(ep);
    if (playerEp) onPlayEpisode(playerEp);
  }, [onPlayEpisode]);

  const handleQueue = useCallback((ep) => {
    if (!onQueueEpisode) return;
    const url = resolveAudioUrl(ep);
    if (!url) return;
    const playerEp = toPlayerEpisode(ep);
    if (playerEp) {
      onQueueEpisode(playerEp);
      onToast?.("Added to queue");
    }
  }, [onQueueEpisode, onToast]);

  const posterUrl = film.poster_path ? `${TMDB_IMG}/w500${film.poster_path}` : null;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 0 120px" }}>
      {/* Hero */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 24px 16px" }}>
        {posterUrl && (
          <img src={posterUrl} alt={film.title} style={{
            width: 180, borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }} />
        )}
        <div style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 14, color: GREEN, marginTop: 16, letterSpacing: 1,
        }}>TONIGHT'S PICK</div>
        <div style={{ color: CREAM, fontSize: 22, fontWeight: 700, marginTop: 4, textAlign: "center" }}>
          {film.title}
        </div>
        <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 4 }}>
          {film.year}{film.genre ? ` · ${film.genre}` : ""}
        </div>

        {film.overview && (
          <div style={{
            color: CREAM, opacity: 0.5, fontSize: 12, marginTop: 12,
            lineHeight: 1.5, textAlign: "center", maxWidth: 320,
          }}>
            {film.overview.length > 200 ? film.overview.slice(0, 200) + "…" : film.overview}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSaveToWatchlist}
          disabled={saving || saved}
          style={{
            marginTop: 16,
            background: saved ? "rgba(76,175,80,0.15)" : "rgba(212,175,55,0.12)",
            border: `1px solid ${saved ? GREEN : AMBER}`,
            color: saved ? GREEN : AMBER,
            borderRadius: 20, padding: "10px 24px",
            fontSize: 14, fontWeight: 600, cursor: saved ? "default" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saved ? "✓ On watchlist" : saving ? "Saving…" : "Add to watchlist"}
        </button>
      </div>

      {/* Episodes */}
      <div style={{ padding: "0 16px" }}>
        <div style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 14, color: AMBER, marginBottom: 12, paddingLeft: 4,
        }}>PODCAST COVERAGE</div>

        {epLoading && (
          <div style={{ color: CREAM, opacity: 0.4, fontSize: 13, textAlign: "center", padding: 20 }}>
            Loading episodes…
          </div>
        )}

        {!epLoading && episodes && episodes.length === 0 && (
          <div style={{ color: CREAM, opacity: 0.4, fontSize: 13, textAlign: "center", padding: 20 }}>
            No episodes found
          </div>
        )}

        {episodes && episodes.map((ep, i) => (
          <EpisodeRow
            key={ep.episode_id || i}
            ep={ep}
            onPlay={() => handlePlay(ep)}
            onQueue={() => handleQueue(ep)}
            isCurrent={currentEp?.id === (ep.episode_id || ep.id)}
            isPlaying={isPlaying}
          />
        ))}
      </div>

      {/* Bottom actions */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "12px 24px calc(env(safe-area-inset-bottom, 16px) + 12px)",
        background: `linear-gradient(transparent, ${DARK} 30%)`,
        display: "flex", justifyContent: "center", gap: 12,
      }}>
        <button onClick={onStartOver} style={{
          background: "rgba(240,235,225,0.08)", color: CREAM,
          border: "none", borderRadius: 20, padding: "10px 20px",
          fontSize: 13, cursor: "pointer", opacity: 0.7,
        }}>Start over</button>
        <button onClick={onClose} style={{
          background: AMBER, color: DARK,
          border: "none", borderRadius: 20, padding: "10px 24px",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
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
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 8px",
      borderBottom: "1px solid rgba(240,235,225,0.06)",
    }}>
      {ep.podcast_artwork_url && (
        <img src={ep.podcast_artwork_url} alt="" style={{
          width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0,
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: CREAM, fontSize: 13, fontWeight: 600,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
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
          fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isCurrent && isPlaying ? "❚❚" : "▶"}
        </button>
        <button onClick={onQueue} style={{
          width: 36, height: 36, borderRadius: 18,
          background: "rgba(240,235,225,0.08)",
          border: "none", color: CREAM, opacity: 0.6,
          fontSize: 12, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} title="Add to queue">+Q</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// EMPTY + LOADING states
// ════════════════════════════════════════════════

function LoadingState() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{
        width: 48, height: 48, border: `3px solid rgba(212,175,55,0.2)`,
        borderTopColor: AMBER, borderRadius: "50%",
        animation: "w2w-spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes w2w-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ color: CREAM, opacity: 0.5, fontSize: 14 }}>
        Finding suggestions…
      </div>
    </div>
  );
}

function EmptyState({ onClose }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📼</div>
      <div style={{ color: CREAM, fontSize: 16, fontWeight: 600 }}>
        You've seen everything!
      </div>
      <div style={{ color: CREAM, opacity: 0.5, fontSize: 13, marginTop: 8, maxWidth: 260 }}>
        Your favorite podcasts don't have any unwatched films left for you. Nice work.
      </div>
      <button onClick={onClose} style={{ ...pillBtnStyle, marginTop: 24 }}>Close</button>
    </div>
  );
}

// ════════════════════════════════════════════════
// Shared styles
// ════════════════════════════════════════════════

function swipeBtnStyle(color) {
  return {
    width: 56, height: 56, borderRadius: 28,
    background: "rgba(240,235,225,0.06)",
    border: `2px solid ${color}`,
    color, fontSize: 20, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "transform 0.1s",
  };
}

const pillBtnStyle = {
  background: AMBER, color: DARK,
  border: "none", borderRadius: 20, padding: "10px 24px",
  fontSize: 14, fontWeight: 700, cursor: "pointer",
};

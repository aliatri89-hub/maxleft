import { useState, useEffect, useRef, memo } from "react";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { apiProxy } from "../../utils/api";
import { isPatreonUrl } from "./FeedPrimitives";
import { toPlayerEpisode, resolveAudioUrl } from "../../utils/episodeUrl";
import { supabase } from "../../supabase";

// ════════════════════════════════════════════════
// PODCAST CARD — episode-first card with deep-cut backdrop
// Leads with podcast artwork, episode title + first-sentence desc,
// film backdrop behind at low opacity, play button primary action.
// ════════════════════════════════════════════════

const TMDB_BD = "https://image.tmdb.org/t/p/w780";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Deep-cut backdrop cache (module-level, survives re-renders) ──
const _deepCutCache = new Map();

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function fmtDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return "";
  const [y, m, d] = dateStr.split("-");
  const mi = parseInt(m, 10);
  if (!mi || mi < 1 || mi > 12) return "";
  return `${MONTHS[mi - 1]} ${parseInt(d, 10)}`;
}

function firstSentence(html) {
  if (!html) return "";
  // Strip HTML tags
  const text = html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
  // Find first sentence boundary
  const match = text.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match ? match[1] : text.slice(0, 140);
  return sentence.length > 160 ? sentence.slice(0, 157) + "…" : sentence;
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PodcastCard({ item, isAdmin, onUnlinked }) {
  const {
    episode_id, episode_title, episode_description, episode_air_date,
    audio_url, audio_status, duration_seconds,
    podcast_name, podcast_slug, podcast_artwork,
    tmdb_id, film_title, film_year, backdrop_path,
  } = item;

  const [dismissed, setDismissed] = useState(false);

  const [backdropUrl, setBackdropUrl] = useState(() => {
    // Check deep-cut cache synchronously
    const cacheKey = `${tmdb_id}:${podcast_slug}`;
    if (_deepCutCache.has(cacheKey)) return _deepCutCache.get(cacheKey);
    // Immediate fallback: use the primary backdrop from media table
    return backdrop_path ? `${TMDB_BD}${backdrop_path}` : null;
  });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { play: playEpisode, togglePlay, currentEp, isPlaying, buffering, addToQueue } = useAudioPlayer();

  const epUrl = resolveAudioUrl(item);
  const isPaywall = isPatreonUrl(epUrl);
  const isCurrent = currentEp?.guid === episode_id || currentEp?.episodeId === episode_id;
  const isActiveAndPlaying = isCurrent && isPlaying;

  const desc = firstSentence(episode_description);
  const fullDesc = (episode_description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();

  // ── Fetch deep-cut backdrop ──
  useEffect(() => {
    if (!tmdb_id) return;
    const cacheKey = `${tmdb_id}:${podcast_slug}`;
    if (_deepCutCache.has(cacheKey)) {
      setBackdropUrl(_deepCutCache.get(cacheKey));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiProxy("tmdb_images", {
          tmdb_id: String(tmdb_id), type: "movie",
        });
        if (cancelled) return;
        const backdrops = res?.backdrops || [];
        // Filter to no-text backdrops (null language = clean cinematography)
        const clean = backdrops.filter(b => !b.iso_639_1 && b.file_path);
        // Offset by podcast slug hash for variety
        const slugOffset = hashStr(podcast_slug) % 5;
        const baseIdx = 15;
        const targetIdx = Math.min(baseIdx + slugOffset, clean.length - 1);
        // Pick deep cut, or fall back to earlier indices
        let pick = null;
        if (clean.length > 0) {
          const idx = Math.min(targetIdx, clean.length - 1);
          pick = clean[Math.max(0, idx)];
        }
        // If no clean backdrops, try en-language ones
        if (!pick) {
          const en = backdrops.filter(b => b.file_path);
          if (en.length > 0) {
            const idx = Math.min(baseIdx + slugOffset, en.length - 1);
            pick = en[Math.max(0, idx)];
          }
        }
        const url = pick ? `${TMDB_BD}${pick.file_path}` : (backdrop_path ? `${TMDB_BD}${backdrop_path}` : null);
        _deepCutCache.set(cacheKey, url);
        if (!cancelled) setBackdropUrl(url);
      } catch {
        const fallback = backdrop_path ? `${TMDB_BD}${backdrop_path}` : null;
        _deepCutCache.set(cacheKey, fallback);
      }
    })();
    return () => { cancelled = true; };
  }, [tmdb_id, podcast_slug, backdrop_path]);

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isPaywall) return;
    if (isCurrent) {
      togglePlay();
      return;
    }
    const playerEp = toPlayerEpisode({
      episode_id,
      episode_title,
      audio_url,
      audio_status,
      podcast_name,
      duration_seconds,
    }, {
      artwork: podcast_artwork,
      community: podcast_name,
    });
    if (playerEp) playEpisode(playerEp);
  };

  const handleUnlink = async (e) => {
    e.stopPropagation();
    if (!episode_id || !tmdb_id) return;
    if (!confirm(`Unlink "${film_title}" from "${episode_title}"?`)) return;
    const { error } = await supabase
      .from("podcast_episode_films")
      .delete()
      .eq("episode_id", episode_id)
      .eq("tmdb_id", tmdb_id);
    if (!error) {
      setDismissed(true);
      if (onUnlinked) onUnlinked(episode_id, tmdb_id);
    }
  };

  const handleQueue = (e) => {
    e.stopPropagation();
    if (!addToQueue || isPaywall || isCurrent) return;
    const playerEp = toPlayerEpisode({
      episode_id,
      episode_title,
      audio_url,
      audio_status,
      podcast_name,
      duration_seconds,
    }, {
      artwork: podcast_artwork,
      community: podcast_name,
    });
    if (playerEp) addToQueue(playerEp);
  };

  if (dismissed) return null;

  return (
    <div
      onClick={() => setExpanded(prev => !prev)}
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
    >
      {/* ── Backdrop layers ── */}
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt=""
          onLoad={() => setImgLoaded(true)}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: imgLoaded ? 0.6 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Left-to-right gradient: opaque left (podcast art zone), fades right */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, rgba(15,13,11,0.92) 0%, rgba(15,13,11,0.55) 40%, rgba(15,13,11,0.2) 70%, rgba(15,13,11,0.35) 100%)",
        pointerEvents: "none",
      }} />
      {/* Bottom darken for text readability */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(15,13,11,0.0) 0%, rgba(15,13,11,0.45) 100%)",
        pointerEvents: "none",
      }} />
      {/* Warm amber overlay for VHS tone */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(30,20,10,0.15)",
        pointerEvents: "none",
      }} />

      {/* ── Content ── */}
      <div style={{
        position: "relative",
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}>
        {/* Podcast artwork */}
        <div style={{
          width: 64, height: 64,
          borderRadius: 10,
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          background: "#1a1714",
        }}>
          {podcast_artwork ? (
            <img
              src={podcast_artwork}
              alt={podcast_name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#2a2520",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 8,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              textAlign: "center",
              lineHeight: 1.1,
            }}>
              {podcast_name}
            </div>
          )}
        </div>

        {/* Right side: episode info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: date + duration | play button */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 3,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {fmtDate(episode_air_date)}
              </span>
              {duration_seconds > 0 && (
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 8, color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {formatDuration(duration_seconds)}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {isAdmin && (
                <div
                  onClick={handleUnlink}
                  title="Unlink bad match"
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, cursor: "pointer",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </div>
              )}
              {!isPaywall && addToQueue && !isCurrent && (
                <div
                  onClick={handleQueue}
                  title="Add to Up Next"
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, cursor: "pointer",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              )}
              {!isPaywall && (
                <div
                  onClick={handlePlay}
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: isActiveAndPlaying
                      ? "rgba(201,124,93,0.3)"
                      : "rgba(201,124,93,0.18)",
                    border: `1.5px solid rgba(201,124,93,${isActiveAndPlaying ? "0.6" : "0.45"})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {isCurrent && buffering ? (
                    <div style={{
                      width: 13, height: 13, borderRadius: "50%",
                      border: "2px solid rgba(201,124,93,0.2)",
                      borderTopColor: "#c97c5d",
                      animation: "pcSpin 0.6s linear infinite",
                    }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#c97c5d">
                      {isActiveAndPlaying ? (
                        <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15,
            color: "#f0ebe1",
            lineHeight: 1.2,
            marginBottom: 4,
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}>
            {film_title}
          </div>

          {/* First sentence of episode description */}
          {desc && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.4,
              marginBottom: 6,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: expanded ? 999 : 2,
              WebkitBoxOrient: "vertical",
              textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            }}>
              {expanded ? fullDesc : desc}
            </div>
          )}

          {/* Bottom: year + podcast name */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: "rgba(255,255,255,0.35)",
            }}>
              {film_year}
            </span>
            <span style={{
              width: 3, height: 3, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {podcast_name}
            </span>
          </div>
        </div>
      </div>

      {/* ── Expanded: full description ── */}
      {expanded && fullDesc && fullDesc.length > desc.length && (
        <div style={{
          position: "relative",
          padding: "0 12px 12px 88px",
        }}>
          <div style={{
            width: "100%", height: 1,
            background: "rgba(255,255,255,0.06)",
            marginBottom: 8,
          }} />
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, lineHeight: 1.55,
            color: "rgba(255,255,255,0.4)",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}>
            {fullDesc}
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes pcSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default memo(PodcastCard);

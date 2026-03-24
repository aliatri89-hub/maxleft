import { useState, memo } from "react";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { isPatreonUrl } from "./FeedPrimitives";
import { toPlayerEpisode, resolveAudioUrl } from "../../utils/episodeUrl";
import { supabase } from "../../supabase";

// ════════════════════════════════════════════════
// PODCAST CARD — episode-first, poster on right
// Podcast art left, text middle, film poster right.
// Clean dark card — no backdrop.
// ════════════════════════════════════════════════

const TMDB_POSTER = "https://image.tmdb.org/t/p/w185";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return "";
  const [, m, d] = dateStr.split("-");
  const mi = parseInt(m, 10);
  if (!mi || mi < 1 || mi > 12) return "";
  return `${MONTHS[mi - 1]} ${parseInt(d, 10)}`;
}

function firstSentence(html) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
  const match = text.match(/^(.+?[.!?])(\s|$)/);
  const sentence = match ? match[1] : text.slice(0, 140);
  return sentence.length > 160 ? sentence.slice(0, 157) + "…" : sentence;
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
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
    tmdb_id, film_title, film_year, poster_path,
  } = item;

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { play: playEpisode, togglePlay, currentEp, isPlaying, buffering, addToQueue } = useAudioPlayer();

  const epUrl = resolveAudioUrl(item);
  const isPaywall = isPatreonUrl(epUrl);
  const isCurrent = currentEp?.guid === episode_id || currentEp?.episodeId === episode_id;
  const isActiveAndPlaying = isCurrent && isPlaying;

  const desc = firstSentence(episode_description);
  const fullDesc = stripHtml(episode_description);
  const posterUrl = poster_path ? `${TMDB_POSTER}${poster_path}` : null;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isPaywall) return;
    if (isCurrent) { togglePlay(); return; }
    const playerEp = toPlayerEpisode({
      episode_id, episode_title, audio_url, audio_status, podcast_name, duration_seconds,
    }, { artwork: podcast_artwork, community: podcast_name });
    if (playerEp) playEpisode(playerEp);
  };

  const handleUnlink = async (e) => {
    e.stopPropagation();
    if (!episode_id || !tmdb_id) return;
    if (!confirm(`Unlink "${film_title}" from "${episode_title}"?`)) return;
    const { error } = await supabase
      .from("podcast_episode_films").delete()
      .eq("episode_id", episode_id).eq("tmdb_id", tmdb_id);
    if (!error) { setDismissed(true); if (onUnlinked) onUnlinked(episode_id, tmdb_id); }
  };

  const handleQueue = (e) => {
    e.stopPropagation();
    if (!addToQueue || isPaywall || isCurrent) return;
    const playerEp = toPlayerEpisode({
      episode_id, episode_title, audio_url, audio_status, podcast_name, duration_seconds,
    }, { artwork: podcast_artwork, community: podcast_name });
    if (playerEp) addToQueue(playerEp);
  };

  if (dismissed) return null;

  return (
    <div
      onClick={() => setExpanded(prev => !prev)}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#1a1714",
        cursor: "pointer",
      }}
    >
      {/* ── Buttons top-right ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 6, padding: "10px 12px 0",
      }}>
        {isAdmin && (
          <div onClick={handleUnlink} title="Unlink bad match" style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer",
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
          </div>
        )}
        {!isPaywall && addToQueue && !isCurrent && (
          <div onClick={handleQueue} title="Add to Up Next" style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        )}
        {!isPaywall && (
          <div onClick={handlePlay} style={{
            width: 34, height: 34, borderRadius: "50%",
            background: isActiveAndPlaying ? "rgba(201,124,93,0.3)" : "rgba(201,124,93,0.18)",
            border: `1.5px solid rgba(201,124,93,${isActiveAndPlaying ? "0.6" : "0.45"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer", transition: "all 0.15s",
          }}>
            {isCurrent && buffering ? (
              <div style={{
                width: 13, height: 13, borderRadius: "50%",
                border: "2px solid rgba(201,124,93,0.2)", borderTopColor: "#c97c5d",
                animation: "pcSpin 0.6s linear infinite",
              }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#c97c5d">
                {isActiveAndPlaying
                  ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                  : <path d="M8 5v14l11-7z" />}
              </svg>
            )}
          </div>
        )}
      </div>

      {/* ── Main content: podcast art | text | poster ── */}
      <div style={{
        display: "flex", gap: 10, padding: "6px 12px 12px",
        alignItems: "flex-start",
      }}>
        {/* Left column: podcast artwork + date/duration */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 10, overflow: "hidden",
            background: "#2a2520",
          }}>
            {podcast_artwork ? (
              <img src={podcast_artwork} alt={podcast_name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900, fontSize: 8, color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase", textAlign: "center", lineHeight: 1.1,
              }}>
                {podcast_name}
              </div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              {fmtDate(episode_air_date)}
            </div>
            {duration_seconds > 0 && (
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8, color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase", letterSpacing: "0.04em",
                marginTop: 1,
              }}>
                {formatDuration(duration_seconds)}
              </div>
            )}
          </div>
        </div>

        {/* Middle column: film title, description, podcast name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15, color: "#f0ebe1",
            lineHeight: 1.2, marginBottom: 4,
          }}>
            {film_title}
          </div>
          {desc && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "rgba(255,255,255,0.45)",
              lineHeight: 1.4, marginBottom: 6,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: expanded ? 999 : 2,
              WebkitBoxOrient: "vertical",
            }}>
              {expanded ? fullDesc : desc}
            </div>
          )}
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 600,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {podcast_name}
          </div>
        </div>

        {/* Right column: film poster + year */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <div style={{
            width: 48, height: 72, borderRadius: 4, overflow: "hidden",
            background: "#2a2520",
          }}>
            {posterUrl ? (
              <img src={posterUrl} alt={film_title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 7, color: "rgba(255,255,255,0.2)",
                textTransform: "uppercase",
              }}>
                N/A
              </div>
            )}
          </div>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, color: "rgba(255,255,255,0.3)",
          }}>
            {film_year}
          </span>
        </div>
      </div>

      {/* ── Expanded: full description ── */}
      {expanded && fullDesc && fullDesc.length > desc.length && (
        <div style={{ padding: "0 12px 12px 86px" }}>
          <div style={{
            width: "100%", height: 1,
            background: "rgba(255,255,255,0.06)", marginBottom: 8,
          }} />
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, lineHeight: 1.55, color: "rgba(255,255,255,0.4)",
          }}>
            {fullDesc}
          </div>
        </div>
      )}

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

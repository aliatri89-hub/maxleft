import { useState, memo } from "react";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { isPatreonUrl } from "./FeedPrimitives";
import { toPlayerEpisode, resolveAudioUrl } from "../../utils/episodeUrl";
import { supabase } from "../../supabase";
import QuickLogModal from "./QuickLogModal";

// ════════════════════════════════════════════════
// PODCAST CARD
//
// [  art  ]  Film Title (year)   Mar 18 · 1h24m  [🗑] [+] [▶]
// [  art  ]  Episode desc…
// [  art  ]  Episode desc cont…
//            PODCAST NAME                    ✓ WATCHED
// ════════════════════════════════════════════════

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
  let sentence = match ? match[1] : text.slice(0, 140);
  if (sentence.length > 160) sentence = sentence.slice(0, 157) + "…";
  else if (!/[.!?]$/.test(sentence)) sentence += "…";
  return sentence;
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

function PodcastCard({ item, isAdmin, userId, onUnlinked }) {
  const {
    episode_id, episode_title, episode_description, episode_air_date,
    audio_url, audio_status, duration_seconds,
    podcast_name, podcast_slug, podcast_artwork,
    tmdb_id, film_title, film_year, poster_path, watched,
  } = item;

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addedToWatchlist, setAddedToWatchlist] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const { play: playEpisode, togglePlay, currentEp, isPlaying, buffering, addToQueue } = useAudioPlayer();

  const isWatched = watched || justLogged;

  const epUrl = resolveAudioUrl(item);
  const isPaywall = isPatreonUrl(epUrl);
  const isCurrent = currentEp?.guid === episode_id || currentEp?.episodeId === episode_id;
  const isActiveAndPlaying = isCurrent && isPlaying;

  const desc = firstSentence(episode_description);
  const fullDesc = stripHtml(episode_description);

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isPaywall) return;
    if (isCurrent) { togglePlay(); return; }
    const playerEp = toPlayerEpisode({
      episode_id, episode_title, episode_description, audio_url, audio_status, podcast_name, duration_seconds,
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
      episode_id, episode_title, episode_description, audio_url, audio_status, podcast_name, duration_seconds,
    }, { artwork: podcast_artwork, community: podcast_name });
    if (playerEp) addToQueue(playerEp);
  };

  const handleWatchlist = async (e) => {
    e.stopPropagation();
    if (!userId || addedToWatchlist) return;
    const { error } = await supabase.from("wishlist").insert({
      user_id: userId,
      item_type: "movie",
      title: film_title,
      cover_url: poster_path ? `https://image.tmdb.org/t/p/w185${poster_path}` : null,
      year: film_year || null,
    });
    if (!error) setAddedToWatchlist(true);
  };

  if (dismissed) return null;

  return (
    <>
    <div
      onClick={() => setExpanded(prev => !prev)}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#1a1714",
        cursor: "pointer",
        padding: "10px 12px",
      }}
    >
      {/* ── Art + right column (art spans title + desc rows) ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Podcast artwork */}
        <div style={{
          width: 64, height: 64, borderRadius: 10, overflow: "hidden",
          background: "#2a2520", flexShrink: 0,
        }}>
          {podcast_artwork ? (
            <img loading="lazy" src={podcast_artwork} alt={podcast_name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900, fontSize: 10, color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase", textAlign: "center", lineHeight: 1.1,
            }}>
              {podcast_name}
            </div>
          )}
        </div>

        {/* Right column: title row then desc */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Row 1: Title Year | Date · Duration | Buttons */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 4,
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 600, fontSize: 16, color: "#f0ebe1",
              lineHeight: 1.2, whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
              flex: 1, minWidth: 0,
            }}>
              {film_title}
              {film_year && (
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12, color: "rgba(255,255,255,0.3)",
                  marginLeft: 6, fontWeight: 400,
                }}>
                  {film_year}
                </span>
              )}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11, color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {fmtDate(episode_air_date)}
              </span>
              {duration_seconds > 0 && (
                <>
                  <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11, color: "rgba(255,255,255,0.25)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {formatDuration(duration_seconds)}
                  </span>
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {isAdmin && (
                <div onClick={handleUnlink} title="Unlink" style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </div>
              )}
              {!isPaywall && addToQueue && !isCurrent && (
                <div onClick={handleQueue} title="Up Next" style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              )}
              {!isPaywall && (
                <div onClick={handlePlay} style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: isActiveAndPlaying ? "rgba(201,124,93,0.25)" : "rgba(201,124,93,0.12)",
                  border: `1.5px solid rgba(201,124,93,${isActiveAndPlaying ? "0.6" : "0.4"})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {isCurrent && buffering ? (
                    <div style={{
                      width: 11, height: 11, borderRadius: "50%",
                      border: "2px solid rgba(201,124,93,0.2)", borderTopColor: "#c97c5d",
                      animation: "pcSpin 0.6s linear infinite",
                    }} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#c97c5d">
                      {isActiveAndPlaying
                        ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                        : <path d="M8 5v14l11-7z" />}
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rows 2-3: Description fills space next to art */}
          {desc && (
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: "rgba(255,255,255,0.45)",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}>
              {desc}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: podcast name | badge — full width below art ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 6,
      }}>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase", letterSpacing: "0.04em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {podcast_name}
        </span>

        {isWatched ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "2px 8px 2px 6px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0, marginLeft: 8,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Watched</span>
          </div>
        ) : userId ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
            {/* Log pill */}
            <div onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "2px 8px 2px 6px", borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, fontWeight: 600,
                color: "rgba(255,255,255,0.25)",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Log</span>
            </div>
            {/* Watchlist pill */}
            {addedToWatchlist ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "2px 8px 2px 6px", borderRadius: 10,
                background: "rgba(201,124,93,0.06)",
                border: "1px solid rgba(201,124,93,0.15)",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(201,124,93,0.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, fontWeight: 600,
                  color: "rgba(201,124,93,0.5)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>Added</span>
              </div>
            ) : (
              <div onClick={handleWatchlist} style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "2px 8px 2px 6px", borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, fontWeight: 600,
                  color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>Watchlist</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Expanded description */}
      {expanded && fullDesc && fullDesc.length > desc.length && (
        <div style={{ paddingTop: 8, paddingLeft: 74 }}>
          <div style={{
            width: "100%", height: 1,
            background: "rgba(255,255,255,0.06)", marginBottom: 8,
          }} />
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.4)",
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

    <QuickLogModal
      data={{
        tmdb_id: tmdb_id,
        title: film_title,
        year: film_year,
        poster_path: poster_path,
      }}
      open={showLogModal}
      onClose={() => setShowLogModal(false)}
      onLogged={() => {
        setJustLogged(true);
        setAddedToWatchlist(false);
      }}
    />
    </>
  );
}

export default memo(PodcastCard);

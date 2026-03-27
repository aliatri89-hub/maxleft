import { t } from "../../theme";
import { useState, memo } from "react";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { isPatreonUrl } from "./FeedPrimitives";
import { toPlayerEpisode, resolveAudioUrl } from "../../utils/episodeUrl";
import { supabase } from "../../supabase";
import QuickLogModal from "./QuickLogModal";

// ════════════════════════════════════════════════
// PODCAST CARD — redesigned layout
//
// [  art  ]  Film Title                 1h24m     ✓ Watched
// [  art  ]  2026 · Mar 18
// [  art  ]  Episode desc…
//                              🗑(admin)   [+queue] [▶ play]
// ════════════════════════════════════════════════

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(dateStr) {
  if (!dateStr || dateStr.length < 10) return "";
  const [, m, d] = dateStr.split("-");
  const mi = parseInt(m, 10);
  if (!mi || mi < 1 || mi > 12) return "";
  return `${MONTHS[mi - 1]} ${parseInt(d, 10)}`;
}

// ── Junk description detection ──
const JUNK_PATTERNS = [
  /^get ad[- ]free/i,
  /^support the show/i,
  /^thank you for (th|li|su)/i,
  /^subscribe/i,
  /^check out/i,
  /^follow us/i,
  /^visit (us|our)/i,
  /patreon\.com/i,
  /^sponsored by/i,
  /^this episode is brought to you/i,
];

function isJunkDesc(text) {
  if (!text) return true;
  return JUNK_PATTERNS.some(p => p.test(text.trim()));
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  const fullDesc = stripHtml(episode_description);
  const hasDesc = fullDesc && !isJunkDesc(fullDesc);

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
    if (!userId) return;
    if (addedToWatchlist) {
      // Remove from watchlist
      const { error } = await supabase.from("wishlist").delete()
        .eq("user_id", userId).eq("title", film_title)
        .in("item_type", ["movie", "show"]);
      if (!error) setAddedToWatchlist(false);
      return;
    }
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

  // ── Shared badge style ──
  const badgeBase = {
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "2px 7px 2px 5px", borderRadius: 12,
    fontSize: 9, fontWeight: 600,
    fontFamily: t.fontMono,
    textTransform: "uppercase", letterSpacing: "0.06em",
    flexShrink: 0, whiteSpace: "nowrap",
  };

  return (
    <>
    <div
      onClick={() => setExpanded(prev => !prev)}
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${t.bgHover}`,
        background: t.bgCard,
        cursor: "pointer",
        padding: "12px 14px",
      }}
    >
      {/* ── Art + right column ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* Podcast artwork */}
        <div style={{
          width: 60, height: 60, borderRadius: 10, overflow: "hidden",
          background: "#2a2520", flexShrink: 0,
        }}>
          {podcast_artwork ? (
            <img loading="lazy" src={podcast_artwork} alt={podcast_name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: t.fontDisplay,
              fontWeight: 900, fontSize: 10, color: "var(--text-secondary)",
              textTransform: "uppercase", textAlign: "center", lineHeight: 1.1,
            }}>
              {podcast_name}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Row 1: Title + Duration ←→ Status badges (top right) */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            gap: 8, marginBottom: 2,
          }}>
            {/* Title + duration */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: 6,
              }}>
                <span style={{
                  fontFamily: t.fontDisplay,
                  fontWeight: 700, fontSize: 18, color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}>
                  {film_title}
                </span>
                {duration_seconds > 0 && (
                  <span style={{
                    fontFamily: t.fontMono,
                    fontSize: 10, color: t.textFaint,
                    letterSpacing: "0.03em", flexShrink: 0,
                    textTransform: "uppercase",
                  }}>
                    {formatDuration(duration_seconds)}
                  </span>
                )}
              </div>
            </div>

            {/* Status badges — top right */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {isWatched ? (
                <div style={{
                  ...badgeBase,
                  background: "rgba(52,211,153,0.10)",
                  border: "1px solid rgba(52,211,153,0.25)",
                  color: "rgba(52,211,153,0.7)",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Watched
                </div>
              ) : userId ? (
                <>
                  <div onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }} style={{
                    ...badgeBase,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${t.bgHover}`,
                    color: t.textFaint,
                    cursor: "pointer",
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.textFaint} strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Log
                  </div>
                  {addedToWatchlist ? (
                    <div onClick={handleWatchlist} style={{
                      ...badgeBase,
                      background: "rgba(201,124,93,0.06)",
                      border: "1px solid rgba(201,124,93,0.15)",
                      color: "rgba(201,124,93,0.5)",
                      cursor: "pointer",
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(201,124,93,0.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Added
                    </div>
                  ) : (
                    <div onClick={handleWatchlist} style={{
                      ...badgeBase,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${t.bgHover}`,
                      color: t.textFaint,
                      cursor: "pointer",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.textFaint} strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Watchlist
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Row 2: Year · Date */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: 6,
          }}>
            {film_year && (
              <span style={{
                fontFamily: t.fontMono,
                fontSize: 11, color: "var(--text-secondary)",
                letterSpacing: "0.02em",
              }}>
                {film_year}
              </span>
            )}
            {film_year && fmtDate(episode_air_date) && (
              <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
            )}
            {fmtDate(episode_air_date) && (
              <span style={{
                fontFamily: t.fontMono,
                fontSize: 10, color: t.textFaint,
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                {fmtDate(episode_air_date)}
              </span>
            )}
          </div>

          {/* Row 3: Tap pill → full description */}
          {hasDesc && (
            expanded ? (
              <div style={{
                fontFamily: t.fontMono,
                fontSize: 12, color: "var(--text-secondary)",
                lineHeight: 1.5, marginTop: 2,
              }}>
                {fullDesc}
              </div>
            ) : (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                marginTop: 2, alignSelf: "flex-start",
              }}>
                <span style={{
                  fontFamily: t.fontMono, fontSize: 10, color: t.textFaint,
                  letterSpacing: "0.05em", textTransform: "uppercase",
                }}>About this episode</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={t.textFaint} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            )
          )}

          {/* Row 4: Bottom — admin trash (left) + queue/play (right) */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: 8,
          }}>
            {/* Left: admin unlink only */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {isAdmin && (
                <div onClick={handleUnlink} title="Unlink" style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </div>
              )}
            </div>

            {/* Right: queue + play buttons (larger) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Queue button */}
              {!isPaywall && addToQueue && !isCurrent && (
                <div onClick={handleQueue} title="Up Next" style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: t.bgElevated, border: `1px solid ${t.borderMedium}`,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              )}
              {/* Play button — primary action, larger + accent fill */}
              {!isPaywall && (
                <div onClick={handlePlay} style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: isActiveAndPlaying ? "rgba(201,124,93,0.2)" : "#c97c5d",
                  border: isActiveAndPlaying ? "1.5px solid rgba(201,124,93,0.5)" : "1.5px solid #c97c5d",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {isCurrent && buffering ? (
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff",
                      animation: "pcSpin 0.6s linear infinite",
                    }} />
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24"
                      fill={isActiveAndPlaying ? "#c97c5d" : "var(--bg-card, #0f0d0b)"}>
                      {isActiveAndPlaying
                        ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                        : <path d="M8 5v14l11-7z" />}
                    </svg>
                  )}
                </div>
              )}
              {/* Patreon link-out */}
              {isPaywall && (
                <a
                  href={epUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(249,104,58,0.12)",
                    border: "1px solid rgba(249,104,58,0.25)",
                    borderRadius: 20, padding: "6px 14px 6px 10px",
                    cursor: "pointer", textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                  </svg>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "#F96836",
                    fontFamily: t.fontMono,
                  }}>
                    Patreon
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

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

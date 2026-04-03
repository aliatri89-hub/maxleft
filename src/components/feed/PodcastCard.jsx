import { t } from "../../theme";
import { useState, useEffect, memo } from "react";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { renderWithTimecodes } from "../community/shared/AudioPlayerProvider";
import { isPatreonUrl, FadeImg } from "./FeedPrimitives";
import { toPlayerEpisode, resolveAudioUrl } from "../../utils/episodeUrl";
import decodeEntities from "../../utils/decodeEntities";
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

function stripUrls(text) {
  if (!text) return "";
  return text
    // Remove CDATA artifacts
    .replace(/\]\]>/g, "")
    // Remove bare URLs
    .replace(/https?:\/\/\S+/g, "")
    // Remove boilerplate label lines and everything after
    .replace(/\b(Follow|Links|Support|Subscribe|Connect|See omnystudio|Visit megaphone|See Privacy Policy|Privacy Policy|California Privacy|Learn more about your ad|Advertising Inquiries)[:\s].*/si, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function PodcastCard({ item, isAdmin, userId, onNavigateCommunity }) {
  const {
    episode_id, episode_title, episode_description, episode_air_date,
    audio_url, audio_status, duration_seconds,
    podcast_name, podcast_slug, podcast_artwork,
    tmdb_id, film_title, film_year, poster_path, watched, logo_url,
    logo_display, card_type, blurb_author, editorial_label,
  } = item;

  const isEditorial = card_type === "editorial";

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [addedToWatchlist, setAddedToWatchlist] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [logoMode, setLogoMode] = useState(logo_display || "white");
  const hasLogoFile = logo_url && /\.png/i.test(logo_url);
  const showLogo = hasLogoFile && logoMode !== "hidden";


  const { play: playEpisode, togglePlay, currentEp, isPlaying, buffering, addToQueue, removeFromQueue, queue, showNudge, seekTo } = useAudioPlayer();

  const handleTimecodeSeek = (sec) => {
    if (isCurrent) {
      seekTo(sec);
    } else {
      const playerEp = toPlayerEpisode({
        episode_id, episode_title, episode_description, audio_url, audio_status, podcast_name, duration_seconds,
      }, { artwork: podcast_artwork, community: podcast_name });
      if (playerEp) playEpisode({ ...playerEp, startAt: sec });
    }
  };
  const isWatched = watched || justLogged;

  const epUrl = resolveAudioUrl(item);
  const isPaywall = isPatreonUrl(epUrl);
  const isCurrent = currentEp?.guid === episode_id || currentEp?.episodeId === episode_id;
  const isActiveAndPlaying = isCurrent && isPlaying;

  const fullDesc = stripUrls(stripHtml(episode_description));
  const hasDesc = isEditorial
    ? !!(episode_description?.trim())
    : fullDesc && !isJunkDesc(fullDesc);

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
    if (inQueue) {
      const idx = queue.findIndex(q => q.enclosureUrl === resolveAudioUrl(item));
      if (idx !== -1) removeFromQueue(idx);
      setInQueue(false);
      showNudge("Removed from Up Next", true);
      return;
    }
    const playerEp = toPlayerEpisode({
      episode_id, episode_title, episode_description, audio_url, audio_status, podcast_name, duration_seconds,
    }, { artwork: podcast_artwork, community: podcast_name });
    if (playerEp) { addToQueue(playerEp); setInQueue(true); }
  };

  const handleWatchlist = async (e) => {
    e.stopPropagation();
    if (!userId) return;
    if (addedToWatchlist) {
      // Remove from watchlist
      const { error } = await supabase.from("wishlist").delete()
        .eq("user_id", userId).eq("title", film_title)
        .in("item_type", ["movie", "show"]);
      if (!error) { setAddedToWatchlist(false); showNudge("Removed from Watchlist", true); }
      return;
    }
    const { error } = await supabase.from("wishlist").insert({
      user_id: userId,
      item_type: "movie",
      title: film_title,
      cover_url: poster_path ? `https://image.tmdb.org/t/p/w185${poster_path}` : null,
      year: film_year || null,
    });
    if (!error) { setAddedToWatchlist(true); showNudge("Added to Watchlist"); }
  };

  if (dismissed) return null;

  // ── Shared badge style ──
  const badgeBase = {
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "2px 7px 2px 5px", borderRadius: 12,
    fontSize: 9, fontWeight: 600,
    fontFamily: t.fontBody,
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
        border: isActiveAndPlaying ? "1px solid rgba(239,159,39,0.35)" : `1px solid ${t.bgHover}`,
        background: "#1c1917",
        cursor: "pointer",
        padding: "12px 14px",
        position: "relative",
        boxShadow: isActiveAndPlaying ? "0 0 0 1px rgba(239,159,39,0.15), inset 0 0 30px rgba(239,159,39,0.04)" : "none",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >


      {/* ── Centered logo overlay — top of card only, never over expanded description ── */}
      {showLogo && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 110,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
        }}>
          <img
            src={logo_url}
            alt={film_title}
            onLoad={() => setLogoReady(true)}
            style={{
              maxHeight: 58,
              maxWidth: "58%",
              width: "auto",
              height: "auto",
              filter: logoMode === "greyscale"
                ? "grayscale(1) drop-shadow(0 2px 10px rgba(0,0,0,0.8))"
                : "brightness(0) invert(1) brightness(0.82) drop-shadow(0 2px 10px rgba(0,0,0,0.8))",
              opacity: logoReady ? 1 : 0,
              transition: "opacity 0.3s",
            }}
          />
        </div>
      )}

      {/* ── Centered fallback title — sharpie style, same position as logo ── */}
      {!showLogo && film_title && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 110,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
          padding: "0 80px 0 80px",
        }}>
          <span style={{
            fontFamily: t.fontSharpie,
            fontWeight: 700,
            fontSize: film_title.length > 20 ? 18 : 22,
            color: "var(--text-primary)",
            textAlign: "center",
            lineHeight: 1.15,
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}>
            {film_title}
          </span>
        </div>
      )}

      {/* ── Admin X — top left ── */}
      {isAdmin && (
        <div onClick={handleUnlink} title="Unlink" style={{
          position: "absolute", top: 8, left: 8,
          width: 18, height: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", zIndex: 2,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      )}

      {/* ── Admin logo mode — bottom left: cycle white → greyscale → hidden ── */}
      {isAdmin && hasLogoFile && !isEditorial && (
        <div
          onClick={async (e) => {
            e.stopPropagation();
            const cycle = { white: "greyscale", greyscale: "hidden", hidden: "white" };
            const next = cycle[logoMode] || "white";
            setLogoMode(next);
            await supabase
              .from('podcast_episode_films')
              .update({ logo_display: next })
              .eq('episode_id', episode_id)
              .eq('tmdb_id', tmdb_id);
          }}
          title={{ white: "White logo (tap for greyscale)", greyscale: "Greyscale logo (tap to hide)", hidden: "Hidden (tap for white)" }[logoMode]}
          style={{
            position: "absolute", bottom: 8, left: 8,
            width: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 2,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={
              logoMode === "hidden" ? "rgba(255,200,0,0.5)"
              : logoMode === "greyscale" ? "rgba(150,150,150,0.6)"
              : "rgba(255,255,255,0.2)"
            }
            strokeWidth="2.5" strokeLinecap="round">
            {logoMode === "hidden"
              ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
          </svg>
        </div>
      )}

      {/* ── Art + right column ── */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        {/* Podcast artwork / MANTL editorial logo */}
        <div style={{
          width: 60, height: 60, borderRadius: 10, overflow: "hidden",
          background: isEditorial ? "#1a1510" : "#2a2520", flexShrink: 0,
          boxShadow: "0 3px 8px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: isEditorial ? "1px solid rgba(196,115,79,0.2)" : "none",
        }}>
          {isEditorial ? (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1a1510",
            }}>
              <div style={{ position: "relative", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(196,115,79,0.12)",
                  border: "1px solid rgba(196,115,79,0.3)",
                  borderRadius: 6,
                }} />
                <div style={{
                  width: 0, height: 0, borderStyle: "solid",
                  borderWidth: "7px 0 7px 13px",
                  borderColor: "transparent transparent transparent #f5f0eb",
                  position: "relative", zIndex: 1, marginLeft: 3,
                }} />
              </div>
            </div>
          ) : podcast_artwork ? (
            <FadeImg src={podcast_artwork} alt={podcast_name}
              placeholderColor="#2a2520"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>

          {/* Row 1: date (left) | year + buttons (right) */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              {/* Date in left slot — always small, title is in centered overlay */}
              {fmtDate(episode_air_date) && (
                <span style={{
                  fontFamily: t.fontBody, fontSize: 11, color: "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  opacity: showLogo ? (logoReady ? 1 : 0) : 1,
                  transition: "opacity 0.3s",
                }}>
                  {fmtDate(episode_air_date)}
                </span>
              )}
            </div>
            {/* Year + queue + play buttons */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, flexShrink: 0 }}>
              {film_year && (
                <span style={{
                  fontFamily: t.fontBody, fontSize: 11, color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.03em", paddingTop: 2,
                }}>
                  {film_year}
                </span>
              )}
              {!isPaywall && !isEditorial && addToQueue && !isCurrent && (
                <div onClick={handleQueue} title="Up Next" style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: inQueue ? "#4a4540" : "#2e2b27",
                  border: inQueue ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}>
                  {inQueue ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>
              )}
              {!isPaywall && !isEditorial && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div onClick={handlePlay} style={{
                    width: 38, height: 38, borderRadius: 8,
                    background: isActiveAndPlaying ? "rgba(239,159,39,0.15)" : "#2e2b27",
                    border: isActiveAndPlaying ? "1.5px solid rgba(239,159,39,0.5)" : "1.5px solid rgba(255,255,255,0.1)",
                    boxShadow: isActiveAndPlaying ? "0 2px 5px rgba(0,0,0,0.55), inset 0 1px 0 rgba(239,159,39,0.1)" : "0 2px 5px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.3s",
                  }}>
                    {isCurrent && buffering ? (
                      <div style={{
                        width: 14, height: 14, borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff",
                        animation: "pcSpin 0.6s linear infinite",
                      }} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
                        {isActiveAndPlaying
                          ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                          : <path d="M8 5v14l11-7z" />}
                      </svg>
                    )}
                  </div>
                  {duration_seconds > 0 && (
                    <span style={{
                      fontFamily: t.fontBody, fontSize: 9, color: "rgba(255,255,255,0.85)",
                      fontWeight: 700,
                      letterSpacing: "0.03em", textTransform: "uppercase",
                    }}>
                      {formatDuration(duration_seconds)}
                    </span>
                  )}
                </div>
              )}
              {isPaywall && (
                <a href={epUrl} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(249,104,58,0.12)",
                    border: "1px solid rgba(249,104,58,0.25)",
                    borderRadius: 20, padding: "6px 14px 6px 10px",
                    cursor: "pointer", textDecoration: "none",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path fill="#F96836" d="M5 22V9a7 7 0 017-7h2a5.5 5.5 0 010 11h-4v9H5zm5-12h2a2.5 2.5 0 000-5h-2v5z"/>
                  </svg>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "#F96836", fontFamily: t.fontBody,
                  }}>Patreon</span>
                </a>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom row: spacer | centered bar | badges right */}
      {(!expanded || !hasDesc) && (
        <div style={{ display: "flex", alignItems: "center", marginTop: 14, position: "relative", zIndex: 1 }}>
          {/* Left spacer — mirrors badge width so bar stays centered */}
          <div style={{ flex: 1 }} />
          {/* Handle / chevron — only when desc exists and collapsed */}
          {hasDesc && !expanded && !isEditorial && (
            <div style={{
              width: 36, height: 3, borderRadius: 2,
              background: "rgba(255,255,255,0.25)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.15)",
              flexShrink: 0,
            }} />
          )}
          {/* Badges — right */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 6 }}>
            {isWatched ? (
              <div style={{ ...badgeBase, background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", color: "rgba(52,211,153,0.7)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Watched
              </div>
            ) : userId ? (
              <div onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }} style={{ ...badgeBase, background: "#2e2b27", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", color: "var(--text-muted)", cursor: "pointer" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Log
              </div>
            ) : null}
            {userId && !isWatched && (
              addedToWatchlist ? (
                <div onClick={handleWatchlist} style={{ ...badgeBase, background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", color: "rgba(52,211,153,0.7)", cursor: "pointer" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Added
                </div>
              ) : (
                <div onClick={handleWatchlist} style={{ ...badgeBase, background: "#2e2b27", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", color: "var(--text-muted)", cursor: "pointer" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Watchlist
                </div>
              )
            )}
          </div>
        </div>
      )}
      {/* Editorial: tap-to-expand blurb with Read more → log modal */}
      {isEditorial && hasDesc && expanded && (
        <div style={{ marginTop: 20, animation: "pcFadeSlide 0.2s ease forwards", position: "relative", zIndex: 1 }}>
          <div style={{
            fontFamily: t.fontBody, fontSize: 15, fontWeight: 700,
            color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em",
            marginBottom: 8,
          }}>
            {editorial_label}
          </div>
          <div style={{
            fontFamily: t.fontSerif, fontSize: 14, color: "#f0ebe1",
            lineHeight: 1.6, whiteSpace: "pre-line",
            display: "-webkit-box", WebkitLineClamp: 10, WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {episode_description}
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); onNavigateCommunity?.("staff-picks", tmdb_id); }}
            style={{
              marginTop: 8, fontFamily: t.fontBody, fontSize: 12, fontWeight: 600,
              color: "rgba(196,115,79,0.75)", cursor: "pointer",
              letterSpacing: "0.04em", display: "inline-block",
            }}
          >
            Read more →
          </div>
        </div>
      )}

      {/* Podcast: tap-to-expand description */}
      {!isEditorial && hasDesc && expanded && (
        <div style={{
          marginTop: 20,
          animation: "pcFadeSlide 0.2s ease forwards",
          position: "relative", zIndex: 1,
        }}>
          {episode_title && (
            <div style={{
              fontFamily: t.fontBody, fontSize: 15, fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "0.02em",
              marginBottom: 8,
            }}>
              {decodeEntities(episode_title)}
            </div>
          )}
          <div style={{
            fontFamily: t.fontSerif, fontSize: 14, color: "#f0ebe1",
            lineHeight: 1.5,
          }}>
            {renderWithTimecodes(fullDesc, handleTimecodeSeek)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pcSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pcFadeSlide {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
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

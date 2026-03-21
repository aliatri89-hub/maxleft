import { useEpisodeMatch } from "../../hooks/community/useEpisodeMatch";
import { Stars, Poster, resolveImg, TMDB_BACKDROP, isPatreonUrl } from "./FeedPrimitives";

// ════════════════════════════════════════════════
// EPISODE CARD — unified (dropped + published + upcoming)
// Reads data.status: 'dropped'/'published' → New Episode card, 'upcoming' → Coming Soon card
// ════════════════════════════════════════════════
const EPISODE_LABELS = [
  "New Episode", "Just Dropped", "Now Streaming",
  "Fresh Off the Pod", "Out Now",
];

function EpisodeCard({ data, onNavigateCommunity }) {
  const { matchedEpisode, isThisEpPlaying, playEpisode, isPlaying } = useEpisodeMatch(
    { ...data, id: data.item_id },
    data.community_name || ""
  );
  const hasBackdrop = !!data.backdrop_path;
  const isDropped = data.status === "dropped" || data.status === "published";
  const isThisPlaying = isThisEpPlaying;
  const seen = !!data.user_has_watched;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!matchedEpisode) return;
    playEpisode(matchedEpisode);
  };

  // Stable label for dropped episodes
  const labelIndex = (data.item_id || "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % EPISODE_LABELS.length;
  const droppedLabel = EPISODE_LABELS[labelIndex];

  // Day-of-week label for upcoming episodes
  const dayLabel = (() => {
    if (isDropped || !data.air_date) return null;
    const airDate = new Date(data.air_date);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const airStart = new Date(airDate.getFullYear(), airDate.getMonth(), airDate.getDate());
    const diffDays = Math.round((airStart - todayStart) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return airDate.toLocaleDateString("en-US", { weekday: "long" });
  })();

  const podName = (data.community_name || "").split(" with")[0];
  const accent = "#EF9F27";

  return (
    <div
      onClick={() => onNavigateCommunity?.(data.community_slug, data.tmdb_id)}
      style={{
        margin: "6px 16px",
        background: "var(--bg-card, #1a1714)",
        borderRadius: 16, overflow: "hidden",
        border: isDropped
          ? `1px solid ${accent}18`
          : `1px dashed ${accent}40`,
        borderTop: `3px solid ${accent}`,
        cursor: "pointer", position: "relative",
      }}
    >
      {/* Backdrop wash */}
      {hasBackdrop && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${resolveImg(data.backdrop_path, TMDB_BACKDROP)})`,
          backgroundSize: "cover", backgroundPosition: "center top",
          opacity: 0.30,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, var(--bg-card, #1a1714) 30%, transparent 80%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 40%, var(--bg-card, #1a1714) 100%)",
          }} />
        </div>
      )}

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -20, right: 30, width: 160, height: 80,
        borderRadius: "50%",
        background: accent,
        opacity: isDropped ? 0.06 : 0.07,
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      {/* Poster + info stack */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px",
        position: "relative", zIndex: 1, alignItems: "stretch",
      }}>
        <Poster
          path={data.poster_path} tmdbId={data.tmdb_id}
          title={data.title} mediaType={data.media_type || "film"}
          width={72} height={108} radius={8}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Top row — label + watched pill (upper right) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
            <div>
              {isDropped ? (
                <div style={{
                  fontFamily: "'Permanent Marker', cursive", fontSize: 18,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  color: accent,
                }}>
                  {droppedLabel}
                </div>
              ) : (
                <div style={{
                  fontFamily: "'Permanent Marker', cursive",
                  fontSize: 18, lineHeight: 1,
                  color: accent,
                }}>
                  {dayLabel ? `Coming ${dayLabel}` : "Coming Soon"}
                </div>
              )}
            </div>

            {/* Watched status pill — upper right */}
            {isDropped && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                background: seen ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
                border: seen ? "1px solid rgba(52,211,153,0.3)" : "1px dashed rgba(255,255,255,0.10)",
                borderRadius: 20, padding: "4px 10px 4px 6px",
                transition: "all 0.3s ease",
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5"
                    stroke={seen ? "#34d399" : "rgba(255,255,255,0.15)"}
                    strokeWidth="1.5"
                  />
                  <polyline points="4.5 7.2 6 8.7 9.5 5.3"
                    stroke={seen ? "#34d399" : "rgba(255,255,255,0.15)"}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: seen ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.15)",
                  fontFamily: "var(--font-mono, monospace)",
                  transition: "color 0.3s ease",
                }}>
                  {seen ? "Watched" : "Unwatched"}
                </span>
              </div>
            )}

            {/* Stars for upcoming cards */}
            {!isDropped && seen && data.user_rating > 0 && (
              <Stars rating={data.user_rating} size={12} />
            )}
          </div>

          {/* Movie title + optional stars */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: 2,
          }}>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
              color: "var(--text-primary, #e8ecf4)",
              lineHeight: 1.2,
            }}>
              {data.title}
            </div>
            {isDropped && seen && data.user_rating > 0 && (
              <Stars rating={data.user_rating} size={12} />
            )}
          </div>

          {/* Series context */}
          {data.miniseries_title ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-muted, #8892a8)", marginBottom: 2,
            }}>
              <span>{data.miniseries_title}</span>
              {data.sort_order && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: "var(--text-faint, #5a6480)",
                }}>
                  #{data.sort_order}
                </span>
              )}
            </div>
          ) : null}

          {/* Bottom row — pod pill left, VCR play button right */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginTop: "auto", paddingTop: 4,
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "rgba(255,255,255,0.04)", borderRadius: 10,
              padding: "3px 8px 3px 3px",
            }}>
              {data.community_image && (
                <img src={data.community_image} alt=""
                  style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }}
                />
              )}
              <span style={{ fontSize: 10, color: "var(--text-faint, #5a6480)", whiteSpace: "nowrap" }}>
                {podName}
              </span>
            </div>

            {/* VCR-style rectangular play button — bottom right */}
            {matchedEpisode && !isPatreonUrl(matchedEpisode.enclosureUrl) && (
              <button
                onClick={handlePlay}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: isThisPlaying ? `${accent}` : accent,
                  borderRadius: 6, border: "none",
                  padding: "7px 14px 7px 11px",
                  cursor: "pointer", flexShrink: 0,
                  opacity: isThisPlaying ? 0.85 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--bg-card, #0f0d0b)">
                  {isThisPlaying
                    ? <><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></>
                    : <path d="M4 2.5L13 8L4 13.5V2.5Z"/>
                  }
                </svg>
                <span style={{
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--bg-card, #0f0d0b)",
                  fontFamily: "var(--font-body, system-ui)",
                }}>
                  {isThisPlaying ? "Pause" : "Play"}
                </span>
              </button>
            )}
            {/* Patreon link-out badge */}
            {matchedEpisode && isPatreonUrl(matchedEpisode.enclosureUrl) && (
              <a
                href={matchedEpisode.enclosureUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: "rgba(249,104,58,0.15)",
                  border: "1px solid rgba(249,104,58,0.3)",
                  borderRadius: 6,
                  padding: "7px 14px 7px 11px",
                  cursor: "pointer", flexShrink: 0,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="15" cy="9" r="5.5" fill="#F96836" />
                  <rect x="3" y="3" width="3" height="18" rx="1" fill="#052D49" />
                </svg>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#F96836",
                  fontFamily: "var(--font-body, system-ui)",
                }}>
                  Patreon
                </span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default EpisodeCard;

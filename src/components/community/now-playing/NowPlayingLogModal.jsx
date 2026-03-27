import CommunityLogModal from "../shared/CommunityLogModal";
import { useState } from "react";

const PATREON_URL = "https://www.patreon.com/nowplayingpodcast";

/**
 * NowPlayingLogModal — thin wrapper for Now Playing Podcast community.
 *
 * Community-specific:
 *   - Brown arrow "So Bad It's Good" toggle (films & shows)
 *   - Brown arrow status badge when logged
 *   - NPP website link in hero
 *   - Listen platforms: Spotify, Podbean, Patreon
 *   - Dynamic Patreon detection from episode_url
 */
export default function NowPlayingLogModal(props) {
  const { item } = props;
  const [brownArrow, setBrownArrow] = useState(props.progressData?.brown_arrow || false);

  const isFilm = item.media_type === "film";
  const isShow = item.media_type === "show";
  const itemIsPatreon = !!item.episode_url?.includes("patreon.com");

  return (
    <CommunityLogModal
      {...props}
      config={{
        communitySlug: "npp",
        pinSlug: "nowplaying",
        communityName: "Now Playing",
        platforms: [
          { type: "spotify" },
          { type: "podbean" },
          { type: "patreon", url: itemIsPatreon ? item.episode_url : PATREON_URL },
        ],
        isPatreon: itemIsPatreon,
      }}
      buildLogPayload={(base) => ({
        ...base,
        brown_arrow: (isFilm || isShow || !item.media_type) ? brownArrow : undefined,
      })}
      renderStatusBadges={(pd) =>
        pd?.brown_arrow ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 10px",
            background: "rgba(160,82,45,0.15)",
            border: "1px solid rgba(205,133,63,0.4)",
            borderRadius: 20, fontSize: 11, color: "#CD853F", fontWeight: 700,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill="rgba(205,133,63,0.9)" />
            </svg>
            So Bad It's Good
          </div>
        ) : null
      }
      renderRatingExtra={() =>
        (isFilm || isShow) ? (
          <div
            onClick={() => setBrownArrow(!brownArrow)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px",
              background: brownArrow ? "rgba(160,82,45,0.15)" : "rgba(255,255,255,0.03)",
              border: `1.5px solid ${brownArrow ? "rgba(205,133,63,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              transition: "all 0.2s",
              userSelect: "none",
              boxShadow: brownArrow ? "0 2px 8px rgba(160,82,45,0.25)" : "none",
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: brownArrow ? "rgba(160,82,45,0.3)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${brownArrow ? "rgba(205,133,63,0.5)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L3 15h6v5h6v-5h6L12 4z" fill={brownArrow ? "rgba(205,133,63,0.9)" : "rgba(255,255,255,0.2)"} />
              </svg>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: brownArrow ? "#CD853F" : "#555",
              letterSpacing: "0.03em",
              transition: "color 0.2s",
            }}>
              So Bad It's Good
            </span>
          </div>
        ) : null
      }
      renderHeroExtra={() => (
        <a href="https://www.nowplayingpodcast.com" target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10, color: "#aaa", textDecoration: "none",
            marginTop: 4, transition: "color 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "#F5C518"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#666"}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          nowplayingpodcast.com
        </a>
      )}
    />
  );
}

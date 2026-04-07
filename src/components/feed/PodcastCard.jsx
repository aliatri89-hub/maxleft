import { t } from "../../theme";
import { useState } from "react";
import { useAudioPlayer } from "../community/shared/AudioPlayerProvider";
import { FadeImg } from "./FeedPrimitives";
import decodeEntities from "../../utils/decodeEntities";
import { fmtDuration } from "../../utils/helpers";

export default function PodcastCard({ item, isAdmin }) {
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();
  const [expanded, setExpanded] = useState(false);

  const {
    episode_id,
    episode_title,
    episode_air_date,
    episode_description,
    audio_url,
    duration_seconds,
    podcast_name,
    podcast_slug,
    podcast_artwork,
  } = item;

  const isActive = currentEp?.guid === episode_id;

  const handlePlay = () => {
    playEpisode({
      guid: episode_id,
      title: decodeEntities(episode_title || ""),
      enclosureUrl: audio_url,
      community: podcast_name,
      artwork: podcast_artwork,
    });
  };

  return (
    <div
      style={{
        background: t.bgCard,
        borderRadius: 14,
        border: `1px solid ${isActive ? "#C4734F" : t.border}`,
        padding: "12px 14px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Artwork */}
      {podcast_artwork ? (
        <FadeImg
          src={podcast_artwork}
          alt={podcast_name}
          style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: t.bgInput, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          🎙
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#C4734F", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
          {podcast_name}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, lineHeight: 1.35, marginBottom: 4 }}>
          {decodeEntities(episode_title || "")}
        </div>
        <div style={{ fontSize: 12, color: t.textTertiary }}>
          {episode_air_date?.slice(0, 10)}{duration_seconds ? ` · ${fmtDuration(duration_seconds)}` : ""}
        </div>

        {expanded && episode_description && (
          <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
            {decodeEntities(episode_description).slice(0, 300)}
            {episode_description.length > 300 ? "…" : ""}
          </div>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={e => { e.stopPropagation(); handlePlay(); }}
        style={{
          flexShrink: 0,
          width: 36, height: 36,
          borderRadius: "50%",
          border: "none",
          background: isActive ? "#C4734F" : t.bgInput,
          color: isActive ? "#fff" : t.textSecondary,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: 14,
        }}
      >
        {isActive && isPlaying ? "⏸" : "▶"}
      </button>
    </div>
  );
}

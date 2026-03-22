import { useAudioPlayer } from "./community/shared/AudioPlayerProvider";
import { tapLight } from "../utils/haptics";

/**
 * AudioPip — tiny headphone icon in the header.
 * Shows when there's a currentEp (playing/paused) or saved recents.
 * Tap opens the full-screen audio player.
 */
export default function AudioPip() {
  const { currentEp, recents, isPlaying, openFullScreen } = useAudioPlayer();

  const hasAudio = currentEp || (recents && recents.length > 0);
  if (!hasAudio) return null;

  return (
    <div
      onClick={() => { tapLight(); openFullScreen(); }}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Headphone icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={currentEp ? "#EF9F27" : "rgba(240,235,225,0.4)"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "stroke 0.3s ease" }}
      >
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5z" />
        <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" />
      </svg>

      {/* Playing indicator — subtle pulse dot */}
      {isPlaying && (
        <div style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#EF9F27",
          animation: "audioPipPulse 1.5s ease-in-out infinite",
        }} />
      )}

      <style>{`
        @keyframes audioPipPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}

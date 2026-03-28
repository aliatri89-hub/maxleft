import { useAudioPlayer } from "./community/shared/AudioPlayerProvider";
import { tapLight } from "../utils/haptics";

/**
 * AudioPip — tiny headphone icon in the header.
 * Shows when there's a currentEp (playing/paused) or saved recents.
 * Tap opens the full-screen audio player.
 */
export default function AudioPip() {
  const { currentEp, recents, isPlaying, openFullScreen } = useAudioPlayer();

  return (
    <div
      onClick={() => { tapLight(); openFullScreen(); }}
      style={{
        width: 32,
        height: 38,
        display: "flex",
        flexDirection: "column",
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

      {/* Audio jack hole — lights up when playing */}
      <div style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: isPlaying ? "#EF9F27" : "#000",
        border: `1.5px solid ${isPlaying ? "rgba(239,159,39,0.3)" : "rgba(255,255,255,0.08)"}`,
        marginTop: 2,
        flexShrink: 0,
        transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        boxShadow: isPlaying ? "0 0 4px rgba(239,159,39,0.5)" : "none",
        animation: isPlaying ? "audioPipPulse 1.5s ease-in-out infinite" : "none",
      }} />

      <style>{`
        @keyframes audioPipPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

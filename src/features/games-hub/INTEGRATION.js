// ═══════════════════════════════════════════════════════════════
// INTEGRATION GUIDE: Games Hub + Reel Time → App.jsx
// ═══════════════════════════════════════════════════════════════
//
// 1. ADD IMPORTS (near line 32-35)
// ────────────────────────────────────────────────────────────────

import ReelTime from "./features/reel-time/ReelTime";
import GamesHub from "./features/games-hub/GamesHub";
import { hasPlayedToday as rtHasPlayedToday } from "./features/reel-time/reelTimeApi";

// 2. ADD STATE (near line 101-104)
// ────────────────────────────────────────────────────────────────
// Replace:
//   const [showGamesMenu, setShowGamesMenu] = useState(false);
// With:
//   const [showGamesHub, setShowGamesHub] = useState(false);
//   const [showReelTime, setShowReelTime] = useState(false);

// Also add alongside tfUnplayed:
//   const [rtUnplayed, setRtUnplayed] = useState(false);

// 3. ADD REEL TIME UNPLAYED CHECK (near line 187-191)
// ────────────────────────────────────────────────────────────────
// Add alongside the existing tfUnplayed check:
//   useEffect(() => {
//     if (!session?.user?.id) return;
//     rtHasPlayedToday(session.user.id).then((played) => setRtUnplayed(!played));
//   }, [session?.user?.id, showReelTime]);

// 4. UPDATE HEADER ICON onClick (line 387)
// ────────────────────────────────────────────────────────────────
// Change:
//   onClick={() => { tapLight(); setShowGamesMenu(true); }}
// To:
//   onClick={() => {
//     tapLight();
//     setShowGamesHub(true);
//     pushNav("gamesHub", () => setShowGamesHub(false));
//   }}

// Also update the unplayed dot logic to include rtUnplayed:
//   {(tfUnplayed || rtUnplayed) ? ( ... gold SVG ... ) : ( ... purple SVG ... )}

// 5. ADD REEL TIME OVERLAY (near line 464-468, after TripleFeature)
// ────────────────────────────────────────────────────────────────

/*
{showReelTime && (
  <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0d0b", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
    <ReelTime session={session} onBack={() => { removeNav("reelTime"); setShowReelTime(false); }} onToast={showToast} />
  </div>
)}
*/

// 6. REPLACE GAMES MENU with GAMES HUB OVERLAY (lines 476-528)
// ────────────────────────────────────────────────────────────────
// DELETE the entire {showGamesMenu && ( ... )} block and replace with:

/*
{showGamesHub && (
  <div className="overlay-slide-up" style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f0d0b", overflow: "auto", WebkitOverflowScrolling: "touch" }}>
    <GamesHub
      session={session}
      onBack={() => { removeNav("gamesHub"); setShowGamesHub(false); }}
      onLaunchGame={(gameId) => {
        setShowGamesHub(false);
        removeNav("gamesHub");
        if (gameId === "tripleFeature") {
          setShowTripleFeature(true);
          pushNav("tripleFeature", () => setShowTripleFeature(false));
        } else if (gameId === "reelTime") {
          setShowReelTime(true);
          pushNav("reelTime", () => setShowReelTime(false));
        } else if (gameId === "pickAFlick") {
          setShowWhatToWatch(true);
          pushNav("whatToWatch", () => setShowWhatToWatch(false));
        } else if (gameId === "creditCheck") {
          // TODO: wire up when Credit Check is built
          showToast("Credit Check coming soon!");
        }
      }}
      gameStatuses={{
        tripleFeature: tfUnplayed ? "available" : "completed",
        reelTime: rtUnplayed ? "available" : "completed",
        creditCheck: "available", // TODO: wire up
        pickAFlick: "always",
      }}
    />
  </div>
)}
*/

// 7. UPDATE VISIBILITY CHECK (line 581)
// ────────────────────────────────────────────────────────────────
// Update the condition that hides the main app shell:
// Change:
//   !showGamesMenu && !showWhatToWatch && !showTripleFeature
// To:
//   !showGamesHub && !showWhatToWatch && !showTripleFeature && !showReelTime

// ═══════════════════════════════════════════════════════════════
// DONE! The games hub icon opens the full Games page, which
// routes to individual games via onLaunchGame callbacks.
// ═══════════════════════════════════════════════════════════════

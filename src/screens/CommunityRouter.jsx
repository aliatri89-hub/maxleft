import { useCommunityPage } from "../hooks/community";
import CommunityLoadingScreen from "../components/CommunityLoadingScreen";
import NowPlayingScreen from "../components/community/now-playing/NowPlayingScreen";
import BlankCheckScreen from "../components/community/blank-check/BlankCheckScreen";
import BigPictureScreen from "../components/community/big-picture/BigPictureScreen";
import FilmJunkScreen from "../components/community/film-junk/FilmJunkScreen";
import HDTGMScreen from "../components/community/hdtgm/HDTGMScreen";
import FilmspottingScreen from "../components/community/filmspotting/FilmspottingScreen";
import RewatchablesScreen from "../components/community/rewatchables/RewatchablesScreen";
import ChapoScreen from "../components/community/chapo/ChapoScreen";
import GetPlayedScreen from "../components/community/getplayed/GetPlayedScreen";

/**
 * CommunityRouter — replaces CommunityScreen.jsx
 *
 * Loads community data by slug, then routes to the correct community-specific
 * screen based on community_type from theme_config.
 *
 * community_type values (set in community_pages.theme_config):
 *   "nowplaying"    → NowPlayingScreen
 *   "blankcheck"    → BlankCheckScreen
 *   "bigpicture"    → BigPictureScreen
 *   "filmjunk"      → FilmJunkScreen
 *   "hdtgm"         → HDTGMScreen
 *   "filmspotting"  → FilmspottingScreen
 *   "rewatchables"  → RewatchablesScreen
 *   "chapo"         → ChapoScreen
 *   "getplayed"     → GetPlayedScreen
 *   (default)       → BlankCheckScreen as fallback (most feature-complete)
 *
 * Props:
 *   slug             — community page slug
 *   session          — supabase session
 *   onBack           — () => void
 *   onToast          — (msg) => void
 *   onShelvesChanged — () => void
 */
export default function CommunityRouter({ slug, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav }) {
  const { community, miniseries, loading, error } = useCommunityPage(slug);

  if (loading) {
    return <CommunityLoadingScreen slug={slug} />;
  }

  if (error || !community) {
    return (
      <div style={{
        height: "100dvh", background: "#0f0d0b",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
      }}>
        <div style={{ color: "#e94560", fontSize: 14 }}>Couldn't load community</div>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.1)",
          color: "#888", borderRadius: 8, padding: "8px 16px",
          fontSize: 13, cursor: "pointer",
        }}>← Go back</button>
      </div>
    );
  }

  const communityType = community.theme_config?.community_type;
  const sharedProps = { community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav };

  switch (communityType) {
    case "nowplaying":
      return <NowPlayingScreen {...sharedProps} />;
    case "blankcheck":
      return <BlankCheckScreen {...sharedProps} />;
    case "bigpicture":
      return <BigPictureScreen {...sharedProps} />;
    case "filmjunk":
      return <FilmJunkScreen {...sharedProps} />;
    case "hdtgm":
      return <HDTGMScreen {...sharedProps} />;
    case "filmspotting":
      return <FilmspottingScreen {...sharedProps} />;
    case "rewatchables":
      return <RewatchablesScreen {...sharedProps} />;
    case "chapo":
      return <ChapoScreen {...sharedProps} />;
    case "getplayed":
      return <GetPlayedScreen {...sharedProps} />;
    default:
      console.warn(`[CommunityRouter] Unknown community_type "${communityType}" for slug "${slug}". Falling back to BlankCheckScreen.`);
      return <BlankCheckScreen {...sharedProps} />;
  }
}

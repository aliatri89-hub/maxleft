import { t } from "../theme";
import { useEffect, lazy, Suspense } from "react";
import { useCommunityPage } from "../hooks/community";
import { trackEvent } from "../hooks/useAnalytics";
import CommunityLoadingScreen from "../components/CommunityLoadingScreen";
import ErrorBoundary from "../components/ErrorBoundary";

// ─── LAZY-LOADED COMMUNITY SCREENS ──────────────────────────
const NowPlayingScreen = lazy(() => import("../components/community/now-playing/NowPlayingScreen"));
const BlankCheckScreen = lazy(() => import("../components/community/blank-check/BlankCheckScreen"));
const BigPictureScreen = lazy(() => import("../components/community/big-picture/BigPictureScreen"));
const FilmJunkScreen = lazy(() => import("../components/community/film-junk/FilmJunkScreen"));
const HDTGMScreen = lazy(() => import("../components/community/hdtgm/HDTGMScreen"));
const FilmspottingScreen = lazy(() => import("../components/community/filmspotting/FilmspottingScreen"));
const RewatchablesScreen = lazy(() => import("../components/community/rewatchables/RewatchablesScreen"));
const ChapoScreen = lazy(() => import("../components/community/chapo/ChapoScreen"));
const GetPlayedScreen = lazy(() => import("../components/community/getplayed/GetPlayedScreen"));
const OriginalsScreen = lazy(() => import("../components/community/originals/OriginalsScreen"));

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

  // Register community-level back with native back button system
  useEffect(() => {
    if (pushNav) pushNav("community", onBack);
    return () => { if (removeNav) removeNav("community"); };
  }, [onBack, pushNav, removeNav]);

  // Analytics: track community visit
  useEffect(() => {
    if (!loading && community && session?.user?.id) {
      trackEvent(session.user.id, "community_visit", {
        slug,
        community_type: community.theme_config?.community_type,
      });
    }
  }, [slug, loading, !!community, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <CommunityLoadingScreen slug={slug} />;
  }

  if (error || !community) {
    return (
      <div style={{
        height: "100dvh", background: t.bgPrimary,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
      }}>
        <div style={{ color: t.red, fontSize: 14 }}>Couldn't load community</div>
        <button onClick={onBack} style={{
          background: "none", border: `1px solid ${t.borderMedium}`,
          color: t.textSecondary, borderRadius: 8, padding: "8px 16px",
          fontSize: 13, cursor: "pointer",
        }}>← Go back</button>
      </div>
    );
  }

  const communityType = community.theme_config?.community_type;
  const sharedProps = { community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav };

  let Screen;
  switch (communityType) {
    case "nowplaying":    Screen = NowPlayingScreen; break;
    case "blankcheck":    Screen = BlankCheckScreen; break;
    case "bigpicture":    Screen = BigPictureScreen; break;
    case "filmjunk":      Screen = FilmJunkScreen; break;
    case "hdtgm":         Screen = HDTGMScreen; break;
    case "filmspotting":  Screen = FilmspottingScreen; break;
    case "rewatchables":  Screen = RewatchablesScreen; break;
    case "chapo":         Screen = ChapoScreen; break;
    case "getplayed":     Screen = GetPlayedScreen; break;
    case "originals":     Screen = OriginalsScreen; break;
    default:
      console.warn(`[CommunityRouter] Unknown community_type "${communityType}" for slug "${slug}". Falling back to BlankCheckScreen.`);
      Screen = BlankCheckScreen;
  }

  return (
    <ErrorBoundary name={`Community: ${community.title || slug}`}>
      <Suspense fallback={<CommunityLoadingScreen slug={slug} />}>
        <Screen {...sharedProps} />
      </Suspense>
    </ErrorBoundary>
  );
}

import { t } from "../theme";
import { useEffect, useState, useRef } from "react";
import { useCommunityPage } from "../hooks/community";
import { trackEvent } from "../hooks/useAnalytics";
import CommunityLoadingScreen from "../components/CommunityLoadingScreen";
import ErrorBoundary from "../components/ErrorBoundary";

// ─── CHUNK LOADERS (dynamic import functions) ───────────────
// Map slug → import() so we can preload chunks in parallel with data.
const CHUNK_LOADERS = {
  nowplaying:    () => import("../components/community/now-playing/NowPlayingScreen"),
  blankcheck:    () => import("../components/community/blank-check/BlankCheckScreen"),
  bigpicture:    () => import("../components/community/big-picture/BigPictureScreen"),
  filmjunk:      () => import("../components/community/film-junk/FilmJunkScreen"),
  hdtgm:         () => import("../components/community/hdtgm/HDTGMScreen"),
  filmspotting:  () => import("../components/community/filmspotting/FilmspottingScreen"),
  rewatchables:  () => import("../components/community/rewatchables/RewatchablesScreen"),
  chapo:         () => import("../components/community/chapo/ChapoScreen"),
  getplayed:     () => import("../components/community/getplayed/GetPlayedScreen"),
  "staff-picks": () => import("../components/community/originals/OriginalsScreen"),
};

// Module-level cache so re-entering is instant (chunk already loaded)
const LOADED_CHUNKS = new Map(); // slug → Component

/**
 * CommunityRouter — loads community data + JS chunk in parallel.
 *
 * ONE loading screen covers both the data fetch and the lazy chunk load.
 * No Suspense boundary = no flash between two loading screen instances.
 */
export default function CommunityRouter({ slug, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav, popNav }) {
  const { community, miniseries, loading, error } = useCommunityPage(slug);
  const [Screen, setScreen] = useState(() => LOADED_CHUNKS.get(slug) || null);
  const chunkStartedRef = useRef(null);

  // Register community-level back with native back button system
  useEffect(() => {
    if (pushNav) pushNav("community", onBack);
    return () => { if (removeNav) removeNav("community"); };
  }, [onBack, pushNav, removeNav]);

  // ── Preload chunk immediately by slug (parallel with data fetch) ──
  useEffect(() => {
    if (!slug) return;

    // Already loaded
    const cached = LOADED_CHUNKS.get(slug);
    if (cached) { setScreen(() => cached); return; }

    // Already started for this slug
    if (chunkStartedRef.current === slug) return;
    chunkStartedRef.current = slug;

    const loader = CHUNK_LOADERS[slug] || CHUNK_LOADERS.blankcheck;
    loader()
      .then((mod) => {
        const Comp = mod.default;
        LOADED_CHUNKS.set(slug, Comp);
        setScreen(() => Comp);
      })
      .catch((err) => {
        console.error("[CommunityRouter] chunk load failed:", err);
      });
  }, [slug]);

  // Analytics: track community visit
  useEffect(() => {
    if (!loading && community && session?.user?.id) {
      trackEvent(session.user.id, "community_visit", {
        slug,
        community_type: community.theme_config?.community_type,
      });
    }
  }, [slug, loading, !!community, session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolve correct Screen component ──────────────────────
  // If slug-based preload doesn't match the community_type, resolve by type
  const communityType = community?.theme_config?.community_type;
  let ResolvedScreen = Screen;

  if (community && Screen && communityType && communityType !== slug) {
    // The community_type differs from slug — check if we need a different chunk
    const typeChunk = LOADED_CHUNKS.get(communityType);
    if (typeChunk) ResolvedScreen = typeChunk;
  }

  // ── Single loading screen: covers data fetch AND chunk load ──
  const isReady = !loading && !error && community && ResolvedScreen;

  if (!isReady) {
    if (error || (!loading && !community)) {
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

    return <CommunityLoadingScreen slug={slug} />;
  }

  const sharedProps = { community, miniseries, session, onBack, onToast, onShelvesChanged, communitySubscriptions, onOpenCommunity, scrollToTmdbId, letterboxdSyncSignal, pushNav, removeNav, popNav };

  return (
    <ErrorBoundary name={`Community: ${community.title || slug}`}>
      <ResolvedScreen {...sharedProps} />
    </ErrorBoundary>
  );
}

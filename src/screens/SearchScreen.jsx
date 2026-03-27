import { t } from "../theme";
/**
 * SearchScreen — Global search with podcast coverage overlay.
 *
 * Two-phase search:
 *   1. search_covered_films() — instant local results (12K+ titles, comes with podcast_count)
 *   2. searchTMDB() — full TMDB catalog (debounced 300ms)
 *   → Merge by tmdb_id, batch-check uncovered TMDB results via get_playable_films()
 *   → Sort: covered first, uncovered after divider
 *
 * Every result expands on tap:
 *   Covered  → episode picker via get_episodes_for_film(), wired to AudioPlayerProvider
 *   Uncovered → "no coverage yet" card with "Notify me when covered" button
 *              Writes to search_miss_log → generate_coverage_notifications() picks it up
 *              when a podcast later covers that film → re-engagement notification
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { searchTMDB } from "../utils/api";
import { trackEvent } from "../hooks/useAnalytics";
import { useAudioPlayer } from "../components/community/shared/AudioPlayerProvider";
import { toPlayerEpisode, resolveAudioUrl } from "../utils/episodeUrl";
import { toPosterPath } from "../utils/mediaWrite";
import FeedFilterBar from "../components/feed/FeedFilterBar";
import QuickLogModal from "../components/feed/QuickLogModal";

const TC = "#C75B3F";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const DEBOUNCE_MS = 300;

export default function SearchScreen({ session, isActive, onToast, pushNav, removeNav }) {
  const userId = session?.user?.id;

  // ── Search state ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);
  const lastQueryRef = useRef("");
  const inputRef = useRef(null);

  // ── Expand state (shared: both covered and uncovered expand) ──
  const [expandedTmdbId, setExpandedTmdbId] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // ── Notify state ──
  const [notifyingId, setNotifyingId] = useState(null);
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  // ── Filter / Sort / Browse ──
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [sortOrder, setSortOrder] = useState(null); // null | "recent" | "oldest"
  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseHasMore, setBrowseHasMore] = useState(false);
  const [browseLoadingMore, setBrowseLoadingMore] = useState(false);
  const isBrowseMode = !query && (selectedPodcast || sortOrder);
  const BROWSE_PAGE = 40;

  // ── Recently covered (empty state) ──
  const [recentlyCovered, setRecentlyCovered] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // ── Audio player ──
  const { play: playEpisode, currentEp, isPlaying, addToQueue } = useAudioPlayer();

  // ── Watched status — batch-check user_media_logs ──
  const [watchedTmdbIds, setWatchedTmdbIds] = useState(new Set());

  const displayResults = isBrowseMode ? browseResults : results;
  useEffect(() => {
    if (!userId || displayResults.length === 0) { setWatchedTmdbIds(new Set()); return; }
    const tmdbIds = displayResults.map(r => r.tmdbId).filter(Boolean);
    if (tmdbIds.length === 0) return;
    let cancelled = false;
    supabase.from("user_films_v").select("tmdb_id")
      .eq("user_id", userId).in("tmdb_id", tmdbIds)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setWatchedTmdbIds(new Set(data.map(r => r.tmdb_id)));
      });
    return () => { cancelled = true; };
  }, [userId, displayResults.length, displayResults[0]?.tmdbId]);

  // ── Admin: unlink bad matches ──
  const isAdmin = userId === "19410e64-d610-4fab-9c26-d24fafc94696";
  const [hiddenEpIds, setHiddenEpIds] = useState(new Set());

  const handleUnlinkEpisode = useCallback(async (ep, tmdbId) => {
    const epId = ep.episode_id || ep.id;
    if (!epId || !tmdbId) return;
    if (!confirm(`Unlink "${ep.episode_title || ep.podcast_name}" from this film?`)) return;
    const { error } = await supabase
      .from("podcast_episode_films")
      .delete()
      .eq("episode_id", epId)
      .eq("tmdb_id", tmdbId);
    if (!error) setHiddenEpIds(prev => new Set([...prev, epId]));
  }, []);

  // ── Load recently covered on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("recently_covered_films", {
        days_back: 30,
        result_limit: 10,
      });
      if (!cancelled && !error && data) {
        setRecentlyCovered(data);
      }
      if (!cancelled) setRecentLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Focus input when tab becomes active ──
  useEffect(() => {
    if (isActive && inputRef.current && !query) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  // ── Browse mode: load catalog when filters active + no query ──
  useEffect(() => {
    if (query) return;
    if (!selectedPodcast && !sortOrder) {
      setBrowseResults([]);
      setBrowseHasMore(false);
      return;
    }

    let cancelled = false;
    setBrowseLoading(true);
    setBrowseResults([]);
    setBrowseHasMore(false);
    setExpandedTmdbId(null);
    if (removeNav) removeNav("searchExpand");

    (async () => {
      const { data, error } = await supabase.rpc("browse_covered_films", {
        podcast_slug: selectedPodcast || null,
        sort_dir: sortOrder === "oldest" ? "asc" : "desc",
        result_limit: BROWSE_PAGE,
        result_offset: 0,
      });
      if (!cancelled && !error && data) {
        const mapped = data.map(mapBrowseRow);
        setBrowseResults(mapped);
        setBrowseHasMore(data.length === BROWSE_PAGE);
      }
      if (!cancelled) setBrowseLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedPodcast, sortOrder, query, removeNav]);

  const mapBrowseRow = (r) => ({
    tmdbId: r.tmdb_id,
    title: r.title,
    year: r.year,
    poster: r.poster_path ? `${TMDB_IMG}/w185${r.poster_path}` : null,
    posterPath: r.poster_path,
    podcastCount: r.podcast_count || 0,
    latestDate: r.latest_episode_date,
    podcasts: r.podcasts,
    source: "browse",
  });

  const loadMoreBrowse = useCallback(async () => {
    if (browseLoadingMore || !browseHasMore) return;
    setBrowseLoadingMore(true);

    const { data, error } = await supabase.rpc("browse_covered_films", {
      podcast_slug: selectedPodcast || null,
      sort_dir: sortOrder === "oldest" ? "asc" : "desc",
      result_limit: BROWSE_PAGE,
      result_offset: browseResults.length,
    });

    if (!error && data) {
      const mapped = data.map(mapBrowseRow);
      setBrowseResults((prev) => [...prev, ...mapped]);
      setBrowseHasMore(data.length === BROWSE_PAGE);
    }
    setBrowseLoadingMore(false);
  }, [browseLoadingMore, browseHasMore, selectedPodcast, sortOrder, browseResults.length]);

  // ═══════════════════════════════════════════
  // TWO-PHASE SEARCH
  // ═══════════════════════════════════════════

  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    if (trimmed === lastQueryRef.current) return;
    lastQueryRef.current = trimmed;
    setSearching(true);
    setHasSearched(true);
    setExpandedTmdbId(null);
    if (removeNav) removeNav("searchExpand");

    try {
      const [localRes, tmdbRows] = await Promise.all([
        supabase.rpc("search_covered_films", {
          search_query: trimmed,
          result_limit: 20,
          podcast_filter: selectedPodcast || null,
        }),
        searchTMDB(trimmed),
      ]);

      const localRows = localRes.data || [];
      const mergedMap = new Map();

      localRows.forEach((r) => {
        if (!r.tmdb_id) return;
        mergedMap.set(r.tmdb_id, {
          tmdbId: r.tmdb_id,
          title: r.title,
          year: r.year,
          posterPath: r.poster_path,
          poster: r.poster_path ? `${TMDB_IMG}/w185${r.poster_path}` : null,
          podcastCount: r.podcast_count || 0,
          inCommunity: r.in_community,
          podcasts: r.podcasts,
          source: "local",
        });
      });

      const uncheckedTmdbIds = [];
      (tmdbRows || []).forEach((r) => {
        if (!r.tmdbId) return;
        if (mergedMap.has(r.tmdbId)) {
          const existing = mergedMap.get(r.tmdbId);
          if (!existing.poster && r.poster) existing.poster = r.poster;
          if (!existing.year && r.year) existing.year = parseInt(r.year);
        } else {
          mergedMap.set(r.tmdbId, {
            tmdbId: r.tmdbId,
            title: r.title,
            year: parseInt(r.year) || null,
            poster: r.poster,
            posterPath: r.poster ? toPosterPath(r.poster) : null,
            podcastCount: 0,
            inCommunity: false,
            source: "tmdb",
          });
          uncheckedTmdbIds.push(r.tmdbId);
        }
      });

      if (uncheckedTmdbIds.length > 0) {
        const { data: playable } = await supabase.rpc("get_playable_films", {
          tmdb_ids: uncheckedTmdbIds,
        });
        (playable || []).forEach((p) => {
          const entry = mergedMap.get(p.tmdb_id);
          if (entry) {
            entry.podcastCount = p.podcast_count || 0;
            if (p.podcasts) entry.podcasts = p.podcasts;
          }
        });
      }

      const all = [...mergedMap.values()];
      const covered = all
        .filter((r) => r.podcastCount > 0)
        .sort((a, b) => b.podcastCount - a.podcastCount);
      const uncovered = all
        .filter((r) => r.podcastCount === 0)
        .sort((a, b) => (b.year || 0) - (a.year || 0));

      setResults([...covered, ...uncovered]);

      // Analytics: track search
      trackEvent(session?.user?.id, "search", {
        query: trimmed,
        result_count: covered.length + uncovered.length,
        covered_count: covered.length,
      });
    } catch (err) {
      console.error("[Search] Error:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [removeNav, selectedPodcast]);

  const handleQueryChange = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      lastQueryRef.current = "";
      if (removeNav) removeNav("searchExpand");
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(val), DEBOUNCE_MS);
  }, [runSearch, removeNav]);

  // ── Re-run search when podcast filter changes during active query ──
  const prevPodcastRef = useRef(selectedPodcast);
  useEffect(() => {
    if (prevPodcastRef.current === selectedPodcast) return;
    prevPodcastRef.current = selectedPodcast;
    if (query.trim().length >= 2) {
      lastQueryRef.current = ""; // force re-search (bypass dedup)
      runSearch(query);
    }
  }, [selectedPodcast, query, runSearch]);

  // ═══════════════════════════════════════════
  // EXPAND (shared for covered + uncovered)
  // ═══════════════════════════════════════════

  const handleResultTap = useCallback(async (tmdbId, podcastCount) => {
    if (expandedTmdbId === tmdbId) {
      // Collapse — remove nav entry
      setExpandedTmdbId(null);
      if (removeNav) removeNav("searchExpand");
      return;
    }

    // Expand — push nav entry so back gesture collapses instead of leaving tab
    setExpandedTmdbId(tmdbId);
    if (pushNav) pushNav("searchExpand", () => setExpandedTmdbId(null));

    if (podcastCount > 0) {
      // Covered: load episodes
      setLoadingEpisodes(true);
      setEpisodes([]);
      const { data, error } = await supabase.rpc("get_episodes_for_film", {
        film_tmdb_id: tmdbId,
      });
      if (!error && data) setEpisodes(data);
      setLoadingEpisodes(false);
    }
    // Uncovered: expansion just reveals the "notify me" card (no async needed)
  }, [expandedTmdbId, pushNav, removeNav]);

  // ── Play ──
  const handlePlay = useCallback((ep) => {
    const url = resolveAudioUrl(ep);
    if (!url) return;
    const playerEp = toPlayerEpisode(ep);
    if (playerEp) playEpisode(playerEp);
  }, [playEpisode]);

  const handleQueue = useCallback((ep) => {
    const url = resolveAudioUrl(ep);
    if (!url) return;
    const playerEp = toPlayerEpisode(ep);
    if (playerEp) addToQueue(playerEp);
  }, [addToQueue]);

  // ═══════════════════════════════════════════
  // NOTIFY ME (uncovered films)
  // ═══════════════════════════════════════════

  const handleNotify = useCallback(async (result) => {
    if (!userId || notifyingId) return;
    setNotifyingId(result.tmdbId);

    try {
      const { error } = await supabase.from("search_miss_log").upsert({
        query: query.trim(),
        tmdb_id: result.tmdbId,
        user_id: userId,
      }, {
        onConflict: "user_id,tmdb_id",
        ignoreDuplicates: true,
      });

      if (!error) {
        setNotifiedIds((prev) => new Set([...prev, result.tmdbId]));
        if (onToast) onToast(`We'll notify you when ${result.title} gets covered`);
      }
    } catch (err) {
      console.error("[Search] Notify error:", err);
    } finally {
      setNotifyingId(null);
    }
  }, [userId, notifyingId, query, onToast]);

  // ── Split for rendering ──
  const coveredResults = useMemo(
    () => results.filter((r) => r.podcastCount > 0), [results]
  );
  const uncoveredResults = useMemo(
    () => results.filter((r) => r.podcastCount === 0), [results]
  );
  const hasDivider = coveredResults.length > 0 && uncoveredResults.length > 0;

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  return (
    <div style={{
      minHeight: "100vh",
      background: t.bgPrimary,
      paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
    }}>
      {/* ── Sticky search + filter bar ── */}
      <div style={{
        position: "sticky", top: 0,
        background: t.bgPrimary, zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          padding: "16px 16px 8px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: t.bgInput,
            borderRadius: 10, padding: "10px 14px",
            border: `1px solid ${t.bgHover}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={searching ? TC : t.textFaint}
              strokeWidth="2.5" strokeLinecap="round"
              style={{ transition: "stroke 0.2s", flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search films..."
              autoCapitalize="off"
              autoCorrect="off"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: t.cream, fontSize: 15,
                fontFamily: t.fontDisplay,
                letterSpacing: "0.03em",
              }}
            />
            {query && (
              <div onClick={() => handleQueryChange("")}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 12, color: t.textMuted,
                  flexShrink: 0,
                }}>×</div>
            )}
          </div>
        </div>

        <FeedFilterBar
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          selectedPodcast={selectedPodcast}
          onPodcastChange={setSelectedPodcast}
          communitySubscriptions={new Set()}
        />
      </div>

      {/* ── Browse mode: podcast catalog ── */}
      {isBrowseMode && (
        <div style={{ padding: "8px 4px 0" }}>
          {browseLoading ? (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textMuted,
            }}>Loading…</div>
          ) : browseResults.length > 0 ? (
            <>
              {browseResults.map((r) => (
                <ResultCard
                  key={r.tmdbId}
                  result={r}
                  isExpanded={expandedTmdbId === r.tmdbId}
                  onTap={() => handleResultTap(r.tmdbId, r.podcastCount)}
                  episodes={expandedTmdbId === r.tmdbId ? episodes : []}
                  loadingEpisodes={expandedTmdbId === r.tmdbId && loadingEpisodes}
                  onPlayEpisode={handlePlay}
                  onQueueEpisode={handleQueue}
                  currentEp={currentEp}
                  isPlaying={isPlaying}
                  isAdmin={isAdmin}
                  hiddenEpIds={hiddenEpIds}
                  onUnlinkEpisode={handleUnlinkEpisode}
                  watched={watchedTmdbIds.has(r.tmdbId)}
                  userId={userId}
                  onWatchedChange={(tmdbId) => setWatchedTmdbIds(prev => new Set([...prev, tmdbId]))}
                />
              ))}

              {/* Load more */}
              {browseHasMore && (
                <div style={{ padding: "12px 16px 20px", textAlign: "center" }}>
                  <button
                    onClick={loadMoreBrowse}
                    disabled={browseLoadingMore}
                    style={{
                      padding: "10px 28px",
                      background: "rgba(199,91,63,0.08)",
                      border: `1px solid rgba(199,91,63,${browseLoadingMore ? "0.1" : "0.25"})`,
                      borderRadius: 8,
                      color: TC,
                      fontSize: 12, fontWeight: 700,
                      fontFamily: t.fontDisplay,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      cursor: browseLoadingMore ? "wait" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {browseLoadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}

              {/* End of results */}
              {!browseHasMore && browseResults.length >= BROWSE_PAGE && (
                <div style={{
                  padding: "8px 16px 20px", textAlign: "center",
                  fontFamily: t.fontBody,
                  fontSize: 9, color: t.textFaint,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {browseResults.length} films
                </div>
              )}
            </>
          ) : (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textSecondary,
            }}>No coverage found for this filter</div>
          )}
        </div>
      )}

      {/* ── Empty state: recently covered (only when no filters active) ── */}
      {!hasSearched && !query && !isBrowseMode && (
        <div style={{ padding: "20px 0 0" }}>
          {/* Section header */}
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{
              fontFamily: t.fontDisplay,
              fontWeight: 700, fontSize: 13,
              color: t.textSecondary,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>Recently covered</div>
            <div style={{
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textSecondary,
              marginTop: 2,
            }}>New podcast episodes this month</div>
          </div>

          {/* Horizontal poster scroll */}
          {recentLoading ? (
            <div style={{
              padding: "20px 16px",
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textSecondary,
            }}>Loading…</div>
          ) : recentlyCovered.length > 0 ? (
            <div className="search-hscroll" style={{
              display: "flex", gap: 12,
              overflowX: "auto", WebkitOverflowScrolling: "touch",
              padding: "0 16px 16px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}>
              {recentlyCovered.map((film) => (
                <div
                  key={film.tmdb_id}
                  onClick={() => { setQuery(film.title); runSearch(film.title); }}
                  style={{
                    flexShrink: 0, width: 110,
                    cursor: "pointer",
                  }}
                >
                  {/* Poster */}
                  {film.poster_path ? (
                    <img
                      src={`${TMDB_IMG}/w185${film.poster_path}`}
                      alt={film.title}
                      loading="lazy"
                      style={{
                        width: 110, height: 165, borderRadius: 8,
                        objectFit: "cover",
                        border: `1px solid ${t.borderSubtle}`,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 110, height: 165, borderRadius: 8,
                      background: t.bgElevated,
                      border: `1px solid ${t.borderSubtle}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: t.fontDisplay,
                      fontSize: 11, color: t.textMuted,
                      textTransform: "uppercase", textAlign: "center",
                      padding: 8, lineHeight: 1.3,
                    }}>{film.title}</div>
                  )}

                  {/* Title + podcast avatars */}
                  <div style={{ marginTop: 6 }}>
                    <div style={{
                      fontFamily: t.fontDisplay,
                      fontWeight: 700, fontSize: 12, color: t.cream,
                      textTransform: "uppercase", letterSpacing: "0.02em",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{film.title}</div>

                    {/* Stacked podcast artwork */}
                    {film.podcasts && film.podcasts.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <div style={{ display: "flex" }}>
                          {film.podcasts.slice(0, 4).map((p, i) => (
                            <img
                              key={p.slug}
                              src={p.artwork}
                              alt={p.name}
                              style={{
                                width: 18, height: 18, borderRadius: 5,
                                objectFit: "cover",
                                border: "1.5px solid #0f0d0b",
                                marginLeft: i === 0 ? 0 : -5,
                                position: "relative", zIndex: 4 - i,
                              }}
                            />
                          ))}
                        </div>
                        <span style={{
                          fontFamily: t.fontBody,
                          fontSize: 9, color: TC,
                          whiteSpace: "nowrap",
                        }}>{film.year || ""}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              padding: "20px 16px",
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textSecondary,
            }}>No recent coverage found</div>
          )}

          {/* Search prompt below */}
          <div style={{
            padding: "24px 32px 0", textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{
              fontFamily: t.fontDisplay,
              fontWeight: 700, fontSize: 14,
              color: t.textMuted,
              textTransform: "uppercase", letterSpacing: "0.04em",
              marginBottom: 4,
            }}>Or search any film</div>
            <div style={{
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textSecondary,
            }}>Find coverage across {recentlyCovered.length > 0
              ? `${recentlyCovered[0]?.podcasts?.length || "all"} podcasts and counting`
              : "all your favorite shows"
            }</div>
          </div>
        </div>
      )}

      {/* ── No results ── */}
      {hasSearched && !searching && results.length === 0 && (
        <div style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{
            fontFamily: t.fontDisplay,
            fontWeight: 700, fontSize: 15,
            color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.04em",
            marginBottom: 6,
          }}>No results for "{query}"</div>
          <div style={{
            fontFamily: t.fontBody,
            fontSize: 10, color: t.textSecondary,
          }}>Try a different title or spelling</div>
        </div>
      )}

      {/* ── Covered results ── */}
      {coveredResults.length > 0 && (
        <div style={{ padding: "8px 4px 0" }}>
          {coveredResults.map((r) => (
            <ResultCard
              key={r.tmdbId}
              result={r}
              isExpanded={expandedTmdbId === r.tmdbId}
              onTap={() => handleResultTap(r.tmdbId, r.podcastCount)}
              episodes={expandedTmdbId === r.tmdbId ? episodes : []}
              loadingEpisodes={expandedTmdbId === r.tmdbId && loadingEpisodes}
              onPlayEpisode={handlePlay}
              onQueueEpisode={handleQueue}
              currentEp={currentEp}
              isPlaying={isPlaying}
              isAdmin={isAdmin}
              hiddenEpIds={hiddenEpIds}
              onUnlinkEpisode={handleUnlinkEpisode}
              watched={watchedTmdbIds.has(r.tmdbId)}
              userId={userId}
              onWatchedChange={(tmdbId) => setWatchedTmdbIds(prev => new Set([...prev, tmdbId]))}
            />
          ))}
        </div>
      )}

      {/* ── Divider ── */}
      {hasDivider && (
        <div style={{
          padding: "20px 16px 8px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />
          <span style={{
            fontFamily: t.fontBody,
            fontSize: 9, color: t.textMuted,
            textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap",
          }}>no coverage yet</span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(270deg, rgba(255,255,255,0.06), transparent)" }} />
        </div>
      )}

      {/* ── Uncovered results ── */}
      {uncoveredResults.length > 0 && (
        <div style={{ padding: hasDivider ? "0 4px" : "8px 4px 0" }}>
          {uncoveredResults.map((r) => (
            <ResultCard
              key={r.tmdbId}
              result={r}
              isExpanded={expandedTmdbId === r.tmdbId}
              onTap={() => handleResultTap(r.tmdbId, 0)}
              onNotify={() => handleNotify(r)}
              notifying={notifyingId === r.tmdbId}
              notified={notifiedIds.has(r.tmdbId)}
              watched={watchedTmdbIds.has(r.tmdbId)}
              userId={userId}
              onWatchedChange={(tmdbId) => setWatchedTmdbIds(prev => new Set([...prev, tmdbId]))}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes searchSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .search-hscroll::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
/* ═══════════════════════════════════════════════════
   ResultCard — unified expand for covered + uncovered
   ═══════════════════════════════════════════════════ */

// Strip HTML tags + podcast promo tails from RSS descriptions
const SEARCH_PROMO_MARKERS = [
  /\bJoin our Patreon\b/i,
  /\bFollow us [@on]/i,
  /\bBe sure to (?:follow|subscribe)/i,
  /\bLearn more about your ad choices/i,
  /\bThanks to our SPONSOR/i,
  /\bThis episode is (?:brought to you|sponsored) by/i,
  /\bWeekly Plugs\b/i,
  /\bProducers?:/i,
  /\bWatch this episode on/i,
];

function searchStripHtml(str) {
  if (!str) return "";
  let text = str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n").trim();
  let cutIdx = text.length;
  for (const marker of SEARCH_PROMO_MARKERS) {
    const match = text.match(marker);
    if (match && match.index < cutIdx) cutIdx = match.index;
  }
  if (cutIdx < text.length) text = text.slice(0, cutIdx).replace(/[\s\n:—–-]+$/, "").trim();
  return text;
}

function ResultCard({
  result, isExpanded, onTap, episodes, loadingEpisodes,
  onPlayEpisode, onQueueEpisode, onNotify, notifying, notified, currentEp, isPlaying,
  isAdmin, hiddenEpIds, onUnlinkEpisode, watched, userId, onWatchedChange,
}) {
  const hasCoverage = result.podcastCount > 0;
  const [expandedEpId, setExpandedEpId] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const isWatched = watched || justLogged;

  return (
    <>
    <div style={{ marginBottom: 2 }}>
      {/* Main row — always tappable */}
      <div
        onClick={onTap}
        style={{
          display: "flex", gap: 12, padding: "12px 14px",
          background: isExpanded ? "rgba(255,255,255,0.04)" : "transparent",
          borderRadius: 10, cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {/* Poster + watched badge */}
        <div style={{ position: "relative", flexShrink: 0 }}>
        {result.poster ? (
          <img src={result.poster} alt={result.title} loading="lazy"
            style={{
              width: 52, height: 78, borderRadius: 6, objectFit: "cover",
              border: `1px solid ${t.borderSubtle}`,
            }} />
        ) : (
          <div style={{
            width: 52, height: 78, borderRadius: 6,
            background: t.bgElevated,
            border: `1px solid ${t.borderSubtle}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: t.fontBody,
            fontSize: 9, color: t.textSecondary,
          }}>NO<br />IMG</div>
        )}
        {isWatched && (
          <div style={{
            position: "absolute", bottom: -3, right: -3,
            width: 16, height: 16, borderRadius: "50%",
            background: t.bgPrimary, border: "1.5px solid rgba(52,211,153,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{
            fontFamily: t.fontDisplay,
            fontWeight: 700, fontSize: 16, color: t.cream,
            textTransform: "uppercase", letterSpacing: "0.03em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{result.title}</div>
          <div style={{
            fontFamily: t.fontBody,
            fontSize: 11, color: t.textMuted, marginTop: 2,
          }}>{result.year || "—"}</div>

          {hasCoverage && (
            <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
              {result.podcasts?.length > 0 ? (
                <>
                  {result.podcasts.slice(0, 5).map((pod, i) => (
                    pod.artwork ? (
                      <img key={pod.slug || i} src={pod.artwork} loading="lazy" alt={pod.name}
                        title={pod.name}
                        style={{
                          width: 22, height: 22, borderRadius: 5, objectFit: "cover",
                          border: "1.5px solid #0f0d0b",
                          marginLeft: i > 0 ? -6 : 0,
                          position: "relative", zIndex: 5 - i,
                        }} />
                    ) : (
                      <div key={pod.slug || i} title={pod.name}
                        style={{
                          width: 22, height: 22, borderRadius: 5,
                          background: t.bgInput,
                          border: "1.5px solid #0f0d0b",
                          marginLeft: i > 0 ? -6 : 0,
                          position: "relative", zIndex: 5 - i,
                        }} />
                    )
                  ))}
                  {result.podcasts.length > 5 && (
                    <span style={{
                      fontFamily: t.fontBody,
                      fontSize: 9, color: t.textMuted,
                      marginLeft: 4,
                    }}>+{result.podcasts.length - 5}</span>
                  )}
                </>
              ) : (
                <span style={{
                  fontFamily: t.fontDisplay,
                  fontSize: 11, fontWeight: 600, color: TC,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {result.podcastCount} podcast{result.podcastCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand chevron — consistent for all results */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: hasCoverage
              ? `rgba(199,91,63,${isExpanded ? "0.2" : "0.08"})`
              : `rgba(255,255,255,${isExpanded ? "0.08" : "0.03"})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24"
              fill="none"
              stroke={hasCoverage ? TC : t.textFaint}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Expanded: Episode picker (covered) ── */}
      {isExpanded && hasCoverage && (
        <div style={{ padding: "4px 14px 12px 78px", animation: "searchSlideDown 0.2s ease" }}>
          {/* Log / Watched pill */}
          {userId && (
            <div style={{ marginBottom: 8 }}>
              {isWatched ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px 3px 7px", borderRadius: 10,
                  background: "rgba(52,211,153,0.08)",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{
                    fontFamily: t.fontBody,
                    fontSize: 9, fontWeight: 600,
                    color: "rgba(52,211,153,0.6)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Watched</span>
                </div>
              ) : (
                <div
                  onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px 3px 7px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${t.bgHover}`,
                    cursor: "pointer",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span style={{
                    fontFamily: t.fontBody,
                    fontSize: 9, fontWeight: 600,
                    color: t.textSecondary,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Log This Film</span>
                </div>
              )}
            </div>
          )}
          {loadingEpisodes && (
            <div style={{ padding: "12px 0", fontFamily: t.fontBody, fontSize: 10, color: t.textMuted }}>
              Loading episodes…
            </div>
          )}

          {!loadingEpisodes && episodes.length === 0 && (
            <div style={{ padding: "12px 0", fontFamily: t.fontBody, fontSize: 10, color: t.textSecondary }}>
              No playable episodes found
            </div>
          )}

          {episodes.filter(ep => !hiddenEpIds?.has(ep.episode_id || ep.id)).map((ep, i) => {
            const epKey = ep.episode_id || ep.id || i;
            const epUrl = resolveAudioUrl(ep);
            const isCurrent = currentEp &&
              (currentEp.guid === (ep.episode_id || ep.id) || currentEp.enclosureUrl === epUrl);
            const isActiveAndPlaying = isCurrent && isPlaying;
            const isEpExpanded = expandedEpId === epKey;
            const descText = searchStripHtml(ep.episode_description);

            return (
              <div key={epKey}>
                <div
                  onClick={(e) => { e.stopPropagation(); setExpandedEpId(isEpExpanded ? null : epKey); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 8px", borderRadius: 6,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    background: isEpExpanded ? "rgba(199,91,63,0.08)" : isCurrent ? "rgba(199,91,63,0.05)" : "transparent",
                  }}>
                {ep.podcast_artwork_url ? (
                  <img src={ep.podcast_artwork_url} loading="lazy" alt={ep.podcast_name}
                    style={{
                      width: 32, height: 32, borderRadius: 8, objectFit: "cover",
                      border: isEpExpanded || isCurrent ? `1.5px solid ${TC}` : `1px solid ${t.borderSubtle}`,
                    }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: t.bgElevated,
                    border: `1px solid ${t.borderSubtle}`,
                  }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: t.fontDisplay,
                    fontWeight: 700, fontSize: 13,
                    color: isEpExpanded || isCurrent ? TC : t.textMuted,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{ep.episode_title || "Episode"}</div>
                  <div style={{
                    fontFamily: t.fontBody,
                    fontSize: 9, color: t.textMuted,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {ep.podcast_name}
                    {ep.duration_seconds ? ` · ${Math.round(ep.duration_seconds / 60)}m` : ""}
                  </div>
                </div>

                {epUrl ? (
                  <>
                  {/* Play / Pause button */}
                  <div
                    onClick={(e) => { e.stopPropagation(); onPlayEpisode?.(ep); }}
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: isActiveAndPlaying ? "rgba(199,91,63,0.15)" : "rgba(255,255,255,0.04)",
                      border: isActiveAndPlaying ? "1px solid rgba(199,91,63,0.3)" : `1px solid ${t.bgHover}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={isActiveAndPlaying ? TC : t.textMuted}>
                      {isActiveAndPlaying ? (
                        <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </div>
                  {/* Queue: add to up next */}
                  {onQueueEpisode && !isCurrent && (
                    <div
                      onClick={(e) => { e.stopPropagation(); onQueueEpisode(ep); }}
                      title="Add to Up Next"
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${t.borderSubtle}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, cursor: "pointer",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  )}
                  {isAdmin && (ep.episode_id || ep.id) && (
                    <div
                      onClick={(e) => { e.stopPropagation(); onUnlinkEpisode?.(ep, result.tmdbId); }}
                      title="Unlink episode"
                      style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, cursor: "pointer",
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </div>
                  )}
                  </>
                ) : (
                  <span style={{
                    fontFamily: t.fontBody,
                    fontSize: 8, color: t.textSecondary, textTransform: "uppercase",
                  }}>soon</span>
                )}
              </div>

              {/* Inline accordion description */}
              <div style={{
                maxHeight: isEpExpanded ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}>
                {descText ? (() => {
                  const splitIdx = descText.search(/[.!?](\s|$)/);
                  const hook = splitIdx > 0 ? descText.slice(0, splitIdx + 1) : descText;
                  const rest = splitIdx > 0 ? descText.slice(splitIdx + 1).trim() : "";
                  return (
                    <div style={{
                      padding: "4px 8px 10px 50px",
                      fontFamily: t.fontSerif,
                      fontSize: 13, lineHeight: 1.55,
                      color: t.textMuted,
                      whiteSpace: "pre-wrap",
                    }}>
                      <span style={{ color: t.textMuted, fontWeight: 600 }}>{hook}</span>
                      {rest && <>{" "}{rest}</>}
                    </div>
                  );
                })() : isEpExpanded ? (
                  <div style={{
                    padding: "4px 8px 10px 50px",
                    fontFamily: t.fontBody,
                    fontSize: 9, fontStyle: "italic",
                    color: t.textMuted,
                  }}>
                    No description available
                  </div>
                ) : null}
              </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expanded: Notify me (uncovered) ── */}
      {isExpanded && !hasCoverage && (
        <div style={{
          padding: "4px 14px 14px 78px",
          animation: "searchSlideDown 0.2s ease",
        }}>
          {/* Log / Watched pill */}
          {userId && (
            <div style={{ marginBottom: 8 }}>
              {isWatched ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px 3px 7px", borderRadius: 10,
                  background: "rgba(52,211,153,0.08)",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{
                    fontFamily: t.fontBody,
                    fontSize: 9, fontWeight: 600,
                    color: "rgba(52,211,153,0.6)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Watched</span>
                </div>
              ) : (
                <div
                  onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px 3px 7px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${t.bgHover}`,
                    cursor: "pointer",
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span style={{
                    fontFamily: t.fontBody,
                    fontSize: 9, fontWeight: 600,
                    color: t.textSecondary,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>Log This Film</span>
                </div>
              )}
            </div>
          )}
          <div style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${t.borderSubtle}`,
            borderRadius: 10,
          }}>
            <div style={{
              fontFamily: t.fontBody,
              fontSize: 10, color: t.textSecondary,
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: 10,
            }}>
              No podcast coverage yet
            </div>

            {notified ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px",
                background: "rgba(199,91,63,0.06)",
                border: "1px solid rgba(199,91,63,0.15)",
                borderRadius: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TC} strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span style={{
                  fontFamily: t.fontDisplay,
                  fontSize: 12, fontWeight: 600, color: TC,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  We'll let you know
                </span>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onNotify?.(); }}
                disabled={notifying}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", width: "100%",
                  background: notifying ? "rgba(199,91,63,0.08)" : "rgba(199,91,63,0.1)",
                  border: `1px solid rgba(199,91,63,${notifying ? "0.15" : "0.25"})`,
                  borderRadius: 8, cursor: notifying ? "wait" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {notifying ? (
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid rgba(199,91,63,0.2)",
                    borderTopColor: TC,
                    animation: "spin 0.6s linear infinite",
                  }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TC} strokeWidth="2" strokeLinecap="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                )}
                <span style={{
                  fontFamily: t.fontDisplay,
                  fontSize: 12, fontWeight: 700, color: TC,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {notifying ? "Subscribing…" : "Notify me when covered"}
                </span>
              </button>
            )}

            <div style={{
              fontFamily: t.fontBody,
              fontSize: 9, color: t.textSecondary,
              marginTop: 8, lineHeight: 1.4,
            }}>
              {notified
                ? "You'll get a notification when a podcast covers this film."
                : "Get notified when a podcast in our network reviews this film."}
            </div>
          </div>
        </div>
      )}
    </div>

    <QuickLogModal
      data={{
        tmdb_id: result.tmdbId,
        title: result.title,
        year: result.year,
        poster_path: result.posterPath,
      }}
      open={showLogModal}
      onClose={() => setShowLogModal(false)}
      onLogged={() => {
        setJustLogged(true);
        onWatchedChange?.(result.tmdbId);
      }}
    />
    </>
  );
}

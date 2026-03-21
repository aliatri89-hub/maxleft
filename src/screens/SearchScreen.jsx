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
import { useAudioPlayer } from "../components/community/shared/AudioPlayerProvider";
import { toPosterPath } from "../utils/mediaWrite";

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

  // ── Recently covered (empty state) ──
  const [recentlyCovered, setRecentlyCovered] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // ── Audio player ──
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();

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
          if (entry) entry.podcastCount = p.podcast_count || 0;
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
    } catch (err) {
      console.error("[Search] Error:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [removeNav]);

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
    if (!ep.audio_url) return;
    playEpisode({
      guid: `search-${ep.episode_id}`,
      title: ep.episode_title || "Episode",
      enclosureUrl: ep.audio_url,
      community: ep.podcast_name || null,
      artwork: ep.podcast_artwork_url || null,
    });
  }, [playEpisode]);

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
      background: "#0f0d0b",
      paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
    }}>
      {/* ── Search bar ── */}
      <div style={{
        padding: "16px 16px 8px",
        position: "sticky", top: 0,
        background: "#0f0d0b", zIndex: 10,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 10, padding: "10px 14px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={searching ? TC : "rgba(255,255,255,0.35)"}
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
              color: "#f5f0eb", fontSize: 15,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.03em",
            }}
          />
          {query && (
            <div onClick={() => handleQueryChange("")}
              style={{
                width: 20, height: 20, borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.5)",
                flexShrink: 0,
              }}>×</div>
          )}
        </div>
      </div>

      {/* ── Empty state: recently covered ── */}
      {!hasSearched && !query && (
        <div style={{ padding: "20px 0 0" }}>
          {/* Section header */}
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>Recently covered</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "rgba(255,255,255,0.15)",
              marginTop: 2,
            }}>New podcast episodes this month</div>
          </div>

          {/* Horizontal poster scroll */}
          {recentLoading ? (
            <div style={{
              padding: "20px 16px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "rgba(255,255,255,0.15)",
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
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 110, height: 165, borderRadius: 8,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 11, color: "rgba(255,255,255,0.2)",
                      textTransform: "uppercase", textAlign: "center",
                      padding: 8, lineHeight: 1.3,
                    }}>{film.title}</div>
                  )}

                  {/* Title + podcast avatars */}
                  <div style={{ marginTop: 6 }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700, fontSize: 12, color: "#f5f0eb",
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
                          fontFamily: "'IBM Plex Mono', monospace",
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
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "rgba(255,255,255,0.15)",
            }}>No recent coverage found</div>
          )}

          {/* Search prompt below */}
          <div style={{
            padding: "24px 32px 0", textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 14,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase", letterSpacing: "0.04em",
              marginBottom: 4,
            }}>Or search any film</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "rgba(255,255,255,0.15)",
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
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 15,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            marginBottom: 6,
          }}>No results for "{query}"</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, color: "rgba(255,255,255,0.15)",
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
              currentEp={currentEp}
              isPlaying={isPlaying}
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
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, color: "rgba(255,255,255,0.2)",
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

function ResultCard({
  result, isExpanded, onTap, episodes, loadingEpisodes,
  onPlayEpisode, onNotify, notifying, notified, currentEp, isPlaying,
}) {
  const hasCoverage = result.podcastCount > 0;

  return (
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
        {/* Poster */}
        {result.poster ? (
          <img src={result.poster} alt={result.title} loading="lazy"
            style={{
              width: 52, height: 78, borderRadius: 6, objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
            }} />
        ) : (
          <div style={{
            width: 52, height: 78, borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9, color: "rgba(255,255,255,0.15)",
          }}>NO<br />IMG</div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 16, color: "#f5f0eb",
            textTransform: "uppercase", letterSpacing: "0.03em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{result.title}</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2,
          }}>{result.year || "—"}</div>

          {hasCoverage && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600, color: TC,
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                {result.podcastCount} podcast{result.podcastCount !== 1 ? "s" : ""}
              </span>
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
              stroke={hasCoverage ? TC : "rgba(255,255,255,0.3)"}
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
          {loadingEpisodes && (
            <div style={{ padding: "12px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              Loading episodes…
            </div>
          )}

          {!loadingEpisodes && episodes.length === 0 && (
            <div style={{ padding: "12px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.15)" }}>
              No playable episodes found
            </div>
          )}

          {episodes.map((ep, i) => {
            const isCurrent = currentEp &&
              (currentEp.guid === `search-${ep.episode_id}` || currentEp.enclosureUrl === ep.audio_url);

            return (
              <div key={ep.episode_id || i}
                onClick={(e) => { e.stopPropagation(); onPlayEpisode?.(ep); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 8px", borderRadius: 6,
                  cursor: ep.audio_url ? "pointer" : "default",
                  transition: "background 0.15s",
                  background: isCurrent ? "rgba(199,91,63,0.08)" : "transparent",
                }}>
                {ep.podcast_artwork_url ? (
                  <img src={ep.podcast_artwork_url} alt={ep.podcast_name}
                    style={{
                      width: 32, height: 32, borderRadius: 8, objectFit: "cover",
                      border: isCurrent ? `1.5px solid ${TC}` : "1px solid rgba(255,255,255,0.06)",
                    }} />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 13,
                    color: isCurrent ? TC : "rgba(255,255,255,0.7)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{ep.episode_title || "Episode"}</div>
                  <div style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9, color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {ep.podcast_name}
                    {ep.duration_seconds ? ` · ${Math.round(ep.duration_seconds / 60)}m` : ""}
                  </div>
                </div>

                {ep.audio_url ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={TC}
                    opacity={isCurrent && isPlaying ? 1 : 0.5}>
                    {isCurrent && isPlaying ? (
                      <g><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></g>
                    ) : (
                      <path d="M8 5v14l11-7z" />
                    )}
                  </svg>
                ) : (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 8, color: "rgba(255,255,255,0.15)", textTransform: "uppercase",
                  }}>soon</span>
                )}
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
          <div style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
          }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10, color: "rgba(255,255,255,0.25)",
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
                  fontFamily: "'Barlow Condensed', sans-serif",
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
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 12, fontWeight: 700, color: TC,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {notifying ? "Subscribing…" : "Notify me when covered"}
                </span>
              </button>
            )}

            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9, color: "rgba(255,255,255,0.15)",
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
  );
}

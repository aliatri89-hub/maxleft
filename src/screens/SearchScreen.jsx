/**
 * SearchScreen — Global search with podcast coverage overlay.
 *
 * Two-phase search:
 *   1. search_covered_films() — instant local results (12K+ titles, comes with podcast_count)
 *   2. searchTMDB() — full TMDB catalog (debounced 300ms)
 *   → Merge by tmdb_id, batch-check uncovered TMDB results via get_playable_films()
 *   → Sort: covered first, uncovered after divider
 *
 * Episode picker:
 *   Tap a covered result → get_episodes_for_film(tmdb_id) → inline expansion
 *   Each row: podcast art, episode title, podcast name, play button
 *   Wired to AudioPlayerProvider via useAudioPlayer()
 *
 * Search miss logging:
 *   Tap + on uncovered result → insert into search_miss_log
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { supabase } from "../supabase";
import { searchTMDB, fetchTMDBDetails } from "../utils/api";
import { useAudioPlayer } from "../components/community/shared/AudioPlayerProvider";
import { upsertMediaLog, toPosterPath } from "../utils/mediaWrite";

const TC = "#C75B3F";
const TMDB_IMG = "https://image.tmdb.org/t/p";
const DEBOUNCE_MS = 300;

export default function SearchScreen({ session, isActive, onToast }) {
  const userId = session?.user?.id;

  // ── Search state ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);
  const lastQueryRef = useRef("");
  const inputRef = useRef(null);

  // ── Episode picker state ──
  const [expandedTmdbId, setExpandedTmdbId] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // ── Logging state ──
  const [loggingId, setLoggingId] = useState(null);

  // ── Audio player ──
  const { play: playEpisode, currentEp, isPlaying } = useAudioPlayer();

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

    try {
      // Phase 1 + 2 in parallel
      const [localRes, tmdbRows] = await Promise.all([
        supabase.rpc("search_covered_films", {
          search_query: trimmed,
          result_limit: 20,
        }),
        searchTMDB(trimmed),
      ]);

      const localRows = localRes.data || [];
      const mergedMap = new Map();

      // Local results already have podcast_count
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

      // Merge TMDB results
      const uncheckedTmdbIds = [];
      (tmdbRows || []).forEach((r) => {
        if (!r.tmdbId) return;
        if (mergedMap.has(r.tmdbId)) {
          // Enrich local result with TMDB poster if missing
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

      // Phase 3: batch coverage check for TMDB-only results
      if (uncheckedTmdbIds.length > 0) {
        const { data: playable } = await supabase.rpc("get_playable_films", {
          tmdb_ids: uncheckedTmdbIds,
        });
        (playable || []).forEach((p) => {
          const entry = mergedMap.get(p.tmdb_id);
          if (entry) entry.podcastCount = p.podcast_count || 0;
        });
      }

      // Sort: covered first (podcast count desc), then uncovered (year desc)
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
  }, []);

  // ── Debounced input ──
  const handleQueryChange = useCallback((val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      lastQueryRef.current = "";
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(val), DEBOUNCE_MS);
  }, [runSearch]);

  // ═══════════════════════════════════════════
  // EPISODE PICKER
  // ═══════════════════════════════════════════

  const handleResultTap = useCallback(async (tmdbId, podcastCount) => {
    if (expandedTmdbId === tmdbId) {
      setExpandedTmdbId(null);
      return;
    }
    if (podcastCount > 0) {
      setExpandedTmdbId(tmdbId);
      setLoadingEpisodes(true);
      setEpisodes([]);

      const { data, error } = await supabase.rpc("get_episodes_for_film", {
        film_tmdb_id: tmdbId,
      });

      if (!error && data) setEpisodes(data);
      setLoadingEpisodes(false);
    }
  }, [expandedTmdbId]);

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
  // LOG (uncovered films)
  // ═══════════════════════════════════════════

  const handleLog = useCallback(async (result) => {
    if (!userId || loggingId) return;
    setLoggingId(result.tmdbId);

    try {
      let director = null;
      try {
        const details = await fetchTMDBDetails(result.tmdbId, "movie");
        director = details?.director || null;
      } catch {}

      await upsertMediaLog(userId, {
        mediaType: "film",
        tmdbId: result.tmdbId,
        title: result.title,
        year: result.year || null,
        creator: director,
        posterPath: result.posterPath || null,
        source: "mantl",
      });

      // Log search miss for expansion roadmap
      supabase.from("search_miss_log").insert({
        query: query.trim(),
        tmdb_id: result.tmdbId,
        user_id: userId,
      }).then(() => {});

      if (onToast) onToast(`${result.title} logged`);
    } catch (err) {
      console.error("[Search] Log error:", err);
      if (onToast) onToast("Couldn't log — try again");
    } finally {
      setLoggingId(null);
    }
  }, [userId, loggingId, query, onToast]);

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
        position: "sticky",
        top: 0,
        background: "#0f0d0b",
        zIndex: 10,
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

      {/* ── Empty state ── */}
      {!hasSearched && !query && (
        <div style={{ padding: "60px 32px", textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(199,91,63,0.08)",
            border: "1px solid rgba(199,91,63,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TC} strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 16,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase", letterSpacing: "0.04em",
            marginBottom: 6,
          }}>Search any film</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11, color: "rgba(255,255,255,0.2)",
            lineHeight: 1.5,
          }}>
            Find podcast coverage across<br />all your favorite shows
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
              isExpanded={false}
              onTap={() => {}}
              episodes={[]}
              loadingEpisodes={false}
              onLog={() => handleLog(r)}
              logging={loggingId === r.tmdbId}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes searchSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   ResultCard
   ═══════════════════════════════════════════════════ */

function ResultCard({
  result, isExpanded, onTap, episodes, loadingEpisodes,
  onPlayEpisode, onLog, logging, currentEp, isPlaying,
}) {
  const hasCoverage = result.podcastCount > 0;

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        onClick={hasCoverage ? onTap : undefined}
        style={{
          display: "flex", gap: 12, padding: "12px 14px",
          background: isExpanded ? "rgba(255,255,255,0.04)" : "transparent",
          borderRadius: 10,
          cursor: hasCoverage ? "pointer" : "default",
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

        {/* Action button */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {hasCoverage ? (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `rgba(199,91,63,${isExpanded ? "0.2" : "0.1"})`,
              border: `1px solid rgba(199,91,63,${isExpanded ? "0.35" : "0.2"})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={TC}
                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onLog?.(); }}
              disabled={logging}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: logging ? "rgba(199,91,63,0.15)" : "rgba(255,255,255,0.04)",
                border: logging ? "1px solid rgba(199,91,63,0.3)" : "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: logging ? "wait" : "pointer", transition: "all 0.15s",
              }}>
              {logging ? (
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  border: "2px solid rgba(199,91,63,0.2)",
                  borderTopColor: TC,
                  animation: "spin 0.6s linear infinite",
                }} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Episode picker ── */}
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
                onClick={() => onPlayEpisode?.(ep)}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

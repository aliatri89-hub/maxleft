import { t } from "../../../theme";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useCommunityAwards } from "../../../hooks/useCommunityAwards";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * FilmspottingAwardsTab — Year-end Top 10 Lists.
 *
 * Reads hosts from community.theme_config.hosts.
 * Only shows hosts that have picks for the visible years
 * (handles rotating guest co-hosts like Michael, Tasha, Dana, Marya, Alison).
 *
 * Layout: All years stacked (newest first), grouped by decade pills.
 * Each year section shows per-host ranked shelves (Film Junk style).
 *
 * No Ben categories, no commentary, no Blank Check specifics.
 */

export default function FilmspottingAwardsTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  coverCacheVersion,
}) {
  const communityId = community?.id;
  const userId = session?.user?.id;
  const { picks, years, loading, error } = useCommunityAwards(communityId);
  const [selectedYear, setSelectedYear] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedHost, setSelectedHost] = useState(null);
  const accent = community?.theme_config?.accent || "#4ade80";

  // Hosts from theme_config
  const allHosts = useMemo(() => {
    const configHosts = community?.theme_config?.hosts || [];
    return configHosts.map(h => ({
      key: h.key,
      name: h.name,
      short: h.name?.[0] || h.key[0].toUpperCase(),
      color: h.color,
    }));
  }, [community]);

  // Reset filters when year changes
  useEffect(() => { setFilter("all"); setSelectedHost(null); }, [selectedYear]);

  // Years visible (all or just the selected one)
  const visibleYears = useMemo(() => {
    if (selectedYear) return [selectedYear];
    return years;
  }, [years, selectedYear]);

  // ─── Map tmdb_id → community_items.id for progress lookup ──
  const tmdbToItemId = useMemo(() => {
    const map = {};
    miniseries.forEach((s) => {
      (s.items || []).forEach((item) => {
        if (item.tmdb_id) map[item.tmdb_id] = item.id;
      });
    });
    return map;
  }, [miniseries]);

  const isSeen = useCallback((title, tmdbId) => {
    if (tmdbId && tmdbToItemId[tmdbId]) return !!progress[tmdbToItemId[tmdbId]];
    return false;
  }, [tmdbToItemId, progress]);

  const getItemId = useCallback((tmdbId) => {
    return tmdbId ? tmdbToItemId[tmdbId] : null;
  }, [tmdbToItemId]);

  // ─── Per-host seen % (across visible years) ───────────────
  const hostStats = useMemo(() => {
    const yearSet = new Set(visibleYears);
    const yearPicks = picks.filter(p => yearSet.has(p.year));
    const stats = {};
    allHosts.forEach(host => {
      const hostPicks = yearPicks.filter(p => p.host === host.key);
      const unique = new Map();
      hostPicks.forEach(p => { if (!unique.has(p.title)) unique.set(p.title, p.tmdb_id); });
      const total = unique.size;
      const seen = [...unique.entries()].filter(([title, tmdbId]) => isSeen(title, tmdbId)).length;
      stats[host.key] = { total, seen, pct: total > 0 ? Math.round((seen / total) * 100) : 0 };
    });
    return stats;
  }, [visibleYears, picks, allHosts, isSeen]);

  // ─── Active hosts (only those with picks across visible years) ──
  const activeHosts = useMemo(() => {
    const yearSet = new Set(visibleYears);
    const pickedKeys = new Set(picks.filter(p => yearSet.has(p.year)).map(p => p.host));
    return allHosts.filter(h => pickedKeys.has(h.key));
  }, [visibleYears, picks, allHosts]);

  // ─── Build stacked year → host shelves structure ──────────
  const yearSections = useMemo(() => {
    return visibleYears.map(year => {
      const yearPicks = picks.filter(p => p.year === year);
      const yearHostKeys = new Set(yearPicks.map(p => p.host));

      // Which hosts to show (all active for this year, or just the selected one)
      const hostsForYear = selectedHost
        ? activeHosts.filter(h => h.key === selectedHost && yearHostKeys.has(h.key))
        : activeHosts.filter(h => yearHostKeys.has(h.key));

      const shelves = hostsForYear
        .map(host => {
          let hostPicks = yearPicks
            .filter(p => p.host === host.key)
            .sort((a, b) => (a.rank || 99) - (b.rank || 99))
            .map(p => ({
              title: p.title,
              tmdbId: p.tmdb_id,
              posterPath: p.poster_path,
              rank: p.rank,
            }));

          // Apply seen/unseen filter
          if (filter === "seen") hostPicks = hostPicks.filter(p => isSeen(p.title, p.tmdbId));
          else if (filter === "unseen") hostPicks = hostPicks.filter(p => !isSeen(p.title, p.tmdbId));

          if (hostPicks.length === 0) return null;
          return { host, picks: hostPicks };
        })
        .filter(Boolean);

      if (shelves.length === 0) return null;
      return { year, shelves };
    }).filter(Boolean);
  }, [visibleYears, picks, activeHosts, selectedHost, filter, isSeen]);

  // ─── Loading / error ────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ color: t.textSecondary, fontSize: 13 }}>Loading awards data...</div>
      </div>
    );
  }

  if (error || picks.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          textTransform: "uppercase", marginBottom: 8,
        }}>🏆 {community?.name || "Awards"}</div>
        <div style={{ fontSize: 13, color: t.textMuted, fontStyle: "italic" }}>
          {error ? "Failed to load awards" : "Awards data coming soon"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* Year dropdown */}
      <div style={{ padding: "16px 16px 8px" }}>
        <select
          value={selectedYear || ""}
          onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
          style={{
            padding: "6px 28px 6px 12px", borderRadius: 20,
            background: selectedYear ? `${accent}20` : "rgba(255,255,255,0.04)",
            border: `1.5px solid ${selectedYear ? accent : "rgba(255,255,255,0.08)"}`,
            color: selectedYear ? accent : t.textMuted,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: t.fontDisplay,
            appearance: "none", WebkitAppearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='${selectedYear ? accent.replace("#", "%23") : "%23666"}'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            outline: "none",
            transition: "all 0.2s",
          }}
        >
          <option value="" style={{ background: t.bgCard, color: t.textSecondary }}>All Years</option>
          {years.map(y => (
            <option key={y} value={y} style={{ background: t.bgCard, color: t.textSecondary }}>{y}</option>
          ))}
        </select>
      </div>

      {/* Seen/unseen filter */}
      <CommunityFilter value={filter} onChange={setFilter} accent={accent} />

      {/* Host filter pills */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 8, overflowX: "auto",
        padding: "4px 16px 12px", scrollbarWidth: "none",
      }}>
        {activeHosts.map(host => {
          const stat = hostStats[host.key] || { pct: 0, total: 0 };
          const isActive = selectedHost === host.key;
          return (
            <button
              key={host.key}
              onClick={() => setSelectedHost(isActive ? null : host.key)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 14px", borderRadius: 20,
                background: isActive ? `${host.color}18` : "rgba(255,255,255,0.04)",
                border: isActive ? `1px solid ${host.color}55` : `1px solid ${t.bgHover}`,
                cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: host.color,
                boxShadow: isActive ? `0 0 6px ${host.color}80` : "none",
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600, color: isActive ? host.color : t.textMuted,
                fontFamily: t.fontDisplay,
              }}>{host.name}</span>
              {stat.total > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: stat.pct === 100 ? t.green : t.textFaint,
                  fontFamily: t.fontDisplay,
                }}>{stat.pct}%</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stacked year sections */}
      {yearSections.length > 0 ? (
        <div>
          {yearSections.map(({ year, shelves }) => (
            <div key={year}>
              {/* Year heading */}
              <div style={{
                textAlign: "center", padding: "24px 16px 12px",
                borderTop: `1px solid ${t.borderSubtle}`,
              }}>
                <div style={{
                  fontSize: 22, fontWeight: 800, color: t.textSecondary,
                  fontFamily: t.fontDisplay,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{year} Top 10 Lists</div>
              </div>

              {/* Host shelves for this year */}
              {shelves.map(({ host, picks: hostPicks }) => (
                <FSHostShelf
                  key={host.key}
                  host={host}
                  picks={hostPicks}
                  isSeen={isSeen}
                  getItemId={getItemId}
                  onToggle={userId ? onToggle : null}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "40px 16px",
          fontSize: 13, color: t.textSecondary, fontStyle: "italic",
        }}>No picks {filter !== "all" ? "match this filter" : selectedYear ? `added for ${selectedYear} yet` : "added yet"}</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   FSHostShelf — one host's ranked picks as a horizontal scroll
   ═══════════════════════════════════════════════════════════════ */

function FSHostShelf({ host, picks, isSeen, getItemId, onToggle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {/* Host header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px 6px",
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: host.color, flexShrink: 0,
        }} />
        <div style={{
          fontSize: 14, fontWeight: 700, color: host.color,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.02em", textTransform: "uppercase",
        }}>{host.name}</div>
        <div style={{
          fontSize: 11, color: t.textMuted,
          fontFamily: t.fontDisplay,
          marginLeft: "auto",
        }}>{picks.length} picks</div>
      </div>

      {/* Poster scroll */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 16px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {picks.map((pick, i) => (
          <FSRankedCard
            key={pick.title + i}
            pick={pick}
            hostColor={host.color}
            seen={isSeen(pick.title, pick.tmdbId)}
            onTap={onToggle ? () => {
              const itemId = getItemId(pick.tmdbId);
              if (itemId) onToggle(itemId);
            } : null}
          />
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   FSRankedCard — poster card with rank badge
   ═══════════════════════════════════════════════════════════════ */

function FSRankedCard({ pick, hostColor, seen, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const posterUrl = pick.posterPath
    ? pick.posterPath.startsWith("http")
      ? pick.posterPath
      : `https://image.tmdb.org/t/p/w185${pick.posterPath}`
    : null;
  const isNumber1 = pick.rank === 1;

  return (
    <div onClick={onTap} style={{
      width: 105, flexShrink: 0,
      cursor: onTap ? "pointer" : "default",
    }}>
      {/* Poster */}
      <div style={{
        width: "100%", aspectRatio: "2/3", borderRadius: 8,
        overflow: "hidden", position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: `1.5px solid ${seen ? "rgba(74,222,128,0.35)" : isNumber1 ? `${hostColor}40` : "rgba(255,255,255,0.04)"}`,
      }}>
        {posterUrl ? (
          <img src={posterUrl} alt={pick.title} loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s",
              filter: seen ? "brightness(0.65)" : "none",
            }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 6,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 600, color: t.textMuted,
              lineHeight: 1.2, textAlign: "center",
            }}>{pick.title}</div>
          </div>
        )}

        {/* Rank badge — top left */}
        {pick.rank && (
          <div style={{
            position: "absolute", top: 4, left: 4,
            background: isNumber1 ? hostColor : "rgba(0,0,0,0.7)",
            color: isNumber1 ? t.textPrimary : t.textSecondary,
            fontSize: 11, fontWeight: 800, padding: "2px 6px",
            borderRadius: 4, fontFamily: t.fontDisplay,
            boxShadow: isNumber1 ? `0 2px 6px ${hostColor}50` : "none",
          }}>#{pick.rank}</div>
        )}

        {/* Seen badge — bottom right */}
        {seen && (
          <div style={{
            position: "absolute", bottom: 4, right: 4,
            background: t.green, color: "#0a0a0a",
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
          }}>✓</div>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 10, fontWeight: isNumber1 ? 600 : 400,
        color: seen ? t.textSecondary : t.textMuted,
        lineHeight: 1.2, marginTop: 5,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{pick.title}</div>
    </div>
  );
}


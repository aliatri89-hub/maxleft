import { useState, useMemo, useCallback } from "react";
import { useCommunityLists } from "../../../hooks/useCommunityLists";
import { ProgressRing, StatPill } from "../primitives";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * FilmJunkListsTab — Per-host poster shelves grouped under list headers.
 *
 * Layout:
 *   Hero (banner + donut + host pills)
 *   Seen/Unseen filter
 *
 *   ── Top 100 Revisited (2020) ──
 *     Sean's List  → horizontal poster scroll
 *     Jay's List   → horizontal poster scroll
 *     Frank's List → horizontal poster scroll
 *
 *   ── Top 100 Films of All Time (2013) ──
 *     Sean / Jay / Frank shelves
 *
 *   ── Top 100 of the 21st Century ──
 *     Sean / Frank shelves (no Jay data)
 *
 * Host pills solo to just that host's shelves across all lists.
 */

const HOSTS = [
  { key: "sean", name: "Sean", color: "#9333EA" },
  { key: "jay", name: "Jay", color: "#78C044" },
  { key: "frank", name: "Frank", color: "#FACC15" },
];

const HOST_MAP = {};
HOSTS.forEach(h => { HOST_MAP[h.key] = h; });

export default function FilmJunkListsTab({
  community,
  session,
  progress = {},
  miniseries = [],
  coverCacheVersion,
  onToggle,
}) {
  const communityId = community?.id;
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#78C044";

  const { lists, getList, loading, error } = useCommunityLists(communityId);
  const [selectedHost, setSelectedHost] = useState(null);
  const [filter, setFilter] = useState("all");

  // ── Map tmdb_id → community_items.id for progress lookup ──
  const tmdbToItemId = useMemo(() => {
    const map = {};
    miniseries.forEach((s) => {
      (s.items || []).forEach((item) => {
        if (item.tmdb_id) map[item.tmdb_id] = item.id;
      });
    });
    return map;
  }, [miniseries]);

  const isSeen = useCallback((tmdbId) => {
    if (tmdbId && tmdbToItemId[tmdbId]) return !!progress[tmdbToItemId[tmdbId]];
    return false;
  }, [tmdbToItemId, progress]);

  const getItemId = useCallback((tmdbId) => {
    return tmdbId ? tmdbToItemId[tmdbId] : null;
  }, [tmdbToItemId]);

  // ── Build grouped shelf data: list → host → films ─────────
  const listGroups = useMemo(() => {
    return lists.map(list => {
      const data = getList(list.id);
      const items = data.items || [];

      // Group items by host
      const byHost = {};
      items.forEach(i => {
        if (!byHost[i.host]) byHost[i.host] = [];
        byHost[i.host].push(i);
      });

      // Sort each host's items by rank
      Object.values(byHost).forEach(arr => arr.sort((a, b) => a.rank - b.rank));

      // Determine which hosts have data for this list
      const availableHosts = HOSTS.filter(h => byHost[h.key] && byHost[h.key].length > 0);

      return { list, byHost, availableHosts };
    });
  }, [lists, getList]);

  // ── Global seen stats (across all lists, deduped) ─────────
  const globalStats = useMemo(() => {
    const allFilms = new Map();
    lists.forEach(list => {
      const data = getList(list.id);
      (data.items || []).forEach(i => {
        const key = i.tmdb_id || i.title;
        if (!allFilms.has(key)) allFilms.set(key, i.tmdb_id);
      });
    });
    const total = allFilms.size;
    const seen = [...allFilms.values()].filter(tmdbId => isSeen(tmdbId)).length;
    return { seen, total, pct: total > 0 ? Math.round((seen / total) * 100) : 0 };
  }, [lists, getList, isSeen]);

  // ── Per-host seen stats ───────────────────────────────────
  const hostStats = useMemo(() => {
    const stats = {};
    HOSTS.forEach(host => {
      const unique = new Map();
      lists.forEach(list => {
        const data = getList(list.id);
        (data.items || []).filter(i => i.host === host.key).forEach(i => {
          const key = i.tmdb_id || i.title;
          if (!unique.has(key)) unique.set(key, i.tmdb_id);
        });
      });
      const total = unique.size;
      const seen = [...unique.values()].filter(tmdbId => isSeen(tmdbId)).length;
      stats[host.key] = { total, seen, pct: total > 0 ? Math.round((seen / total) * 100) : 0 };
    });
    return stats;
  }, [lists, getList, isSeen]);

  if (loading) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ color: "#888", fontSize: 13 }}>Loading lists...</div>
      </div>
    );
  }

  if (error || lists.length === 0) {
    return (
      <div style={{ padding: "0 0 100px" }}>
        <ListsHero community={community} seenStats={{ seen: 0, total: 0, pct: 0 }} accent={accent} />
        <div style={{ padding: "40px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            {error ? "Failed to load lists" : "Lists coming soon"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* ─── Hero ────────────────────────────────────────────── */}
      <ListsHero
        community={community}
        seenStats={globalStats}
        accent={accent}
      />

      {/* ─── Host filter pills ───────────────────────────────── */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 8, overflowX: "auto",
        padding: "0 16px 8px", scrollbarWidth: "none",
      }}>
        {HOSTS.map(host => {
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
                border: isActive ? `1px solid ${host.color}55` : "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: host.color,
                boxShadow: isActive ? `0 0 6px ${host.color}80` : "none",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: isActive ? host.color : "#888",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.02em",
              }}>{host.name}</span>
              {stat.total > 0 && (
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: isActive ? host.color : "rgba(255,255,255,0.35)",
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {stat.pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Seen/Unseen filter ──────────────────────────────── */}
      <CommunityFilter value={filter} onChange={setFilter} accent={accent} />

      {/* ─── List groups with per-host shelves ────────────────── */}
      {listGroups.map(({ list, byHost, availableHosts }) => {
        // Determine which hosts to show
        const hostsToShow = selectedHost
          ? availableHosts.filter(h => h.key === selectedHost)
          : availableHosts;

        if (hostsToShow.length === 0) return null;

        return (
          <div key={list.id} style={{ marginBottom: 24 }}>
            {/* List section header */}
            <div style={{
              padding: "20px 16px 4px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ flex: 1, height: 1, background: `${accent}30` }} />
              <div style={{
                fontSize: 16, fontWeight: 800, color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.03em", textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>{list.name}</div>
              <div style={{ flex: 1, height: 1, background: `${accent}30` }} />
            </div>

            {/* Per-host shelves */}
            {hostsToShow.map(host => {
              let hostFilms = byHost[host.key] || [];

              // Apply seen/unseen filter
              if (filter === "seen") hostFilms = hostFilms.filter(i => isSeen(i.tmdb_id));
              else if (filter === "unseen") hostFilms = hostFilms.filter(i => !isSeen(i.tmdb_id));

              if (hostFilms.length === 0) return null;

              return (
                <HostShelf
                  key={host.key}
                  host={host}
                  films={hostFilms}
                  isSeen={isSeen}
                  getItemId={getItemId}
                  onToggle={userId ? onToggle : null}
                  accent={accent}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   HostShelf — one host's ranked poster scroll
   ═══════════════════════════════════════════════════════════════ */

function HostShelf({ host, films, isSeen, getItemId, onToggle, accent }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Host shelf header */}
      <div style={{
        padding: "12px 16px 6px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: host.color,
          flexShrink: 0,
        }} />
        <div style={{
          fontSize: 13, fontWeight: 700, color: host.color,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.02em", textTransform: "uppercase",
        }}>{host.name}'s List</div>
        <div style={{
          fontSize: 11, color: "rgba(255,255,255,0.25)",
          marginLeft: "auto",
        }}>
          {films.length} films
        </div>
      </div>

      {/* Horizontal scroll */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 16px 12px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {films.map((item, i) => (
          <ListPosterCard
            key={(item.tmdb_id || item.title) + i}
            item={item}
            rank={item.rank}
            seen={isSeen(item.tmdb_id)}
            accent={accent}
            hostColor={host.color}
            onTap={onToggle ? () => {
              const itemId = getItemId(item.tmdb_id);
              if (itemId) onToggle(itemId);
            } : null}
          />
        ))}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "0 16px" }} />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ListPosterCard — poster with rank badge overlay
   ═══════════════════════════════════════════════════════════════ */

function ListPosterCard({ item, rank, seen, accent, hostColor, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const posterUrl = item.poster_path
    ? item.poster_path.startsWith("http")
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w185${item.poster_path}`
    : null;

  const isTop10 = rank <= 10;

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
        border: `2px solid ${seen ? "#4ade80" : "rgba(255,255,255,0.06)"}`,
        boxShadow: seen ? "0 0 8px rgba(74,222,128,0.25)" : "none",
      }}>
        {posterUrl ? (
          <img src={posterUrl} alt={item.title} loading="lazy"
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
              fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)",
              lineHeight: 1.2, textAlign: "center",
            }}>{item.title}</div>
          </div>
        )}

        {/* Rank badge — top left, tinted with host color for top 10 */}
        <div style={{
          position: "absolute", top: 4, left: 4,
          background: isTop10 ? hostColor : "rgba(0,0,0,0.7)",
          color: isTop10 ? "#fff" : "rgba(255,255,255,0.7)",
          minWidth: 22, height: 22, borderRadius: 6,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800,
          fontFamily: "'Barlow Condensed', sans-serif",
          padding: "0 4px",
          boxShadow: isTop10 ? `0 0 8px ${hostColor}60` : "0 1px 3px rgba(0,0,0,0.4)",
        }}>
          {rank}
        </div>

        {/* Seen badge — bottom right */}
        {seen && (
          <div style={{
            position: "absolute", bottom: 4, right: 4,
            background: "#4ade80", color: "#0a0a0a",
            width: 18, height: 18, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
          }}>✓</div>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: seen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)",
        lineHeight: 1.2, marginTop: 5,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{item.title}</div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ListsHero — banner + donut + stat pills
   ═══════════════════════════════════════════════════════════════ */

function ListsHero({ community, seenStats, accent }) {
  const tabHero = community?.theme_config?.tab_heroes?.lists;
  const bannerUrl = tabHero?.banner_url || community?.banner_url;
  const hasBanner = !!bannerUrl;
  const heroTagline = tabHero?.tagline || "📋 Film Junk Lists";
  const heroDescription = tabHero?.description || "Sean · Jay · Frank";

  return (
    <div style={{
      position: "relative",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      {hasBanner ? (
        <>
          <img src={bannerUrl} alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: tabHero?.banner_contain ? "contain" : "cover",
              objectPosition: tabHero?.banner_position || "center center",
              opacity: tabHero?.banner_opacity ?? 0.6,
              transform: `scale(${tabHero?.banner_scale ?? 1})`,
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(10,10,20,0.3) 0%, rgba(10,10,20,0.65) 50%, #0a0a14 100%)",
          }} />
        </>
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #0f0f1a 0%, #0a0a14 100%)",
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>{heroTagline}</div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.5)",
          textAlign: "center", maxWidth: 300,
          margin: "0 auto 20px",
        }}>{heroDescription}</div>

        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: 24,
        }}>
          <ProgressRing pct={seenStats.pct} accent={accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <StatPill label="Seen" value={`${seenStats.seen}/${seenStats.total}`} color={accent} />
            <StatPill label="Unseen" value={seenStats.total - seenStats.seen} color="rgba(255,255,255,0.3)" />
          </div>
        </div>
      </div>
    </div>
  );
}

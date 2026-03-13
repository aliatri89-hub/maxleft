import { useState, useMemo, useCallback } from "react";
import { useCommunityDrafts } from "../../../hooks/useCommunityDrafts";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * BigPictureFilmographyTab — Every movie across all Big Picture drafts,
 * deduped and grouped by decade using community_items.
 *
 * POST-REFACTOR: This tab follows the Community Contract.
 *   - Receives progress, miniseries, onToggle, filter as props from CommunityScreen
 *   - Uses useCommunityDrafts ONLY for draft metadata (draft count, host picks)
 *   - Does NOT manage its own seenSet, posterCache, or modal
 *   - Tracking goes through community_user_progress via the shared hooks
 */

export default function BigPictureFilmographyTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  coverCacheVersion,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}) {
  const communityId = community?.id;
  const accent = community?.theme_config?.accent || "#f0436c";
  const hostsConfig = community?.theme_config?.hosts || {};

  // Draft metadata — used ONLY for display (draft count, host badges)
  const { picks } = useCommunityDrafts(communityId);

  // ─── Build draft metadata overlay ──────────────────────────
  // Maps tmdb_id → { draftCount, hosts } for badge rendering
  const draftMeta = useMemo(() => {
    if (!picks || picks.length === 0) return {};

    const metaMap = {}; // keyed by tmdb_id
    picks.forEach((p) => {
      if (!p.tmdb_id) return;
      if (!metaMap[p.tmdb_id]) {
        metaMap[p.tmdb_id] = { draftCount: 0, hosts: new Set() };
      }
      metaMap[p.tmdb_id].draftCount++;
      if (p.host) metaMap[p.tmdb_id].hosts.add(p.host);
    });

    // Convert sets to arrays
    Object.values(metaMap).forEach((m) => {
      m.hosts = [...m.hosts];
    });

    return metaMap;
  }, [picks]);

  // ─── Filter to filmography miniseries only ─────────────────
  const filmSeries = useMemo(
    () => miniseries.filter((s) => s.tab_key === "filmography"),
    [miniseries]
  );

  // ─── Visible series (filtered by search + seen/unseen) ─────
  const visibleSeries = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    const isSearching = q.length >= 2;

    return filmSeries
      .map((s) => {
        let items = s.items || [];

        // Seen/unseen filter
        if (filter === "seen") {
          items = items.filter((i) => progress[i.id]);
        } else if (filter === "unseen") {
          items = items.filter((i) => !progress[i.id]);
        }

        // Search filter
        if (isSearching) {
          items = items.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              (i.creator || "").toLowerCase().includes(q) ||
              String(i.year || "").includes(q)
          );
        }

        if (items.length === 0) return null;
        return { ...s, items };
      })
      .filter(Boolean);
  }, [filmSeries, filter, progress, searchQuery]);

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* ─── Filter ────────────────────────────────────────── */}
      <CommunityFilter value={filter} onChange={onFilterChange} accent={accent} />

      {/* ─── Search ────────────────────────────────────────── */}
      <div style={{ padding: "8px 16px 0" }}>
        <input
          type="text"
          placeholder="Search films..."
          value={searchQuery || ""}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, color: "#e0e0e0", fontSize: 14,
            fontFamily: "inherit", WebkitAppearance: "none", outline: "none",
          }}
        />
      </div>

      {/* ─── Decade Shelves ────────────────────────────────── */}
      {visibleSeries.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          color: "rgba(255,255,255,0.3)", fontSize: 14,
        }}>
          {filter !== "all" ? "No films match this filter" : "No films found"}
        </div>
      ) : (
        visibleSeries.map((series) => (
          <DecadeShelf
            key={series.id}
            series={series}
            progress={progress}
            draftMeta={draftMeta}
            hostsConfig={hostsConfig}
            accent={accent}
            onToggle={onToggle}
            coverCacheVersion={coverCacheVersion}
          />
        ))
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DecadeShelf — horizontal scroll of poster cards for one decade
   ═══════════════════════════════════════════════════════════════ */

function DecadeShelf({ series, progress, draftMeta, hostsConfig, accent, onToggle, coverCacheVersion }) {
  const items = series.items || [];
  const seen = items.filter((i) => progress[i.id]).length;
  const total = items.length;
  const allSeen = seen === total && total > 0;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Decade header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 16px", marginBottom: 8,
      }}>
        <div style={{
          fontSize: 15, fontWeight: 800, color: allSeen ? "#4ade80" : "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          {series.title}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: allSeen ? "#4ade80" : accent,
          fontFamily: "'Barlow Condensed', sans-serif",
          marginLeft: "auto",
        }}>
          {seen}/{total}
        </div>
      </div>

      {/* Poster scroll */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 16px 12px",
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        {items.map((item) => (
          <BPPosterCard
            key={item.id}
            item={item}
            isSeen={!!progress[item.id]}
            meta={item.tmdb_id ? draftMeta[item.tmdb_id] : null}
            hostsConfig={hostsConfig}
            accent={accent}
            onTap={() => onToggle(item.id)}
            coverCacheVersion={coverCacheVersion}
          />
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   BPPosterCard — poster card with draft count + host color badges
   ═══════════════════════════════════════════════════════════════ */

function BPPosterCard({ item, isSeen, meta, hostsConfig, accent, onTap, coverCacheVersion }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  const posterUrl = item.poster_path
    ? item.poster_path.startsWith("http")
      ? item.poster_path
      : `https://image.tmdb.org/t/p/w185${item.poster_path}`
    : null;

  return (
    <div onClick={onTap} style={{
      width: 110, flexShrink: 0, cursor: "pointer",
      WebkitTapHighlightColor: "transparent",
    }}>
      {/* Poster */}
      <div style={{
        width: "100%", aspectRatio: "2/3", borderRadius: 8,
        overflow: "hidden", position: "relative",
        background: isSeen
          ? "linear-gradient(135deg, #1a3a2a, #0f2a1a)"
          : "linear-gradient(135deg, #1a1a2e, #16213e)",
        border: `2px solid ${isSeen ? "#4ade80" : "transparent"}`,
        transition: "border-color 0.2s",
      }}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? (isSeen ? 0.7 : 0.85) : 0,
              transition: "opacity 0.3s",
            }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 6,
          }}>
            <div style={{ fontSize: 10, color: "#888", textAlign: "center", lineHeight: 1.2 }}>
              {item.title}
            </div>
          </div>
        )}

        {/* Draft count badge (top-right) */}
        {meta && meta.draftCount > 1 && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            background: `${accent}cc`, color: "#fff",
            fontSize: 9, fontWeight: 700, padding: "2px 5px",
            borderRadius: 4, lineHeight: 1,
          }}>
            {meta.draftCount}×
          </div>
        )}

        {/* Host color dots (bottom-left) */}
        {meta && meta.hosts.length > 0 && (
          <div style={{
            position: "absolute", bottom: 4, left: 4,
            display: "flex", gap: 3,
          }}>
            {meta.hosts.slice(0, 4).map((host) => (
              <div key={host} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: hostsConfig[host]?.color || accent,
                border: "1px solid rgba(0,0,0,0.3)",
              }} />
            ))}
          </div>
        )}

        {/* Seen badge */}
        {isSeen && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(0deg, rgba(16,185,129,0.3) 0%, transparent 60%)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            paddingBottom: 6,
          }}>
            <div style={{
              background: "#4ade80", color: "#0a0a0a",
              width: 22, height: 22, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
              boxShadow: "0 2px 6px rgba(74,222,128,0.4)",
            }}>✓</div>
          </div>
        )}
      </div>

      {/* Title */}
      <div style={{
        marginTop: 5, fontSize: 10, fontWeight: 600,
        color: isSeen ? "#4ade80" : "rgba(255,255,255,0.7)",
        lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>
        {item.title}
      </div>
      {item.year && (
        <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>{item.year}</div>
      )}
    </div>
  );
}




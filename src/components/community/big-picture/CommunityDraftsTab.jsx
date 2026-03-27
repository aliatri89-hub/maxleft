import { useState, useEffect, useMemo, useCallback } from "react";
import { useCommunityDrafts } from "../../../hooks/useCommunityDrafts";
import { ProgressRing, StatPill } from "../primitives";

/**
 * CommunityDraftsTab — The Big Picture Draft Tracker
 *
 * Poster card shelves grouped by draft category (Drama, Comedy/Horror, etc.)
 * with per-host colored badges, a "who's winning your draft?" scoreboard,
 * and seen tracking via community_user_progress (shared system).
 *
 * POST-REFACTOR: Follows the Community Contract.
 *   - Receives progress + onToggle from CommunityScreen
 *   - No inline modal, no seenSet, no posterCache, no supabase imports
 *   - useCommunityDrafts is used ONLY for draft structure/metadata
 *   - Seen status comes from progress prop (keyed by community_items.id)
 *   - Tapping a card calls onToggle(itemId) → opens shared CommunityLogModal
 */

const DRAFT_TYPE_LABELS = {
  year: "Year Drafts",
  theme: "Theme",
  genre: "Genre",
  actor_director: "Actor / Director",
  auction: "Auctions",
};

export default function CommunityDraftsTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  coverCacheVersion,
}) {
  const communityId = community?.id;
  const userId = session?.user?.id;
  const accent = community?.theme_config?.accent || "#f0436c";
  const hostsConfig = community?.theme_config?.hosts || {};

  const { drafts, picks, draftsByType, availableTypes, getDraft, loading, error } =
    useCommunityDrafts(communityId);

  // ─── Navigation state ──────────────────────────────────────
  const [activeDraftType, setActiveDraftType] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);

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

  // Helper: check if a movie is seen via community_user_progress
  const isSeen = useCallback((title, tmdbId) => {
    if (tmdbId && tmdbToItemId[tmdbId]) {
      return !!progress[tmdbToItemId[tmdbId]];
    }
    return false;
  }, [tmdbToItemId, progress]);

  // Helper: get the community_item_id for a draft pick (for onToggle)
  const getItemId = useCallback((tmdbId) => {
    return tmdbId ? tmdbToItemId[tmdbId] : null;
  }, [tmdbToItemId]);

  // ─── Auto-select first available draft type ────────────────
  useEffect(() => {
    if (availableTypes.length > 0 && !activeDraftType) {
      setActiveDraftType(availableTypes[0]);
    }
  }, [availableTypes, activeDraftType]);

  // ─── Auto-select first draft within active type ────────────
  useEffect(() => {
    if (!activeDraftType || !draftsByType[activeDraftType]) return;
    const typeDrafts = draftsByType[activeDraftType];
    if (typeDrafts.length > 0 && !selectedDraftId) {
      setSelectedDraftId(typeDrafts[0].id);
    }
  }, [activeDraftType, draftsByType, selectedDraftId]);

  // Reset draft selection when switching types
  const handleTypeChange = useCallback((type) => {
    setActiveDraftType(type);
    const typeDrafts = draftsByType[type] || [];
    setSelectedDraftId(typeDrafts.length > 0 ? typeDrafts[0].id : null);
  }, [draftsByType]);

  // ─── Current draft data ────────────────────────────────────
  const draftData = useMemo(() => {
    if (!selectedDraftId) return null;
    return getDraft(selectedDraftId);
  }, [selectedDraftId, getDraft]);

  // ─── Seen stats for current draft ─────────────────────────
  const seenStats = useMemo(() => {
    if (!draftData) return { seen: 0, total: 0, pct: 0 };
    const total = draftData.uniqueMovies.length;
    const seen = draftData.uniqueMovies.filter((m) => isSeen(m.title, m.tmdbId)).length;
    return { seen, total, pct: total > 0 ? Math.round((seen / total) * 100) : 0 };
  }, [draftData, isSeen]);

  // ─── Scoreboard: per-host seen counts ─────────────────────
  const scoreboard = useMemo(() => {
    if (!draftData) return [];
    return Object.entries(draftData.hostStats)
      .map(([hostKey, stats]) => {
        const hostConfig = hostsConfig[hostKey] || {};
        const seen = stats.picks.filter((p) => isSeen(p.title, p.tmdb_id)).length;
        return {
          key: hostKey,
          name: hostConfig.name || hostKey,
          color: hostConfig.color || accent,
          seen,
          total: stats.total,
          pct: stats.total > 0 ? Math.round((seen / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.pct - a.pct || b.seen - a.seen);
  }, [draftData, isSeen, hostsConfig, accent]);

  // ─── Loading / empty ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ color: "#bbb", fontSize: 13 }}>Loading drafts...</div>
      </div>
    );
  }

  if (error || drafts.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: "uppercase", marginBottom: 8,
        }}>
          📋 Drafts
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", fontStyle: "italic" }}>
          {error ? "Failed to load drafts" : "Draft data coming soon"}
        </div>
      </div>
    );
  }

  const currentTypeDrafts = draftsByType[activeDraftType] || [];

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* ─── Hero ──────────────────────────────────────────── */}
      <DraftsHero
        community={community}
        seenStats={seenStats}
        accent={accent}
        draftTitle={draftData?.draft?.title}
      />

      {/* ─── Draft Type Tabs ───────────────────────────────── */}
      {availableTypes.length > 1 && (
        <div
          className="hide-scrollbar"
          style={{
            display: "flex",
            gap: 0,
            overflowX: "auto",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              style={{
                padding: "12px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  activeDraftType === type
                    ? `2px solid ${accent}`
                    : "2px solid transparent",
                color:
                  activeDraftType === type ? accent : "rgba(255,255,255,0.3)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              {DRAFT_TYPE_LABELS[type] || type}
            </button>
          ))}
        </div>
      )}

      {/* ─── Draft Selector Pills ──────────────────────────── */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "12px 16px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {currentTypeDrafts.map((d) => {
          const isActive = d.id === selectedDraftId;
          const label =
            activeDraftType === "year" ? d.draft_year : d.title.replace(/^The\s+/i, "");
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDraftId(d.id)}
              style={{
                padding: "7px 18px",
                borderRadius: 20,
                border: isActive
                  ? `1px solid ${accent}`
                  : "1px solid rgba(255,255,255,0.08)",
                background: isActive ? `${accent}18` : "rgba(255,255,255,0.03)",
                color: isActive ? accent : "rgba(255,255,255,0.45)",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ─── Scoreboard ────────────────────────────────────── */}
      {scoreboard.length > 0 && (
        <DraftScoreboard
          scoreboard={scoreboard}
          draftTitle={draftData?.draft?.title}
          accent={accent}
        />
      )}

      {/* ─── Category Shelves ──────────────────────────────── */}
      {draftData &&
        draftData.categories.map((cat, ci) => (
          <DraftCategoryShelf
            key={cat.category}
            category={cat}
            hostsConfig={hostsConfig}
            accent={accent}
            isSeen={isSeen}
            getItemId={getItemId}
            onToggle={userId ? onToggle : null}
            isLast={ci === draftData.categories.length - 1}
          />
        ))}

      {draftData && draftData.categories.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 16px",
            fontSize: 13,
            color: "rgba(255,255,255,0.78)",
            fontStyle: "italic",
          }}
        >
          No picks added for this draft yet
        </div>
      )}

      {/* ─── Episode Link ──────────────────────────────────── */}
      {draftData?.draft?.spotify_url && (
        <div style={{ padding: "8px 16px 20px", textAlign: "center" }}>
          <a
            href={draftData.draft.spotify_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "rgba(30, 215, 96, 0.08)",
              border: "1px solid rgba(30, 215, 96, 0.2)",
              borderRadius: 20,
              color: "#1ed760",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              transition: "background 0.2s",
            }}
          >
            Listen to this draft
          </a>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DraftsHero — progress ring + seen stats for current draft
   ═══════════════════════════════════════════════════════════════ */

function DraftsHero({ community, seenStats, accent, draftTitle }) {
  const { seen, total, pct } = seenStats;
  const hasBanner = !!community?.banner_url;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Background */}
      {hasBanner ? (
        <>
          <img
            src={community.banner_url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.6,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(15,13,11,0.3) 0%, rgba(15,13,11,0.65) 50%, #0a0906 100%)",
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, #0f0d0b 0%, #0a0906 100%)",
          }}
        />
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 4,
            lineHeight: 1.1,
          }}
        >
          {community?.tagline || community?.name || "The Big Picture"}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            textAlign: "center",
            maxWidth: 300,
            margin: "0 auto 20px",
          }}
        >
          {community?.description}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <ProgressRing pct={pct} accent={accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <StatPill label="Seen" value={`${seen}/${total}`} color={accent} />
            <StatPill
              label="Unseen"
              value={total - seen}
              color="rgba(255,255,255,0.3)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DraftScoreboard — "Who's winning your draft?"
   ═══════════════════════════════════════════════════════════════ */

function DraftScoreboard({ scoreboard, draftTitle, accent }) {
  return (
    <div
      style={{
        margin: "4px 16px 16px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        padding: "14px 16px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.72)",
          marginBottom: 12,
        }}
      >
        Who's winning your draft?
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {scoreboard.map((host, idx) => (
          <div
            key={host.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Rank */}
            <div
              style={{
                width: 20,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                color: idx === 0 ? accent : "rgba(255,255,255,0.25)",
                textAlign: "center",
              }}
            >
              {idx + 1}
            </div>

            {/* Name */}
            <div
              style={{
                width: 64,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                color: host.color,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {host.name}
            </div>

            {/* Bar */}
            <div
              style={{
                flex: 1,
                height: 6,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  width: `${host.pct}%`,
                  background: host.color,
                  transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  minWidth: host.seen > 0 ? 4 : 0,
                }}
              />
            </div>

            {/* Score */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif",
                color: "#fff",
                width: 36,
                textAlign: "right",
              }}
            >
              {host.seen}/{host.total}
            </div>

            {/* Crown for leader */}
            {idx === 0 && host.seen > 0 && (
              <span style={{ fontSize: 14, marginLeft: -4 }}>👑</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DraftCategoryShelf — horizontal scroll of picks per category
   ═══════════════════════════════════════════════════════════════ */

function DraftCategoryShelf({
  category,
  hostsConfig,
  accent,
  isSeen,
  getItemId,
  onToggle,
  isLast,
}) {
  const { category: catName, picks } = category;

  // Group picks: one card per movie, tagged with which host(s) picked it
  const cards = useMemo(() => {
    const movieMap = {};
    picks.forEach((p) => {
      const key = `${p.title}:${p.movie_year}`;
      if (!movieMap[key]) {
        movieMap[key] = {
          title: p.title,
          movieYear: p.movie_year,
          tmdbId: p.tmdb_id,
          posterPath: p.poster_path,
          hosts: [],
        };
      }
      const hostConfig = hostsConfig[p.host] || {};
      movieMap[key].hosts.push({
        key: p.host,
        name: hostConfig.name || p.host,
        color: hostConfig.color || accent,
      });
      // Keep best poster
      if (!movieMap[key].posterPath && p.poster_path) {
        movieMap[key].posterPath = p.poster_path;
      }
    });
    return Object.values(movieMap);
  }, [picks, hostsConfig, accent]);

  return (
    <div style={{ marginBottom: isLast ? 0 : 4, paddingBottom: isLast ? 0 : 4 }}>
      {/* Category header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.72)",
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 10,
          paddingLeft: 16,
          paddingTop: 16,
        }}
      >
        {catName}
      </div>

      {/* Poster scroll */}
      <div
        className="hide-scrollbar"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "0 16px 12px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {cards.map((card, i) => (
          <DraftCard
            key={card.title + card.movieYear + i}
            card={card}
            isSeen={isSeen(card.title, card.tmdbId)}
            onTap={
              onToggle
                ? () => {
                    const itemId = getItemId(card.tmdbId);
                    if (itemId) onToggle(itemId);
                  }
                : null
            }
          />
        ))}
      </div>

      {/* Separator */}
      <div
        style={{
          height: 1,
          background: "rgba(255,255,255,0.04)",
          margin: "0 16px 0",
        }}
      />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   DraftCard — poster card with host badge(s)
   ═══════════════════════════════════════════════════════════════ */

function DraftCard({ card, isSeen, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const posterUrl = card.posterPath
    ? card.posterPath.startsWith("http")
      ? card.posterPath
      : `https://image.tmdb.org/t/p/w185${card.posterPath}`
    : null;

  return (
    <div
      onClick={onTap}
      style={{
        width: 110,
        flexShrink: 0,
        cursor: onTap ? "pointer" : "default",
      }}
    >
      {/* Host badge chips */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 3,
          marginBottom: 5,
          flexWrap: "wrap",
          minHeight: 18,
        }}
      >
        {card.hosts.map((h) => (
          <div
            key={h.key}
            style={{
              fontSize: 8,
              fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: h.color,
              background: `${h.color}18`,
              border: `1px solid ${h.color}40`,
              borderRadius: 3,
              padding: "1px 5px",
              lineHeight: 1.4,
            }}
          >
            {h.name}
          </div>
        ))}
      </div>

      {/* Poster */}
      <div
        style={{
          width: "100%",
          aspectRatio: "2/3",
          borderRadius: 8,
          overflow: "hidden",
          position: "relative",
          background: "rgba(255,255,255,0.03)",
          border: isSeen
            ? "1.5px solid rgba(74,222,128,0.35)"
            : "1.5px solid rgba(255,255,255,0.06)",
          transition: "border-color 0.2s",
        }}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={card.title}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: imgLoaded ? 1 : 0,
              filter: isSeen ? "brightness(0.65)" : "none",
              transition: "opacity 0.3s",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>🎬</div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.2,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(255,255,255,0.78)",
                marginTop: 2,
              }}
            >
              {card.movieYear}
            </div>
          </div>
        )}

        {/* Seen badge */}
        {isSeen && (
          <div
            style={{
              position: "absolute",
              bottom: 4,
              right: 4,
              background: "#4ade80",
              color: "#0a0a0a",
              width: 18,
              height: 18,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: isSeen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)",
          lineHeight: 1.2,
          marginTop: 5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {card.title}
      </div>

      {/* Year */}
      <div
        style={{
          fontSize: 9,
          color: "rgba(255,255,255,0.78)",
          marginTop: 2,
        }}
      >
        {card.movieYear}
      </div>
    </div>
  );
}




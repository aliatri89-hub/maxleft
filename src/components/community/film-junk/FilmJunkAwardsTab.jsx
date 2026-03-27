import { t } from "../../../theme";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useCommunityAwards } from "../../../hooks/useCommunityAwards";
import { ProgressRing, StatPill } from "../primitives";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * FilmJunkAwardsTab — The Junkies
 *
 * Simplified from the Blankies awards:
 *   - Consensus awards (no per-host picks, no host filter pills)
 *   - Year picker + seen/unseen filter
 *   - Winner poster cards + nominee shelves per category
 *
 * Reuses `useCommunityAwards` hook — data is seeded with host: "consensus"
 * for all picks. The UI just doesn't surface host differentiation.
 *
 * Props:
 *   community        — community_pages row
 *   session          — supabase session
 *   progress         — user progress map
 *   miniseries       — all series (for tmdb→itemId mapping)
 *   coverCacheVersion
 *   onToggle         — (itemId) => void
 */

export default function FilmJunkAwardsTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
  coverCacheVersion,
}) {
  const communityId = community?.id;
  const userId = session?.user?.id;
  const { picks, years, getYear, loading, error } = useCommunityAwards(communityId);
  const [selectedYear, setSelectedYear] = useState(null);
  const [filter, setFilter] = useState("all");
  const accent = community?.theme_config?.accent || "#78C044";

  useEffect(() => { setFilter("all"); }, [selectedYear]);

  // ─── Map tmdb_id → community_items.id ─────────────────────
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

  // Auto-select most recent year
  useEffect(() => {
    if (years.length > 0 && selectedYear === null) setSelectedYear(years[0]);
  }, [years, selectedYear]);

  const yearData = useMemo(() => {
    if (!selectedYear) return { standard: [], ben: [] };
    return getYear(selectedYear);
  }, [selectedYear, getYear]);

  // ─── Seen stats ───────────────────────────────────────────
  const seenStats = useMemo(() => {
    if (!selectedYear) return { seen: 0, total: 0, pct: 0 };
    const uniqueTitles = new Map();
    picks.filter(p => p.year === selectedYear).forEach(p => {
      if (!uniqueTitles.has(p.title)) uniqueTitles.set(p.title, p.tmdb_id);
    });
    const total = uniqueTitles.size;
    const seen = [...uniqueTitles.entries()].filter(([title, tmdbId]) => isSeen(title, tmdbId)).length;
    return { seen, total, pct: total > 0 ? Math.round((seen / total) * 100) : 0 };
  }, [selectedYear, picks, isSeen]);

  if (loading) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ color: t.textSecondary, fontSize: 13 }}>Loading awards data...</div>
      </div>
    );
  }

  if (error || years.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          textTransform: "uppercase", marginBottom: 8,
        }}>🏆 The Junkies</div>
        <div style={{ fontSize: 13, color: t.textMuted, fontStyle: "italic" }}>
          {error ? "Failed to load awards" : "Awards data coming soon"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* ─── Awards Hero ─────────────────────────────────────── */}
      <JunkiesHero
        community={community}
        seenStats={seenStats}
        accent={accent}
        yearsCount={years.length}
      />

      {/* ─── Year picker ─────────────────────────────────────── */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 6, overflowX: "auto",
        padding: "0 16px 12px", scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {years.map((year) => (
          <button key={year} onClick={() => setSelectedYear(year)} style={{
            padding: "7px 18px", borderRadius: 20,
            border: selectedYear === year ? `1px solid ${accent}` : `1px solid ${t.bgHover}`,
            background: selectedYear === year ? `${accent}18` : "rgba(255,255,255,0.03)",
            color: selectedYear === year ? accent : t.textFaint,
            fontSize: 15, fontWeight: 700,
            fontFamily: t.fontDisplay,
            cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
          }}>{year}</button>
        ))}
      </div>

      {/* ─── Seen/Unseen filter ──────────────────────────────── */}
      <CommunityFilter value={filter} onChange={setFilter} accent={accent} />

      {/* ─── Categories ──────────────────────────────────────── */}
      {yearData.standard.length > 0 && (
        <div style={{ padding: "0 12px" }}>
          {yearData.standard.map((cat, ci) => (
            <JunkiesCategorySection
              key={cat.category}
              category={cat}
              isSeen={isSeen}
              getItemId={getItemId}
              onToggle={userId ? onToggle : null}
              isLast={ci === yearData.standard.length - 1}
              filter={filter}
              accent={accent}
            />
          ))}
        </div>
      )}

      {yearData.standard.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 16px",
          fontSize: 13, color: t.textSecondary, fontStyle: "italic",
        }}>No picks added for {selectedYear} yet</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   JunkiesCategorySection — horizontal scroll: winner → nominees
   ═══════════════════════════════════════════════════════════════ */

function JunkiesCategorySection({ category, isSeen, getItemId, onToggle, isLast, filter, accent }) {
  const { category: name, picks: picksByHost } = category;

  // Flatten all picks (consensus = single host key)
  const allPicks = Object.values(picksByHost).flat();

  // Dedupe by title, keep winner status
  const byFilm = {};
  allPicks.forEach(p => {
    const key = p.title;
    if (!byFilm[key]) {
      byFilm[key] = {
        title: p.title,
        subtitle: p.subtitle,
        posterPath: p.posterPath,
        tmdbId: p.tmdbId,
        isWinner: p.isWinner,
      };
    }
    if (p.isWinner) byFilm[key].isWinner = true;
    if (!byFilm[key].posterPath && p.posterPath) byFilm[key].posterPath = p.posterPath;
    if (p.tmdbId && !byFilm[key].tmdbId) byFilm[key].tmdbId = p.tmdbId;
  });

  // Sort: winners first, then nominees
  let cards = Object.values(byFilm).sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    return 0;
  });

  // Apply seen/unseen filter
  if (filter === "seen") cards = cards.filter(c => isSeen(c.title, c.tmdbId));
  else if (filter === "unseen") cards = cards.filter(c => !isSeen(c.title, c.tmdbId));

  if (cards.length === 0) return null;

  return (
    <div style={{ marginBottom: isLast ? 0 : 4, paddingBottom: isLast ? 0 : 4 }}>
      {/* Category header */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: t.textMuted,
        fontFamily: t.fontBody,
        letterSpacing: "0.06em", textTransform: "uppercase",
        marginBottom: 10, paddingLeft: 16,
      }}>{name}</div>

      {/* Horizontal scroll shelf */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 16px 12px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {cards.map((card, i) => (
          <JunkiesCard
            key={card.title + i}
            card={card}
            isSeen={isSeen(card.title, card.tmdbId)}
            accent={accent}
            onTap={onToggle ? () => {
              const itemId = getItemId(card.tmdbId);
              if (itemId) onToggle(itemId);
            } : null}
          />
        ))}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: t.bgElevated, margin: "0 16px 16px" }} />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   JunkiesCard — poster card (winner or nominee)
   ═══════════════════════════════════════════════════════════════ */

function JunkiesCard({ card, isSeen, accent, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const posterUrl = card.posterPath
    ? card.posterPath.startsWith("http")
      ? card.posterPath
      : `https://image.tmdb.org/t/p/w185${card.posterPath}`
    : null;

  return (
    <div onClick={onTap} style={{
      width: 105, flexShrink: 0,
      cursor: onTap ? "pointer" : "default",
    }}>
      {/* Winner badge spacer */}
      {card.isWinner ? (
        <div style={{
          display: "flex", justifyContent: "center", marginBottom: 5, minHeight: 18,
        }}>
          <div style={{
            fontSize: 8, fontWeight: 700,
            fontFamily: t.fontDisplay,
            letterSpacing: "0.04em", textTransform: "uppercase",
            color: accent, background: `${accent}18`,
            border: `1px solid ${accent}40`,
            borderRadius: 3, padding: "1px 5px", lineHeight: 1.4,
          }}>WINNER</div>
        </div>
      ) : (
        <div style={{ minHeight: 23 }} />
      )}

      {/* Poster */}
      <div style={{
        width: "100%", aspectRatio: "2/3", borderRadius: 8,
        overflow: "hidden", position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: `1.5px solid ${isSeen ? "rgba(74,222,128,0.35)" : card.isWinner ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
      }}>
        {posterUrl ? (
          <img src={posterUrl} alt={card.title} loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s",
              filter: isSeen ? "brightness(0.65)" : (!card.isWinner ? "brightness(0.85)" : "none"),
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
            }}>{card.title}</div>
          </div>
        )}

        {/* Trophy overlay */}
        {card.isWinner && (
          <div style={{
            position: "absolute", top: 4, left: 4,
            fontSize: 14, lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
          }}>🏆</div>
        )}

        {/* Seen badge */}
        {isSeen && (
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
        fontSize: 10, fontWeight: card.isWinner ? 600 : 400,
        color: isSeen ? t.textSecondary : t.textMuted,
        lineHeight: 1.2, marginTop: 5,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{card.title}</div>

      {/* Subtitle (e.g. actor name for performance categories) */}
      {card.subtitle && (
        <div style={{
          fontSize: 8, color: t.textMuted, marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontStyle: "italic",
        }}>{card.subtitle}</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   JunkiesHero — ring chart + seen stats
   ═══════════════════════════════════════════════════════════════ */

function JunkiesHero({ community, seenStats, accent, yearsCount }) {
  const tabHero = community?.theme_config?.tab_heroes?.awards;
  const bannerUrl = tabHero?.banner_url || community?.banner_url;
  const hasBanner = !!bannerUrl;
  const heroTagline = tabHero?.tagline || "🏆 The Junkies";
  const heroDescription = tabHero?.description || `${yearsCount} years of awards · Sean · Jay · Frank`;

  return (
    <div style={{
      position: "relative",
      borderBottom: `1px solid ${t.borderSubtle}`,
      overflow: "hidden",
    }}>
      {hasBanner ? (
        <>
          <img loading="lazy" src={bannerUrl} alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: tabHero?.banner_contain ? "contain" : "cover",
              objectPosition: tabHero?.banner_position || "center center",
              opacity: tabHero?.banner_opacity ?? 0.6,
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(15,13,11,0.3) 0%, rgba(15,13,11,0.65) 50%, #0a0906 100%)",
          }} />
        </>
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #0f0d0b 0%, #0a0906 100%)",
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: t.textPrimary,
          fontFamily: t.fontDisplay,
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>{heroTagline}</div>
        <div style={{
          fontSize: 13, color: t.textMuted,
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

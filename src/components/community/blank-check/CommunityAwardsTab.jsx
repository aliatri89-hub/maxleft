import { useState, useEffect, useMemo, useCallback } from "react";
import { useCommunityAwards } from "../../../hooks/useCommunityAwards";
import CommunityFilter from "../shared/CommunityFilter";

/**
 * CommunityAwardsTab — The Blankies
 *
 * Winner poster cards with colored ★ indicators +
 * horizontal scrolling nominee shelves per category +
 * seen tracking via community_user_progress (shared system).
 *
 * POST-REFACTOR: Follows the Community Contract.
 *   - Receives progress + onToggle from CommunityScreen
 *   - No inline modal, no seenSet, no posterCache, no supabase imports
 *   - useCommunityAwards provides display structure (categories, hosts, winners)
 *   - Seen status comes from progress prop (keyed by community_items.id)
 *   - Tapping a card calls onToggle(itemId) → opens shared CommunityLogModal
 */

const HOSTS = [
  { key: "griffin", name: "Griffin", short: "G", color: "#e94560" },
  { key: "david", name: "David", short: "D", color: "#22d3ee" },
  { key: "joe", name: "Joe", short: "J", color: "#facc15" },
];

const BEN_COLOR = "#4ade80";

export default function CommunityAwardsTab({
  community,
  session,
  progress = {},
  miniseries = [],
  onToggle,
}) {
  const communityId = community?.id;
  const userId = session?.user?.id;
  const { picks, years, getYear, loading, error } = useCommunityAwards(communityId);
  const [selectedYear, setSelectedYear] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedHost, setSelectedHost] = useState(null); // null = all hosts
  const accent = community?.theme_config?.accent || "#e94560";

  // Reset filters when year changes
  useEffect(() => { setFilter("all"); setSelectedHost(null); }, [selectedYear]);

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

  // Helper: get the community_item_id for an awards pick
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

  // ─── Per-host seen % for this year ────────────────────────
  const hostStats = useMemo(() => {
    if (!selectedYear) return {};
    const yearPicks = picks.filter(p => p.year === selectedYear);

    const stats = {};

    // Standard hosts
    HOSTS.forEach(host => {
      const hostPicks = yearPicks.filter(p => p.host === host.key);
      const unique = new Map();
      hostPicks.forEach(p => { if (!unique.has(p.title)) unique.set(p.title, p.tmdb_id); });
      const total = unique.size;
      const seen = [...unique.entries()].filter(([title, tmdbId]) => isSeen(title, tmdbId)).length;
      stats[host.key] = { total, seen, pct: total > 0 ? Math.round((seen / total) * 100) : 0 };
    });

    // Ben
    const benPicks = yearPicks.filter(p => p.host === "ben");
    const benUnique = new Map();
    benPicks.forEach(p => { if (!benUnique.has(p.title)) benUnique.set(p.title, p.tmdb_id); });
    const benTotal = benUnique.size;
    const benSeen = [...benUnique.entries()].filter(([title, tmdbId]) => isSeen(title, tmdbId)).length;
    stats["ben"] = { total: benTotal, seen: benSeen, pct: benTotal > 0 ? Math.round((benSeen / benTotal) * 100) : 0 };

    return stats;
  }, [selectedYear, picks, isSeen]);
  if (loading) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ color: "#888", fontSize: 13 }}>Loading awards data...</div>
      </div>
    );
  }

  if (error || years.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: "uppercase", marginBottom: 8,
        }}>🏆 The Blankies</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          {error ? "Failed to load awards" : "Awards data coming soon"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 100px" }}>
      {/* ─── Awards Hero: banner + dropdown + donuts ──────── */}
      <AwardsHeroBanner community={community}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", lineHeight: 1.1,
          padding: "20px 16px 0",
        }}>
          The Blankies
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.5)",
          textAlign: "center", marginTop: 4,
        }}>
          The Annual Blank Check Awards
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.08em", textTransform: "uppercase",
          textAlign: "center", marginTop: 10,
        }}>
          with
        </div>
        <HostDonutGrid
          hostStats={hostStats}
          selectedHost={selectedHost}
          onSelectHost={(key) => setSelectedHost(selectedHost === key ? null : key)}
        />
        <div style={{ padding: "0 16px 14px", textAlign: "center" }}>
          <YearDropdown
            years={years}
            selectedYear={selectedYear}
            onChange={setSelectedYear}
            accent={accent}
          />
        </div>
      </AwardsHeroBanner>

      {/* ─── Seen/Unseen filter ─────────────────────────────── */}
      <CommunityFilter value={filter} onChange={setFilter} accent={accent} />

      {/* ─── Standard Categories ────────────────────────────── */}
      {yearData.standard.length > 0 && (
        <div style={{ padding: "0 12px" }}>
          {yearData.standard.map((cat, ci) => (
            <CategorySection
              key={cat.category}
              category={cat}
              hosts={HOSTS}
              isSeen={isSeen}
              getItemId={getItemId}
              onToggle={userId ? onToggle : null}
              isLast={ci === yearData.standard.length - 1}
              filter={filter}
              selectedHost={selectedHost}
            />
          ))}
        </div>
      )}

      {/* ─── Ben's Categories ───────────────────────────────── */}
      {yearData.ben.length > 0 && (!selectedHost || selectedHost === "ben") && (
        <div style={{ padding: "0 0", marginTop: 28 }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, padding: "0 16px" }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.2), transparent)" }} />
            <div style={{
              fontSize: 16, fontWeight: 800, color: BEN_COLOR,
              fontFamily: "'Barlow Condensed', sans-serif",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>🎲 Ben's Awards</div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.2), transparent)" }} />
          </div>

          {/* Editorial note */}
          <div style={{
            margin: "0 16px 16px", padding: "10px 14px",
            background: "rgba(74,222,128,0.04)",
            border: "1px solid rgba(74,222,128,0.08)",
            borderRadius: 8, textAlign: "center",
          }}>
            <div style={{
              fontSize: 11, color: "rgba(74,222,128,0.5)",
              fontStyle: "italic", lineHeight: 1.5,
            }}>No typed-out description can do justice to Ben. Listen to the episode.</div>
          </div>

          {yearData.ben.map((cat) => (
            <BenCategoryShelf
              key={cat.category}
              category={cat}
              isSeen={isSeen}
              getItemId={getItemId}
              onToggle={userId ? onToggle : null}
              filter={filter}
            />
          ))}
        </div>
      )}

      {yearData.standard.length === 0 && yearData.ben.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 16px",
          fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic",
        }}>No picks added for {selectedYear} yet</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   CategorySection — horizontal scroll: winners → nominees
   ═══════════════════════════════════════════════════════════════ */

function CategorySection({ category, hosts, isSeen, getItemId, onToggle, isLast, filter, selectedHost }) {
  const { category: name, picks } = category;
  const isPerformance = name.includes("Actor") || name.includes("Actress") || name.includes("Voice");

  // ─── Collect all films, deduped, with host info ─────────────
  // When a host is selected, only include picks from that host
  const activeHosts = selectedHost ? hosts.filter(h => h.key === selectedHost) : hosts;

  const allFilms = {};
  activeHosts.forEach(host => {
    const hostPicks = picks[host.key] || [];
    hostPicks.forEach(p => {
      const key = isPerformance ? `${p.title}||${p.subtitle || ""}` : p.title;
      if (!allFilms[key]) {
        allFilms[key] = {
          title: p.title,
          subtitle: isPerformance ? p.subtitle : null,
          posterPath: p.posterPath,
          tmdbId: p.tmdbId,
          hostWins: [],
          hostNoms: [],
        };
      }
      if (p.isWinner) {
        allFilms[key].hostWins.push(host);
      } else {
        allFilms[key].hostNoms.push(host);
      }
      if (!allFilms[key].posterPath && p.posterPath) {
        allFilms[key].posterPath = p.posterPath;
      }
      if (p.tmdbId && !allFilms[key].tmdbId) allFilms[key].tmdbId = p.tmdbId;
    });
  });

  // Sort: winners first (by number of host wins desc), then nominees
  let cards = Object.values(allFilms).sort((a, b) => {
    if (a.hostWins.length !== b.hostWins.length) return b.hostWins.length - a.hostWins.length;
    const aTotal = a.hostWins.length + a.hostNoms.length;
    const bTotal = b.hostWins.length + b.hostNoms.length;
    return bTotal - aTotal;
  });

  // Apply seen/unseen filter
  if (filter === "seen") cards = cards.filter(c => isSeen(c.title, c.tmdbId));
  else if (filter === "unseen") cards = cards.filter(c => !isSeen(c.title, c.tmdbId));

  if (cards.length === 0) return null;

  return (
    <div style={{ marginBottom: isLast ? 0 : 4, paddingBottom: isLast ? 0 : 4 }}>
      {/* Category header */}
      <div style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)",
        fontFamily: "'IBM Plex Mono', monospace",
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
          <AwardCard
            key={card.title + (card.subtitle || "") + i}
            card={card}
            isSeen={isSeen(card.title, card.tmdbId)}
            onTap={onToggle ? () => {
              const itemId = getItemId(card.tmdbId);
              if (itemId) onToggle(itemId);
            } : null}
            isPerformance={isPerformance}
          />
        ))}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "0 16px 16px" }} />
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   AwardCard — poster card for both winners and nominees
   ═══════════════════════════════════════════════════════════════ */

function AwardCard({ card, isSeen, onTap, isPerformance }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const isWinner = card.hostWins.length > 0;
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
      {/* Host name chips — winners only */}
      {isWinner && (
        <div style={{
          display: "flex", justifyContent: "center", gap: 3,
          marginBottom: 5, flexWrap: "wrap", minHeight: 18,
        }}>
          {card.hostWins.map(h => (
            <div key={h.key} style={{
              fontSize: 8, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.04em", textTransform: "uppercase",
              color: h.color, background: `${h.color}18`,
              border: `1px solid ${h.color}40`,
              borderRadius: 3, padding: "1px 5px", lineHeight: 1.4,
            }}>{h.name}</div>
          ))}
        </div>
      )}

      {/* Spacer for nominees to align poster tops with winners */}
      {!isWinner && <div style={{ minHeight: 23 }} />}

      {/* Poster */}
      <div style={{
        width: "100%", aspectRatio: "2/3", borderRadius: 8,
        overflow: "hidden", position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: `1.5px solid ${isSeen ? "rgba(74,222,128,0.35)" : isWinner ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
      }}>
        {posterUrl ? (
          <img src={posterUrl} alt={card.title} loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s",
              filter: isSeen ? "brightness(0.65)" : (!isWinner ? "brightness(0.85)" : "none"),
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
            }}>{card.title}</div>
          </div>
        )}

        {/* Winner stars overlay — top-left */}
        {isWinner && (
          <div style={{
            position: "absolute", top: 4, left: 4,
            display: "flex", gap: 2,
          }}>
            {card.hostWins.map(h => (
              <span key={h.key} style={{
                fontSize: 14, lineHeight: 1,
                filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.6))`,
                color: h.color,
              }}>★</span>
            ))}
          </div>
        )}

        {/* Seen badge — bottom-right */}
        {isSeen && (
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
        fontSize: 10, fontWeight: isWinner ? 600 : 400,
        color: isSeen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)",
        lineHeight: 1.2, marginTop: 5,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{card.title}</div>

      {/* Subtitle for performance categories */}
      {isPerformance && card.subtitle && (
        <div style={{
          fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontStyle: "italic",
        }}>{card.subtitle}</div>
      )}

      {/* Host indicators — dots for nominees */}
      {!isWinner && (card.hostNoms.length > 0) && (
        <div style={{ display: "flex", gap: 3, marginTop: 4, justifyContent: "center" }}>
          {card.hostNoms.map(h => (
            <span key={h.key} style={{
              display: "inline-block", width: 6, height: 6,
              borderRadius: "50%", background: h.color, opacity: 0.7,
            }} />
          ))}
        </div>
      )}

      {/* For winners, show nominee dots too */}
      {isWinner && card.hostNoms.length > 0 && (
        <div style={{ display: "flex", gap: 3, marginTop: 3, justifyContent: "center" }}>
          {card.hostNoms.map(h => (
            <span key={h.key} style={{
              display: "inline-block", width: 5, height: 5,
              borderRadius: "50%", background: h.color, opacity: 0.5,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   BenCategoryShelf — poster shelf with Ben's commentary
   ═══════════════════════════════════════════════════════════════ */

function BenCategoryShelf({ category, isSeen, getItemId, onToggle, filter }) {
  let benPicks = category.picks.ben || [];
  const catName = category.category;
  const isNoThankYou = catName.toLowerCase().includes("no thank");
  const isHonorable = catName.toLowerCase().includes("honorable");
  const tint = isNoThankYou ? "#e94560" : BEN_COLOR;

  // Apply seen/unseen filter
  if (filter === "seen") benPicks = benPicks.filter(p => isSeen(p.title, p.tmdbId));
  else if (filter === "unseen") benPicks = benPicks.filter(p => !isSeen(p.title, p.tmdbId));

  if (benPicks.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Category header */}
      <div style={{ padding: "0 16px", marginBottom: 8 }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: tint,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          {isNoThankYou ? "👎 " : isHonorable ? "📝 " : "🏆 "}{catName}
        </div>
      </div>

      {/* Poster scroll shelf */}
      <div className="hide-scrollbar" style={{
        display: "flex", gap: 10, overflowX: "auto",
        padding: "0 16px 8px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {benPicks.map((pick, i) => {
          const posterUrl = pick.posterPath
            ? pick.posterPath.startsWith("http")
              ? pick.posterPath
              : `https://image.tmdb.org/t/p/w185${pick.posterPath}`
            : null;

          return (
            <BenCard
              key={pick.title + i}
              pick={pick}
              posterUrl={posterUrl}
              isSeen={isSeen(pick.title, pick.tmdbId)}
              isNoThankYou={isNoThankYou}
              tint={tint}
              onTap={onToggle ? () => {
                const itemId = getItemId(pick.tmdbId);
                if (itemId) onToggle(itemId);
              } : null}
            />
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: `${tint}10`, margin: "0 16px" }} />
    </div>
  );
}

function BenCard({ pick, posterUrl, isSeen, isNoThankYou, tint, onTap }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div onClick={onTap} style={{
      width: 115, flexShrink: 0,
      cursor: onTap ? "pointer" : "default",
    }}>
      {/* Poster */}
      <div style={{
        width: "100%", aspectRatio: "2/3", borderRadius: 8,
        overflow: "hidden", position: "relative",
        background: isNoThankYou ? "rgba(233,69,96,0.06)" : "rgba(74,222,128,0.04)",
        border: `1.5px solid ${isSeen ? "rgba(74,222,128,0.35)" : `${tint}20`}`,
      }}>
        {posterUrl ? (
          <img src={posterUrl} alt={pick.title} loading="lazy"
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s",
              filter: isNoThankYou
                ? "saturate(0.4) brightness(0.6)"
                : (isSeen ? "brightness(0.65)" : "none"),
            }}
          />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 6,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 600, color: `${tint}60`,
              lineHeight: 1.2, textAlign: "center",
            }}>{pick.title}</div>
          </div>
        )}

        {/* Winner indicator */}
        {pick.isWinner && !isNoThankYou && (
          <div style={{
            position: "absolute", top: 4, left: 4,
            fontSize: 14, lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
          }}>🏆</div>
        )}

        {/* No Thank You X overlay */}
        {isNoThankYou && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(233,69,96,0.15)",
          }}>
            <span style={{
              fontSize: 32, color: "#e94560", opacity: 0.6,
              fontWeight: 900, lineHeight: 1,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>✕</span>
          </div>
        )}

        {/* Seen badge */}
        {isSeen && !isNoThankYou && (
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
        color: isNoThankYou ? "rgba(233,69,96,0.7)" : (isSeen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)"),
        lineHeight: 1.2, marginTop: 5,
        overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        textDecoration: isNoThankYou ? "line-through" : "none",
      }}>{pick.title}</div>

      {/* Ben's commentary */}
      {pick.subtitle && (
        <div style={{
          fontSize: 8, color: `${tint}70`, marginTop: 3,
          lineHeight: 1.3, fontStyle: "italic",
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        }}>"{pick.subtitle}"</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   AwardsHeroBanner — banner background with children overlaid
   ═══════════════════════════════════════════════════════════════ */

function AwardsHeroBanner({ community, children }) {
  const tabHero = community?.theme_config?.tab_heroes?.awards;
  const bannerUrl = tabHero?.banner_url || community?.banner_url;

  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Background image */}
      {bannerUrl && (
        <>
          <img
            src={bannerUrl}
            alt=""
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: tabHero?.banner_contain ? "contain" : "cover",
              objectPosition: tabHero?.banner_position || "center center",
              opacity: tabHero?.banner_opacity ?? 0.5,
            }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(10,10,20,0.4) 0%, rgba(10,10,20,0.75) 60%, #0a0a14 100%)",
          }} />
        </>
      )}

      {/* Content layered on top */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   YearDropdown — compact select replacing horizontal pill scroll
   ═══════════════════════════════════════════════════════════════ */

function YearDropdown({ years, selectedYear, onChange, accent }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={selectedYear || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: `${accent}12`,
          border: `1px solid ${accent}40`,
          borderRadius: 10,
          padding: "8px 32px 8px 14px",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.04em",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {years.map((year) => (
          <option key={year} value={year} style={{ background: "#1a1a2e", color: "#fff" }}>
            {year}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <div style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        fontSize: 10,
        color: accent,
        lineHeight: 1,
      }}>▼</div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   HostDonutGrid — 2×2 grid of donut rings with host avatars
   Click a host to filter picks. Click again to deselect.
   ═══════════════════════════════════════════════════════════════ */

const HOST_AVATARS = {
  griffin: "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/griffin_avatar.png",
  david:   "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/david_avatar%20(2).png",
  joe:     "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/Reid_avatar.png",
  ben:     "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners/ben_avatar.png",
};

const DONUT_HOSTS = [
  { key: "griffin", name: "Griffin", color: "#e94560" },
  { key: "david",  name: "David",  color: "#22d3ee" },
  { key: "ben",    name: "Ben",    color: "#4ade80" },
  { key: "joe",    name: "Joe",    color: "#facc15" },
];

function HostDonutGrid({ hostStats, selectedHost, onSelectHost }) {
  const ringSize = 78;
  const strokeWidth = 4.5;
  const radius = (ringSize / 2) - strokeWidth - 1.5;
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  const avatarR = radius - strokeWidth / 2 - 1.5;

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: 20,
      padding: "8px 16px 14px",
    }}>
      {DONUT_HOSTS.map(host => {
        const stat = hostStats[host.key] || { pct: 0, total: 0, seen: 0 };
        const isActive = selectedHost === host.key;
        const isDimmed = selectedHost && selectedHost !== host.key;
        const pct = stat.pct || 0;
        const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
        const avatarUrl = HOST_AVATARS[host.key];
        const clipId = `avatar-clip-${host.key}`;

        return (
          <div
            key={host.key}
            onClick={() => onSelectHost(host.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
              opacity: isDimmed ? 0.35 : 1,
              transition: "all 0.25s ease",
              WebkitTapHighlightColor: "transparent",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {/* Ring + avatar */}
            <div style={{
              position: "relative",
              width: ringSize,
              height: ringSize,
              filter: isActive ? `drop-shadow(0 0 6px ${host.color}50)` : "none",
              transition: "filter 0.25s ease",
            }}>
              <svg
                width={ringSize}
                height={ringSize}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
              >
                <defs>
                  <clipPath id={clipId}>
                    <circle cx={cx} cy={cy} r={avatarR} />
                  </clipPath>
                </defs>

                {/* Track */}
                <circle
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke={host.color}
                  strokeWidth={strokeWidth}
                  opacity={0.15}
                />

                {/* Progress arc */}
                {pct > 0 && (
                  <circle
                    cx={cx} cy={cy} r={radius}
                    fill="none"
                    stroke={host.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{
                      transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                )}

                {/* Avatar image inside ring */}
                {avatarUrl && (
                  <image
                    href={avatarUrl}
                    x={cx - avatarR}
                    y={cy - avatarR}
                    width={avatarR * 2}
                    height={avatarR * 2}
                    clipPath={`url(#${clipId})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}
              </svg>
            </div>

            {/* Percentage */}
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              color: isActive ? host.color : "#fff",
              fontFamily: "'Barlow Condensed', sans-serif",
              lineHeight: 1,
              transition: "color 0.2s",
            }}>
              {pct}<span style={{ fontSize: 12, fontWeight: 700 }}>%</span>
            </div>

            {/* Host name */}
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: isActive ? host.color : "rgba(255,255,255,0.45)",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "color 0.2s",
              lineHeight: 1,
            }}>
              {host.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

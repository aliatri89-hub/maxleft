import { useMemo } from "react";
import { HeroBanner } from "../primitives";

/**
 * GetPlayedHero — Hero section for the Get Played community page.
 *
 * Stats: single completion ring + horizontal stat bars for Beat/Playing/Backlog.
 * Play Along tab: "What Are You Playing?" horizontal cards (max 3, centered).
 * No active challenge card (removed until confirmed).
 */
export default function GetPlayedHero({ community, miniseries, progress, activeTab, wpypItems = [], playingNow = [] }) {
  const tabHero = community?.theme_config?.tab_heroes?.[activeTab];
  const heroTagline = tabHero?.tagline ?? community?.tagline;
  const heroDescription = tabHero?.description ?? community?.description;
  const heroBanner = tabHero?.banner_url ?? community?.banner_url;

  const isPlayAlong = activeTab === "playalong";
  const isGameSlop = activeTab === "gameslop";

  // ── Stats ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalGames = 0, beat = 0, playing = 0, backlog = 0;

    miniseries.forEach((s) => {
      (s.items || []).forEach((i) => {
        totalGames++;
        const p = progress[i.id];
        if (!p) return;
        if (p.status === "completed" || p.status === "beat") beat++;
        else if (p.status === "playing") playing++;
        else if (p.status === "backlog") backlog++;
        else beat++; // default logged = beat
      });
    });

    return {
      totalGames, beat, playing, backlog,
      beatPct: totalGames > 0 ? (beat / totalGames) * 100 : 0,
      playingPct: totalGames > 0 ? (playing / totalGames) * 100 : 0,
      backlogPct: totalGames > 0 ? (backlog / totalGames) * 100 : 0,
      overallPct: totalGames > 0 ? ((beat + playing + backlog) / totalGames) * 100 : 0,
    };
  }, [miniseries, progress]);

  // ── Playtime helper ───────────────────────────────────────
  const formatPlaytime = (game) => {
    if (game.started_at) {
      const days = Math.floor((Date.now() - new Date(game.started_at).getTime()) / (1000 * 60 * 60 * 24));
      if (days === 0) return "Started today";
      if (days === 1) return "1 day";
      return `${days} days`;
    }
    return null;
  };

  const STATUS_COLORS = {
    beat: "#4ade80",
    playing: "#00d4ff",
    backlog: "#facc15",
    total: "#e91e8c",
  };

  return (
    <div style={{
      position: "relative",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
    }}>
      <HeroBanner
        bannerUrl={heroBanner}
        contain={tabHero?.banner_contain}
        position={tabHero?.banner_position}
        opacity={tabHero?.banner_opacity}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "24px 16px 20px" }}>
        {/* Title + tagline */}
        <div style={{
          fontSize: heroTagline ? 28 : 22,
          fontWeight: 800, color: "#fff",
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: "0.03em", textTransform: "uppercase",
          textAlign: "center", marginBottom: 4, lineHeight: 1.1,
        }}>
          {heroTagline || community?.name || "Get Played"}
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center",
          maxWidth: 300, margin: "0 auto 16px", whiteSpace: "pre-line",
        }}>
          {heroDescription}
        </div>

        {/* ── Stat bars ──────────────────────────────────────── */}
        {stats.totalGames > 0 && (
          <div style={{
            maxWidth: 280, margin: "0 auto",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <StatBar label={isGameSlop ? "Played" : "Beat"} count={stats.beat} total={stats.totalGames} pct={stats.beatPct} color={STATUS_COLORS.beat} showTotal />
            <StatBar label="Playing" count={stats.playing} total={stats.totalGames} pct={stats.playingPct} color={STATUS_COLORS.playing} />
            <StatBar label="Backlog" count={stats.backlog} total={stats.totalGames} pct={stats.backlogPct} color={STATUS_COLORS.backlog} />
          </div>
        )}

        {/* ── What Are You Playing? ──────────────────────────── */}
        {isPlayAlong && playingNow.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#facc15",
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: 10, textAlign: "center",
            }}>
              🎮 What Are You Playing?
            </div>
            <div style={{
              display: "flex", gap: 10,
              justifyContent: "center",
              padding: "0 2px 4px",
            }}>
              {playingNow.slice(0, 3).map((game) => {
                const playtime = formatPlaytime(game);
                return (
                  <div key={game.id} style={{
                    flexShrink: 0, width: 100,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  }}>
                    <div style={{
                      width: 100, height: 56, borderRadius: 8, overflow: "hidden",
                      background: "rgba(255,255,255,0.06)",
                      border: "2px solid rgba(250,204,21,0.3)",
                      boxShadow: "0 0 12px rgba(250,204,21,0.1)",
                    }}>
                      {game.cover_url ? (
                        <img src={game.cover_url} alt={game.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20,
                        }}>🎮</div>
                      )}
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: "#fff",
                      textAlign: "center", lineHeight: 1.2,
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      width: "100%",
                    }}>
                      {game.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   StatBar — horizontal progress bar with label and count
   ═══════════════════════════════════════════════════════════════ */
function StatBar({ label, count, total, pct, color, showTotal }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 52, fontSize: 10, fontWeight: 700,
        color: color,
        textTransform: "uppercase", letterSpacing: "0.05em",
        textAlign: "right", flexShrink: 0,
      }}>
        {label}
      </div>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${Math.max(pct, count > 0 ? 3 : 0)}%`,
          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{
        width: showTotal ? 40 : 28, fontSize: 11, fontWeight: 700,
        color: color,
        textAlign: "left", flexShrink: 0,
      }}>
        {showTotal ? `${count}/${total}` : count}
      </div>
    </div>
  );
}

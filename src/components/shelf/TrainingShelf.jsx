import { useState } from "react";
import { SPORT_ICONS } from "../../utils/constants";
import { formatPace, formatDuration, formatDistance } from "../../utils/strava";
import { formatDate } from "../../utils/helpers";
import StravaRouteMap from "../StravaRouteMap";

const S = {
  sectionBleed: { padding: 0, marginBottom: 28 },
  labelRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 0 14px",
  },
  label: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 20, color: "var(--text-primary)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "flex", alignItems: "center", gap: 8,
  },
  count: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--text-faint)", fontWeight: 400,
  },
  addBtn: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-green)", fontWeight: 600,
    cursor: "pointer",
  },

  /* ── Empty state ── */
  empty: { textAlign: "center", padding: "40px 16px" },
  emptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  emptyText: {
    fontFamily: "var(--font-serif)", fontSize: 14,
    color: "var(--text-muted)", fontStyle: "italic",
  },
  emptyCta: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--accent-green)", cursor: "pointer", marginTop: 10,
  },

  /* ── Shared image styles ── */
  imgBg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
  },
  fallback: {
    position: "absolute", inset: 0,
    background: "rgba(255,255,255,0.03)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  /* ── Hero event (first / most important) — full bleed ── */
  hero: {
    position: "relative",
    overflow: "hidden", cursor: "pointer",
    minHeight: 240,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    marginBottom: 12,
  },
  heroBg: {
    filter: "brightness(0.65) saturate(1.15)",
  },
  heroContent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    zIndex: 1, padding: "24px 20px 18px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)",
  },
  heroTitle: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 22, color: "#fff",
    textTransform: "uppercase", letterSpacing: "0.03em",
    lineHeight: 1.15,
    textShadow: "0 2px 10px rgba(0,0,0,0.5)",
  },
  heroDetail: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "rgba(255,255,255,0.7)", marginTop: 4,
    letterSpacing: "0.02em",
  },
  heroDate: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--accent-gold)", marginTop: 4,
    letterSpacing: "0.04em", fontWeight: 600,
  },
  heroReady: {
    fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
    color: "var(--accent-gold)", marginTop: 6,
    textTransform: "uppercase", letterSpacing: "0.04em",
  },

  /* ── Sub-row (1–3 smaller tiles underneath, padded) ── */
  subRow: (count) => ({
    display: "grid",
    gridTemplateColumns: count === 1 ? "1fr" : `repeat(${count}, 1fr)`,
    gap: 10,
    padding: "0 16px",
  }),
  thumb: {
    position: "relative", borderRadius: 10,
    overflow: "hidden", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.2)",
  },
  thumbBg: {
    filter: "brightness(0.6) saturate(1.1)",
  },
  thumbContent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    zIndex: 1, padding: "16px 10px 10px",
    background: "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 65%, transparent 100%)",
  },
  thumbTitle: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 12, color: "#fff",
    textTransform: "uppercase", letterSpacing: "0.02em",
    lineHeight: 1.2,
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  thumbDetail: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    color: "rgba(255,255,255,0.6)", marginTop: 2,
  },
  thumbDate: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    color: "var(--accent-gold)", marginTop: 2, fontWeight: 600,
  },
  thumbReady: {
    fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700,
    color: "var(--accent-gold)", marginTop: 3,
    textTransform: "uppercase",
  },

  expandBtn: {
    textAlign: "center", padding: "14px 16px 0",
    fontFamily: "var(--font-display)", fontSize: 14,
    fontWeight: 600, letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.35)", cursor: "pointer",
  },

  /* ── Strava latest activity ── */
  stravaCard: {
    overflow: "hidden",
    background: "rgba(255,255,255,0.02)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  stravaHero: {
    height: 180, overflow: "hidden",
    position: "relative",
  },
  stravaHeader: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "12px 16px 4px",
  },
  stravaName: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 18, color: "var(--text-primary)",
    padding: "0 16px 10px", letterSpacing: "0.02em",
  },
  stravaStats: {
    display: "flex", gap: 0, padding: "0 16px 14px",
  },
  stravaStat: { flex: 1, textAlign: "center" },
  stravaStatVal: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 18, color: "var(--text-primary)",
  },
  stravaStatLabel: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    color: "var(--text-faint)", textTransform: "uppercase",
    letterSpacing: "0.06em", marginTop: 3,
  },
  stravaFooter: {
    padding: "10px 16px 12px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    textAlign: "center",
  },
  stravaDisconnect: {
    fontFamily: "var(--font-mono)", fontSize: 10,
    color: "var(--text-faint)", cursor: "pointer",
  },
  stravaPowered: {
    display: "flex", alignItems: "center",
  },
};

/* ── Aspect ratio based on sub-count ── */
const THUMB_ASPECT = { 1: "16/9", 2: "4/3", 3: "3/4" };

/* ── Render a tile's background image or fallback ── */
function TileBg({ item, brightness }) {
  if (item.locationImage) {
    return (
      <div style={{
        ...S.imgBg, ...brightness,
        backgroundImage: `url(${item.locationImage})`,
        backgroundPosition: `${(item.photoPosition || "50 50").split(" ").join("% ")}%`,
      }} />
    );
  }
  return <div style={{ ...S.fallback, fontSize: brightness === S.heroBg ? 48 : 28 }}>{item.emoji || "🏁"}</div>;
}

export default function TrainingShelf({
  goals, stravaActivities, stravaConnected, stravaLoading, stravaDismissed,
  onAddEvent, onViewEvent, onStravaConnect, onStravaDisconnect, setStravaDismissed,
}) {
  const [expanded, setExpanded] = useState(false);
  const all = goals || [];
  const visible = expanded ? all : all.slice(0, 4);
  const hero = visible[0] || null;
  const rest = visible.slice(1, 4);

  return (
    <div>
      {/* ── Training section ── */}
      <div style={S.sectionBleed}>
        <div style={{ padding: "0 16px" }}>
          <div style={S.labelRow}>
            <div style={S.label}>
              🏁 Training For
              {all.length > 0 && <span style={S.count}>{all.length}</span>}
            </div>
            <div style={S.addBtn} onClick={onAddEvent}>+ Add</div>
          </div>
        </div>

        {all.length === 0 ? (
          <div style={{ padding: "0 16px" }}>
            <div style={S.empty}>
              <div style={S.emptyIcon}>🏁</div>
              <div style={S.emptyText}>What are you training for?</div>
              <div style={S.emptyCta} onClick={onAddEvent}>Add an event</div>
              <StravaNudge show={!stravaConnected && !stravaDismissed} onConnect={onStravaConnect} onDismiss={() => { setStravaDismissed(true); try { localStorage.setItem("mantl_strava_dismissed", "1"); } catch {} }} />
            </div>
          </div>
        ) : (
          <>
            {/* Hero — full bleed */}
            {hero && (
              <div style={S.hero} onClick={() => onViewEvent(hero)}>
                <TileBg item={hero} brightness={S.heroBg} />
                <div style={S.heroContent}>
                  <div style={S.heroTitle}>
                    {hero.title}{hero.distance ? ` · ${hero.distance}` : ""}
                  </div>
                  {hero.location && <div style={S.heroDetail}>{hero.location}</div>}
                  {hero.goal && <div style={{ ...S.heroDetail, fontStyle: "italic" }}>Goal: {hero.goal}</div>}
                  {hero.targetDate && <div style={S.heroDate}>{formatDate(hero.targetDate)}</div>}
                  {hero.targetDate && new Date(hero.targetDate + "T23:59:59") <= new Date() && (
                    <div style={S.heroReady}>🏆 Log result</div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-row — 1 landscape, 2 squarish, or 3 portrait */}
            {rest.length > 0 && (
              <div style={S.subRow(rest.length)}>
                {rest.map((item, i) => (
                  <div style={{ ...S.thumb, aspectRatio: THUMB_ASPECT[rest.length] || "3/4" }} key={i} onClick={() => onViewEvent(item)}>
                    <TileBg item={item} brightness={S.thumbBg} />
                    <div style={S.thumbContent}>
                      <div style={S.thumbTitle}>
                        {item.title}{item.distance ? ` · ${item.distance}` : ""}
                      </div>
                      {item.location && <div style={S.thumbDetail}>{item.location}</div>}
                      {item.targetDate && <div style={S.thumbDate}>{formatDate(item.targetDate)}</div>}
                      {item.targetDate && new Date(item.targetDate + "T23:59:59") <= new Date() && (
                        <div style={S.thumbReady}>🏆 Log result</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {all.length > 4 && (
              <div style={S.expandBtn} onClick={() => setExpanded(!expanded)}>
                {expanded ? "Show less" : `Show all ${all.length}`} →
              </div>
            )}
            <div style={{ padding: "0 16px" }}>
              <StravaNudge show={!stravaConnected && !stravaDismissed} onConnect={onStravaConnect} onDismiss={() => { setStravaDismissed(true); try { localStorage.setItem("mantl_strava_dismissed", "1"); } catch {} }} />
            </div>
          </>
        )}
      </div>

      {/* ── Strava latest activity ── */}
      {stravaConnected && stravaActivities.length > 0 && !stravaLoading && (
        <div style={S.sectionBleed}>
          <div style={{ padding: "0 16px" }}>
            <div style={S.labelRow}>
              <div style={S.label}>🏃 Latest Activity</div>
              <div style={S.stravaPowered}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/cb/Strava_Logo.svg" alt="Strava" style={{ height: 16, opacity: 0.6 }} />
              </div>
            </div>
          </div>
          <div style={S.stravaCard}>
            {stravaActivities.slice(0, 1).map((act, i) => {
              const icon = SPORT_ICONS[act.sport_type] || SPORT_ICONS[act.type] || "💪";
              const isRun = (act.sport_type || act.type || "").toLowerCase().includes("run");
              const isRide = (act.sport_type || act.type || "").toLowerCase().includes("ride");
              return (
                <div key={act.strava_id || i}>
                  {act.photos?.primary?.urls ? (
                    <div style={S.stravaHero}>
                      <img src={act.photos.primary.urls['600'] || act.photos.primary.urls['100'] || Object.values(act.photos.primary.urls)[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  ) : act.map?.summary_polyline ? (
                    <div style={{ ...S.stravaHero, background: "rgba(255,255,255,0.02)" }}>
                      <StravaRouteMap polyline={act.map.summary_polyline} />
                    </div>
                  ) : null}
                  <div style={S.stravaHeader}>
                    <span style={{ fontSize: 15 }}>{icon}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent-orange)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {(act.sport_type || act.type || "Workout").replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginLeft: "auto" }}>
                      {new Date(act.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div style={S.stravaName}>{act.name}</div>
                  <div style={S.stravaStats}>
                    {act.distance > 0 && <div style={S.stravaStat}><div style={S.stravaStatVal}>{formatDistance(act.distance)}</div><div style={S.stravaStatLabel}>Distance</div></div>}
                    <div style={S.stravaStat}><div style={S.stravaStatVal}>{formatDuration(act.moving_time)}</div><div style={S.stravaStatLabel}>Time</div></div>
                    {(isRun || isRide) && act.average_speed > 0 && <div style={S.stravaStat}><div style={S.stravaStatVal}>{isRun ? formatPace(act.average_speed) : `${(act.average_speed * 3.6).toFixed(1)} km/h`}</div><div style={S.stravaStatLabel}>{isRun ? "Pace" : "Speed"}</div></div>}
                    {act.total_elevation_gain > 0 && <div style={S.stravaStat}><div style={S.stravaStatVal}>{Math.round(act.total_elevation_gain)}m</div><div style={S.stravaStatLabel}>Elev</div></div>}
                    {act.average_heartrate > 0 && <div style={S.stravaStat}><div style={S.stravaStatVal}>{Math.round(act.average_heartrate)}</div><div style={S.stravaStatLabel}>HR</div></div>}
                  </div>
                </div>
              );
            })}
            <div style={S.stravaFooter}>
              <div style={S.stravaDisconnect} onClick={onStravaDisconnect}>Disconnect Strava</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StravaNudge({ show, onConnect, onDismiss }) {
  if (!show) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 14px", marginTop: 12,
      background: "rgba(255,255,255,0.03)", borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }} onClick={onConnect}>
        Connect <span style={{ color: "var(--accent-orange)", fontWeight: 600 }}>Strava</span> to show your latest training activity →
      </span>
      <span style={{ fontSize: 14, color: "var(--text-faint)", cursor: "pointer", marginLeft: 8 }} onClick={onDismiss}>✕</span>
    </div>
  );
}

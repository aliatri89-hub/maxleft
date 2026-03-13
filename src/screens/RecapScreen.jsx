import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { COUNTRIES } from "../utils/countries";
// import { HABITS } from "../utils/constants"; // DISABLED: habits removed for launch
import { stravaApi } from "../utils/strava";

function RecapScreen({ session, profile, onBack, onToast, embedded }) {
  const now = new Date();
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Proxy image URLs through wsrv.nl for CORS support (needed for canvas export)
  const proxyImg = (url) => {
    if (!url) return "";
    if (url.startsWith("data:") || url.includes("supabase.co")) return url;
    if (url.startsWith("http://")) url = url.replace("http://", "https://");
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&default=1`;
  };
  const [recapMonth, setRecapMonth] = useState(now.getMonth()); // 0-11
  const [recapYear, setRecapYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loaded, setLoaded] = useState(null); // "month-year" of last load
  const [heroType, setHeroType] = useState("auto"); // "auto" | "training" | "reading" | "popculture" | "habits" | "travel"
  const cardRef = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const prevMonth = () => {
    if (recapMonth === 0) { setRecapMonth(11); setRecapYear(y => y - 1); }
    else setRecapMonth(m => m - 1);
  };
  const nextMonth = () => {
    const atCurrent = recapMonth === now.getMonth() && recapYear === now.getFullYear();
    if (atCurrent) return;
    if (recapMonth === 11) { setRecapMonth(0); setRecapYear(y => y + 1); }
    else setRecapMonth(m => m + 1);
  };

  const loadRecapData = async () => {
    const s = sessionRef.current;
    if (!s) return;
    const loadKey = `${recapMonth}-${recapYear}`;
    if (loaded === loadKey) return;
    setLoading(true);
    const uid = s.user.id;
    const startDate = new Date(recapYear, recapMonth, 1).toISOString();
    const endDate = new Date(recapYear, recapMonth + 1, 0, 23, 59, 59).toISOString();

    // Books finished this month
    const { data: booksData } = await supabase.from("books").select("*").eq("user_id", uid)
      .eq("is_active", false).neq("habit_id", 7)
      .gte("finished_at", startDate).lte("finished_at", endDate)
      .order("finished_at", { ascending: false });
    const books = (booksData || []).map(b => ({
      title: b.title, author: b.author, cover: b.cover_url, rating: b.rating, pages: b.total_pages,
    }));

    // Currently reading (active books as of that month)
    const { data: readingData } = await supabase.from("books").select("*").eq("user_id", uid)
      .eq("is_active", true).neq("habit_id", 7).limit(1);
    const currentlyReading = readingData?.[0] ? { title: readingData[0].title, author: readingData[0].author, cover: readingData[0].cover_url } : null;

    // Pages read this month (from reading log)
    const { data: logData } = await supabase.from("reading_log").select("page_from, page_to, created_at")
      .eq("user_id", uid)
      .gte("created_at", startDate).lte("created_at", endDate);
    const pagesRead = (logData || []).reduce((sum, entry) => sum + Math.max(0, (entry.page_to || 0) - (entry.page_from || 0)), 0);

    // Movies this month
    const { data: moviesData } = await supabase.from("movies").select("*").eq("user_id", uid)
      .gte("watched_at", startDate).lte("watched_at", endDate)
      .order("watched_at", { ascending: false });
    const films = (moviesData || []).map(m => ({
      title: m.title, cover: m.poster_url, rating: m.rating, year: m.year, director: m.director,
    }));

    // Shows this month (only watching/finished, not entire library)
    const { data: showsData } = await supabase.from("shows").select("*").eq("user_id", uid)
      .in("status", ["watching", "finished"])
      .gte("created_at", startDate).lte("created_at", endDate);
    const shows = (showsData || []).map(s => ({ title: s.title, rating: s.rating, status: s.status, cover: s.poster_url }));

    // Games this month (only playing/beat, not entire Steam library)
    const { data: gamesData } = await supabase.from("games").select("*").eq("user_id", uid)
      .in("status", ["playing", "beat"])
      .gte("created_at", startDate).lte("created_at", endDate);
    const games = (gamesData || []).map(g => ({ title: g.title, rating: g.rating, cover: g.cover_url }));

    // Trophies (completed events) this month
    const { data: trophiesData } = await supabase.from("workout_goals").select("*").eq("user_id", uid)
      .eq("is_active", false).gte("habit_id", 1).not("completed_at", "is", null)
      .gte("completed_at", startDate).lte("completed_at", endDate)
      .order("completed_at", { ascending: false });
    const trophies = (trophiesData || []).map(t => ({
      title: t.name, result: t.result, emoji: t.emoji || "🏆", location: t.location,
    }));

    // Upcoming events (next event after this month)
    const { data: upcomingData } = await supabase.from("workout_goals").select("*").eq("user_id", uid)
      .eq("is_active", true).gte("habit_id", 1)
      .gte("target_date", endDate)
      .order("target_date", { ascending: true }).limit(1);
    const upcoming = upcomingData?.[0] ? (() => {
      const target = new Date(upcomingData[0].target_date);
      const monthEnd = new Date(recapYear, recapMonth + 1, 0);
      const weeksOut = Math.max(1, Math.round((target - monthEnd) / (7 * 24 * 60 * 60 * 1000)));
      return { title: upcomingData[0].name, weeksOut };
    })() : null;

    // Countries visited this month (use visited_at if set, fall back to created_at)
    const { data: countriesData } = await supabase.from("countries").select("*").eq("user_id", uid)
      .eq("status", "been");
    const countriesFiltered = (countriesData || []).filter(c => {
      const stamp = c.visited_at || c.created_at;
      return stamp && stamp >= startDate && stamp <= endDate;
    });
    const countries = countriesFiltered.map(c => {
      const meta = COUNTRIES.find(cc => cc.code === c.country_code);
      return { name: c.country_name, flag: meta?.flag || "🏳️", code: c.country_code };
    });

    // Strava monthly stats — compute per-activity-type stats from raw activities
    let strava = null;
    try {
      const afterEpoch = Math.floor(new Date(recapYear, recapMonth, 1).getTime() / 1000);
      const beforeEpoch = Math.floor(new Date(recapYear, recapMonth + 1, 0, 23, 59, 59).getTime() / 1000);
      const result = await stravaApi("monthly", null, { after: afterEpoch, before: beforeEpoch });

      // Process raw activities if available, fall back to legacy stats
      const activities = result?.activities || [];
      if (activities.length > 0) {
        // Categorize activities
        const cats = { run: [], ride: [], swim: [], hike: [], strength: [], other: [] };
        const catOf = (t) => {
          const s = (t || "").toLowerCase();
          if (s.includes("run")) return "run";
          if (s.includes("ride") || s.includes("bike") || s.includes("cycling")) return "ride";
          if (s.includes("swim")) return "swim";
          if (s.includes("hike") || s.includes("walk")) return "hike";
          if (s.includes("weight") || s.includes("crossfit") || s.includes("workout") || s.includes("yoga") || s.includes("elliptical")) return "strength";
          return "other";
        };
        activities.forEach(a => {
          const cat = catOf(a.sport_type || a.type);
          cats[cat].push(a);
        });

        // Find primary activity type (most sessions)
        const typeCounts = Object.entries(cats).filter(([, v]) => v.length > 0).sort((a, b) => b[1].length - a[1].length);
        const primary = typeCounts[0]?.[0] || "run";
        // Global stats
        const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0);
        const totalTime = activities.reduce((s, a) => s + (a.moving_time || 0), 0);
        const totalElev = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
        const totalKm = (totalDist / 1000).toFixed(1);
        const totalHours = (totalTime / 3600).toFixed(1);

        // Per-type stats
        const typeStats = {};
        for (const [cat, acts] of Object.entries(cats)) {
          if (acts.length === 0) continue;
          const dist = acts.reduce((s, a) => s + (a.distance || 0), 0);
          const time = acts.reduce((s, a) => s + (a.moving_time || 0), 0);
          const elev = acts.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
          const longest = Math.max(...acts.map(a => a.distance || 0));
          const avgSpeed = acts.filter(a => a.average_speed > 0).reduce((s, a) => s + a.average_speed, 0) / (acts.filter(a => a.average_speed > 0).length || 1);
          const avgHR = acts.filter(a => a.average_heartrate > 0).reduce((s, a) => s + a.average_heartrate, 0) / (acts.filter(a => a.average_heartrate > 0).length || 1);
          typeStats[cat] = { count: acts.length, dist, distKm: (dist / 1000).toFixed(1), time, elev: Math.round(elev), longest, longestKm: (longest / 1000).toFixed(1), avgSpeed, avgHR: avgHR > 0 ? Math.round(avgHR) : null };
        }

        // Compute primary-type specific display values
        const ps = typeStats[primary] || {};
        let primaryLabel = { run: "Runs", ride: "Rides", swim: "Swims", hike: "Hikes", strength: "Sessions", other: "Sessions" }[primary];
        let primaryIcon = { run: "🏃", ride: "🚴", swim: "🏊", hike: "🥾", strength: "🏋️", other: "💪" }[primary];

        // Build detail lines based on primary type
        const details = [];
        if (primary === "run") {
          if (ps.longest > 1000) details.push({ label: "Longest run", value: `${ps.longestKm}km` });
          if (ps.elev > 0) details.push({ label: "Elevation", value: `${ps.elev}m` });
        } else if (primary === "ride") {
          if (ps.longest > 1000) details.push({ label: "Longest ride", value: `${ps.longestKm}km` });
          if (ps.elev > 0) details.push({ label: "Elevation", value: `${ps.elev}m` });
        } else if (primary === "swim") {
          if (ps.longest > 0) details.push({ label: "Longest swim", value: ps.longest >= 1000 ? `${(ps.longest / 1000).toFixed(1)}km` : `${Math.round(ps.longest)}m` });
          if (ps.avgHR) details.push({ label: "Avg HR", value: `${ps.avgHR}bpm` });
        } else if (primary === "hike") {
          if (ps.longest > 1000) details.push({ label: "Longest hike", value: `${ps.longestKm}km` });
          if (ps.elev > 0) details.push({ label: "Elevation", value: `${ps.elev}m` });
          if (ps.avgHR) details.push({ label: "Avg HR", value: `${ps.avgHR}bpm` });
        } else {
          // strength / other — time-focused
          if (ps.avgHR) details.push({ label: "Avg HR", value: `${ps.avgHR}bpm` });
        }

        // Activity type breakdown (if mixed)
        const breakdown = typeCounts.filter(([, v]) => v.length > 0).map(([cat, acts]) => {
          const label = { run: "run", ride: "ride", swim: "swim", hike: "hike", strength: "workout", other: "other" }[cat];
          return `${acts.length} ${label}${acts.length !== 1 ? "s" : ""}`;
        });

        // Top 3 tiles — adapt units to primary type
        const tiles = primary === "swim" ? [
          { value: ps.dist >= 1000 ? (ps.dist / 1000).toFixed(1) : Math.round(ps.dist), unit: ps.dist >= 1000 ? "km" : "m", label: "Distance" },
          { value: ps.count, unit: "", label: primaryLabel },
          { value: totalHours, unit: "hrs", label: "Moving" },
        ] : primary === "strength" ? [
          { value: ps.count, unit: "", label: "Sessions" },
          { value: totalHours, unit: "hrs", label: "Moving" },
          { value: totalDist > 0 ? totalKm : (totalElev > 0 ? Math.round(totalElev) : ps.avgHR || "—"), unit: totalDist > 0 ? "km" : (totalElev > 0 ? "m" : (ps.avgHR ? "bpm" : "")), label: totalDist > 0 ? "Distance" : (totalElev > 0 ? "Elev" : (ps.avgHR ? "Avg HR" : "")) },
        ] : [
          { value: totalKm, unit: "km", label: "Distance" },
          { value: ps.count, unit: "", label: primaryLabel },
          { value: totalHours, unit: "hrs", label: "Moving" },
        ];

        strava = { tiles, details, breakdown: breakdown.length > 1 ? breakdown : [], primary, primaryIcon, totalActivities: activities.length, typeStats, totalElev: Math.round(totalElev), totalDist: totalKm, totalTime: totalHours };
      } else if (result?.stats) {
        // Legacy fallback — old edge function that only returns stats
        const s = result.stats;
        const primary = s.totalRuns > 0 && s.totalRuns >= (s.totalRides || 0) ? "run" : s.totalRides > 0 ? "ride" : "other";
        const tiles = [
          { value: s.totalKm, unit: "km", label: "Distance" },
          { value: s.totalActivities, unit: "", label: s.totalRuns > 0 && s.totalRides === 0 ? "Runs" : s.totalRides > 0 && s.totalRuns === 0 ? "Rides" : "Sessions" },
          { value: s.totalHours, unit: "hrs", label: "Moving" },
        ];
        const details = [];
        if (s.longestRun > 0) details.push({ label: "Longest", value: `${s.longestRun}km` });
        if (s.elevation > 0) details.push({ label: "Elevation", value: `${s.elevation}m` });
        const breakdown = [];
        if (s.totalRuns > 0 && s.totalRides > 0) {
          breakdown.push(`${s.totalRuns} run${s.totalRuns !== 1 ? "s" : ""}`, `${s.totalRides} ride${s.totalRides !== 1 ? "s" : ""}`);
          if (s.totalOther > 0) breakdown.push(`${s.totalOther} other`);
        }
        strava = { tiles, details, breakdown, primary, primaryIcon: primary === "ride" ? "🚴" : "🏃", totalActivities: s.totalActivities };
      }
    } catch (e) { /* Strava not connected or edge function not deployed */ }

    const nextUpBook = profile.nextUpBook || null;

    // Habit tracking data DISABLED for launch
    let habitsRecap = null;

    const hasContent = books.length > 0 || pagesRead > 0 || films.length > 0 || shows.length > 0 || games.length > 0 || trophies.length > 0 || countries.length > 0 || strava || nextUpBook;

    setData({ books, currentlyReading, pagesRead, films, shows, games, trophies, upcoming, countries, strava, nextUpBook, habitsRecap, hasContent });
    setLoaded(`${recapMonth}-${recapYear}`);
    setLoading(false);
  };

  useEffect(() => {
    const key = `${recapMonth}-${recapYear}`;
    if (loaded !== key) loadRecapData();
  }, [recapMonth, recapYear, loaded]);

  const stars = (n) => {
    if (!n) return "";
    const full = Math.floor(n);
    const hasHalf = n % 1 >= 0.5;
    return "★".repeat(full) + (hasHalf ? "✦" : "") + "☆".repeat(5 - full - (hasHalf ? 1 : 0));
  };

  const loadHtml2Canvas = () => new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve(window.html2canvas);
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0f0f10",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `mantl-recap-${MONTH_NAMES[recapMonth].toLowerCase()}-${recapYear}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      onToast("Recap saved!");
    } catch (e) {
      console.error("Export error:", e);
      onToast("Couldn't export — try screenshotting instead");
    }
    setExporting(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0f0f10",
        scale: 3,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (navigator.share && blob) {
          const file = new File([blob], `mantl-recap-${MONTH_NAMES[recapMonth].toLowerCase()}-${recapYear}.png`, { type: "image/png" });
          try {
            await navigator.share({ files: [file], title: `${profile.username}'s ${MONTH_NAMES[recapMonth]} Recap` });
          } catch (e) { /* user cancelled */ }
        } else {
          // Fallback to download
          const url = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `mantl-recap-${MONTH_NAMES[recapMonth].toLowerCase()}-${recapYear}.png`;
          link.href = url;
          link.click();
          onToast("Recap saved!");
        }
        setExporting(false);
      }, "image/png");
      return;
    } catch (e) {
      console.error("Share error:", e);
      onToast("Couldn't export — try screenshotting instead");
    }
    setExporting(false);
  };

  const isCurrentMonth = recapMonth === now.getMonth() && recapYear === now.getFullYear();

  return (
    <div className="recap-screen" style={embedded ? { minHeight: "auto", background: "transparent", padding: "8px 0 0" } : undefined}>
      {!embedded && (
      <div className="recap-header">
        <button className="recap-back" onClick={onBack}>← Back</button>
        <div className="recap-title">Monthly Recap</div>
        <div style={{ width: 48 }} />
      </div>
      )}

      {/* Month picker */}
      <div className="recap-month-picker">
        <button className="recap-month-arrow" onClick={prevMonth}>‹</button>
        <div className="recap-month-label">{MONTH_NAMES[recapMonth]} {recapYear}</div>
        <button className="recap-month-arrow" onClick={nextMonth} style={isCurrentMonth ? { opacity: 0.2, cursor: "default" } : {}}>›</button>
      </div>

      {loading ? (
        <div className="recap-empty">Generating recap...</div>
      ) : !data?.hasContent ? (
        <div className="recap-empty">Nothing logged in {MONTH_NAMES[recapMonth]}. Get out there!</div>
      ) : (
        <>
          {/* Hero type selector */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16, flexWrap: "wrap", padding: "0 16px" }}>
            {[
              { key: "auto", label: "Auto", emoji: "✨" },
              ...(data.strava ? [{ key: "training", label: "Training", emoji: "🏃" }] : []),
              ...(data.books.length > 0 || data.currentlyReading || data.pagesRead > 0 || data.nextUpBook ? [{ key: "reading", label: "Reading", emoji: "📖" }] : []),
              ...((data.films.length + data.shows.length + data.games.length) > 0 ? [{ key: "popculture", label: "Pop Culture", emoji: "🎬" }] : []),
              ...(data.habitsRecap ? [{ key: "habits", label: "Habits", emoji: "🔥" }] : []),
              ...(data.countries.length > 0 ? [{ key: "travel", label: "Travel", emoji: "🌍" }] : []),
            ].map(opt => (
              <div key={opt.key} onClick={() => setHeroType(opt.key)}
                style={{
                  padding: "6px 14px", borderRadius: 100, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.04em",
                  background: heroType === opt.key ? "var(--charcoal)" : "var(--card)",
                  color: heroType === opt.key ? "var(--cream)" : "var(--text-dim)",
                  border: `1px solid ${heroType === opt.key ? "var(--charcoal)" : "var(--border)"}`,
                  transition: "all 0.15s",
                }}>
                {opt.emoji} {opt.label}
              </div>
            ))}
          </div>
          {/* The card */}
          <div className="recap-card-wrapper">
            <div style={{
              padding: 2, borderRadius: 22,
              background: "linear-gradient(135deg, rgba(196,115,79,0.5) 0%, rgba(212,168,67,0.4) 35%, rgba(196,115,79,0.15) 60%, rgba(212,168,67,0.35) 100%)",
              boxShadow: "0 0 30px rgba(196,115,79,0.15), 0 0 60px rgba(212,168,67,0.08)",
            }}>
            <div ref={cardRef} style={{
              width: 375, background: "linear-gradient(170deg, #1c1c1e 0%, #0f0f10 40%, #141416 100%)",
              borderRadius: 20, overflow: "hidden", position: "relative",
              fontFamily: "'Barlow Condensed', sans-serif", color: "#f4f0ea",
            }}>
              {/* Grain */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.04,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }} />
              {/* Top accent */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 2,
                background: "linear-gradient(90deg, transparent 0%, #c4734f 30%, #d4a843 70%, transparent 100%)",
              }} />

              <div style={{ position: "relative", zIndex: 2, padding: "28px 24px 24px", display: "flex", flexDirection: "column", minHeight: 480 }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(244,240,234,0.35)", marginBottom: 4 }}>Monthly Recap</div>
                    <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.01em", textTransform: "uppercase", lineHeight: 1 }}>{MONTH_NAMES[recapMonth]}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: "rgba(244,240,234,0.3)", marginTop: 2 }}>{recapYear}</div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: "rgba(244,240,234,0.25)", marginTop: 4 }}>@{profile.username}</div>
                </div>

                {/* Trophies — hidden in reading/popculture hero */}
                {heroType !== "reading" && heroType !== "popculture" && heroType !== "habits" && data.trophies.length > 0 && (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(212,168,67,0.12) 0%, rgba(196,115,79,0.08) 100%)",
                    border: "1px solid rgba(212,168,67,0.2)", borderRadius: 14, padding: "16px 18px", marginBottom: 16,
                  }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: "#d4a843", marginBottom: 8 }}>
                      🏆 {data.trophies.length === 1 ? "Trophy Earned" : `${data.trophies.length} Trophies Earned`}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.01em", lineHeight: 1.15 }}>{data.trophies[0].title}</div>
                    {data.trophies[0].result && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: "#d4a843", marginTop: 6, letterSpacing: "0.04em" }}>{data.trophies[0].result}</div>
                    )}
                  </div>
                )}

                {/* Upcoming event — hidden in reading/popculture hero */}
                {heroType !== "reading" && heroType !== "popculture" && heroType !== "habits" && data.upcoming && (
                  <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 11, color: "rgba(244,240,234,0.45)", marginBottom: 14 }}>
                    🎯 Next up: {data.upcoming.title} — {data.upcoming.weeksOut} week{data.upcoming.weeksOut !== 1 ? "s" : ""} out
                  </div>
                )}

                {/* Section rendering — hero-aware */}
                {(() => {
                  const hero = heroType === "auto" ? null : heroType;
                  const hasTraining = !!data.strava;
                  const hasReading = data.books.length > 0 || data.pagesRead > 0 || !!data.currentlyReading || !!data.nextUpBook;
                  const shelfItems = [...data.films.map(f => ({ ...f, type: "film" })), ...data.shows.map(s => ({ ...s, type: "show" })), ...data.games.map(g => ({ ...g, type: "game" }))];
                  const hasPopCulture = shelfItems.length > 0;
                  const hasTravel = data.countries.length > 0;
                  const sectionLabel = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(244,240,234,0.5)", marginBottom: 8, fontWeight: 700 };
                  const compactLine = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.35)", marginBottom: 8 };
                  const compactVal = { color: "rgba(244,240,234,0.6)", fontWeight: 600 };

                  /* ====== TRAINING — full / compact ====== */
                  const TrainingFull = () => hasTraining ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={sectionLabel}>{data.strava.primaryIcon || "🏃"} Training</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {data.strava.tiles.map((s, i) => (
                          <div key={i} style={{ background: "rgba(244,240,234,0.04)", borderRadius: 10, padding: hero === "training" ? "16px 10px" : "12px 10px", textAlign: "center" }}>
                            <div style={{ fontSize: hero === "training" ? 30 : 24, fontWeight: 900, lineHeight: 1 }}>{s.value}<span style={{ fontSize: hero === "training" ? 13 : 11, fontWeight: 600, color: "rgba(244,240,234,0.4)", marginLeft: 2 }}>{s.unit}</span></div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,240,234,0.25)", marginTop: 4 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {hero === "training" ? (
                        <>
                          {/* Hero: detailed stat cards */}
                          {(() => {
                            const statCards = [
                              ...data.strava.details.map(d => ({ label: d.label, value: d.value })),
                              ...(data.strava.totalElev > 0 && !data.strava.details.some(d => d.label === "Elevation") ? [{ label: "Elevation", value: `${data.strava.totalElev.toLocaleString()}m` }] : []),
                              ...(data.strava.totalActivities > 0 ? [{ label: "Workouts", value: String(data.strava.totalActivities) }] : []),
                            ];
                            return statCards.length > 0 ? (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
                                {statCards.map((d, i) => (
                                  <div key={i} style={{
                                    background: "rgba(244,240,234,0.03)", borderRadius: 8, padding: "10px 12px",
                                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                                    ...(statCards.length % 2 === 1 && i === statCards.length - 1 ? { gridColumn: "1 / -1" } : {}),
                                  }}>
                                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(244,240,234,0.3)" }}>{d.label}</span>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: "rgba(244,240,234,0.8)" }}>{d.value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                          {/* Breakdown by type */}
                          {data.strava.breakdown.length > 0 && (
                            <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center", flexWrap: "wrap" }}>
                              {data.strava.breakdown.map((b, i) => (
                                <div key={i} style={{
                                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.04em",
                                  padding: "4px 12px", borderRadius: 100, border: "1px solid rgba(244,240,234,0.08)",
                                  color: "rgba(244,240,234,0.4)",
                                }}>{b}</div>
                              ))}
                            </div>
                          )}
                          {/* Per-type stats (if 2+ types) */}
                          {data.strava.typeStats && Object.keys(data.strava.typeStats).length > 1 && (
                            <div style={{ marginTop: 10 }}>
                              {Object.entries(data.strava.typeStats).filter(([cat, ts]) => cat !== "other" && ts.count > 0 && ts.distKm > 0).slice(0, 3).map(([cat, ts]) => {
                                const icon = { run: "🏃", ride: "🚴", swim: "🏊", hike: "🥾", strength: "🏋️", other: "⚡" }[cat] || "⚡";
                                const paceStr = cat === "run" && ts.avgSpeed > 0 ? `${Math.floor(1000 / ts.avgSpeed / 60)}:${String(Math.round(1000 / ts.avgSpeed % 60)).padStart(2, "0")} /km` : cat === "ride" && ts.avgSpeed > 0 ? `${(ts.avgSpeed * 3.6).toFixed(1)} km/h` : null;
                                return (
                                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid rgba(244,240,234,0.04)" }}>
                                    <span style={{ fontSize: 14 }}>{icon}</span>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(244,240,234,0.6)", flex: 1 }}>{ts.distKm}km</span>
                                    {paceStr && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.35)" }}>{paceStr}</span>}
                                    {ts.elev > 0 && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.35)" }}>↑{ts.elev}m</span>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ display: "flex", gap: 16, marginTop: 8, padding: "0 4px", flexWrap: "wrap" }}>
                          {data.strava.details.map((d, i) => (
                            <div key={i} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.3)" }}>
                              {d.label}: <span style={{ color: "rgba(244,240,234,0.6)" }}>{d.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null;

                  const TrainingCompact = () => hasTraining ? (
                    <div style={compactLine}>
                      {data.strava.primaryIcon || "🏃"}{" "}
                      {data.strava.tiles.map((s, i) => (
                        <span key={i}>{i > 0 ? " · " : ""}<span style={compactVal}>{s.value}{s.unit}</span> {s.label.toLowerCase()}</span>
                      ))}
                    </div>
                  ) : null;

                  /* ====== READING — full / compact ====== */
                  const ReadingFull = () => hasReading ? (
                    <div style={{ marginBottom: 14 }}>
                      <div style={sectionLabel}>📖 Reading</div>
                      {hero === "reading" ? (
                        <>
                          {/* Hero: book covers — currently reading, last read, up next */}
                          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                            {data.currentlyReading && (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {data.currentlyReading.cover && (
                                  <img src={proxyImg(data.currentlyReading.cover)} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", display: "block" }} crossOrigin="anonymous" />
                                )}
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 9, color: "rgba(244,240,234,0.35)", marginBottom: 2 }}>Currently reading</div>
                                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "rgba(244,240,234,0.85)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.currentlyReading.title}</div>
                                  {data.currentlyReading.author && <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: "rgba(244,240,234,0.3)", marginTop: 1 }}>{data.currentlyReading.author}</div>}
                                </div>
                              </div>
                            )}
                            {data.books.length > 0 && (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {data.books[0].cover && (
                                  <img src={proxyImg(data.books[0].cover)} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", display: "block" }} crossOrigin="anonymous" />
                                )}
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 9, color: "rgba(244,240,234,0.35)", marginBottom: 2 }}>Last read</div>
                                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "rgba(244,240,234,0.85)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.books[0].title}</div>
                                  {data.books[0].author && <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: "rgba(244,240,234,0.3)", marginTop: 1 }}>{data.books[0].author}</div>}
                                  {data.books[0].rating > 0 && <div style={{ color: "#d4a843", fontSize: 10, marginTop: 2 }}>{stars(data.books[0].rating)}</div>}
                                </div>
                              </div>
                            )}
                            {data.nextUpBook && (
                              <div style={{ flex: 1, minWidth: 0,  }}>
                                {data.nextUpBook.cover && (
                                  <img src={proxyImg(data.nextUpBook.cover)} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", display: "block" }} crossOrigin="anonymous" />
                                )}
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 9, color: "rgba(244,240,234,0.55)", marginBottom: 2 }}>Up next</div>
                                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: "rgba(244,240,234,0.85)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.nextUpBook.title}</div>
                                  {data.nextUpBook.author && <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: "rgba(244,240,234,0.3)", marginTop: 1 }}>{data.nextUpBook.author}</div>}
                                </div>
                              </div>
                            )}
                          </div>
                          {data.pagesRead > 0 && (
                            <div style={{ background: "rgba(244,240,234,0.03)", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase", color: "rgba(244,240,234,0.3)" }}>Pages this month</span>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: "rgba(244,240,234,0.85)" }}>{data.pagesRead.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {data.currentlyReading && (
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              {data.currentlyReading.cover && (
                                <img src={proxyImg(data.currentlyReading.cover)} alt="" style={{ width: 58, aspectRatio: "2/3", objectFit: "cover", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", flexShrink: 0 }} crossOrigin="anonymous" />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 10, color: "rgba(244,240,234,0.4)", letterSpacing: "0.02em" }}>Currently reading</div>
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "rgba(244,240,234,0.85)", marginTop: 3, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.currentlyReading.title}</div>
                                {data.currentlyReading.author && <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: "rgba(244,240,234,0.35)", marginTop: 2 }}>{data.currentlyReading.author}</div>}
                                {data.pagesRead > 0 && (
                                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.5)", marginTop: 6 }}>
                                    <span style={{ fontWeight: 700, color: "rgba(244,240,234,0.7)", fontSize: 14 }}>{data.pagesRead.toLocaleString()}</span> pages this month
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {!data.currentlyReading && data.pagesRead > 0 && (
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.5)" }}>
                              <span style={{ fontWeight: 700, color: "rgba(244,240,234,0.7)", fontSize: 18 }}>{data.pagesRead.toLocaleString()}</span> pages read
                            </div>
                          )}
                          {data.books.length > 0 && (
                            <div style={{ marginTop: data.currentlyReading ? 10 : 0 }}>
                              <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 11, color: "rgba(244,240,234,0.4)" }}>
                                Last read: <span style={{ color: "rgba(244,240,234,0.65)", fontWeight: 600 }}>{data.books[0].title}</span>{data.books[0].author ? <span style={{ color: "rgba(244,240,234,0.35)" }}> by {data.books[0].author}</span> : ""}
                                {data.books[0].rating > 0 && <span style={{ color: "#d4a843", marginLeft: 6 }}>{stars(data.books[0].rating)}</span>}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : null;

                  const ReadingCompact = () => hasReading ? (
                    <div style={compactLine}>
                      📖{" "}
                      {data.pagesRead > 0 && <><span style={compactVal}>{data.pagesRead.toLocaleString()}</span> pages</>}
                      {data.currentlyReading && <>{data.pagesRead > 0 ? " · " : ""}Reading: <span style={compactVal}>{data.currentlyReading.title}</span></>}
                      {!data.currentlyReading && data.books.length > 0 && <>{data.pagesRead > 0 ? " · " : ""}Last: <span style={compactVal}>{data.books[0].title}</span></>}
                    </div>
                  ) : null;

                  /* ====== POP CULTURE — full / compact ====== */
                  const PopCultureFull = () => {
                    if (!hasPopCulture) return null;
                    const totalCount = shelfItems.length;
                    const topItem = shelfItems.filter(s => s.rating).reduce((a, b) => ((b.rating || 0) > (a.rating || 0) ? b : a), shelfItems[0]);
                    const isHero = hero === "popculture";

                    if (isHero) {
                      /* Hero: separate sections for films, shows, games */
                      const PosterGrid = ({ items, label, emoji }) => {
                        if (items.length === 0) return null;
                        const show = Math.min(4, items.length);
                        const rest = items.length - show;
                        return (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(244,240,234,0.4)", fontWeight: 700 }}>{emoji} {label}</div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 900, color: "rgba(244,240,234,0.7)" }}>{items.length}</div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, items.length)}, 1fr)`, gap: 6 }}>
                              {items.slice(0, show).map((item, i) => (
                                <div key={i} style={{ position: "relative" }}>
                                  {item.cover ? (
                                    <img src={proxyImg(item.cover)} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: 6, display: "block" }} crossOrigin="anonymous" />
                                  ) : (
                                    <div style={{ width: "100%", aspectRatio: "2/3", background: "rgba(244,240,234,0.06)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{emoji}</div>
                                  )}
                                  {item.rating >= 5 && (
                                    <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: 6, color: "#d4a843", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>★★★★★</div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {rest > 0 && (
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(244,240,234,0.25)", textAlign: "right", marginTop: 2 }}>+{rest} more</div>
                            )}
                          </div>
                        );
                      };
                      return (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={sectionLabel}>Pop Culture Diet</div>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{totalCount}</div>
                          </div>
                          <PosterGrid items={data.films} label="Films" emoji="🎬" />
                          <PosterGrid items={data.shows} label="Shows" emoji="📺" />
                          <PosterGrid items={data.games} label="Games" emoji="🎮" />
                          {topItem?.rating > 0 && (
                            <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 10, color: "rgba(244,240,234,0.3)", paddingLeft: 2 }}>
                              Top rated: {topItem.title} {stars(topItem.rating)}
                            </div>
                          )}
                        </div>
                      );
                    }

                    /* Auto: combined grid */
                    const perRow = totalCount <= 3 ? totalCount : 6;
                    const showCount = Math.min(12, totalCount);
                    const remaining = totalCount - showCount;
                    const fewItems = totalCount <= 3;
                    return (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={sectionLabel}>Pop Culture Diet</div>
                          <div style={{ fontSize: 20, fontWeight: 900 }}>{totalCount}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: fewItems ? `repeat(${perRow}, 72px)` : `repeat(${perRow}, 1fr)`, gap: fewItems ? 10 : 4, rowGap: fewItems ? 10 : 6 }}>
                          {shelfItems.slice(0, showCount).map((item, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              {item.cover ? (
                                <img src={proxyImg(item.cover)} alt="" style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: fewItems ? 6 : 5, display: "block" }} crossOrigin="anonymous" />
                              ) : (
                                <div style={{ width: "100%", aspectRatio: "2/3", background: "rgba(244,240,234,0.06)", borderRadius: fewItems ? 6 : 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fewItems ? 18 : 14 }}>
                                  {item.type === "film" ? "🎬" : item.type === "show" ? "📺" : "🎮"}
                                </div>
                              )}
                              {item.rating >= 5 && (
                                <div style={{ position: "absolute", bottom: 3, left: 0, right: 0, textAlign: "center", fontSize: 7, color: "#d4a843", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>★★★★★</div>
                              )}
                            </div>
                          ))}
                        </div>
                        {remaining > 0 && (
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.3)", textAlign: "right", marginTop: 4 }}>+{remaining} more</div>
                        )}
                        <div style={{ display: "flex", gap: 12, marginTop: 6, paddingLeft: 2 }}>
                          {data.films.length > 0 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(244,240,234,0.35)" }}>{data.films.length} film{data.films.length !== 1 ? "s" : ""}</div>}
                          {data.shows.length > 0 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(244,240,234,0.35)" }}>{data.shows.length} show{data.shows.length !== 1 ? "s" : ""}</div>}
                          {data.games.length > 0 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "rgba(244,240,234,0.35)" }}>{data.games.length} game{data.games.length !== 1 ? "s" : ""}</div>}
                        </div>
                        {topItem?.rating > 0 && (
                          <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 10, color: "rgba(244,240,234,0.3)", marginTop: 4, paddingLeft: 2 }}>
                            Top rated: {topItem.title} {stars(topItem.rating)}
                          </div>
                        )}
                      </div>
                    );
                  };

                  const PopCultureCompact = () => {
                    if (!hasPopCulture) return null;
                    const parts = [];
                    if (data.films.length > 0) parts.push(`${data.films.length} film${data.films.length !== 1 ? "s" : ""}`);
                    if (data.shows.length > 0) parts.push(`${data.shows.length} show${data.shows.length !== 1 ? "s" : ""}`);
                    if (data.games.length > 0) parts.push(`${data.games.length} game${data.games.length !== 1 ? "s" : ""}`);
                    return <div style={compactLine}>🎬 <span style={compactVal}>{parts.join(" · ")}</span></div>;
                  };

                  /* ====== TRAVEL — full / compact ====== */
                  const TravelFull = () => hasTravel ? (
                    <div style={{ marginBottom: 14 }}>
                      {hero === "travel" ? (
                        <>
                          <div style={sectionLabel}>🌍 Travel</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {data.countries.map((c, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(244,240,234,0.04)", borderRadius: 10, padding: "8px 14px" }}>
                                <img src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`} alt={c.name} style={{ width: 32, height: 22, borderRadius: 3, objectFit: "cover" }} />
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: "rgba(244,240,234,0.8)" }}>{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", gap: 3 }}>
                            {data.countries.map((c, i) => (
                              <img key={i} src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt={c.name} style={{ width: 22, height: 15, borderRadius: 2, objectFit: "cover" }} />
                            ))}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.4)" }}>
                            {data.countries.length} {data.countries.length === 1 ? "country" : "countries"} visited
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;

                  const TravelCompact = () => hasTravel ? (
                    <div style={{ ...compactLine, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🌍</span>
                      <span style={{ display: "flex", gap: 2 }}>
                        {data.countries.slice(0, 6).map((c, i) => (
                          <img key={i} src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt={c.name} style={{ width: 16, height: 11, borderRadius: 1, objectFit: "cover" }} />
                        ))}
                      </span>
                      <span style={compactVal}>{data.countries.length} {data.countries.length === 1 ? "country" : "countries"}</span>
                    </div>
                  ) : null;

                  /* ====== HABITS — full / compact ====== */
                  const hasHabits = !!data.habitsRecap;
                  const HabitsFull = () => {
                    if (!hasHabits) return null;
                    const hr = data.habitsRecap;
                    const dotColor = (s) => s === "done" ? "#7A9A6A" : s === "rest" ? "#C4A86A" : "rgba(255,255,255,0.08)";
                    return (
                      <div style={{ marginBottom: 14 }}>
                        <div style={sectionLabel}>🔥 Habits</div>
                        {/* Stat tiles */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                          {[
                            { value: `${hr.overallRate}%`, label: "Completion" },
                            { value: hr.overallBestStreak, label: "Best Streak" },
                            { value: hr.perfectDays, label: "Perfect Days" },
                          ].map((t, i) => (
                            <div key={i} style={{
                              background: "rgba(244,240,234,0.04)", borderRadius: 10, padding: "12px 8px", textAlign: "center",
                              border: "1px solid rgba(244,240,234,0.06)",
                            }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", lineHeight: 1.1,
                                color: i === 0 && hr.overallRate >= 80 ? "#7A9A6A" : i === 0 && hr.overallRate >= 50 ? "#C4A86A" : "rgba(244,240,234,0.85)" }}>{t.value}</div>
                              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(244,240,234,0.35)", marginTop: 4 }}>{t.label}</div>
                            </div>
                          ))}
                        </div>
                        {/* Per-habit rows with month dots */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {hr.habits.map((h, hi) => {
                            const pct = h.possible > 0 ? Math.round((h.completed / h.possible) * 100) : 0;
                            return (
                              <div key={hi}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                                  <span style={{ fontSize: 14 }}>{h.emoji}</span>
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: "rgba(244,240,234,0.75)", flex: 1, textTransform: "uppercase", letterSpacing: "0.02em" }}>{h.name}</span>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: h.bestStreak >= 7 ? "#c4734f" : "rgba(244,240,234,0.35)" }}>
                                    {h.bestStreak > 0 ? `🔥${h.bestStreak}` : "—"}
                                  </span>
                                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: pct >= 80 ? "#7A9A6A" : pct >= 50 ? "#C4A86A" : "rgba(244,240,234,0.3)", fontWeight: 600 }}>
                                    {pct}%
                                  </span>
                                </div>
                                {/* Month dots grid */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, paddingLeft: 22 }}>
                                  {h.dots.map((s, di) => (
                                    <div key={di} style={{
                                      width: 8, height: 8, borderRadius: "50%",
                                      background: dotColor(s),
                                      transition: "background 0.15s",
                                    }} />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  const HabitsCompact = () => {
                    if (!hasHabits) return null;
                    const hr = data.habitsRecap;
                    return (
                      <div style={{ ...compactLine, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>🔥</span>
                        <span style={compactVal}>{hr.habits.length} habits</span>
                        <span>·</span>
                        <span style={compactVal}>{hr.overallRate}%</span>
                        <span>completion</span>
                        {hr.overallBestStreak >= 3 && (
                          <>
                            <span>·</span>
                            <span style={{ ...compactVal, color: "#c4734f" }}>{hr.overallBestStreak}d</span>
                            <span>best</span>
                          </>
                        )}
                      </div>
                    );
                  };

                  /* ====== AUTO MODE — original layout ====== */
                  if (!hero) {
                    return (
                      <>
                        <TrainingFull />
                        {(hasTraining || data.trophies.length > 0 || data.upcoming) && (
                          <div style={{ height: 1, background: "rgba(244,240,234,0.06)", margin: "2px 0 14px" }} />
                        )}
                        <ReadingFull />
                        <PopCultureFull />
                        <TravelFull />
                        {hasHabits && (
                          <>
                            <div style={{ height: 1, background: "rgba(244,240,234,0.06)", margin: "2px 0 14px" }} />
                            <HabitsCompact />
                          </>
                        )}
                      </>
                    );
                  }

                  /* ====== HERO MODE — featured section + compact rest ====== */
                  const HeroSection = hero === "training" ? TrainingFull : hero === "reading" ? ReadingFull : hero === "popculture" ? PopCultureFull : hero === "habits" ? HabitsFull : hero === "travel" ? TravelFull : TrainingFull;
                  const compactSections = [
                    hero !== "training" && hasTraining ? <TrainingCompact key="tc" /> : null,
                    hero !== "reading" && hasReading ? <ReadingCompact key="rc" /> : null,
                    hero !== "popculture" && hasPopCulture ? <PopCultureCompact key="pc" /> : null,
                    hero !== "habits" && hasHabits ? <HabitsCompact key="hc" /> : null,
                    hero !== "travel" && hasTravel ? <TravelCompact key="trc" /> : null,
                  ].filter(Boolean);

                  return (
                    <>
                      <HeroSection />
                      {compactSections.length > 0 && (
                        <>
                          <div style={{ height: 1, background: "rgba(244,240,234,0.06)", margin: "4px 0 12px" }} />
                          {compactSections}
                        </>
                      )}
                    </>
                  );
                })()}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Footer */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.08em", color: "rgba(244,240,234,0.2)" }}>mymantl.app/{profile.username}</div>
                  <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c4734f", lineHeight: 1 }}>MANTL</div>
                </div>

              </div>
            </div>
            </div>{/* end glow border */}
          </div>

          {/* Actions */}
          <div className="recap-actions">
            <button className="recap-btn secondary" onClick={handleDownload} disabled={exporting}>
              {exporting ? "..." : "📥 Save Image"}
            </button>
            <button className="recap-btn primary" onClick={handleShare} disabled={exporting}>
              {exporting ? "..." : "📤 Share"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}


export default RecapScreen;

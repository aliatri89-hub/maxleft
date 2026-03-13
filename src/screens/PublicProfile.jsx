import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { COUNTRIES } from "../utils/countries";
import { sb } from "../utils/api";
import { formatDate } from "../utils/helpers";
import MantlPiece from "../components/shelf/MantlPiece";

const renderStars = (rating) => {
  if (!rating) return null;
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <>
      {"★".repeat(full)}
      {hasHalf && <span style={{ display: "inline-block", width: "0.55em", overflow: "hidden", verticalAlign: "top" }}>★</span>}
    </>
  );
};

function PublicProfile({ data, onSignIn, session, onToast }) {
  const { profile, shelves } = data;
  const [friendStatus, setFriendStatus] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [diaryShelf, setDiaryShelf] = useState(null);
  const [diaryView, setDiaryView] = useState("diary");
  const [diarySort, setDiarySort] = useState("date-desc");
  const [viewingItem, setViewingItem] = useState(null);
  const [activeSection, setActiveSection] = useState("shelves"); // "shelves" | "activity"
  const [reportingUser, setReportingUser] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const submitUserReport = async () => {
    if (!session || !reportReason.trim()) return;
    setSubmittingReport(true);
    await sb(supabase.from("reports").insert({
      reporter_id: session.user.id,
      reported_user_id: profile.id,
      reported_content_id: profile.id,
      reason: reportReason.trim(),
      context: `User profile: @${profile.username} — ${profile.name || ""} — bio: ${profile.bio || "(none)"}`,
    }), onToast, "Couldn't submit report");
    setSubmittingReport(false);
    setReportingUser(false);
    setReportReason("");
    if (onToast) onToast("Report submitted — thank you");
  };

  const blockProfileUser = async () => {
    if (!session) return;
    await sb(supabase.from("blocked_users").insert({ user_id: session.user.id, blocked_id: profile.id }), onToast, "Couldn't block");
    setReportingUser(false);
    if (onToast) onToast(`Blocked @${profile.username}`);
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  useEffect(() => {
    if (!session || !profile.id || session.user.id === profile.id) return;
    const checkFriendStatus = async () => {
      setFriendStatus("loading");
      const uid = session.user.id;
      const pid = profile.id;
      const { data: rows } = await supabase.from("friends")
        .select("status, requester_id, receiver_id")
        .or(`and(requester_id.eq.${uid},receiver_id.eq.${pid}),and(requester_id.eq.${pid},receiver_id.eq.${uid})`);
      if (!rows || rows.length === 0) { setFriendStatus("none"); return; }
      const row = rows[0];
      if (row.status === "accepted") { setFriendStatus("friends"); return; }
      if (row.status === "pending" && row.requester_id === uid) { setFriendStatus("pending_sent"); return; }
      if (row.status === "pending" && row.receiver_id === uid) { setFriendStatus("pending_received"); return; }
      setFriendStatus("none");
    };
    checkFriendStatus();
  }, [session, profile.id]);

  const sendFriendRequest = async () => {
    if (!session || friendActionLoading) return;
    setFriendActionLoading(true);
    const { error } = await supabase.from("friends").insert({ requester_id: session.user.id, receiver_id: profile.id, status: "pending" });
    if (!error) { setFriendStatus("pending_sent"); if (onToast) onToast("Friend request sent!"); }
    setFriendActionLoading(false);
  };

  const acceptFriendRequest = async () => {
    if (!session || friendActionLoading) return;
    setFriendActionLoading(true);
    await sb(supabase.from("friends").update({ status: "accepted" }).eq("requester_id", profile.id).eq("receiver_id", session.user.id), onToast, "Couldn't update");
    setFriendStatus("friends");
    if (onToast) onToast("You're now friends!");
    setFriendActionLoading(false);
  };

  const shelfConfigs = {
    books: { icon: "📖", label: "Bookshelf" },
    movies: { icon: "🎬", label: "Films" },
    shows: { icon: "📺", label: "Shows" },
    games: { icon: "🎮", label: "Games" },
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Activity feed helpers
  const actionLabel = (item) => {
    if (item.activity_type === "habits") return item.action || "started tracking";
    if (item.activity_type === "strava") {
      const a = (item.action || "").toLowerCase();
      const sportVerbs = { "run": "went running", "ride": "went cycling", "swim": "went swimming", "walk": "went walking", "hike": "went hiking", "alpine ski": "went skiing", "snowboard": "went snowboarding", "workout": "worked out", "weight training": "hit the weights", "yoga": "did yoga" };
      return sportVerbs[a] || (a ? `went ${a}ing` : "worked out");
    }
    if (item.activity_type === "streak") return item.action || "hit a streak";
    if (item.activity_type === "book") {
      if (item.action === "finished") return "finished reading";
      if (item.action === "started" || item.action === "reading") return "started reading";
      if (item.action === "progress") return "is reading";
      return "shelved";
    }
    if (item.activity_type === "movie") return "watched";
    if (item.activity_type === "show") return "finished watching";
    if (item.activity_type === "game") return item.action === "finished" ? "completed" : "is playing";
    if (item.activity_type === "event") { if (item.action === "countdown_day") return "is up tomorrow for"; if (item.action === "countdown_week") return "is 1 week out from"; if (item.action === "countdown_month") return "is training for"; return "completed"; }
    return item.action || "shared";
  };

  // Resolve pinned mantl items
  const pins = profile.mantlPins || [];
  const allItems = [
    ...(shelves.books || []).map(b => ({ ...b, _pinType: "book" })),
    ...(shelves.movies || []).map(m => ({ ...m, _pinType: "movie" })),
    ...(shelves.shows || []).map(s => ({ ...s, _pinType: "show" })),
    ...(shelves.games || []).map(g => ({ ...g, _pinType: "game" })),
    ...(shelves.trophies || []).map(t => ({ ...t, _pinType: "trophy" })),
    ...(shelves.goals || []).map(g => ({ ...g, _pinType: "goal" })),
    ...(shelves.countries || []).map(c => ({ ...c, _pinType: "country", title: c.countryName, cover: c.photoUrl })),
  ];
  const pinnedItems = pins.map(pin => {
    const found = allItems.find(it => it._pinType === pin.type && String(it.id) === String(pin.id));
    return found || null;
  }).filter(Boolean);

  // Diary overlay
  const renderDiary = () => {
    if (!diaryShelf) return null;
    const cfg = shelfConfigs[diaryShelf];
    const items = shelves[diaryShelf] || [];
    if (items.length === 0) return null;

    const isGame = diaryShelf === "games";
    let sortedGroups;

    if (isGame) {
      const playing = items.filter(i => i.status === "playing" || i.isPlaying);
      const backlog = items.filter(i => i.status === "completed" || (!i.isPlaying && i.status !== "beat" && i.status !== "playing"));
      const beat = items.filter(i => i.status === "beat");
      const byPlaytime = (a, b) => {
        const hA = parseFloat((a.notes || "").match(/^([\d.]+)h/)?.[1] || "0");
        const hB = parseFloat((b.notes || "").match(/^([\d.]+)h/)?.[1] || "0");
        return hB - hA;
      };
      sortedGroups = [
        ...(playing.length > 0 ? [{ label: `🎮 Now Playing · ${playing.length}`, items: playing.sort(byPlaytime).map(i => ({ ...i, _date: i.createdAt ? new Date(i.createdAt) : null })) }] : []),
        ...(backlog.length > 0 ? [{ label: `📋 Backlog · ${backlog.length}`, items: backlog.sort(byPlaytime).map(i => ({ ...i, _date: i.createdAt ? new Date(i.createdAt) : null })) }] : []),
        ...(beat.length > 0 ? [{ label: `✅ Beat · ${beat.length}`, items: beat.sort(byPlaytime).map(i => ({ ...i, _date: i.createdAt ? new Date(i.createdAt) : null })) }] : []),
      ];
    } else if (diarySort === "rating" || diarySort === "rating-asc") {
      const isAsc = diarySort === "rating-asc";
      const grouped = {};
      const unrated = [];
      items.forEach(item => {
        const r = item.rating > 0 ? Math.round(item.rating) : 0;
        const dateStr = item.watchedAt || item.finishedAt || item.createdAt || item.completedAt;
        const enriched = { ...item, _date: dateStr ? new Date(dateStr) : null };
        if (r === 0) { unrated.push(enriched); return; }
        const key = isAsc ? `${r}` : `${5 - r}`;
        const label = `${"★".repeat(r)} · ${r} star${r !== 1 ? "s" : ""}`;
        if (!grouped[key]) grouped[key] = { label, items: [] };
        grouped[key].items.push(enriched);
      });
      sortedGroups = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, g]) => ({ ...g, items: g.items.sort((a, b) => (b._date || 0) - (a._date || 0)) }));
    } else {
      const grouped = {};
      items.forEach(item => {
        const dateStr = item.watchedAt || item.finishedAt || item.createdAt || item.completedAt;
        const d = dateStr ? new Date(dateStr) : null;
        const key = d ? `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}` : "undated";
        const label = d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "Undated";
        if (!grouped[key]) grouped[key] = { label, items: [] };
        grouped[key].items.push({ ...item, _date: d });
      });
      const dateAsc = diarySort === "date-asc";
      const undatedGroup = grouped["undated"];
      delete grouped["undated"];
      sortedGroups = Object.entries(grouped)
        .sort(([a], [b]) => dateAsc ? a.localeCompare(b) : b.localeCompare(a))
        .map(([, g]) => ({ ...g, items: g.items.sort((a, b) => dateAsc ? (a._date || Infinity) - (b._date || Infinity) : (b._date || 0) - (a._date || 0)) }));
      if (undatedGroup) sortedGroups.push(undatedGroup);
    }

    return (
      <div className="item-detail-overlay" onClick={(e) => e.target === e.currentTarget && setDiaryShelf(null)}>
        <div className="item-detail-sheet" style={{ maxHeight: "92vh" }}>
          <div className="modal-handle" />
          <button className="item-detail-close" onClick={() => setDiaryShelf(null)}>← Close</button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div className="bb" style={{ fontSize: 20 }}>{cfg?.icon} {cfg?.label}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                {items.length} total
                {isGame && (() => {
                  const beat = items.filter(i => i.status === "beat").length;
                  const bl = items.filter(i => i.status !== "beat").length;
                  return beat > 0 || bl > 0 ? ` · ${beat} beat · ${bl} to go` : "";
                })()}
              </div>
            </div>
            <div style={{ display: "flex", background: "var(--bg-elevated)", borderRadius: 8, overflow: "hidden" }}>
              <button className="mono" onClick={() => setDiaryView("diary")}
                style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                  background: diaryView === "diary" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: diaryView === "diary" ? "var(--text-primary)" : "var(--text-muted)" }}>
                {isGame ? "List" : "Diary"}
              </button>
              <button className="mono" onClick={() => setDiaryView("grid")}
                style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                  background: diaryView === "grid" ? "rgba(255,255,255,0.1)" : "transparent",
                  color: diaryView === "grid" ? "var(--text-primary)" : "var(--text-muted)" }}>
                Grid
              </button>
            </div>
          </div>

          {/* Sort controls */}
          {!isGame && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { key: "date-desc", label: "Newest" },
                { key: "date-asc", label: "Oldest" },
                { key: "rating", label: "★ Highest" },
                    { key: "rating-asc", label: "★ Lowest" },
              ].map(s => (
                <button key={s.key} className="mono" onClick={() => setDiarySort(s.key)}
                  style={{
                    padding: "5px 12px", fontSize: 10, border: "1px solid var(--border-subtle)", borderRadius: 20, cursor: "pointer",
                    background: diarySort === s.key ? "rgba(255,255,255,0.1)" : "transparent",
                    color: diarySort === s.key ? "var(--text-primary)" : "var(--text-muted)",
                    borderColor: diarySort === s.key ? "var(--border-medium)" : "var(--border-subtle)",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {diaryView === "grid" && (() => {
            let gridItems = isGame ? items : [...items];
            if (!isGame) {
              if (diarySort === "rating" || diarySort === "rating-asc") {
                gridItems = gridItems.filter(i => i.rating > 0);
                gridItems.sort((a, b) => diarySort === "rating-asc" ? (a.rating || 0) - (b.rating || 0) : (b.rating || 0) - (a.rating || 0));
              } else {
                gridItems.sort((a, b) => {
                  const dA = new Date(a.watchedAt || a.finishedAt || a.createdAt || a.completedAt || 0);
                  const dB = new Date(b.watchedAt || b.finishedAt || b.createdAt || b.completedAt || 0);
                  return diarySort === "date-asc" ? dA - dB : dB - dA;
                });
              }
            }
            return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingBottom: 20 }}>
              {gridItems.map((item, i) => (
                <div key={i} style={{ cursor: "pointer", position: "relative" }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                  <div style={{
                    aspectRatio: "2/3", borderRadius: 6, overflow: "hidden",
                    background: item.cover ? `url(${item.cover}) center/cover` : "var(--bg-elevated)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: isGame && item.status === "beat" ? 0.5 : 1,
                  }}>
                    {!item.cover && <span style={{ fontSize: 24 }}>{cfg?.icon}</span>}
                  </div>
                  {isGame && item.status === "beat" && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%", background: "var(--accent-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, color: "white" }}>✓</span>
                    </div>
                  )}
                  {item.rating > 0 && <div style={{ fontSize: 10, color: "var(--accent-terra)", marginTop: 3, letterSpacing: 1 }}>{renderStars(item.rating)}</div>}
                </div>
              ))}
            </div>
            );
          })()}

          {diaryView === "diary" && (
            <div style={{ paddingBottom: 20 }}>
              {sortedGroups.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 20 }}>
                  <div className="bb" style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.04em" }}>
                    {group.label}
                  </div>
                  {group.items.map((item, i) => {
                    const day = item._date ? item._date.getDate() : null;
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                        borderBottom: "1px solid var(--border-subtle)", cursor: "pointer",
                        opacity: isGame && item.status === "beat" ? 0.65 : 1,
                      }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                        {isGame ? (
                          <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: item.status === "beat" ? "var(--accent-green)" : "var(--bg-elevated)",
                            border: item.status === "beat" ? "none" : "2px solid var(--border-subtle)",
                          }}>
                            {item.status === "beat" ? <span style={{ fontSize: 14, color: "white" }}>✓</span> : ""}
                          </div>
                        ) : (
                          <div className="mono" style={{ width: 28, fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textAlign: "center", flexShrink: 0 }}>
                            {day || "—"}
                          </div>
                        )}
                        <div style={{
                          width: 36, height: 54, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                          background: item.cover ? `url(${item.cover}) center/cover` : "var(--bg-elevated)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {!item.cover && <span style={{ fontSize: 14 }}>{cfg?.icon}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isGame && item.status === "beat" ? "line-through" : "none" }}>
                            {item.title}
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                            {isGame ? (item.notes || item.platform || "") : `${item.director || item.author || ""}${item.year ? ` · ${item.year}` : ""}`}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          {item.rating > 0 && <div style={{ fontSize: 11, color: "var(--accent-terra)", letterSpacing: 1 }}>{renderStars(item.rating)}</div>}
                          {item.source === "letterboxd" && (
                            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end", marginTop: 2 }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E054" }} />
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#40BCF4" }} />
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF8000" }} />
                            </div>
                          )}
                          {isGame && item.status === "beat" && <div className="mono" style={{ fontSize: 9, color: "var(--accent-green)", marginTop: 2 }}>BEAT</div>}
                          {isGame && item.isPlaying && <div className="mono" style={{ fontSize: 9, color: "var(--accent-terra)", marginTop: 2 }}>PLAYING</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Item detail sheet (read-only)
  const renderItemDetail = () => {
    if (!viewingItem) return null;
    return (
      <div className="item-detail-overlay" onClick={(e) => e.target === e.currentTarget && setViewingItem(null)}>
        <div className="item-detail-sheet" style={{ maxHeight: "85vh" }}>
          <div className="modal-handle" />
          <button className="item-detail-close" onClick={() => setViewingItem(null)}>← Close</button>

          <div className="item-detail-top">
            {viewingItem.cover ? (
              <div className="item-detail-cover" style={{ backgroundImage: `url(${viewingItem.cover})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            ) : (
              <div className="item-detail-cover" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-elevated)", fontSize: 32 }}>
                {(shelfConfigs[viewingItem.shelfType]?.icon || "📦")}
              </div>
            )}
            <div className="item-detail-meta">
              <div className="item-detail-title">{viewingItem.title}</div>
              {(viewingItem.author || viewingItem.director) && (
                <div className="item-detail-author">{viewingItem.author || viewingItem.director}</div>
              )}
              {viewingItem.platform && <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{viewingItem.platform}</div>}
              {viewingItem.year && <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{viewingItem.year}</div>}
            </div>
          </div>

          {/* Rating */}
          {viewingItem.rating > 0 && (
            <div style={{ margin: "16px 0", textAlign: "center" }}>
              <div style={{ fontSize: 20, letterSpacing: 2, color: "var(--accent-terra)" }}>{renderStars(viewingItem.rating)}</div>
            </div>
          )}

          {/* Game status */}
          {viewingItem.shelfType === "games" && (
            <div style={{ margin: "12px 0" }}>
              <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: viewingItem.status === "playing" ? "linear-gradient(135deg, #4a6fa5, #3a5a8a)" : viewingItem.status === "beat" ? "var(--accent-green)" : "var(--bg-elevated)",
                color: viewingItem.status === "playing" || viewingItem.status === "beat" ? "white" : "var(--text-muted)",
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em",
              }}>
                {viewingItem.status === "playing" ? "🎮 Playing" : viewingItem.status === "beat" ? "✓ Beat" : "📋 Backlog"}
              </div>
            </div>
          )}

          {/* Notes/playtime */}
          {viewingItem.notes && (
            <div style={{ margin: "12px 0" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--accent-terra)", letterSpacing: "0.1em", marginBottom: 6 }}>NOTES</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, padding: "12px 16px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                {viewingItem.notes}
              </div>
            </div>
          )}

          {/* Source badge */}
          {viewingItem.source === "letterboxd" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginTop: 8 }}>
              <span style={{ display: "flex", gap: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E054" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#40BCF4" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF8000" }} />
              </span>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>via Letterboxd</span>
            </div>
          )}
          {viewingItem.source === "steam" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, marginTop: 8 }}>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>🎮 via Steam</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Feed activity items
  const feedItems = shelves.feedItems || [];

  return (
    <div className="public-profile" style={{ background: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <div className="public-header" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="public-brand" onClick={() => { window.location.href = "/"; }} style={{ cursor: "pointer", color: "var(--text-primary)" }}>MANTL</div>
        <div className="header-tagline" style={{ textAlign: "center", color: "var(--text-muted)" }}>Shelf what you're made of</div>
      </div>

      {/* Profile card */}
      <div className="profile-hero" style={{ marginBottom: 20, background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
        {profile.locationImage && <div className="profile-hero-bg" style={{ backgroundImage: `url(${profile.locationImage})`, filter: "brightness(0.55)" }} />}
        <div className={`profile-hero-overlay${profile.locationImage ? " has-bg" : ""}`} style={{ color: "var(--text-primary)" }}>
          <div className="profile-hero-row">
            <div className="profile-avatar" style={{ background: "var(--bg-elevated)", border: "2px solid var(--border-medium)" }}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : (profile.avatar || "👤")}
            </div>
            <div style={{ flex: 1 }}>
              <div className="profile-hero-name" style={{ color: "var(--text-primary)" }}>@{profile.username}</div>
              {profile.location && <div className="profile-hero-location" style={{ color: "var(--text-muted)" }}>📍 {profile.location}</div>}
            </div>
            {session && session.user.id !== profile.id && (
              <div onClick={() => { setReportingUser(true); setReportReason(""); }}
                style={{ padding: "4px 8px", cursor: "pointer", fontSize: 16, color: "var(--text-faint)", alignSelf: "flex-start" }}>
                •••
              </div>
            )}
          </div>
          {profile.bio && <div className="profile-hero-bio" style={{ color: "var(--text-secondary)" }}>{profile.bio}</div>}

          {/* Stats row */}
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12, padding: "10px 0" }}>
            {(shelves.books || []).length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{(shelves.books || []).length}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>books</div>
              </div>
            )}
            {(shelves.movies || []).length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{(shelves.movies || []).length}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>films</div>
              </div>
            )}
            {(shelves.shows || []).length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{(shelves.shows || []).length}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>shows</div>
              </div>
            )}
            {(shelves.games || []).length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{(shelves.games || []).length}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>games</div>
              </div>
            )}
            {(shelves.trophies || []).length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{(shelves.trophies || []).length}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>events</div>
              </div>
            )}
            {(shelves.countries?.filter(c => c.status === "been") || []).length > 0 && (
              <div style={{ textAlign: "center" }}>
                <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{shelves.countries.filter(c => c.status === "been").length}</div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>countries</div>
              </div>
            )}
          </div>

          {/* Friend buttons */}
          {session && session.user.id !== profile.id && friendStatus && friendStatus !== "loading" && (
            <div style={{ marginTop: 8 }}>
              {friendStatus === "none" && <button className="btn-shelf-it" style={{ width: "100%", padding: "10px 0", fontSize: 13 }} onClick={sendFriendRequest} disabled={friendActionLoading}>{friendActionLoading ? "Sending..." : "＋ Add Friend"}</button>}
              {friendStatus === "pending_sent" && <div style={{ textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text-faint)", padding: "10px 0", border: "1px solid var(--border-subtle)", borderRadius: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>✓ Request Sent</div>}
              {friendStatus === "pending_received" && <button className="btn-shelf-it" style={{ width: "100%", padding: "10px 0", fontSize: 13 }} onClick={acceptFriendRequest} disabled={friendActionLoading}>{friendActionLoading ? "Accepting..." : "Accept Friend Request"}</button>}
              {friendStatus === "friends" && <div style={{ textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--accent-green)", padding: "10px 0", border: "1px solid var(--accent-green)", borderRadius: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>✓ Friends</div>}
            </div>
          )}
          {!session && (
            <div style={{ marginTop: 8 }}>
              <button className="btn-shelf-it" style={{ width: "100%", padding: "10px 0", fontSize: 13 }} onClick={onSignIn}>Sign in to add friend</button>
            </div>
          )}
        </div>
      </div>

      {/* Section tabs: Shelves | Activity */}
      <div style={{ display: "flex", background: "var(--bg-card)", borderRadius: 10, overflow: "hidden", margin: "0 0 20px 0", border: "1px solid var(--border-subtle)" }}>
        <button className="mono" onClick={() => setActiveSection("shelves")}
          style={{ flex: 1, padding: "10px 0", fontSize: 11, border: "none", cursor: "pointer", letterSpacing: "0.06em",
            background: activeSection === "shelves" ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeSection === "shelves" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
          Shelves
        </button>
        <button className="mono" onClick={() => setActiveSection("activity")}
          style={{ flex: 1, padding: "10px 0", fontSize: 11, border: "none", cursor: "pointer", letterSpacing: "0.06em",
            background: activeSection === "activity" ? "rgba(255,255,255,0.1)" : "transparent",
            color: activeSection === "activity" ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
          Activity
        </button>
      </div>

      {activeSection === "shelves" && (
        <>
          {/* The Mantl — tap-through exhibition */}
          {pinnedItems.length > 0 && (
            <MantlPiece
              profile={profile} shelves={shelves} shelvesLoaded={true}
              onViewItem={(item) => setViewingItem(item)}
              onViewCountry={() => {}}
            />
          )}

          {/* Training For */}
          {shelves.goals?.length > 0 && (
            <div className="shelf-section">
              <div className="shelf-label-row"><div className="shelf-label">🏁 Training For <span className="shelf-count">{shelves.goals.length}</span></div></div>
              <div className="event-cards">
                {shelves.goals.map((item, i) => (
                  <div className="event-card" key={i} style={!item.locationImage ? { background: "var(--bg-card)", border: "1px solid var(--border-subtle)" } : {}}>
                    {item.locationImage ? <div className="event-card-bg" style={{ backgroundImage: `url(${item.locationImage})` }} /> : <div className="event-card-bg-fallback ondeck-bg">{item.emoji || "🎯"}</div>}
                    <div className={`event-card-content${item.locationImage ? " has-image" : ""}`}>
                      <div className="event-card-title">{item.title}</div>
                      {item.location && <div className="event-card-detail">{item.location}</div>}
                      {item.targetDate && <div className="event-card-date">{formatDate(item.targetDate)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trophy Case */}
          {shelves.trophies?.length > 0 && (
            <div className="shelf-section">
              <div className="shelf-label-row"><div className="shelf-label">🏆 Trophy Case <span className="shelf-count">{shelves.trophies.length}</span></div></div>
              <div className="event-cards">
                {shelves.trophies.map((item, i) => (
                  <div className="event-card" key={i} style={!item.locationImage ? { background: "var(--bg-card)", border: "1px solid var(--border-subtle)" } : {}}>
                    {item.locationImage ? <div className="event-card-bg" style={{ backgroundImage: `url(${item.locationImage})` }} /> : <div className="event-card-bg-fallback trophy-bg">{item.emoji || "🏆"}</div>}
                    <div className={`event-card-content${item.locationImage ? " has-image" : ""}`}>
                      <div className="event-card-title">{item.title}</div>
                      {item.result && <div className="event-card-detail">{item.result}</div>}
                      {item.location && <div className="event-card-detail">{item.location}</div>}
                      {item.completedAt && <div className="event-card-date">{formatDate(item.completedAt)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passport */}
          {(shelves.countries?.filter(c => c.status === "been").length > 0 || profile.homeCountry) && (
            <div className="shelf-section">
              <div className="shelf-label-row">
                <div className="shelf-label">🌍 Passport {shelves.countries?.filter(c => c.status === "been").length > 0 && <span className="shelf-count">{shelves.countries.filter(c => c.status === "been").length} {shelves.countries.filter(c => c.status === "been").length === 1 ? "country" : "countries"}</span>}</div>
              </div>
              <div className="shelf-surface">
                {profile.homeCountry && (() => {
                  const hc = COUNTRIES.find(c => c.code === profile.homeCountry);
                  if (!hc) return null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", marginBottom: 8 }}>
                      <img src={`https://flagcdn.com/w40/${profile.homeCountry.toLowerCase()}.png`} alt="" style={{ width: 24, height: 17, objectFit: "cover", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 13, color: "var(--text-primary)", letterSpacing: "0.02em" }}>{hc.name}</span>
                      <span style={{ color: "var(--text-faint)", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em", textTransform: "uppercase" }}>Issued in</span>
                    </div>
                  );
                })()}
                {shelves.countries?.filter(c => c.status === "been").length > 0 && (() => {
                  const visited = shelves.countries.filter(c => c.status === "been")
                    .sort((a, b) => { const aY = a.visitYear || 0, bY = b.visitYear || 0; if (aY && bY) { if (bY !== aY) return bY - aY; return (b.visitMonth || 0) - (a.visitMonth || 0); } if (aY !== bY) return bY - aY; return a.countryName.localeCompare(b.countryName); });
                  return (
                    <>
                      {visited.length > 4 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase", padding: "0 4px 6px" }}>Last visited</div>}
                      <div className="passport-list">
                        {visited.slice(0, 8).map((c, i) => (
                          <div className="passport-row" key={c.id || i}>
                            <img src={`https://flagcdn.com/w80/${c.countryCode.toLowerCase()}.png`} alt="" className="passport-row-flag" />
                            <div className="passport-row-name">{c.countryName}</div>
                            {c.visitYear && <div className="passport-row-year">{c.visitYear}</div>}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Shelves — capped at 8 with See All */}
          {Object.entries(shelfConfigs).map(([key, cfg]) => {
            const items = shelves[key] || [];
            if (items.length === 0) return null;
            const display = items.slice(0, 8);
            return (
              <div className="shelf-section" key={key}>
                <div className="shelf-label-row">
                  <div className="shelf-label">{cfg.icon} {cfg.label} <span className="shelf-count">{items.length}</span></div>
                </div>
                <div className="shelf-surface">
                  <div className="shelf-items">
                    {display.map((item, i) => (
                      <div className="shelf-item" key={i} style={{ cursor: "pointer" }} onClick={() => setViewingItem({ ...item, shelfType: key })}>
                        <div className="shelf-item-cover" style={item.cover ? { backgroundImage: `url(${item.cover})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
                        <div className="shelf-item-title">{item.title}</div>
                        {item.isReading ? (
                          <>
                            <div className="shelf-item-reading-tag">Reading</div>
                            {item.totalPages > 0 && <div className="shelf-item-progress"><div className="shelf-item-progress-fill" style={{ width: `${Math.min(100, ((item.currentPage || 0) / item.totalPages) * 100)}%` }} /></div>}
                          </>
                        ) : item.isWatching ? (
                          <div className="shelf-item-reading-tag">S{item.currentSeason}E{item.currentEpisode}</div>
                        ) : item.isPlaying ? (
                          <div className="shelf-item-reading-tag" style={{ background: "linear-gradient(135deg, #4a6fa5, #3a5a8a)", color: "white", fontWeight: 700, letterSpacing: "0.06em" }}>🎮 Playing</div>
                        ) : item.isBeat ? (
                          <div className="shelf-item-reading-tag" style={{ background: "var(--accent-green)", color: "white", fontWeight: 700, letterSpacing: "0.06em" }}>✓ Beat</div>
                        ) : item.source === "steam" && item.status === "completed" ? (
                          <div className="shelf-item-reading-tag" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", fontSize: 8 }}>Backlog</div>
                        ) : item.rating ? (
                          <div className="shelf-item-stars">{renderStars(item.rating)}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="mono" onClick={() => setDiaryShelf(key)}
                    style={{ textAlign: "center", fontSize: 11, color: "var(--accent-terra)", cursor: "pointer", paddingTop: 10, letterSpacing: "0.03em" }}>
                    {items.length > 8 ? `See all ${items.length}` : (key === "games" ? "All Games" : "Diary")} →
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Activity tab */}
      {activeSection === "activity" && (
        <div style={{ padding: "0 4px" }}>
          {feedItems.length === 0 ? (
            <div className="mono" style={{ textAlign: "center", color: "var(--text-faint)", padding: "40px 0", fontSize: 12 }}>
              No recent activity
            </div>
          ) : (
            feedItems.map((item, i) => (
              <div key={item.id || i} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div className="feed-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>
                    {item.userAvatar ? <img src={item.userAvatar} alt="" /> : (item.userAvatarEmoji || "👤")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="feed-action-text" style={{ flex: 1, fontSize: 13 }}>
                        <strong>{item.userName || profile.username}</strong>{" "}{actionLabel(item)}
                      </div>
                      <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)", flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
                    </div>
                    {/* Item card */}
                    {(item.item_title || item.item_cover) && (
                      <div style={{ display: "flex", gap: 10, marginTop: 8, padding: "10px", background: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                        {item.item_cover && (
                          <div style={{ width: 40, height: 60, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: `url(${item.item_cover}) center/cover` }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.item_title || item.title}</div>
                          {item.item_author && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{item.item_author}{item.item_year ? ` · ${item.item_year}` : ""}</div>}
                          {item.rating > 0 && <div style={{ fontSize: 11, color: "var(--accent-terra)", marginTop: 2 }}>{renderStars(item.rating)}</div>}
                          {item.metadata?.source === "steam" && item.metadata?.playtime_total > 0 && (
                            <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>
                              🕐 {item.metadata.playtime_total}h total
                              {item.metadata.playtime_2weeks > 0 ? ` · 📅 ${item.metadata.playtime_2weeks}h this week` : ""}
                              {item.metadata.achievements_total > 0 ? ` · 🏆 ${item.metadata.achievements_earned}/${item.metadata.achievements_total}` : ""}
                            </div>
                          )}
                          {item.metadata?.source === "letterboxd" && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                              <span style={{ display: "flex", gap: 2 }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E054" }} />
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#40BCF4" }} />
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF8000" }} />
                              </span>
                              <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>via Letterboxd</span>
                            </div>
                          )}
                          {item.metadata?.source === "steam" && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                              <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>🎮 via Steam</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Streak card */}
                    {item.activity_type === "streak" && (
                      <div style={{ marginTop: 8, padding: "12px 16px", background: "var(--bg-card)", borderRadius: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: "var(--accent-gold)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.04em" }}>
                          🔥 {item.item_title || item.title}
                        </div>
                      </div>
                    )}
                 
                    {item.activity_type === "strava" && item.metadata && (
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4, display: "flex", gap: 12 }}>
                        {item.metadata.distance && <span>📏 {(item.metadata.distance / 1000).toFixed(1)}km</span>}
                        {item.metadata.moving_time && <span>⏱ {Math.floor(item.metadata.moving_time / 60)}m</span>}
                        {item.metadata.elevation && <span>⛰ {Math.round(item.metadata.elevation)}m</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CTA */}
      <div className="public-cta">
        <div className="public-cta-line" />
        <div className="public-cta-inner">
          <div className="public-cta-brand">MANTL</div>
          <div className="public-cta-tagline">Shelf what you're made of.</div>
          <div className="public-cta-sub">Track what you read, watch, play, and do — all in one place.</div>
          <button className="public-cta-btn" onClick={onSignIn}>Join Mantl</button>
        </div>
        <div className="public-cta-footer">mymantl.app</div>
      </div>

      {/* Diary overlay */}
      {renderDiary()}

      {/* Item detail overlay (read-only) */}
      {renderItemDetail()}

      {/* Report User Modal */}
      {reportingUser && (
        <div className="overlay" onClick={() => setReportingUser(false)}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Report User</div>
              <div className="pin-picker-close" onClick={() => setReportingUser(false)}>✕</div>
            </div>
            <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-faint)" }}>
                Reporting <strong>@{profile.username}</strong>
              </div>
              <div>
                <div className="event-form-label">What's the issue?</div>
                {["Inappropriate username", "Inappropriate bio or content", "Spam", "Harassment", "Other"].map(reason => (
                  <div
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    style={{
                      padding: "10px 14px", marginBottom: 6, borderRadius: 8, cursor: "pointer",
                      border: reportReason === reason ? "2px solid var(--accent-green)" : "1px solid var(--border-subtle)",
                      background: reportReason === reason ? "rgba(74,222,128,0.08)" : "var(--bg-input)",
                      fontSize: 14, fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >{reason}</div>
                ))}
              </div>
              <button
                className="btn-shelf-it"
                disabled={!reportReason || submittingReport}
                onClick={submitUserReport}
              >
                {submittingReport ? "Submitting..." : "Submit Report"}
              </button>
              <div
                style={{ textAlign: "center", fontSize: 12, color: "var(--accent-red)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}
                onClick={blockProfileUser}
              >Block this user</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default PublicProfile;

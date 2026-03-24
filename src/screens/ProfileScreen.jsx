import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";

import { sb } from "../utils/api";
import InitialAvatar from "../components/InitialAvatar";
import ImportCSVModal from "../components/ImportCSVModal";

/** Smooth expand/collapse wrapper using CSS grid trick */
function Expandable({ open, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateRows: open ? "1fr" : "0fr",
      opacity: open ? 1 : 0,
      transition: "grid-template-rows 0.3s cubic-bezier(0.2,0.9,0.3,1), opacity 0.25s ease",
    }}>
      <div style={{ overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function ProfileScreen({ profile, shelves, onBack, onSignOut, onDeleteAccount, session, onUpdateAvatar, onUpdateProfile, onToast, initialView, pushNav, removeNav, onLetterboxdConnect, onLetterboxdDisconnect, onLetterboxdSync, letterboxdSyncing, onGoodreadsConnect, onGoodreadsDisconnect, onGoodreadsSync, goodreadsSyncing, onSteamConnect, onSteamDisconnect, onSteamSync, steamSyncing, onImportComplete, communitySubscriptions, onSubscribe, onUnsubscribe, favoritePodcasts, onToggleFavoritePodcast }) {
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [expandedListType, setExpandedListType] = useState(null);
  const [editName, setEditName] = useState(profile.name || "");
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [letterboxdOpen, setLetterboxdOpen] = useState(false);
  const [lbUsernameInput, setLbUsernameInput] = useState(profile.letterboxd_username || "");
  const [goodreadsOpen, setGoodreadsOpen] = useState(false);
  const [grUserIdInput, setGrUserIdInput] = useState(profile.goodreads_user_id || "");
  const [steamOpen, setSteamOpen] = useState(false);
  const [steamIdInput, setSteamIdInput] = useState(profile.steam_id || "");
  const [syncOpen, setSyncOpen] = useState(false);
  const [podcastsOpen, setPodcastsOpen] = useState(false);
  const [allPodcasts, setAllPodcasts] = useState([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);
  const fileRef = useRef(null);

  // ── Notification preferences ──
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ new_coverage: true, favorites_only: false });
  const [notifLoaded, setNotifLoaded] = useState(false);

  useEffect(() => {
    if (!notifOpen || notifLoaded) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_notification_preferences")
        .select("new_coverage, favorites_only")
        .eq("user_id", session?.user?.id)
        .maybeSingle();
      if (!cancelled) {
        if (data) setNotifPrefs({ new_coverage: data.new_coverage, favorites_only: data.favorites_only });
        setNotifLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [notifOpen, notifLoaded, session?.user?.id]);

  const updateNotifPref = async (key, value) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    const { error } = await supabase
      .from("user_notification_preferences")
      .upsert({
        user_id: session?.user?.id,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (error) {
      console.error("Failed to update notification pref:", error);
      setNotifPrefs(notifPrefs); // revert
    }
  };

  // ── Load podcasts for favorite picker ──
  useEffect(() => {
    if (!podcastsOpen || allPodcasts.length > 0) return;
    let cancelled = false;

    (async () => {
      setLoadingPodcasts(true);
      const { data, error } = await supabase
        .from("podcasts")
        .select("id, name, slug, artwork_url, tier, community_page_id")
        .eq("active", true)
        .order("name", { ascending: true });

      if (!cancelled && !error) {
        // Sort: deep-dive pods first, then alphabetical
        const sorted = (data || []).sort((a, b) => {
          if (a.tier === "deep" && b.tier !== "deep") return -1;
          if (a.tier !== "deep" && b.tier === "deep") return 1;
          return a.name.localeCompare(b.name);
        });
        setAllPodcasts(sorted);
      }
      if (!cancelled) setLoadingPodcasts(false);
    })();

    return () => { cancelled = true; };
  }, [podcastsOpen]);


  const handleSaveName = async () => {
    if (!session || !editName.trim()) return;
    setSavingProfile(true);
    try {
      await supabase.from("profiles").update({ name: editName.trim() }).eq("id", session.user.id);
      if (onUpdateProfile) onUpdateProfile({ name: editName.trim() });
      setEditingName(false);
      onToast("Name updated!");
    } catch (e) {
      console.error("Save name error:", e);
    }
    setSavingProfile(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${session.user.id}/avatar.${ext}`;

      // Upload to Supabase Storage (bucket: "avatars")
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache bust

      // Update profile
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", session.user.id);

      if (onUpdateAvatar) onUpdateAvatar(publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      onToast("Upload failed — please try again");
    }
    setUploading(false);
  };

  const loadWishlist = async () => {
    if (!session) return;
    const { data } = await supabase.from("wishlist").select("*")
      .eq("user_id", session.user.id).order("created_at", { ascending: false });
    setWishlist(data || []);
  };

  const removeFromWishlist = async (id) => {
    await sb(supabase.from("wishlist").delete().eq("id", id), onToast, "Couldn't delete");
    setWishlist(prev => prev.filter(w => w.id !== id));
    onToast("Removed from list");
  };

  return (
    <div className="profile-screen" style={{ paddingBottom: 40 }}>
      <div className="profile-screen-header">
        <button className="profile-back" onClick={onBack}>← Back</button>
      </div>

      {/* ── Avatar + Identity ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="avatar-upload-wrap" onClick={() => fileRef.current?.click()}>
          <div className="profile-big-avatar">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <InitialAvatar username={profile.username} size={80} />}
            {uploading && (
              <div className="avatar-uploading"><div className="save-spinner" style={{ borderTopColor: "white" }} /></div>
            )}
          </div>
          <div className="avatar-upload-overlay" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em" }}>Edit</div>
          <input ref={fileRef} className="avatar-upload-input" type="file" accept="image/*" onChange={handleUpload} />
        </div>

        {/* Tap-to-edit name */}
        {editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setEditName(profile.name || ""); } }}
              style={{
                fontFamily: "'Permanent Marker', cursive", fontWeight: 400, fontSize: 20,
                color: "#EF9F27", background: "rgba(255,255,255,0.06)",
                border: "1px solid #EF9F2740", borderRadius: 8,
                padding: "6px 12px", outline: "none", textAlign: "center",
                width: 180,
              }}
            />
            <button
              onClick={handleSaveName}
              disabled={savingProfile}
              style={{
                padding: "6px 12px", border: "none", borderRadius: 6,
                background: "#EF9F27", color: "var(--bg-card, #0f0d0b)",
                fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em",
              }}
            >
              {savingProfile ? "..." : "Save"}
            </button>
          </div>
        ) : (
          <div
            className="profile-big-name"
            onClick={() => setEditingName(true)}
            style={{ cursor: "pointer", fontFamily: "'Permanent Marker', cursive", color: "#EF9F27" }}
            title="Tap to edit name"
          >
            {profile.name}
          </div>
        )}

        <div className="profile-big-handle">@{profile.username}</div>
      </div>

      {/* ── LIBRARY GROUP ── */}
      <div className="profile-group">
        <div className="profile-group-label">Library</div>
        <div className="profile-group-card">
          <div className="profile-group-row" onClick={() => setSyncOpen(!syncOpen)}>
            <span className="profile-group-row-text">Sync</span>
            <span className="profile-group-row-chevron" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(letterboxdSyncing || goodreadsSyncing || steamSyncing) && <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--terracotta)" }}>syncing...</span>}
              {(profile.letterboxd_username || profile.goodreads_user_id || profile.steam_id) && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--terracotta)", opacity: 0.6 }} />
              )}
              {syncOpen ? "▾" : "›"}
            </span>
          </div>
          <Expandable open={syncOpen}>
            <div style={{ padding: "4px 0 8px" }}>
              {/* Letterboxd */}
              <div className="profile-group-sub-row" onClick={() => setLetterboxdOpen(!letterboxdOpen)}>
                <span className="profile-group-row-text" style={{ fontSize: 14 }}>Letterboxd</span>
                <span className="profile-group-row-chevron" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {profile.letterboxd_username && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terracotta)", opacity: 0.5 }} />}
                  {letterboxdOpen ? "▾" : "›"}
                </span>
              </div>
              <Expandable open={letterboxdOpen}>
                <div className="profile-sync-panel">
                  {profile.letterboxd_username ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E054" }} />
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#40BCF4" }} />
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF8000" }} />
                        </div>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)", flex: 1 }}>
                          letterboxd.com/<strong>{profile.letterboxd_username}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                        Your diary syncs automatically when you open the app.
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="profile-sync-btn" onClick={onLetterboxdSync} disabled={letterboxdSyncing}>
                          {letterboxdSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button className="profile-disconnect-btn" onClick={onLetterboxdDisconnect}>Disconnect</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                        Auto-sync your Letterboxd diary. Films, ratings, and watch dates flow into your shelf and feed.
                      </div>
                      <div style={{ display: "flex", alignItems: "center", background: "var(--bg-input)", border: "1px solid var(--border-medium)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-faint)", padding: "10px 0 10px 12px", whiteSpace: "nowrap" }}>letterboxd.com/</span>
                        <input value={lbUsernameInput} onChange={e => setLbUsernameInput(e.target.value)}
                          placeholder="username"
                          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "var(--font-mono)", padding: "10px 12px 10px 2px", background: "transparent", color: "var(--text-primary)" }} />
                      </div>
                      <button className="profile-connect-btn" disabled={!lbUsernameInput.trim() || letterboxdSyncing}
                        onClick={() => onLetterboxdConnect(lbUsernameInput.trim())}>
                        {letterboxdSyncing ? "Connecting..." : "Connect & Sync"}
                      </button>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-faint)", textAlign: "center", marginTop: 8 }}>
                        Your Letterboxd profile must be public
                      </div>
                    </>
                  )}
                </div>
              </Expandable>

              {/* Goodreads */}
              <div className="profile-group-sub-row" onClick={() => setGoodreadsOpen(!goodreadsOpen)}>
                <span className="profile-group-row-text" style={{ fontSize: 14 }}>Goodreads</span>
                <span className="profile-group-row-chevron" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {profile.goodreads_user_id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terracotta)", opacity: 0.5 }} />}
                  {goodreadsOpen ? "▾" : "›"}
                </span>
              </div>
              <Expandable open={goodreadsOpen}>
                <div className="profile-sync-panel">
                  {profile.goodreads_user_id ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)", flex: 1 }}>
                          User ID: <strong>{profile.goodreads_user_id}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                        Your read shelf syncs automatically when you open the app.
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="profile-sync-btn" onClick={onGoodreadsSync} disabled={goodreadsSyncing}>
                          {goodreadsSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button className="profile-disconnect-btn" onClick={onGoodreadsDisconnect}>Disconnect</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                        Auto-sync your Goodreads read shelf. Books, ratings, and read dates flow into your shelf and feed.
                      </div>
                      <div style={{ display: "flex", alignItems: "center", background: "var(--bg-input)", border: "1px solid var(--border-medium)", borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-faint)", padding: "10px 0 10px 12px", whiteSpace: "nowrap" }}>User ID:</span>
                        <input value={grUserIdInput} onChange={e => setGrUserIdInput(e.target.value)}
                          placeholder="e.g. 127753855"
                          style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "var(--font-mono)", padding: "10px 12px 10px 6px", background: "transparent", color: "var(--text-primary)" }} />
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-faint)", marginBottom: 10, lineHeight: 1.5 }}>
                        Find your ID in your Goodreads profile URL: goodreads.com/user/show/<strong>127753855</strong>
                      </div>
                      <button className="profile-connect-btn" disabled={!grUserIdInput.trim() || goodreadsSyncing}
                        onClick={() => onGoodreadsConnect(grUserIdInput.trim())}>
                        {goodreadsSyncing ? "Connecting..." : "Connect & Sync"}
                      </button>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-faint)", textAlign: "center", marginTop: 8 }}>
                        Your Goodreads profile must be public
                      </div>
                    </>
                  )}
                </div>
              </Expandable>

              {/* Steam */}
              <div className="profile-group-sub-row" onClick={() => setSteamOpen(!steamOpen)}>
                <span className="profile-group-row-text" style={{ fontSize: 14 }}>Steam</span>
                <span className="profile-group-row-chevron" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {profile.steam_id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terracotta)", opacity: 0.5 }} />}
                  {steamOpen ? "▾" : "›"}
                </span>
              </div>
              <Expandable open={steamOpen}>
                <div className="profile-sync-panel">
                  {profile.steam_id ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)", flex: 1 }}>
                          Steam ID: <strong>{profile.steam_id}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                        Recently played games sync automatically.
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="profile-sync-btn" onClick={onSteamSync} disabled={steamSyncing}>
                          {steamSyncing ? "Syncing..." : "Sync Now"}
                        </button>
                        <button className="profile-disconnect-btn" onClick={onSteamDisconnect}>Disconnect</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                        Sync your recently played Steam games. Playtime and achievements flow into your shelf and feed.
                      </div>
                      <input value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)}
                        placeholder="Steam ID or custom URL name"
                        style={{ width: "100%", border: "1px solid var(--border-medium)", outline: "none", fontSize: 13, fontFamily: "var(--font-mono)", padding: "10px 12px", background: "var(--bg-input)", borderRadius: 10, color: "var(--text-primary)", marginBottom: 10, boxSizing: "border-box" }} />
                      <button className="profile-connect-btn" disabled={!steamIdInput.trim() || steamSyncing}
                        onClick={() => onSteamConnect(steamIdInput.trim())}>
                        {steamSyncing ? "Connecting..." : "Connect & Sync"}
                      </button>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-faint)", textAlign: "center", marginTop: 8 }}>
                        Your Steam profile must be public · Find your ID at steamid.io
                      </div>
                    </>
                  )}
                </div>
              </Expandable>
            </div>
          </Expandable>

          <div className="profile-group-divider" />

          {/* ── My Podcasts ── */}
          <div className="profile-group-row" onClick={() => setPodcastsOpen(!podcastsOpen)}>
            <span className="profile-group-row-text">My Podcasts</span>
            <span className="profile-group-row-chevron" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {favoritePodcasts?.size > 0 && (
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  color: "var(--terracotta)", opacity: 0.7,
                }}>{favoritePodcasts.size} favorite{favoritePodcasts.size !== 1 ? "s" : ""}</span>
              )}
              {podcastsOpen ? "▾" : "›"}
            </span>
          </div>
          <Expandable open={podcastsOpen}>
            <div style={{ padding: "4px 14px 12px" }}>
              {loadingPodcasts ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-faint)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  Loading...
                </div>
              ) : allPodcasts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-faint)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                  No podcasts available
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {/* Sort: favorites first, then rest */}
                  {[...allPodcasts].sort((a, b) => {
                    const aFav = favoritePodcasts?.has(a.id) ? 0 : 1;
                    const bFav = favoritePodcasts?.has(b.id) ? 0 : 1;
                    if (aFav !== bFav) return aFav - bFav;
                    return 0; // preserve existing sort within groups
                  }).map(pod => {
                    const isFav = favoritePodcasts?.has(pod.id);
                    const accent = isFav ? "var(--terracotta, #c97849)" : "rgba(255,255,255,0.3)";

                    return (
                      <div
                        key={pod.id}
                        onClick={() => onToggleFavoritePodcast(pod.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 12px",
                          background: isFav ? "rgba(201,120,73,0.08)" : "rgba(255,255,255,0.02)",
                          border: `1.5px solid ${isFav ? "rgba(201,120,73,0.3)" : "var(--border-medium)"}`,
                          borderRadius: 10,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Podcast artwork */}
                        {pod.artwork_url ? (
                          <img src={pod.artwork_url} alt="" style={{
                            width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                            border: isFav ? "1.5px solid rgba(201,120,73,0.3)" : "1.5px solid rgba(255,255,255,0.06)",
                          }} />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                            background: "rgba(255,255,255,0.04)",
                            border: "1.5px solid rgba(255,255,255,0.06)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16,
                          }}>🎙️</div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                            color: isFav ? "var(--text-primary)" : "var(--text-muted)",
                            lineHeight: 1.2,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{pod.name}</div>
                          {pod.tier === "deep" && (
                            <div style={{
                              fontFamily: "var(--font-mono)", fontSize: 9,
                              color: "var(--terracotta, #c97849)", opacity: 0.7,
                              marginTop: 2, letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}>Deep Dive</div>
                          )}
                        </div>

                        {/* Star toggle */}
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isFav ? "rgba(201,120,73,0.15)" : "rgba(255,255,255,0.04)",
                          transition: "all 0.2s ease",
                          flexShrink: 0,
                          fontSize: 14,
                        }}>
                          {isFav ? "★" : "☆"}
                        </div>
                      </div>
                    );
                  })}

                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    color: "var(--text-faint)", textAlign: "center",
                    marginTop: 4, letterSpacing: "0.03em",
                    lineHeight: 1.5,
                  }}>
                    Favorites float to the top when viewing podcast coverage on a film
                  </div>
                </div>
              )}
            </div>
          </Expandable>

          <div className="profile-group-divider" />

          {/* ── Notifications ── */}
          <div className="profile-group-row" onClick={() => setNotifOpen(!notifOpen)}>
            <span className="profile-group-row-text">Notifications</span>
            <span className="profile-group-row-chevron">{notifOpen ? "▾" : "›"}</span>
          </div>
          <Expandable open={notifOpen}>
            <div style={{ padding: "4px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* New coverage toggle */}
              <div
                onClick={() => updateNotifPref("new_coverage", !notifPrefs.new_coverage)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px",
                  background: notifPrefs.new_coverage ? "rgba(201,120,73,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${notifPrefs.new_coverage ? "rgba(201,120,73,0.3)" : "var(--border-medium)"}`,
                  borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                    color: notifPrefs.new_coverage ? "var(--text-primary)" : "var(--text-muted)",
                  }}>New Coverage Alerts</div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    color: "var(--text-faint)", marginTop: 3,
                    lineHeight: 1.4, letterSpacing: "0.03em",
                  }}>
                    Get notified when a podcast covers a film you've logged
                  </div>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 11, flexShrink: 0, marginLeft: 12,
                  background: notifPrefs.new_coverage ? "var(--terracotta, #c97849)" : "rgba(255,255,255,0.12)",
                  transition: "background 0.2s ease",
                  position: "relative",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 2,
                    left: notifPrefs.new_coverage ? 20 : 2,
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>

              {/* Favorites only toggle — only visible when coverage alerts are on */}
              {notifPrefs.new_coverage && (
                <div
                  onClick={() => updateNotifPref("favorites_only", !notifPrefs.favorites_only)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", marginLeft: 12,
                    background: notifPrefs.favorites_only ? "rgba(201,120,73,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1.5px solid ${notifPrefs.favorites_only ? "rgba(201,120,73,0.2)" : "var(--border-medium)"}`,
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                      color: notifPrefs.favorites_only ? "var(--text-primary)" : "var(--text-muted)",
                    }}>Favorites Only</div>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 9,
                      color: "var(--text-faint)", marginTop: 3,
                      lineHeight: 1.4, letterSpacing: "0.03em",
                    }}>
                      Only from podcasts you've starred above
                    </div>
                  </div>
                  <div style={{
                    width: 40, height: 22, borderRadius: 11, flexShrink: 0, marginLeft: 12,
                    background: notifPrefs.favorites_only ? "var(--terracotta, #c97849)" : "rgba(255,255,255,0.12)",
                    transition: "background 0.2s ease",
                    position: "relative",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", background: "#fff",
                      position: "absolute", top: 2,
                      left: notifPrefs.favorites_only ? 20 : 2,
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }} />
                  </div>
                </div>
              )}

              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 9,
                color: "var(--text-faint)", textAlign: "center",
                letterSpacing: "0.03em", lineHeight: 1.5,
              }}>
                Requires the app installed on your phone
              </div>
            </div>
          </Expandable>

          <div className="profile-group-divider" />

          <div className="profile-group-row" onClick={() => setShowImportCSV(true)}>
            <span className="profile-group-row-text">Import Library</span>
            <span className="profile-group-row-chevron">›</span>
          </div>

          <div className="profile-group-divider" />

          <div className="profile-group-row" onClick={() => { setWishlistOpen(!wishlistOpen); if (!wishlistOpen && wishlist.length === 0) loadWishlist(); }}>
            <span className="profile-group-row-text">My Lists</span>
            <span className="profile-group-row-chevron">{wishlistOpen ? "▾" : "›"}</span>
          </div>
          <Expandable open={wishlistOpen}>
            <div style={{ padding: "8px 0 12px" }}>
              {wishlist.length === 0 ? (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-faint)", padding: "12px 18px", lineHeight: 1.5 }}>
                  No items yet. Tap "Want to read/watch/play" on a friend's activity to add items here.
                </div>
              ) : (
                ["book", "movie", "show", "game"].map(type => {
                  const items = wishlist.filter(w => w.item_type === type);
                  if (items.length === 0) return null;
                  const label = type === "book" ? "Reading List" : type === "movie" ? "Watch List" : type === "show" ? "Show List" : "Play List";
                  const isExpanded = expandedListType === type;
                  const MAX_PREVIEW = 5;
                  const accent = "#EF9F27";

                  return (
                    <div key={type} style={{ marginBottom: 4 }}>
                      {/* Summary row */}
                      <div
                        onClick={() => setExpandedListType(isExpanded ? null : type)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 18px", cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{
                            fontFamily: "'Permanent Marker', cursive", fontSize: 14,
                            color: accent, letterSpacing: "0.04em",
                          }}>{label}</span>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 10,
                            color: `${accent}80`, fontWeight: 600,
                            background: `${accent}12`, borderRadius: 10,
                            padding: "2px 8px",
                          }}>{items.length}</span>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s",
                        }}>
                          <path d="M4.5 2.5L8 6L4.5 9.5" stroke={`${accent}80`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>

                      {/* Expanded items */}
                      <Expandable open={isExpanded}>
                        <div style={{ padding: "0 18px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {items.slice(0, MAX_PREVIEW).map(item => {
                            return (
                              <div key={item.id} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 12px",
                                background: "rgba(255,255,255,0.02)",
                                border: `1px solid ${accent}10`,
                                borderRadius: 8,
                                transition: "all 0.2s",
                              }}>
                                {item.cover_url ? (
                                  <img src={item.cover_url} alt="" style={{ width: 32, height: 48, borderRadius: 4, objectFit: "cover", flexShrink: 0, border: `1px solid ${accent}12` }} />
                                ) : (
                                  <div style={{ width: 32, height: 48, borderRadius: 4, background: `${accent}08`, border: `1px solid ${accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: `${accent}60` }}>?</span>
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                                  {item.author && <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{item.author}</div>}
                                </div>
                                <div
                                  onClick={() => removeFromWishlist(item.id)}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M3 3l6 6M9 3l-6 6" stroke="var(--text-faint)" strokeWidth="1.2" strokeLinecap="round"/>
                                  </svg>
                                </div>
                              </div>
                            );
                          })}
                          {items.length > MAX_PREVIEW && (
                            <div style={{
                              textAlign: "center", padding: "10px 0 4px",
                            }}>
                              <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 10,
                                color: `${accent}90`, letterSpacing: "0.04em",
                                background: `${accent}0a`, border: `1px solid ${accent}18`,
                                borderRadius: 16, padding: "4px 12px", cursor: "pointer",
                              }}>
                                + {items.length - MAX_PREVIEW} more
                              </span>
                            </div>
                          )}
                        </div>
                      </Expandable>
                    </div>
                  );
                })
              )}
            </div>
          </Expandable>
        </div>
      </div>

      {/* ── ACCOUNT GROUP ── */}
      <div className="profile-group">
        <div className="profile-group-label">Account</div>
        <button className="btn-signout" onClick={async () => {
          try { if (onSignOut) await onSignOut(); } catch (_) {}
          window.location.replace('/');
        }}>Sign Out</button>
        {!confirmDeleteAccount ? (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <span className="profile-delete-link" onClick={() => setConfirmDeleteAccount(true)}>Delete Account</span>
          </div>
        ) : (
          <div className="profile-delete-confirm">
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#f87171", marginBottom: 8 }}>Delete your account?</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-faint)", marginBottom: 16, lineHeight: 1.5 }}>
              This will permanently delete your profile, library, activity history, and all data. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn-confirm-yes" style={{ fontSize: 12, padding: "8px 20px" }} onClick={onDeleteAccount}>Yes, Delete Everything</button>
              <button className="btn-confirm-no" style={{ fontSize: 12, padding: "8px 20px" }} onClick={() => setConfirmDeleteAccount(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── ATTRIBUTION ── */}
      <div className="profile-group" style={{ opacity: 0.5, paddingBottom: 8 }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          padding: "8px 16px",
        }}>
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190.24 81.52" style={{ height: 12, opacity: 0.7 }}>
              <defs>
                <linearGradient id="tmdb-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#90CEA1" />
                  <stop offset="0.56" stopColor="#3CBEC9" />
                  <stop offset="1" stopColor="#00B3E5" />
                </linearGradient>
              </defs>
              <g fill="url(#tmdb-grad)">
                <path d="M105.67 36.06h66.6a17.97 17.97 0 000-35.93h-66.6a17.97 17.97 0 000 35.93zm-88.7 45.46h7.49V58.35h12.34v-6.5H24.46V39.43H38.4v-6.5H16.97zM46.56 81.52h7.5V32.93h-7.5zm20.62 0h7.49V58.35h12.34v-6.5H74.67V39.43h13.95v-6.5H67.18zm36.82-35.96v22.86c0 7.55 4.03 13.68 14.02 13.68 10 0 14.03-6.13 14.03-13.68V45.56c0-7.55-4.03-13.73-14.03-13.73-9.99 0-14.02 6.18-14.02 13.73zm7.5-.9c0-4.38 2.11-6.33 6.52-6.33s6.52 1.95 6.52 6.33v24.64c0 4.38-2.11 6.33-6.52 6.33s-6.52-1.95-6.52-6.33zm28.24-11.73h14.03c9.47 0 13.7 5.2 13.7 12.47v12.07c0 7.27-4.23 12.47-13.7 12.47h-14.03zm7.49 30.51h5.94c4.32 0 6.8-2 6.8-6.57v-11.2c0-4.6-2.48-6.57-6.8-6.57h-5.94zm28.18-30.51h14.36c8.38 0 12.07 3.74 12.07 10.14 0 4.13-1.88 7.6-6.52 8.58v.14c5.25.6 7.72 3.87 7.72 8.72 0 7.11-4.5 10.89-12.81 10.89h-14.82zm7.49 16.87h5.73c3.79 0 5.73-1.5 5.73-5.2 0-3.56-2.07-5.17-5.73-5.17h-5.73zm0 17.14h6.52c4.17 0 6.2-1.9 6.2-5.53 0-3.48-2.34-5.2-6.2-5.2h-6.52z"/>
              </g>
            </svg>
          </a>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: 9,
            color: "var(--text-faint, #5a6480)",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 260,
          }}>
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </div>
        </div>
      </div>

      {/* Import CSV Modal — portaled to body to escape transform containing block */}
      {showImportCSV && createPortal(
        <ImportCSVModal
          session={session}
          onClose={() => setShowImportCSV(false)}
          onToast={onToast}
          onComplete={onImportComplete}
        />,
        document.body
      )}
    </div>
  );
}


export default ProfileScreen;

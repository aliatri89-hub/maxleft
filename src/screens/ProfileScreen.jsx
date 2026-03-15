import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { DEFAULT_ENABLED_SHELVES, DEFAULT_SHELF_ORDER, GROUP_TYPE_CONFIG } from "../utils/constants";
import { sb } from "../utils/api";
import InitialAvatar from "../components/InitialAvatar";
import ImportCSVModal from "../components/ImportCSVModal";

function ProfileScreen({ profile, shelves, onBack, onSignOut, onDeleteAccount, session, onUpdateAvatar, onUpdateProfile, onToast, initialView, pushNav, removeNav, onLetterboxdConnect, onLetterboxdDisconnect, onLetterboxdSync, letterboxdSyncing, onGoodreadsConnect, onGoodreadsDisconnect, onGoodreadsSync, goodreadsSyncing, onSteamConnect, onSteamDisconnect, onSteamSync, steamSyncing, userGroups, onOpenGroup, onCreateGroup, onJoinCode, onImportComplete }) {
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [managingShelves, setManagingShelves] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name || "");
  const [editBio, setEditBio] = useState(profile.bio || "");
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [letterboxdOpen, setLetterboxdOpen] = useState(false);
  const [lbUsernameInput, setLbUsernameInput] = useState(profile.letterboxd_username || "");
  const [goodreadsOpen, setGoodreadsOpen] = useState(false);
  const [grUserIdInput, setGrUserIdInput] = useState(profile.goodreads_user_id || "");
  const [steamOpen, setSteamOpen] = useState(false);
  const [steamIdInput, setSteamIdInput] = useState(profile.steam_id || "");
  const [syncOpen, setSyncOpen] = useState(false);
  const [showImportCSV, setShowImportCSV] = useState(false);
  useEffect(() => { console.log("[Import] showImportCSV changed to:", showImportCSV); }, [showImportCSV]);
  const fileRef = useRef(null);

  // Shelf drag-to-reorder
  const [shelfDragIdx, setShelfDragIdx] = useState(null);
  const [shelfDragOverIdx, setShelfDragOverIdx] = useState(null);
  const shelfDragRefs = useRef({ startY: 0, startIdx: -1, timer: null });
  const shelfListRef = useRef(null);

  useEffect(() => {
    const el = shelfListRef.current;
    if (!el || shelfDragIdx === null) return;
    const handler = (e) => { if (shelfDragIdx !== null) e.preventDefault(); };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, [shelfDragIdx]);

  const onShelfDragStart = (idx, e) => {
    const touch = e.touches?.[0] || e;
    shelfDragRefs.current.startY = touch.clientY;
    shelfDragRefs.current.startIdx = idx;
    shelfDragRefs.current.timer = setTimeout(() => {
      setShelfDragIdx(idx);
      setShelfDragOverIdx(idx);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 300);
  };

  const onShelfDragMove = (e) => {
    if (shelfDragIdx === null) {
      const touch = e.touches?.[0] || e;
      if (Math.abs(touch.clientY - shelfDragRefs.current.startY) > 10) {
        clearTimeout(shelfDragRefs.current.timer);
      }
      return;
    }
    const touch = e.touches?.[0] || e;
    const listEl = shelfListRef.current;
    if (!listEl) return;
    const rows = listEl.querySelectorAll("[data-shelf-idx]");
    let closest = shelfDragIdx;
    let minDist = Infinity;
    rows.forEach(row => {
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(touch.clientY - mid);
      if (dist < minDist) { minDist = dist; closest = parseInt(row.dataset.shelfIdx); }
    });
    if (closest !== shelfDragOverIdx) setShelfDragOverIdx(closest);
  };

  const onShelfDragEnd = async () => {
    clearTimeout(shelfDragRefs.current.timer);
    if (shelfDragIdx === null || shelfDragOverIdx === null || shelfDragIdx === shelfDragOverIdx) {
      setShelfDragIdx(null);
      setShelfDragOverIdx(null);
      return;
    }
    // Reorder within the visible (filtered) toggles only
    const visibleKeys = shelfToggles.map(t => t.key);
    const [moved] = visibleKeys.splice(shelfDragIdx, 1);
    visibleKeys.splice(shelfDragOverIdx, 0, moved);
    // Rebuild full order: keep hidden keys in front, then visible in new order
    const hiddenKeys = currentOrder.filter(k => !shelfToggleMap[k]);
    const order = [...hiddenKeys, ...visibleKeys];
    setShelfDragIdx(null);
    setShelfDragOverIdx(null);
    if (onUpdateProfile) onUpdateProfile({ shelfOrder: order });
    await sb(supabase.from("profiles").update({ shelf_order: order }).eq("id", session.user.id), onToast, "Couldn't update");
  };

  const onShelfDragCancel = () => {
    clearTimeout(shelfDragRefs.current.timer);
    setShelfDragIdx(null);
    setShelfDragOverIdx(null);
  };

  const shelfToggleMap = {
    // training, trophies, passport — HIDDEN: focused on media
    books: { icon: "📖", label: "Bookshelf" },
    movies: { icon: "🎬", label: "Film Shelf" },
    shows: { icon: "📺", label: "Show Shelf" },
    games: { icon: "🎮", label: "Game Shelf" },
    // challenge (Habits) + groups DISABLED for launch
  };

  const currentOrder = profile.shelfOrder || DEFAULT_SHELF_ORDER;
  const shelfToggles = currentOrder.map(key => ({ key, ...shelfToggleMap[key] })).filter(t => t.icon);

  const enabledShelves = { ...DEFAULT_ENABLED_SHELVES, ...(profile.enabledShelves || {}) };

  const handleToggleShelf = async (key) => {
    const updated = { ...enabledShelves, [key]: !enabledShelves[key] };
    // If turning off training, also turn off trophies (trophies come from events)
    // Actually no — keep them independent. User might want to show past trophies but not upcoming events.
    if (onUpdateProfile) onUpdateProfile({ enabledShelves: updated });
    await sb(supabase.from("profiles").update({ enabled_shelves: updated }).eq("id", session.user.id), onToast, "Couldn't update");
  };

  const handleSaveProfile = async () => {
    if (!session) return;
    setSavingProfile(true);
    try {
      await supabase.from("profiles").update({
        name: editName,
        bio: editBio,
      }).eq("id", session.user.id);
      if (onUpdateProfile) onUpdateProfile({ name: editName, bio: editBio });
      setEditing(false);
      onToast("Profile updated!");
    } catch (e) {
      console.error("Save profile error:", e);
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
    <div className="profile-screen">
      <div className="profile-screen-header">
        <button className="profile-back" onClick={onBack}>← Back</button>
      </div>

      <div className="avatar-upload-wrap" onClick={() => fileRef.current?.click()}>
        <div className="profile-big-avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <InitialAvatar username={profile.username} size={80} />}
          {uploading && (
            <div className="avatar-uploading"><div className="save-spinner" style={{ borderTopColor: "white" }} /></div>
          )}
        </div>
        <div className="avatar-upload-overlay">📷</div>
        <input
          ref={fileRef}
          className="avatar-upload-input"
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />
      </div>

      <div className="profile-big-name bb">{profile.name}</div>
      <div className="profile-big-handle">@{profile.username}</div>

      {profile.bio && <div className="profile-bio">"{profile.bio}"</div>}

      {/* Stats */}
      <div className="profile-card" style={{ marginTop: 24 }}>
        <div className="profile-stats" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
          <div className="stat">
            <div className="stat-num">{shelves.books?.length || 0}</div>
            <div className="stat-label">Books</div>
          </div>
          <div className="stat">
            <div className="stat-num">{shelves.movies?.length || 0}</div>
            <div className="stat-label">Films</div>
          </div>
          <div className="stat">
            <div className="stat-num">{shelves.shows?.length || 0}</div>
            <div className="stat-label">Shows</div>
          </div>
          <div className="stat">
            <div className="stat-num">{shelves.games?.length || 0}</div>
            <div className="stat-label">Games</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="settings-section">
        <div className="settings-label">Settings</div>

        <div className="settings-item" onClick={() => setEditing(!editing)}>
          <div className="settings-item-text">Edit Profile</div>
          <div className="settings-item-arrow">{editing ? "▾" : "→"}</div>
        </div>
        {editing && (
          <div className="edit-profile-form">
            <div>
              <div className="event-form-label">Name</div>
              <input className="event-form-input" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div>
              <div className="event-form-label">Bio</div>
              <input className="event-form-input" placeholder="A short bio..." value={editBio} onChange={e => setEditBio(e.target.value)} />
            </div>
            <button className="btn-save-profile" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save"}
            </button>
          </div>
        )}
        <div className="settings-item" onClick={() => setManagingShelves(!managingShelves)}>
          <div className="settings-item-text">Manage Shelves</div>
          <div className="settings-item-arrow">{managingShelves ? "▾" : "→"}</div>
        </div>
        {managingShelves && (
          <div className="manage-shelves-panel" ref={shelfListRef}
            onTouchMove={onShelfDragMove} onTouchEnd={onShelfDragEnd} onTouchCancel={onShelfDragCancel}
            onMouseMove={shelfDragIdx !== null ? onShelfDragMove : undefined}
            onMouseUp={shelfDragIdx !== null ? onShelfDragEnd : undefined}
            onMouseLeave={shelfDragIdx !== null ? onShelfDragCancel : undefined}>
            <div className="shelf-toggle-row">
              <div className="shelf-drag-handle" style={{ opacity: 0.15 }}>⠿</div>
              <div className="shelf-toggle-info">
                <div className="shelf-toggle-icon">📌</div>
                <div className="shelf-toggle-label">My Mantl</div>
              </div>
              <div className="shelf-toggle-permanent">Always on</div>
            </div>
            {shelfToggles.map(({ key, icon, label }, idx) => {
              const isDragging = shelfDragIdx === idx;
              const isDragOver = shelfDragIdx !== null && shelfDragOverIdx === idx && shelfDragIdx !== idx;
              return (
                <div className={`shelf-toggle-row${isDragging ? " shelf-dragging" : ""}${isDragOver ? " shelf-drag-over" : ""}`}
                  key={key} data-shelf-idx={idx}
                  onTouchStart={(e) => onShelfDragStart(idx, e)}
                  onMouseDown={(e) => onShelfDragStart(idx, e)}>
                  <div className="shelf-drag-handle">⠿</div>
                  <div className="shelf-toggle-info">
                    <div className="shelf-toggle-icon">{icon}</div>
                    <div className={`shelf-toggle-label${!enabledShelves[key] ? " disabled" : ""}`}>{label}</div>
                  </div>
                  <div
                    className={`shelf-toggle-switch${enabledShelves[key] ? " on" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleToggleShelf(key); }}
                  />
                </div>
              );
            })}
          </div>
        )}
        {/* Monthly Recap — moved to My Mantl tab */}
        <div className="settings-item" onClick={() => { setWishlistOpen(!wishlistOpen); if (!wishlistOpen && wishlist.length === 0) loadWishlist(); }}>
          <div className="settings-item-text">My Lists</div>
          <div className="settings-item-arrow">{wishlistOpen ? "▾" : "→"}</div>
        </div>
        {wishlistOpen && (
          <div style={{ padding: "0 20px 16px" }}>
            {wishlist.length === 0 ? (
              <div style={{ fontFamily: "'Lora', serif", fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", padding: "12px 0" }}>
                No items yet. Tap "Want to read/watch/play" on a friend's activity or when searching to add items here.
              </div>
            ) : (
              ["book", "movie", "show", "game"].map(type => {
                const items = wishlist.filter(w => w.item_type === type);
                if (items.length === 0) return null;
                const label = type === "book" ? "📚 Reading List" : type === "movie" ? "🎬 Watch List" : type === "show" ? "📺 Watch List" : "🎮 Play List";
                return (
                  <div key={type} style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 6 }}>{label} <span style={{ color: "var(--accent-green)" }}>{items.length}</span></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {items.map(item => {
                        const isNextUp = type === "book" && profile.nextUpBook?.id === item.id;
                        return (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", background: isNextUp ? "rgba(74,222,128,0.08)" : "var(--bg-card)", border: `1px solid ${isNextUp ? "var(--accent-green)" : "var(--border-subtle)"}`, borderRadius: 8,
                        }}>
                          {item.cover_url ? (
                            <img src={item.cover_url} alt="" style={{ width: 30, height: 44, borderRadius: 3, objectFit: "cover", flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 30, height: 44, borderRadius: 3, background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                              {type === "book" ? "📖" : type === "movie" ? "🎬" : type === "show" ? "📺" : "🎮"}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                            {item.author && <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: "var(--text-faint)" }}>{item.author}</div>}
                            {isNextUp && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.1em", color: "var(--accent-green)", marginTop: 2 }}>UP NEXT</div>}
                          </div>
                          {type === "book" && (
                            <div
                              style={{ fontSize: 16, cursor: "pointer", padding: "4px 6px", color: isNextUp ? "var(--accent-green)" : "var(--text-faint)", opacity: isNextUp ? 1 : 0.4 }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const nextUp = isNextUp ? null : { id: item.id, title: item.title, author: item.author, cover: item.cover_url };
                                await supabase.from("profiles").update({ next_up_book: nextUp }).eq("id", session.user.id);
                                onUpdateProfile({ nextUpBook: nextUp });
                                onToast(isNextUp ? "Cleared next up" : `Up next: ${item.title} 📖`);
                              }}
                              title={isNextUp ? "Remove next up" : "Set as next up"}
                            >🔖</div>
                          )}
                          <div
                            style={{ fontSize: 14, color: "var(--text-faint)", cursor: "pointer", padding: "4px 8px" }}
                            onClick={() => removeFromWishlist(item.id)}
                          >✕</div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        <div className="settings-item" onClick={() => setSyncOpen(!syncOpen)}>
          <div className="settings-item-text">Sync</div>
          <div className="settings-item-arrow">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {(letterboxdSyncing || goodreadsSyncing || steamSyncing) && <span className="mono" style={{ fontSize: 9, color: "var(--accent-green)" }}>syncing...</span>}
              {(profile.letterboxd_username || profile.goodreads_user_id || profile.steam_id) && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--bg-elevated)", boxShadow: "0 0 6px rgba(122,154,106,0.5)" }} />
              )}
              {syncOpen ? "▾" : "→"}
            </span>
          </div>
        </div>
        {syncOpen && (
          <div style={{ padding: "8px 0", marginTop: -4, marginBottom: 8 }}>
            {/* Letterboxd */}
            <div className="settings-item" style={{ paddingLeft: 12 }} onClick={() => setLetterboxdOpen(!letterboxdOpen)}>
              <div className="settings-item-text" style={{ fontSize: 13 }}>Letterboxd</div>
              <div className="settings-item-arrow">
                {profile.letterboxd_username && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--bg-elevated)", marginRight: 6, display: "inline-block" }} />}
                {letterboxdOpen ? "▾" : "→"}
              </div>
            </div>
            {letterboxdOpen && (
              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, margin: "0 8px 8px" }}>
                {profile.letterboxd_username ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00E054" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#40BCF4" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF8000" }} />
                      </div>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-primary)", flex: 1 }}>
                        letterboxd.com/<strong>{profile.letterboxd_username}</strong>
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                      Your diary syncs automatically when you open the app.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="mono" onClick={onLetterboxdSync}
                        disabled={letterboxdSyncing}
                        style={{ flex: 1, fontSize: 10, padding: "8px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-medium)", borderRadius: 8, cursor: "pointer", color: "var(--text-primary)" }}>
                        {letterboxdSyncing ? "Syncing..." : "Sync Now"}
                      </button>
                      <button className="mono" onClick={onLetterboxdDisconnect}
                        style={{ fontSize: 10, padding: "8px 12px", background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, cursor: "pointer", color: "#f87171" }}>
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                      Auto-sync your Letterboxd diary. Films, ratings, and watch dates flow into your shelf and feed.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--border-medium)", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", padding: "10px 0 10px 12px", whiteSpace: "nowrap" }}>letterboxd.com/</span>
                      <input className="mono" value={lbUsernameInput} onChange={e => setLbUsernameInput(e.target.value)}
                        placeholder="username"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, padding: "10px 12px 10px 2px", background: "transparent", color: "var(--text-primary)" }} />
                    </div>
                    <button className="mono" disabled={!lbUsernameInput.trim() || letterboxdSyncing}
                      onClick={() => onLetterboxdConnect(lbUsernameInput.trim())}
                      style={{ width: "100%", fontSize: 11, padding: "10px", background: "var(--accent-green)", color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}>
                      {letterboxdSyncing ? "Connecting..." : "Connect & Sync"}
                    </button>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", marginTop: 8 }}>
                      Your Letterboxd profile must be public
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Goodreads */}
            <div className="settings-item" style={{ paddingLeft: 12 }} onClick={() => setGoodreadsOpen(!goodreadsOpen)}>
              <div className="settings-item-text" style={{ fontSize: 13 }}>Goodreads</div>
              <div className="settings-item-arrow">
                {profile.goodreads_user_id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--bg-elevated)", marginRight: 6, display: "inline-block" }} />}
                {goodreadsOpen ? "▾" : "→"}
              </div>
            </div>
            {goodreadsOpen && (
              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, margin: "0 8px 8px" }}>
                {profile.goodreads_user_id ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>📚</span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-primary)", flex: 1 }}>
                        User ID: <strong>{profile.goodreads_user_id}</strong>
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                      Your read shelf syncs automatically when you open the app.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="mono" onClick={onGoodreadsSync}
                        disabled={goodreadsSyncing}
                        style={{ flex: 1, fontSize: 10, padding: "8px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-medium)", borderRadius: 8, cursor: "pointer", color: "var(--text-primary)" }}>
                        {goodreadsSyncing ? "Syncing..." : "Sync Now"}
                      </button>
                      <button className="mono" onClick={onGoodreadsDisconnect}
                        style={{ fontSize: 10, padding: "8px 12px", background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, cursor: "pointer", color: "#f87171" }}>
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                      Auto-sync your Goodreads read shelf. Books, ratings, and read dates flow into your shelf and feed.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", background: "var(--bg-elevated)", border: "1px solid var(--border-medium)", borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", padding: "10px 0 10px 12px", whiteSpace: "nowrap" }}>User ID:</span>
                      <input className="mono" value={grUserIdInput} onChange={e => setGrUserIdInput(e.target.value)}
                        placeholder="e.g. 127753855"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, padding: "10px 12px 10px 6px", background: "transparent", color: "var(--text-primary)" }} />
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", marginBottom: 10, lineHeight: 1.5 }}>
                      Find your ID in your Goodreads profile URL: goodreads.com/user/show/<strong>127753855</strong>
                    </div>
                    <button className="mono" disabled={!grUserIdInput.trim() || goodreadsSyncing}
                      onClick={() => onGoodreadsConnect(grUserIdInput.trim())}
                      style={{ width: "100%", fontSize: 11, padding: "10px", background: "var(--accent-green)", color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}>
                      {goodreadsSyncing ? "Connecting..." : "Connect & Sync"}
                    </button>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", marginTop: 8 }}>
                      Your Goodreads profile must be public
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Steam */}
            <div className="settings-item" style={{ paddingLeft: 12 }} onClick={() => setSteamOpen(!steamOpen)}>
              <div className="settings-item-text" style={{ fontSize: 13 }}>Steam</div>
              <div className="settings-item-arrow">
                {profile.steam_id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--bg-elevated)", marginRight: 6, display: "inline-block" }} />}
                {steamOpen ? "▾" : "→"}
              </div>
            </div>
            {steamOpen && (
              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, margin: "0 8px 8px" }}>
                {profile.steam_id ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>🎮</span>
                      <span className="mono" style={{ fontSize: 12, color: "var(--text-primary)", flex: 1 }}>
                        Steam ID: <strong>{profile.steam_id}</strong>
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 12, lineHeight: 1.5 }}>
                      Recently played games sync automatically.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="mono" onClick={onSteamSync}
                        disabled={steamSyncing}
                        style={{ flex: 1, fontSize: 10, padding: "8px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-medium)", borderRadius: 8, cursor: "pointer", color: "var(--text-primary)" }}>
                        {steamSyncing ? "Syncing..." : "Sync Now"}
                      </button>
                      <button className="mono" onClick={onSteamDisconnect}
                        style={{ fontSize: 10, padding: "8px 12px", background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, cursor: "pointer", color: "#f87171" }}>
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.6 }}>
                      Sync your recently played Steam games. Playtime and achievements flow into your shelf and feed.
                    </div>
                    <input className="mono" value={steamIdInput} onChange={e => setSteamIdInput(e.target.value)}
                      placeholder="Steam ID or custom URL name"
                      style={{ width: "100%", border: "1px solid var(--border-medium)", outline: "none", fontSize: 13, padding: "10px 12px", background: "var(--bg-input)", borderRadius: 8, color: "var(--text-primary)", marginBottom: 10, boxSizing: "border-box" }} />
                    <button className="mono" disabled={!steamIdInput.trim() || steamSyncing}
                      onClick={() => onSteamConnect(steamIdInput.trim())}
                      style={{ width: "100%", fontSize: 11, padding: "10px", background: "var(--accent-green)", color: "#0a0a0a", border: "none", borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}>
                      {steamSyncing ? "Connecting..." : "Connect & Sync"}
                    </button>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", marginTop: 8 }}>
                      Your Steam profile must be public · Find your ID at steamid.io
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Import Library — standalone item */}
        <div className="settings-item" onClick={() => { console.log("[Import] Button clicked, setting showImportCSV=true"); setShowImportCSV(true); }}>
          <div className="settings-item-text">Import Library</div>
          <div className="settings-item-arrow">→</div>
        </div>

        <div className="settings-item">
          <div className="settings-item-text">Notifications</div>
          <div className="settings-item-arrow">→</div>
        </div>


        {/* Groups — DISABLED for launch */}
        {false && (<>
        <div className="settings-item" onClick={() => setGroupsOpen(!groupsOpen)}>
          <div className="settings-item-text">My Groups</div>
          <div className="settings-item-arrow">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {userGroups?.length > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{userGroups.length}</span>}
              {groupsOpen ? "▾" : "→"}
            </span>
          </div>
        </div>
        {groupsOpen && (
          <div style={{ padding: "0 0 12px" }}>
            {/* Existing groups */}
            {userGroups?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12, padding: "0 4px" }}>
                {userGroups.map(g => {
                  const cfg = GROUP_TYPE_CONFIG[g.type] || GROUP_TYPE_CONFIG.training;
                  return (
                    <div key={g.id} onClick={() => onOpenGroup(g.id)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-subtle)", cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 24 }}>{g.emoji || cfg.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bb" style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{cfg.label} · {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}</div>
                      </div>
                      {g.role === "admin" && <div className="mono" style={{ fontSize: 9, color: "var(--accent-terra)", letterSpacing: "0.04em" }}>ADMIN</div>}
                      <div style={{ color: "var(--text-faint)" }}>→</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Join by code */}
            <div style={{ display: "flex", gap: 8, padding: "0 4px", marginBottom: 10, alignItems: "center" }}>
              <input
                className="event-form-input"
                placeholder="Enter invite code"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={6}
                style={{ flex: 1, minWidth: 0, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}
              />
              <button
                className="btn-shelf-it"
                disabled={joinCodeInput.length < 4 || joiningGroup}
                style={{ padding: "8px 16px", fontSize: 12, whiteSpace: "nowrap", width: "auto", flex: "none" }}
                onClick={async () => {
                  setJoiningGroup(true);
                  await onJoinCode(joinCodeInput);
                  setJoinCodeInput("");
                  setJoiningGroup(false);
                }}
              >
                {joiningGroup ? "..." : "JOIN"}
              </button>
            </div>

            {/* Create new */}
            <div style={{ padding: "0 4px" }}>
              <div onClick={onCreateGroup} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "12px", borderRadius: 12, border: "2px dashed var(--border-med)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 16, color: "var(--accent-green)" }}>+</span>
                <span className="bb" style={{ fontSize: 13, color: "var(--accent-green)" }}>Create a Group</span>
              </div>
            </div>
          </div>
        )}
        </>)}

        <button className="btn-signout" onClick={async () => {
          try { if (onSignOut) await onSignOut(); } catch (_) {}
          window.location.replace('/');
        }}>Sign Out</button>
        {!confirmDeleteAccount ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span
              style={{ fontSize: 12, color: "var(--text-faint)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.04em" }}
              onClick={() => setConfirmDeleteAccount(true)}
            >Delete Account</span>
          </div>
        ) : (
          <div style={{ marginTop: 16, padding: 16, background: "rgba(248,113,113,0.06)", borderRadius: 12, border: "1px solid rgba(248,113,113,0.15)", textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: "#f87171", marginBottom: 8 }}>Delete your account?</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 16, lineHeight: 1.5 }}>This will permanently delete your profile, shelves, activity history, and all data. This cannot be undone.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button className="btn-confirm-yes" style={{ fontSize: 12, padding: "8px 20px" }} onClick={onDeleteAccount}>Yes, Delete Everything</button>
              <button className="btn-confirm-no" style={{ fontSize: 12, padding: "8px 20px" }} onClick={() => setConfirmDeleteAccount(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Import CSV Modal — portaled to body to escape transform containing block */}
      {showImportCSV && console.log("[Import] Rendering ImportCSVModal")}
      {showImportCSV && createPortal(
        <ImportCSVModal
          session={session}
          onClose={() => { console.log("[Import] Modal onClose called"); setShowImportCSV(false); }}
          onToast={onToast}
          onComplete={onImportComplete}
        />,
        document.body
      )}
    </div>
  );
}


export default ProfileScreen;

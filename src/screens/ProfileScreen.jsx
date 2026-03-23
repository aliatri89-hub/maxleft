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

function ProfileScreen({ profile, shelves, onBack, onSignOut, onDeleteAccount, session, onUpdateAvatar, onUpdateProfile, onToast, initialView, pushNav, removeNav, onLetterboxdConnect, onLetterboxdDisconnect, onLetterboxdSync, letterboxdSyncing, onGoodreadsConnect, onGoodreadsDisconnect, onGoodreadsSync, goodreadsSyncing, onSteamConnect, onSteamDisconnect, onSteamSync, steamSyncing, onImportComplete }) {
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
  const fileRef = useRef(null);


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

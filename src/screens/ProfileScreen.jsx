import { t } from "../theme";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";

import { sb } from "../utils/api";
import InitialAvatar from "../components/InitialAvatar";
import LetterboxdSetupPortal from "../components/LetterboxdSetupPortal";
import IngestReviewTool from "../components/feed/IngestReviewTool";
import AboutMantlScreen from "./AboutMantlScreen";

/** Smooth expand/collapse wrapper using CSS grid trick */
function Expandable({ open, children }) {
  const [mounted, setMounted] = React.useState(open);

  // Mount on first open, never unmount (avoids re-fetching data)
  React.useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  return (
    // overflow:hidden + height:0 collapses instantly (no layout animation)
    // only opacity transitions — fully GPU-composited, zero layout cost
    <div style={{
      overflow: "hidden",
      height: open ? "auto" : 0,
      opacity: open ? 1 : 0,
      pointerEvents: open ? "auto" : "none",
      transition: "opacity 0.18s ease",
      willChange: "opacity",
    }}>
      {children}
    </div>
  );
}

function ProfileScreen({ profile, onBack, onSignOut, onDeleteAccount, session, onUpdateAvatar, onUpdateProfile, onToast, initialView, pushNav, removeNav, onLetterboxdConnect, onLetterboxdDisconnect, onLetterboxdSync, letterboxdSyncing, onImportComplete, communitySubscriptions, onSubscribe, onUnsubscribe, favoritePodcasts, onToggleFavoritePodcast }) {
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name || "");
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showImportCSV, setShowImportCSV] = useState(false); // kept for safety
  const [letterboxdOpen, setLetterboxdOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [podcastsOpen, setPodcastsOpen] = useState(false);
  const [allPodcasts, setAllPodcasts] = useState([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(false);
  const fileRef = useRef(null);

  // ── Notification preferences ──
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ new_coverage: true, favorites_only: false });
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Open letterboxd section if navigated here with initialView="letterboxd"
  useEffect(() => {
    if (initialView === "letterboxd") setLetterboxdOpen(true);
  }, [initialView]);

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
        const sortKey = n => n.replace(/^(the|a|an)\s+/i, "").trim();
        const sorted = (data || []).sort((a, b) => {
          if (a.tier === "deep" && b.tier !== "deep") return -1;
          if (a.tier !== "deep" && b.tier === "deep") return 1;
          return sortKey(a.name).localeCompare(sortKey(b.name));
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

  const loadWatchlist = async () => {
    if (!session) return;
    const { data } = await supabase.from("wishlist").select("*")
      .eq("user_id", session.user.id)
      .in("item_type", ["movie", "show"])
      .order("created_at", { ascending: false });
    setWatchlist(data || []);
  };

  const removeFromWatchlist = async (id) => {
    await sb(supabase.from("wishlist").delete().eq("id", id), onToast, "Couldn't delete");
    setWatchlist(prev => prev.filter(w => w.id !== id));
    onToast("Removed from watchlist");
  };

  return (
    <div className="profile-screen" style={{ paddingBottom: "calc(80px + var(--sab, 0px))" }}>
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
                fontFamily: t.fontSerif, fontWeight: 700, fontSize: 22,
                color: "#EF9F27", background: t.bgInput,
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
            style={{ cursor: "pointer", fontFamily: t.fontSerif, fontWeight: 700, color: "#EF9F27" }}
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
          <div className="profile-group-row" onClick={() => setLetterboxdOpen(true)}>
            <span className="profile-group-row-text">Letterboxd</span>
            <span className="profile-group-row-chevron" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {letterboxdSyncing && <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--terracotta)" }}>syncing...</span>}
              {profile.letterboxd_username
                ? <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>@{profile.letterboxd_username}</span>
                : <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>Not connected</span>
              }
              ›
            </span>
          </div>

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
                    const accent = isFav ? "var(--terracotta, #c97849)" : t.textFaint;

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
                          <img src={pod.artwork_url} loading="lazy" alt="" style={{
                            width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                            border: isFav ? "1.5px solid rgba(201,120,73,0.3)" : "1.5px solid rgba(255,255,255,0.06)",
                          }} />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                            background: t.bgElevated,
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
                    width: 18, height: 18, borderRadius: "50%", background: t.textPrimary,
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
                      width: 18, height: 18, borderRadius: "50%", background: t.textPrimary,
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

          <div className="profile-group-row" onClick={() => { setWatchlistOpen(!watchlistOpen); if (!watchlistOpen && watchlist.length === 0) loadWatchlist(); }}>
            <span className="profile-group-row-text">Watchlist</span>
            <span className="profile-group-row-chevron">{watchlistOpen ? "▾" : "›"}</span>
          </div>
          <Expandable open={watchlistOpen}>
            <div style={{ padding: "8px 0 12px" }}>
              {watchlist.length === 0 ? (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-faint)", padding: "12px 18px", lineHeight: 1.5 }}>
                  No films yet. Add movies from the swipe game, community pages, or search.
                </div>
              ) : (
                <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {watchlist.map(item => (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(239,159,39,0.08)",
                      borderRadius: 8,
                    }}>
                      {item.cover_url ? (
                        <img src={item.cover_url} loading="lazy" alt="" style={{
                          width: 34, height: 50, borderRadius: 4, objectFit: "cover",
                          flexShrink: 0, border: "1px solid rgba(239,159,39,0.1)",
                        }} />
                      ) : (
                        <div style={{
                          width: 34, height: 50, borderRadius: 4,
                          background: "rgba(239,159,39,0.06)", border: "1px solid rgba(239,159,39,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 16, opacity: 0.4 }}>🎬</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                          color: "var(--text-primary)", whiteSpace: "nowrap",
                          overflow: "hidden", textOverflow: "ellipsis",
                        }}>{item.title}</div>
                        <div style={{
                          fontFamily: "var(--font-mono)", fontSize: 10,
                          color: "var(--text-faint)", marginTop: 2,
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          {item.year && <span>{item.year}</span>}
                          <span style={{
                            fontSize: 9, color: "rgba(239,159,39,0.5)",
                            background: "rgba(239,159,39,0.08)",
                            borderRadius: 4, padding: "1px 5px", textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}>{item.item_type === "show" ? "show" : "film"}</span>
                        </div>
                      </div>
                      <div
                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id); }}
                        style={{
                          width: 28, height: 28, borderRadius: 6, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(255,255,255,0.02)",
                          border: `1px solid ${t.borderSubtle}`,
                          transition: "all 0.2s",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3l6 6M9 3l-6 6" stroke="var(--text-faint)" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Expandable>
        </div>
      </div>

      {/* ── ADMIN: INBOX ── */}
      {session?.user?.id === "19410e64-d610-4fab-9c26-d24fafc94696" && (
        <div className="profile-group">
          <div className="profile-group-label">Admin</div>
          <div className="profile-group-row" onClick={() => setInboxOpen(!inboxOpen)}>
            <span className="profile-group-row-text">Ingest Inbox</span>
            <span className="profile-group-row-chevron">{inboxOpen ? "▾" : "›"}</span>
          </div>
          <Expandable open={inboxOpen}>
            <div style={{ padding: "4px 0 12px" }}>
              <IngestReviewTool userId={session.user.id} onToast={onToast} session={session} />
            </div>
          </Expandable>
        </div>
      )}

      {/* ── SUPPORT GROUP ── */}
      <div className="profile-group">
        <div className="profile-group-label">Support</div>
        <div className="profile-group-card">
          <div
            className="profile-group-row"
            onClick={() => { setShowAbout(true); pushNav("about", () => setShowAbout(false)); }}
          >
            <span className="profile-group-row-text">About MANTL</span>
            <span className="profile-group-row-chevron">›</span>
          </div>
          <div className="profile-group-divider" />
          <div
            className="profile-group-row"
            onClick={() => window.open("https://mymantl.app/faq", "_blank")}
          >
            <span className="profile-group-row-text">Help & FAQ</span>
            <span className="profile-group-row-chevron">›</span>
          </div>
          <div className="profile-group-divider" />
          <div
            className="profile-group-row"
            onClick={() => window.open("mailto:hello@mymantl.app", "_blank")}
          >
            <span className="profile-group-row-text">Contact</span>
            <span className="profile-group-row-chevron" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>
              hello@mymantl.app
            </span>
          </div>
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
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: t.red, marginBottom: 8 }}>Delete your account?</div>
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
            style={{ display: "inline-block", opacity: 0.7 }}
          >
            <img
              src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
              alt="The Movie Database"
              style={{ height: 16, display: "block" }}
            />
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

      {/* About MANTL Screen */}
      {showAbout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--bg-shell, #0f0d0b)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <AboutMantlScreen onBack={() => { removeNav("about"); setShowAbout(false); }} />
        </div>
      )}

      {/* Import CSV Modal — portaled to body to escape transform containing block */}
      {letterboxdOpen && (
        <LetterboxdSetupPortal
          session={session}
          profile={profile}
          onClose={() => setLetterboxdOpen(false)}
          onComplete={onImportComplete}
          onLetterboxdSync={onLetterboxdSync}
          letterboxdSyncing={letterboxdSyncing}
        />
      )}
    </div>
  );
}


export default ProfileScreen;

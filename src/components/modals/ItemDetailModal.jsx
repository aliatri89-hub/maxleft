import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { fetchTMDBDetails } from "../../utils/api";
import { formatDate } from "../../utils/helpers";
import BottomSheet from "../shared/BottomSheet";
import StarRating from "../shared/StarRating";

/**
 * ItemDetailModal — Dark bottom-sheet for viewing/editing any shelf item.
 * Self-contained: manages its own state and Supabase calls.
 *
 * Props:
 *   item       — shelf item object (with .shelfType added)
 *   session    — auth session
 *   profile    — user profile (for mantlPins)
 *   onClose    — () => void
 *   onRefresh  — () => void — reload shelf data after changes
 *   onPin      — (type, id) => void
 *   onUnpin    — (type, id) => void
 *   onToast    — (msg) => void
 *   onAutoComplete — (habit, ...) => void (optional)
 */
export default function ItemDetailModal({
  item,
  session,
  profile,
  onClose,
  onRefresh,
  onPin,
  onUnpin,
  onToast,
  onAutoComplete,
}) {
  if (!item) return null;

  const { shelfType } = item;
  const userId = session?.user?.id;

  // ── Shared state ──
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [editingRating, setEditingRating] = useState(false);
  const [editRatingVal, setEditRatingVal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localItem, setLocalItem] = useState(item); // mutable copy for optimistic updates

  // ── Book state ──
  const [editPage, setEditPage] = useState(item.currentPage || 0);
  const [readingLog, setReadingLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // ── Show state ──
  const [showSeasons, setShowSeasons] = useState([]);
  const [editSeason, setEditSeason] = useState(item.currentSeason || 1);
  const [editEpisode, setEditEpisode] = useState(item.currentEpisode || 1);
  const [watchingLog, setWatchingLog] = useState([]);
  const [seasonRatings, setSeasonRatings] = useState({});
  const [seasonRating, setSeasonRating] = useState(0);

  // ── Shared for finish flows ──
  const [finishRating, setFinishRating] = useState(0);
  const [finishNotes, setFinishNotes] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  // ── Styling helpers ──
  const label = (text) => (
    <div style={{
      fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
      fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", marginBottom: 8,
      color: "rgba(255,255,255,0.5)",
    }}>{text}</div>
  );

  const statusMsg = () => saveStatus && (
    <div style={{
      marginTop: 10, fontSize: 12, textAlign: "center",
      color: saveStatus === "saved" ? "#4ade80" : saveStatus === "error" ? "#e94560" : "#888",
    }}>
      {saveStatus === "saving" && "Saving..."}
      {saveStatus === "saved" && "✓ Done!"}
      {saveStatus === "error" && "✗ Something went wrong. Try again."}
    </div>
  );

  const flash = (status) => {
    setSaveStatus(status);
    setTimeout(() => setSaveStatus(null), 2500);
  };

  // ── Data loading ──

  // Books: reading log
  useEffect(() => {
    if (shelfType !== "books" || !item.id) return;
    setLoadingLog(true);
    supabase.from("reading_log").select("*").eq("book_id", item.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setReadingLog(data || []); setLoadingLog(false); });
  }, [item.id, shelfType]);

  // Shows: TMDB seasons
  useEffect(() => {
    if (shelfType !== "shows" || !localItem.isWatching || !item.tmdbId) return;
    fetchTMDBDetails(item.tmdbId, "tv").then(d => {
      setShowSeasons(d?.seasons || []);
      setEditSeason(item.currentSeason || 1);
      setEditEpisode(item.currentEpisode || 1);
    });
  }, [item.id, localItem.isWatching]);

  // Shows: watching log + season ratings
  useEffect(() => {
    if (shelfType !== "shows" || !item.id) return;
    supabase.from("watching_log").select("*").eq("show_id", item.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setWatchingLog(data || []));
    supabase.from("season_ratings").select("*").eq("show_id", item.id)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(r => { map[r.season] = r.rating; });
        setSeasonRatings(map);
      });
  }, [item.id, shelfType]);

  // ── Actions ──

  const updateRating = async () => {
    const table = ({ movies: "movies", shows: "shows", games: "games", books: "books" })[shelfType];
    if (!table) return;
    const { error } = await supabase.from(table).update({ rating: editRatingVal || null }).eq("id", item.id);
    if (!error) {
      setLocalItem(prev => ({ ...prev, rating: editRatingVal || null }));
      setEditingRating(false);
      if (onRefresh) onRefresh();
    }
  };

  const removeItem = async () => {
    setDeleting(true);
    const table = ({ movies: "movies", shows: "shows", games: "games", books: "books" })[shelfType];
    if (!table) return;
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (!error) {
      // Also remove from mantl pins if pinned
      const pinType = ({ books: "book", movies: "movie", shows: "show", games: "game" })[shelfType];
      if (onUnpin && pinType) onUnpin(pinType, item.id);
      if (onRefresh) onRefresh();
      onClose();
    } else {
      setDeleting(false);
      if (onToast) onToast("Couldn't delete — try again");
    }
  };

  const saveBookProgress = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");
    const isFinished = editPage >= (localItem.totalPages || 9999);

    try {
      // Save reading log entry if page moved forward
      if (editPage > (localItem.currentPage || 0)) {
        await supabase.from("reading_log").insert({
          book_id: item.id,
          user_id: userId,
          page_from: localItem.currentPage || 0,
          page_to: editPage,
          notes: updateNotes.trim() || null,
        });
      }

      // Update book
      const updates = {
        current_page: editPage,
        ...(isFinished ? {
          status: "read",
          rating: finishRating || null,
          notes: finishNotes.trim() || localItem.notes || null,
          finished_at: new Date().toISOString(),
        } : {}),
      };
      await supabase.from("books").update(updates).eq("id", item.id);

      // Reload reading log
      const { data: freshLog } = await supabase.from("reading_log")
        .select("*").eq("book_id", item.id).order("created_at", { ascending: false });
      setReadingLog(freshLog || []);
      setJournalOpen(true);

      setLocalItem(prev => ({
        ...prev, currentPage: editPage,
        ...(isFinished ? { isReading: false, rating: finishRating || null, status: "read" } : {}),
      }));
      setUpdateNotes("");
      if (isFinished) { setFinishRating(0); setFinishNotes(""); }
      if (onRefresh) onRefresh();
      if (onAutoComplete) onAutoComplete("reading", null, "book");
      flash("saved");
    } catch (err) {
      console.error("Book save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  const saveShowProgress = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");

    const epsBeforeSeason = showSeasons.filter(s => s.number < editSeason).reduce((sum, s) => sum + s.episodes, 0);
    const totalWatched = epsBeforeSeason + editEpisode;
    const seasonEps = showSeasons.find(s => s.number === editSeason)?.episodes || 0;
    const isSeasonFinale = editEpisode >= seasonEps;
    const isShowFinished = editSeason === showSeasons[showSeasons.length - 1]?.number && isSeasonFinale;
    const hasMoved = editSeason !== (localItem.currentSeason || 1) || editEpisode !== (localItem.currentEpisode || 1);

    try {
      if (hasMoved) {
        await supabase.from("watching_log").insert({
          show_id: item.id, user_id: userId,
          season: editSeason,
          episode_from: (editSeason === (localItem.currentSeason || 1)) ? (localItem.currentEpisode || 1) : 1,
          episode_to: editEpisode,
          notes: updateNotes.trim() || null,
        });
      }
      if (seasonRating > 0) {
        await supabase.from("season_ratings").upsert({
          show_id: item.id, user_id: userId,
          season: editSeason, rating: seasonRating,
        }, { onConflict: "show_id,user_id,season" });
      }
      await supabase.from("shows").update({
        current_season: editSeason, current_episode: editEpisode,
        episodes_watched: totalWatched,
        ...(isShowFinished ? { status: "finished", rating: finishRating || null } : {}),
      }).eq("id", item.id);

      // Reload logs
      const { data: freshLog } = await supabase.from("watching_log").select("*")
        .eq("show_id", item.id).order("created_at", { ascending: false });
      setWatchingLog(freshLog || []);
      const { data: freshRatings } = await supabase.from("season_ratings").select("*").eq("show_id", item.id);
      const map = {};
      (freshRatings || []).forEach(r => { map[r.season] = r.rating; });
      setSeasonRatings(map);

      setLocalItem(prev => ({
        ...prev, currentSeason: editSeason, currentEpisode: editEpisode,
        episodesWatched: totalWatched,
        ...(isShowFinished ? { isWatching: false, status: "finished" } : {}),
      }));
      setUpdateNotes(""); setSeasonRating(0);
      if (isShowFinished) setFinishRating(0);
      setJournalOpen(true);
      if (onRefresh) onRefresh();
      if (onAutoComplete) onAutoComplete("watching", null, "show");
      flash("saved");
    } catch (err) {
      console.error("Show save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  const finishGame = async () => {
    if (!userId || !item.id) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      await supabase.from("games").update({
        status: "completed",
        rating: finishRating || null,
        notes: finishNotes.trim() || localItem.notes || null,
        finished_at: new Date().toISOString(),
      }).eq("id", item.id);
      setLocalItem(prev => ({ ...prev, isPlaying: false, rating: finishRating || null, status: "completed" }));
      setFinishRating(0); setFinishNotes("");
      if (onRefresh) onRefresh();
      flash("saved");
    } catch (err) {
      console.error("Game save error:", err);
      flash("error");
    }
    setSaving(false);
  };

  const setGameStatus = async (status) => {
    const { error } = await supabase.from("games").update({ status }).eq("id", item.id);
    if (!error) {
      setLocalItem(prev => ({
        ...prev, status,
        isPlaying: status === "playing",
        isBeat: status === "beat",
      }));
      if (onRefresh) onRefresh();
    }
  };

  // ── Pin logic ──
  const pinType = ({ books: "book", movies: "movie", shows: "show", games: "game" })[shelfType];
  const isPinned = (profile?.mantlPins || []).some(p => p.type === pinType && String(p.id) === String(item.id));
  const pinsFull = (profile?.mantlPins || []).length >= 4 && !isPinned;

  // ── Render helpers ──
  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return <span style={{ color: "#facc15", letterSpacing: 1 }}>{"★".repeat(full)}{hasHalf ? "⯨" : ""}</span>;
  };

  // Computed show state
  const showComputed = shelfType === "shows" && showSeasons.length > 0 ? (() => {
    const epsBeforeSeason = showSeasons.filter(s => s.number < editSeason).reduce((sum, s) => sum + s.episodes, 0);
    const totalWatched = epsBeforeSeason + editEpisode;
    const seasonEps = showSeasons.find(s => s.number === editSeason)?.episodes || 0;
    const isSeasonFinale = editEpisode >= seasonEps;
    const isShowFinished = editSeason === showSeasons[showSeasons.length - 1]?.number && isSeasonFinale;
    const hasMoved = editSeason !== (localItem.currentSeason || 1) || editEpisode !== (localItem.currentEpisode || 1);
    return { totalWatched, isSeasonFinale, isShowFinished, hasMoved };
  })() : null;

  return (
    <BottomSheet onClose={onClose} maxHeight="90vh">
      {/* ── Hero: poster + info ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 100, flexShrink: 0,
          aspectRatio: shelfType === "games" ? "16/9" : "2/3",
          borderRadius: 8, overflow: "hidden",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)",
        }}>
          {localItem.cover ? (
            <img src={localItem.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32,
            }}>
              {{ movies: "🎬", books: "📖", shows: "📺", games: "🎮" }[shelfType]}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
            fontSize: 22, fontWeight: 800, color: "#fff",
            textTransform: "uppercase", lineHeight: 1.1, marginBottom: 4,
          }}>{localItem.title}</div>

          {localItem.year && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.year}</div>}
          {localItem.author && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.author}</div>}
          {localItem.director && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.director}</div>}
          {localItem.platform && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.platform}</div>}
          {shelfType === "games" && localItem.genre && <div style={{ fontSize: 12, color: "#999", marginBottom: 2 }}>{localItem.genre}</div>}

          {localItem.rating && (
            <div style={{ marginTop: 8 }}>
              {renderStars(localItem.rating)}
              <span style={{ fontSize: 11, color: "#888", marginLeft: 6 }}>({localItem.rating})</span>
            </div>
          )}

          {/* Status badges */}
          {localItem.isReading && !localItem.rating && (
            <div style={badgeStyle("#4ade80")}>📖 Currently reading</div>
          )}
          {localItem.isWatching && (
            <div style={badgeStyle("#e94560")}>📺 S{localItem.currentSeason}E{localItem.currentEpisode}</div>
          )}
          {localItem.isPlaying && (
            <div style={badgeStyle("#a78bfa")}>
              🎮 Playing
              {localItem.source === "steam" && <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 4 }}>· Steam</span>}
            </div>
          )}
          {localItem.isBeat && (
            <div style={badgeStyle("#4ade80")}>✓ Beat</div>
          )}

          {localItem.watchedAt && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Watched {formatDate(localItem.watchedAt)}</div>}
          {localItem.finishedAt && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Finished {formatDate(localItem.finishedAt)}</div>}
        </div>
      </div>

      {/* ── Game: Mark as Finished ── */}
      {localItem.isPlaying && shelfType === "games" && (
        <Section>
          {label("Finished playing?")}
          <StarRating value={finishRating} onChange={setFinishRating} label="Rate This Game" />
          <textarea
            style={textareaStyle}
            placeholder="Final thoughts... (optional)"
            value={finishNotes}
            onChange={(e) => setFinishNotes(e.target.value)}
          />
          <button style={primaryBtn} onClick={finishGame} disabled={saving}>
            {saving ? "Saving..." : "Mark as Finished"}
          </button>
          {statusMsg()}
        </Section>
      )}

      {/* ── Book: Page Progress ── */}
      {localItem.isReading && shelfType === "books" && (
        <Section>
          {label("Page Progress")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input
              type="number" min="0" max={localItem.totalPages || 9999}
              value={editPage || ""}
              onChange={(e) => setEditPage(Math.max(0, parseInt(e.target.value) || 0))}
              onFocus={() => { if (!editPage) setEditPage(localItem.currentPage || 0); }}
              placeholder="0"
              style={{ ...inputStyle, width: 72, textAlign: "center" }}
            />
            <span style={{ color: "#666", fontSize: 13 }}>of {localItem.totalPages || "?"} pages</span>
          </div>

          {localItem.totalPages > 0 && (
            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
              <div style={{
                height: "100%", borderRadius: 2, transition: "width 0.3s",
                width: `${Math.min(100, ((editPage || localItem.currentPage || 0) / localItem.totalPages) * 100)}%`,
                background: "linear-gradient(90deg, #4ade80, #22c55e)",
              }} />
            </div>
          )}

          {/* Notes for update */}
          {editPage > (localItem.currentPage || 0) && editPage < (localItem.totalPages || 9999) && (
            <textarea style={textareaStyle} placeholder="Thoughts on this section? (optional)"
              value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} />
          )}

          {/* Finish book: rating appears at last page */}
          {editPage >= (localItem.totalPages || 9999) && (
            <>
              <textarea style={textareaStyle} placeholder="Thoughts on this section? (optional)"
                value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} />
              <div style={{ marginTop: 12 }}>
                <StarRating value={finishRating} onChange={setFinishRating} label="Rate This Book" />
              </div>
              <textarea style={{ ...textareaStyle, marginTop: 12 }} placeholder="Final thoughts... (optional)"
                value={finishNotes} onChange={(e) => setFinishNotes(e.target.value)} />
            </>
          )}

          <button style={primaryBtn} onClick={saveBookProgress} disabled={saving}>
            {saving ? "Saving..." : editPage >= (localItem.totalPages || 9999) ? "Mark as Finished" : "Update Progress"}
          </button>
          {statusMsg()}
        </Section>
      )}

      {/* ── Show: Episode Tracker ── */}
      {localItem.isWatching && shelfType === "shows" && (
        <Section>
          {label("Episode Progress")}
          {showSeasons.length > 0 ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "#888", fontSize: 12 }}>S</span>
                <select style={selectStyle} value={editSeason}
                  onChange={(e) => { setEditSeason(parseInt(e.target.value)); setEditEpisode(1); }}>
                  {showSeasons.map(s => <option key={s.number} value={s.number}>{s.number}</option>)}
                </select>
                <span style={{ color: "#888", fontSize: 12 }}>E</span>
                <select style={selectStyle} value={editEpisode}
                  onChange={(e) => setEditEpisode(parseInt(e.target.value))}>
                  {Array.from({ length: showSeasons.find(s => s.number === editSeason)?.episodes || 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              {localItem.totalEpisodes > 0 && showComputed && (
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{
                    height: "100%", borderRadius: 2, transition: "width 0.3s",
                    width: `${Math.min(100, (showComputed.totalWatched / localItem.totalEpisodes) * 100)}%`,
                    background: "linear-gradient(90deg, #e94560, #c4384f)",
                  }} />
                </div>
              )}

              {showComputed?.hasMoved && (
                <textarea style={textareaStyle} placeholder="Thoughts on these episodes? (optional)"
                  value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} />
              )}

              {/* Season finale rating */}
              {showComputed?.isSeasonFinale && !showComputed?.isShowFinished && (
                <div style={{ marginTop: 12 }}>
                  <StarRating value={seasonRating} onChange={setSeasonRating} label={`Rate Season ${editSeason}`} />
                </div>
              )}

              {/* Show finished: season + overall rating */}
              {showComputed?.isShowFinished && (
                <>
                  <div style={{ marginTop: 12 }}>
                    <StarRating value={seasonRating} onChange={setSeasonRating} label={`Rate Season ${editSeason}`} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <StarRating value={finishRating} onChange={setFinishRating} label="Rate the Overall Show" />
                  </div>
                </>
              )}

              <button style={primaryBtn} onClick={saveShowProgress} disabled={saving}>
                {saving ? "Saving..." : showComputed?.isShowFinished ? "Mark as Finished"
                  : showComputed?.isSeasonFinale ? `Finish Season ${editSeason}` : "Update Progress"}
              </button>
              {statusMsg()}
            </>
          ) : (
            <div style={{ color: "#666", fontSize: 13 }}>Loading seasons...</div>
          )}
        </Section>
      )}

      {/* ── Steam Stats (games) ── */}
      {shelfType === "games" && localItem.source === "steam" && (() => {
        const hours = localItem.playtimeHours != null ? Math.round(localItem.playtimeHours) : null;
        const achTotal = localItem.achievementsTotal || 0;
        const achEarned = localItem.achievementsEarned || 0;
        const achPct = achTotal > 0 ? Math.round((achEarned / achTotal) * 100) : 0;
        return (hours || achTotal) ? (
          <Section>
            {label("Steam Stats")}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {hours != null && (
                <StatCard value={`${hours}h`} sub="PLAYED" />
              )}
              {achTotal > 0 && (
                <div style={{ flex: 1, minWidth: 100, padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono, monospace)" }}>
                    {achEarned}<span style={{ fontSize: 14, color: "#666" }}>/{achTotal}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.05em", fontFamily: "var(--font-mono, monospace)" }}>ACHIEVEMENTS</div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${achPct}%`, background: achPct === 100 ? "#4ade80" : "#a78bfa", borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              )}
            </div>
          </Section>
        ) : null;
      })()}

      {/* ── Notes display ── */}
      {localItem.notes && shelfType !== "books" && shelfType !== "shows" && !(shelfType === "games" && localItem.source === "steam") && (
        <Section>
          {label("Your Notes")}
          <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{localItem.notes}</div>
        </Section>
      )}

      {/* ── Reading Journal ── */}
      {shelfType === "books" && readingLog.length > 0 && (
        <Section>
          <div onClick={() => setJournalOpen(!journalOpen)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer", padding: "8px 0",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>Reading Journal</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#666" }}>{readingLog.length} {readingLog.length === 1 ? "entry" : "entries"}</span>
              <span style={{ color: "#666", transform: journalOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </span>
          </div>
          {journalOpen && readingLog.map((entry) => (
            <div key={entry.id} onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
              style={{
                padding: "10px 14px", marginBottom: 6,
                background: "rgba(255,255,255,0.03)", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#999" }}>p.{entry.page_from} → p.{entry.page_to}</span>
                <span style={{ fontSize: 10, color: "#666" }}>{formatDate(entry.created_at)}</span>
              </div>
              {expandedEntry === entry.id && entry.notes && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#aaa", lineHeight: 1.4 }}>{entry.notes}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* ── Watching Journal ── */}
      {shelfType === "shows" && watchingLog.length > 0 && (
        <Section>
          <div onClick={() => setJournalOpen(!journalOpen)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer", padding: "8px 0",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>Watching Journal</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#666" }}>{watchingLog.length} {watchingLog.length === 1 ? "entry" : "entries"}</span>
              <span style={{ color: "#666", transform: journalOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </span>
          </div>
          {journalOpen && (
            <>
              {Object.keys(seasonRatings).length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {Object.entries(seasonRatings).sort((a, b) => a[0] - b[0]).map(([season, rating]) => (
                    <div key={season} style={{ display: "flex", justifyContent: "space-between", padding: "6px 14px", fontSize: 12, color: "#999" }}>
                      <span>Season {season}</span>
                      <span>{renderStars(rating)} <span style={{ color: "#666" }}>({rating})</span></span>
                    </div>
                  ))}
                </div>
              )}
              {watchingLog.map((entry) => (
                <div key={entry.id} onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  style={{
                    padding: "10px 14px", marginBottom: 6,
                    background: "rgba(255,255,255,0.03)", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#999" }}>S{entry.season} E{entry.episode_from}–{entry.episode_to}</span>
                    <span style={{ fontSize: 10, color: "#666" }}>{formatDate(entry.created_at)}</span>
                  </div>
                  {expandedEntry === entry.id && entry.notes && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#aaa", lineHeight: 1.4 }}>{entry.notes}</div>
                  )}
                </div>
              ))}
            </>
          )}
        </Section>
      )}

      {/* ── Pin to Mantl ── */}
      <div style={{ marginBottom: 12 }}>
        <button
          disabled={pinsFull}
          onClick={() => { if (isPinned) onUnpin(pinType, item.id); else onPin(pinType, item.id); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, cursor: pinsFull ? "not-allowed" : "pointer",
            fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
            fontWeight: 600, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase",
            border: "none",
            opacity: pinsFull ? 0.4 : 1,
            background: isPinned ? "#C4734F" : "rgba(196,115,79,0.12)",
            color: isPinned ? "white" : "#C4734F",
            transition: "all 0.15s",
          }}
        >
          {isPinned ? "📌 Unpin from Mantl" : pinsFull ? "Mantl Full (4/4)" : "📌 Pin to Mantl"}
        </button>
      </div>

      {/* ── Game status selector ── */}
      {shelfType === "games" && (
        <Section>
          {label("Status")}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "playing", label: "🎮 Playing", bg: "linear-gradient(135deg, #a78bfa, #7c5cc4)", color: "white" },
              { key: "completed", label: "📋 Backlog", bg: "rgba(255,255,255,0.04)", color: "#888" },
              { key: "beat", label: "✓ Beat", bg: "#4ade80", color: "#0a0a0a" },
            ].map(opt => {
              const isActive = (localItem.status || "completed") === opt.key;
              return (
                <button key={opt.key} onClick={() => setGameStatus(opt.key)}
                  style={{
                    flex: 1, padding: "10px 8px", fontSize: 11, border: "none", borderRadius: 8,
                    cursor: "pointer", fontFamily: "var(--font-mono, monospace)", fontWeight: isActive ? 700 : 400,
                    background: isActive ? opt.bg : "rgba(255,255,255,0.04)",
                    color: isActive ? opt.color : "rgba(255,255,255,0.3)",
                    boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s",
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Actions: Edit rating + Remove ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {!localItem.isReading && !localItem.isWatching && !localItem.isPlaying && (
          <button style={secondaryBtn} onClick={() => {
            setEditingRating(!editingRating);
            setEditRatingVal(localItem.rating || 0);
            setConfirmDelete(false);
          }}>
            {editingRating ? "Cancel" : "Edit Rating"}
          </button>
        )}
        <button style={dangerBtn} onClick={() => { setConfirmDelete(!confirmDelete); setEditingRating(false); }}>
          Remove from Shelf
        </button>
      </div>

      {/* ── Inline edit rating ── */}
      {editingRating && (
        <Section>
          <StarRating value={editRatingVal} onChange={setEditRatingVal} label="Update Rating" />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={primaryBtn} onClick={updateRating}>Save</button>
            <button style={secondaryBtn} onClick={() => setEditingRating(false)}>Cancel</button>
          </div>
        </Section>
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div style={{
          marginTop: 12, padding: "14px 16px",
          background: "rgba(233,69,96,0.06)",
          border: "1px solid rgba(233,69,96,0.15)",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, marginBottom: 12 }}>
            Remove <strong style={{ color: "#fff" }}>{localItem.title}</strong> from your shelf? This will also delete any journal entries and ratings.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...primaryBtn, background: "#e94560" }}
              onClick={removeItem} disabled={deleting}>
              {deleting ? "Deleting..." : "Yes, Remove"}
            </button>
            <button style={secondaryBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Close ── */}
      <button style={ghostBtn} onClick={onClose}>Cancel</button>
    </BottomSheet>
  );
}

// ── Sub-components ──

function Section({ children }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>;
}

function StatCard({ value, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 100, padding: "14px 16px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10, textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "var(--font-mono, monospace)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.05em", fontFamily: "var(--font-mono, monospace)" }}>{sub}</div>
    </div>
  );
}

// ── Style constants ──

function badgeStyle(color) {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    marginTop: 8, padding: "3px 10px",
    background: `${color}15`, border: `1px solid ${color}40`,
    borderRadius: 20, fontSize: 11, color, fontWeight: 600,
  };
}

const textareaStyle = {
  width: "100%", minHeight: 60,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, color: "#e0e0e0",
  fontSize: 13, padding: "10px 12px",
  resize: "none", fontFamily: "inherit", outline: "none",
  marginBottom: 12,
};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#e0e0e0",
  fontSize: 14, padding: "8px 10px",
  fontFamily: "inherit", outline: "none",
};

const selectStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#e0e0e0",
  fontSize: 14, padding: "8px 12px",
  fontFamily: "inherit", outline: "none",
  appearance: "none", WebkitAppearance: "none",
  width: 72, colorScheme: "dark",
};

const primaryBtn = {
  flex: 1, width: "100%", padding: "13px 0",
  background: "linear-gradient(135deg, #4ade80, #22c55e)",
  border: "none", borderRadius: 12,
  color: "#0a0a0a", fontSize: 14, fontWeight: 700,
  fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
  cursor: "pointer", transition: "opacity 0.15s",
  textAlign: "center", letterSpacing: "0.02em",
};

const secondaryBtn = {
  flex: 1, width: "100%", padding: "11px 0",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12, color: "#ccc",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background 0.15s",
  textAlign: "center",
};

const dangerBtn = {
  flex: 1, width: "100%", padding: "11px 0",
  background: "rgba(233,69,96,0.08)",
  border: "1px solid rgba(233,69,96,0.2)",
  borderRadius: 12, color: "#e94560",
  fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "background 0.15s",
  textAlign: "center",
};

const ghostBtn = {
  width: "100%", padding: "10px 0", marginTop: 8,
  background: "none", border: "none",
  color: "#666", fontSize: 13, cursor: "pointer",
};

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { COUNTRIES } from "../../utils/countries";
import { VISIT_MONTHS, formatVisitDate } from "../../utils/constants";
import { compressImage, sb } from "../../utils/api";
import { formatDate } from "../../utils/helpers";
import { WORLD_MAP_URL, ISO_NUM_A2, decodeTopojson, geoPathStr } from "../../utils/geo";
import LocationInput from "../LocationInput";
import ItemDetailModal from "./ItemDetailModal";

/**
 * ShelfModals — Renders all shelf-related modals/overlays.
 *
 * Receives "trigger" props (what's open + closers) from ShelfHome.
 * Manages all internal modal state (forms, editing, confirming, etc).
 */
export default function ShelfModals({
  // Trigger state (controlled by parent)
  addingEvent, setAddingEvent,
  viewingEvent, setViewingEvent,
  trophyCaseOpen, setTrophyCaseOpen,
  addingTrophy, setAddingTrophy,
  addingCountry, setAddingCountry,
  viewingCountry, setViewingCountry,
  showPassportMap, setShowPassportMap,
  diaryShelf, setDiaryShelf,
  viewingItem, setViewingItem,
  showPinPicker, setShowPinPicker,
  // Data
  shelves, profile, session,
  // Callbacks
  onRefresh, onToast, onPin, onUnpin, onShelfIt, onUpdateProfile, onAutoComplete,
}) {
  // ── Internal modal state ──
  const [eventForm, setEventForm] = useState({ name: "", location: "", date: "", goal: "" });
  const [savingEvent, setSavingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);
  const [completingEvent, setCompletingEvent] = useState(false);
  const [eventResult, setEventResult] = useState("");
  const [uploadingTrophyPhoto, setUploadingTrophyPhoto] = useState(false);
  const [repositioningPhoto, setRepositioningPhoto] = useState(false);
  const [photoPos, setPhotoPos] = useState({ x: 50, y: 50 });
  const repoDragRef = useRef(null);

  // Passport modal state
  const [countrySearch, setCountrySearch] = useState("");
  const [savingCountry, setSavingCountry] = useState(false);
  const [confirmDeleteCountry, setConfirmDeleteCountry] = useState(false);
  const [passportTab, setPassportTab] = useState("been");
  const [pendingCountry, setPendingCountry] = useState(null);
  const [multiSelectCountries, setMultiSelectCountries] = useState(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);
  const [pendingVisitMonth, setPendingVisitMonth] = useState("");
  const [pendingVisitYear, setPendingVisitYear] = useState("");
  const [pendingTripMonth, setPendingTripMonth] = useState("");
  const [pendingTripYear, setPendingTripYear] = useState("");
  const [editingCountryDate, setEditingCountryDate] = useState(false);
  const [editVisitMonth, setEditVisitMonth] = useState("");
  const [editVisitYear, setEditVisitYear] = useState("");
  const [mapData, setMapData] = useState(null);
  const [mapTooltip, setMapTooltip] = useState(null);

  // Diary state
  const [diaryView, setDiaryView] = useState("diary");
  const [diarySort, setDiarySort] = useState("date-desc");
  const [beatAnimId, setBeatAnimId] = useState(null);
  const [pinSearch, setPinSearch] = useState("");
  const [pinCategory, setPinCategory] = useState(null); // null = show category tiles, "book"/"movie"/etc = filtered
  const [pendingPin, setPendingPin] = useState(null);
  const [pinNote, setPinNote] = useState("");

  const toggleBeat = async (gameId, currentStatus) => {
    const newStatus = currentStatus === "beat" ? "playing" : "beat";
    setBeatAnimId(gameId);
    const { error } = await supabase.from("games").update({ status: newStatus }).eq("id", gameId).eq("user_id", session.user.id);
    if (!error) onRefresh();
    setTimeout(() => setBeatAnimId(null), 600);
  };

  const shelfConfig = {
    books: { icon: "📖", label: "Bookshelf", modalCat: "book" },
    movies: { icon: "🎬", label: "Movies", modalCat: "movie" },
    shows: { icon: "📺", label: "Shows", modalCat: "show" },
    games: { icon: "🎮", label: "Games", modalCat: "game" },
  };

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

  // Reset internal state when event overlay opens
  useEffect(() => {
    if (viewingEvent) {
      const [x, y] = (viewingEvent.photoPosition || "50 50").split(" ").map(Number);
      setPhotoPos({ x: x || 50, y: y || 50 });
      setRepositioningPhoto(false);
      setEditingEvent(false);
      setConfirmDeleteEvent(false);
      setCompletingEvent(false);
    }
  }, [viewingEvent?.id]);

  // Reset form when add modals open
  useEffect(() => {
    if (addingEvent) setEventForm({ name: "", location: "", date: "", goal: "", distance: "" });
  }, [addingEvent]);
  useEffect(() => {
    if (addingTrophy) setEventForm({ name: "", location: "", date: "", result: "", distance: "" });
  }, [addingTrophy]);
  useEffect(() => {
    if (addingCountry) { setCountrySearch(""); setPendingCountry(null); setMultiSelectCountries(new Set()); }
  }, [addingCountry]);
  useEffect(() => {
    if (showPinPicker) { setPinSearch(""); setPinCategory(null); setPendingPin(null); setPinNote(""); }
  }, [showPinPicker]);

  // Load world map data
  useEffect(() => {
    if (!showPassportMap || mapData) return;
    fetch(WORLD_MAP_URL)
      .then(r => r.json())
      .then(data => setMapData(decodeTopojson(data, "countries")))
      .catch(() => {});
  }, [showPassportMap]);

  return (
    <>
      {/* ══ Add Event Modal ══ */}
      {/* Add Event Modal */}
      {addingEvent && (
        <div className="overlay" onClick={() => setAddingEvent(false)}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Add Event</div>
              <div className="pin-picker-close" onClick={() => setAddingEvent(false)}>✕</div>
            </div>
            <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div className="event-form-label">Event Name</div>
                <input className="event-form-input" placeholder="e.g. Boston Marathon" value={eventForm.name} onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <div className="event-form-label">Location</div>
                <LocationInput value={eventForm.location} onChange={v => setEventForm(prev => ({ ...prev, location: v }))} placeholder="City name for cover photo (e.g. Boston)" />
                <div className="event-form-hint">Used to pull a location photo — try a city or landmark name</div>
              </div>
              <div>
                <div className="event-form-label">Date</div>
                <input className="event-form-input" type="date" value={eventForm.date} onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div>
                <div className="event-form-label">Goal <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
                <input className="event-form-input" placeholder='e.g. Sub 3:30, Finish, Summit Day 2' value={eventForm.goal} onChange={e => setEventForm(prev => ({ ...prev, goal: e.target.value }))} />
              </div>
              <div>
                <div className="event-form-label">Distance <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
                <input className="event-form-input" placeholder="e.g. 26.2 mi, 50K, Half Marathon" value={eventForm.distance || ""} onChange={e => setEventForm(prev => ({ ...prev, distance: e.target.value }))} />
              </div>
              <button className="btn-shelf-it" disabled={!eventForm.name.trim() || savingEvent} onClick={async () => {
                if (!session || !eventForm.name.trim()) return;
                setSavingEvent(true);
                try {
                  await supabase.from("workout_goals").insert({
                    user_id: session.user.id,
                    name: eventForm.name.trim(),
                    location: eventForm.location.trim() || null,
                    target_date: eventForm.date || null,
                    goal_text: eventForm.goal.trim() || null,
                    distance: eventForm.distance?.trim() || null,
                    is_active: true,
                    habit_id: 1,
                    source: "mantl",
                  });
                  setSavingEvent(false);
                  setAddingEvent(false);
                  if (onRefresh) onRefresh();
                } catch (err) {
                  console.error(err);
                  setSavingEvent(false);
                }
              }}>
                {savingEvent ? "Adding..." : "Add Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Trophy Case */}
      {trophyCaseOpen && shelves.trophies?.length > 0 && (
        <div className="item-detail-overlay" onClick={(e) => e.target === e.currentTarget && setTrophyCaseOpen(false)}>
          <div className="item-detail-sheet" style={{ maxWidth: 500, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer" }} onClick={() => setTrophyCaseOpen(false)}>← Back</span>
                <span className="bb" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, letterSpacing: "0.08em", textTransform: "uppercase" }}>🏆 Trophy Case</span>
              </div>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{shelves.trophies.length} event{shelves.trophies.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="trophy-case-list">
              {[...shelves.trophies].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0)).map((item, i) => (
                <div className="trophy-overlay-card" key={i} onClick={() => {
                  setViewingEvent({ ...item, _isTrophy: true });
                  setEditingEvent(false); setConfirmDeleteEvent(false); setCompletingEvent(false);
                }}>
                  {item.locationImage ? (
                    <img src={item.locationImage} alt="" style={{ objectPosition: `${(item.photoPosition || "50 50").split(" ").join("% ")}%` }} />
                  ) : (
                    <div className="trophy-overlay-card-fallback">{item.emoji || "🏆"}</div>
                  )}
                  {item.locationImage && <div className="trophy-overlay-gradient" />}
                  <div className="trophy-overlay-content">
                    <div>
                      <div className="trophy-overlay-event">{item.title}{item.distance ? ` · ${item.distance}` : ""}</div>
                      <div className="trophy-overlay-meta">
                        {item.completedAt && formatDate(item.completedAt)}{item.location ? ` · ${item.location}` : ""}
                      </div>
                    </div>
                    {item.result && <div className="trophy-overlay-result">🏅 {item.result}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", padding: "16px" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer" }}
                onClick={() => { setTrophyCaseOpen(false); setAddingTrophy(true); setEventForm({ name: "", location: "", date: "", result: "", distance: "" }); }}>
                + Add a trophy
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Trophy Modal */}
      {addingTrophy && (
        <div className="overlay" onClick={() => setAddingTrophy(false)}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Add Trophy</div>
              <div className="pin-picker-close" onClick={() => setAddingTrophy(false)}>✕</div>
            </div>
            <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div className="event-form-label">What did you do?</div>
                <input className="event-form-input" placeholder="e.g. Boston Marathon, Mt. Kilimanjaro Summit" value={eventForm.name} onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <div className="event-form-label">Location</div>
                <LocationInput value={eventForm.location} onChange={v => setEventForm(prev => ({ ...prev, location: v }))} placeholder="City or landmark for cover photo" />
                <div className="event-form-hint">Used to pull a location photo — try a city or landmark name</div>
              </div>
              <div>
                <div className="event-form-label">Date Completed</div>
                <input className="event-form-input" type="date" value={eventForm.date} onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))} />
              </div>
              <div>
                <div className="event-form-label">Result <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
                <input className="event-form-input" placeholder="e.g. 3:28:12, Finished!, Summit reached" value={eventForm.result || ""} onChange={e => setEventForm(prev => ({ ...prev, result: e.target.value }))} />
              </div>
              <div>
                <div className="event-form-label">Distance <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
                <input className="event-form-input" placeholder="e.g. 26.2 mi, 50K, Half Marathon" value={eventForm.distance || ""} onChange={e => setEventForm(prev => ({ ...prev, distance: e.target.value }))} />
              </div>
              <div>
                <div className="event-form-label">Photo <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
                {eventForm._photoPreview ? (
                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
                    <img src={eventForm._photoPreview} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer" }}
                      onClick={() => setEventForm(prev => ({ ...prev, _photoFile: null, _photoPreview: null }))}>✕</div>
                  </div>
                ) : (
                  <div className="trophy-photo-empty" style={{ height: 60, cursor: "pointer" }} onClick={() => document.getElementById("trophy-add-photo-input")?.click()}>
                    <span style={{ fontSize: 16 }}>📷</span>
                    <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Add a photo</span>
                  </div>
                )}
                <input id="trophy-add-photo-input" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = "";
                  const preview = URL.createObjectURL(file);
                  setEventForm(prev => ({ ...prev, _photoFile: file, _photoPreview: preview }));
                }} />
              </div>
              <button className="btn-shelf-it" disabled={!eventForm.name.trim() || savingEvent} onClick={async () => {
                if (!session || !eventForm.name.trim()) return;
                setSavingEvent(true);
                try {
                  const { data: inserted } = await supabase.from("workout_goals").insert({
                    user_id: session.user.id,
                    name: eventForm.name.trim(),
                    location: eventForm.location.trim() || null,
                    completed_at: eventForm.date ? new Date(eventForm.date + "T12:00:00").toISOString() : new Date().toISOString(),
                    result: eventForm.result?.trim() || null,
                    distance: eventForm.distance?.trim() || null,
                    is_active: false,
                    habit_id: 1,
                    source: "mantl",
                  }).select("id").single();
                  // Upload photo if selected
                  if (eventForm._photoFile && inserted?.id) {
                    try {
                      const compressed = await compressImage(eventForm._photoFile);
                      const ext = compressed.type === "image/jpeg" ? "jpg" : compressed.name.split(".").pop();
                      const path = `${session.user.id}/${inserted.id}.${ext}`;
                      const { error: upErr } = await supabase.storage.from("trophy-photos").upload(path, compressed, { upsert: true, contentType: compressed.type });
                      if (!upErr) {
                        const { data: urlData } = supabase.storage.from("trophy-photos").getPublicUrl(path);
                        const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
                        await supabase.from("workout_goals").update({ photo_url: publicUrl }).eq("id", inserted.id);
                      }
                    } catch (photoErr) { console.error("Photo upload error:", photoErr); }
                  }
                  setSavingEvent(false);
                  setAddingTrophy(false);
                  if (onRefresh) onRefresh();
                  onToast("🏆 Trophy added!");
                } catch (err) {
                  console.error(err);
                  setSavingEvent(false);
                }
              }}>
                {savingEvent ? "Adding..." : "🏆 Add to Trophy Case"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Event Overlay */}
      {viewingEvent && (
        <div className="item-detail-overlay" onClick={(e) => e.target === e.currentTarget && (() => { setViewingEvent(null); setCompletingEvent(false); setEventResult(""); })()}>
          <div className="item-detail-sheet">
            <div className="item-detail-close" onClick={() => { setViewingEvent(null); setCompletingEvent(false); setEventResult(""); }}>✕</div>

            {/* Event header image with photo upload + reposition */}
            <div className="trophy-photo-area"
              onClick={() => {
                if (repositioningPhoto || uploadingTrophyPhoto) return;
                if (!session) return;
                document.getElementById("trophy-photo-input")?.click();
              }}
              onTouchStart={(e) => {
                if (!repositioningPhoto) return;
                const t = e.touches[0];
                repoDragRef.current = { startX: t.clientX, startY: t.clientY, startPosX: photoPos.x, startPosY: photoPos.y };
              }}
              onTouchMove={(e) => {
                if (!repositioningPhoto || !repoDragRef.current) return;
                e.preventDefault();
                const t = e.touches[0];
                const dx = t.clientX - repoDragRef.current.startX;
                const dy = t.clientY - repoDragRef.current.startY;
                // Invert: drag right = show more left = decrease X%
                const newX = Math.max(0, Math.min(100, repoDragRef.current.startPosX - (dx / 2)));
                const newY = Math.max(0, Math.min(100, repoDragRef.current.startPosY - (dy / 1.5)));
                setPhotoPos({ x: newX, y: newY });
              }}
              onTouchEnd={() => { repoDragRef.current = null; }}
              onMouseDown={(e) => {
                if (!repositioningPhoto) return;
                repoDragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: photoPos.x, startPosY: photoPos.y };
              }}
              onMouseMove={(e) => {
                if (!repositioningPhoto || !repoDragRef.current) return;
                const dx = e.clientX - repoDragRef.current.startX;
                const dy = e.clientY - repoDragRef.current.startY;
                const newX = Math.max(0, Math.min(100, repoDragRef.current.startPosX - (dx / 2)));
                const newY = Math.max(0, Math.min(100, repoDragRef.current.startPosY - (dy / 1.5)));
                setPhotoPos({ x: newX, y: newY });
              }}
              onMouseUp={() => { repoDragRef.current = null; }}
            >
              {viewingEvent.locationImage ? (
                <>
                  <img src={viewingEvent.locationImage} alt="" style={{
                    width: "100%", height: "100%", objectFit: "cover",
                    objectPosition: `${photoPos.x}% ${photoPos.y}%`,
                    filter: uploadingTrophyPhoto ? "brightness(0.3)" : repositioningPhoto ? "brightness(0.85)" : "brightness(0.6)",
                    cursor: repositioningPhoto ? "grab" : "pointer",
                  }} />
                  {repositioningPhoto ? (
                    <div className="trophy-repo-controls">
                      <span className="trophy-repo-hint">Drag to reposition</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="trophy-repo-btn" onClick={async (e) => {
                          e.stopPropagation();
                          const pos = `${Math.round(photoPos.x)} ${Math.round(photoPos.y)}`;
                          await supabase.from("workout_goals").update({ photo_position: pos }).eq("id", viewingEvent.id);
                          setViewingEvent(prev => ({ ...prev, photoPosition: pos }));
                          setRepositioningPhoto(false);
                          if (onRefresh) onRefresh();
                          onToast("Position saved!");
                        }}>Save</button>
                        <button className="trophy-repo-btn trophy-repo-cancel" onClick={(e) => {
                          e.stopPropagation();
                          const [ox, oy] = (viewingEvent.photoPosition || "50 50").split(" ").map(Number);
                          setPhotoPos({ x: ox, y: oy });
                          setRepositioningPhoto(false);
                        }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="trophy-photo-overlay-btn" style={{ bottom: 8, right: 8 }}>
                        {uploadingTrophyPhoto ? "Uploading…" : "📷"}
                      </div>
                      {viewingEvent.photoUrl && (
                        <>
                          <div className="trophy-photo-overlay-btn" style={{ bottom: 8, right: 48 }} onClick={(e) => {
                            e.stopPropagation();
                            const [ox, oy] = (viewingEvent.photoPosition || "50 50").split(" ").map(Number);
                            setPhotoPos({ x: ox, y: oy });
                            setRepositioningPhoto(true);
                          }}>
                            ✥
                          </div>
                          <div className="trophy-photo-overlay-btn" style={{ bottom: 8, right: 88, fontSize: 12 }} onClick={async (e) => {
                            e.stopPropagation();
                            if (!session || !viewingEvent) return;
                            await supabase.from("workout_goals").update({ photo_url: null, photo_position: "50 50" }).eq("id", viewingEvent.id);
                            // Try to delete from storage (best effort)
                            try { await supabase.storage.from("trophy-photos").remove([`${session.user.id}/${viewingEvent.id}`]); } catch (e) {}
                            setViewingEvent(prev => ({ ...prev, photoUrl: null, locationImage: null, photoPosition: "50 50" }));
                            setPhotoPos({ x: 50, y: 50 });
                            if (onRefresh) onRefresh();
                            onToast("Photo removed");
                          }}>
                            ✕
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="trophy-photo-empty">
                  {uploadingTrophyPhoto ? (
                    <span style={{ fontSize: 13, color: "var(--text-faint)" }}>Uploading…</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 22 }}>📷</span>
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Add a photo</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              id="trophy-photo-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !session || !viewingEvent) return;
                e.target.value = "";
                setUploadingTrophyPhoto(true);
                try {
                  const compressed = await compressImage(file);
                  const ext = compressed.type === "image/jpeg" ? "jpg" : compressed.name.split(".").pop();
                  const path = `${session.user.id}/${viewingEvent.id}.${ext}`;
                  const { error: upErr } = await supabase.storage
                    .from("trophy-photos")
                    .upload(path, compressed, { upsert: true, contentType: compressed.type });
                  if (upErr) throw upErr;
                  const { data: urlData } = supabase.storage.from("trophy-photos").getPublicUrl(path);
                  const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
                  await supabase.from("workout_goals").update({ photo_url: publicUrl }).eq("id", viewingEvent.id);
                  setViewingEvent(prev => ({ ...prev, locationImage: publicUrl, photoUrl: publicUrl }));
                  if (onRefresh) onRefresh();
                  onToast("Photo saved!");
                } catch (err) {
                  console.error("Trophy photo upload error:", err);
                  onToast("Upload failed — make sure the 'trophy-photos' storage bucket exists in Supabase");
                }
                setUploadingTrophyPhoto(false);
              }}
            />

            <div>

              {editingEvent ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div className="event-form-label">Event Name</div>
                    <input className="event-form-input" value={eventForm.name} onChange={e => setEventForm(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <div className="event-form-label">Location</div>
                    <LocationInput value={eventForm.location} onChange={v => setEventForm(prev => ({ ...prev, location: v }))} placeholder="City or landmark" />
                    <div className="event-form-hint">City or landmark name for the cover photo</div>
                  </div>
                  <div>
                    <div className="event-form-label">{viewingEvent._isTrophy ? "Date Completed" : "Date"}</div>
                    <input className="event-form-input" type="date" value={eventForm.date} onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))} />
                  </div>
                  {viewingEvent._isTrophy ? (
                    <div>
                      <div className="event-form-label">Result</div>
                      <input className="event-form-input" placeholder="e.g. 3:28:12, Finished!, Summit reached" value={eventForm.result || ""} onChange={e => setEventForm(prev => ({ ...prev, result: e.target.value }))} />
                    </div>
                  ) : (
                    <div>
                      <div className="event-form-label">Goal</div>
                      <input className="event-form-input" placeholder='e.g. Sub 3:30' value={eventForm.goal} onChange={e => setEventForm(prev => ({ ...prev, goal: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <div className="event-form-label">Distance <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
                    <input className="event-form-input" placeholder="e.g. 26.2 mi, 50K, Half Marathon" value={eventForm.distance || ""} onChange={e => setEventForm(prev => ({ ...prev, distance: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-shelf-it" style={{ flex: 1 }} disabled={savingEvent} onClick={async () => {
                      if (!session) return;
                      setSavingEvent(true);
                      if (viewingEvent._isTrophy) {
                        await sb(supabase.from("workout_goals").update({
                          name: eventForm.name.trim(),
                          location: eventForm.location.trim() || null,
                          completed_at: eventForm.date ? new Date(eventForm.date + "T12:00:00").toISOString() : viewingEvent.completedAt,
                          result: eventForm.result?.trim() || null,
                          distance: eventForm.distance?.trim() || null,
                          }).eq("id", viewingEvent.id), onToast, "Couldn't update");

                      } else {
                        await sb(supabase.from("workout_goals").update({
                          name: eventForm.name.trim(),
                          location: eventForm.location.trim() || null,
                          target_date: eventForm.date || null,
                          goal_text: eventForm.goal.trim() || null,
                          distance: eventForm.distance?.trim() || null,
                          }).eq("id", viewingEvent.id), onToast, "Couldn't update");

                      }
                      setSavingEvent(false);
                      setEditingEvent(false);
                      setViewingEvent(null);
                      if (onRefresh) onRefresh();
                    }}>
                      {savingEvent ? "Saving..." : "Save Changes"}
                    </button>
                    <button className="btn-edit-rating" style={{ flex: 0 }} onClick={() => setEditingEvent(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="item-detail-title">{viewingEvent.title}</div>
                  {viewingEvent.distance && <div className="item-detail-meta" style={{ fontWeight: 600, color: "var(--terracotta)" }}>{viewingEvent.distance}</div>}
                  {viewingEvent.location && <div className="item-detail-meta">{viewingEvent.location}</div>}
                  {viewingEvent._isTrophy ? (
                    <>
                      {viewingEvent.completedAt && <div className="item-detail-meta">{formatDate(viewingEvent.completedAt)}</div>}
                      {viewingEvent.result && <div className="item-detail-meta" style={{ fontStyle: "italic", marginTop: 8 }}>Result: {viewingEvent.result}</div>}
                      {!viewingEvent.result && (
                        <div className="event-add-goal" onClick={() => {
                          setEditingEvent(true);
                          setEventForm({ name: viewingEvent.title, location: viewingEvent.location || "", date: viewingEvent.completedAt ? viewingEvent.completedAt.slice(0, 10) : "", result: "", distance: viewingEvent.distance || "" });
                        }}>+ Add a result</div>
                      )}
                    </>
                  ) : (
                    <>
                      {viewingEvent.targetDate && <div className="item-detail-meta">{formatDate(viewingEvent.targetDate)}</div>}
                      {viewingEvent.goal && <div className="item-detail-meta" style={{ fontStyle: "italic", marginTop: 8 }}>Goal: {viewingEvent.goal}</div>}
                      {!viewingEvent.goal && (
                        <div className="event-add-goal" onClick={() => {
                          setEditingEvent(true);
                          setEventForm({ name: viewingEvent.title, location: viewingEvent.location || "", date: viewingEvent.targetDate || "", goal: "", distance: viewingEvent.distance || "" });
                        }}>+ Add a goal</div>
                      )}
                    </>
                  )}

                  {/* Event completion — show when date is today or past */}
                  {viewingEvent.targetDate && new Date(viewingEvent.targetDate + "T23:59:59") <= new Date() && (
                    completingEvent ? (
                      <div style={{ marginTop: 16, padding: 16, background: "rgba(196, 115, 79, 0.08)", borderRadius: 12, border: "1px solid rgba(196, 115, 79, 0.2)" }}>
                        <div className="event-form-label" style={{ color: "var(--terracotta)", fontWeight: 600 }}>How did it go?</div>
                        <input
                          className="event-form-input"
                          placeholder="e.g. 3:28:12, Finished!, Summit reached"
                          value={eventResult}
                          onChange={e => setEventResult(e.target.value)}
                          autoFocus
                        />
                        <div className="event-form-hint">Add your result, time, or a note — or leave blank</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button className="btn-shelf-it" style={{ flex: 1 }} disabled={savingEvent} onClick={async () => {
                            if (!session) return;
                            setSavingEvent(true);
                            await sb(supabase.from("workout_goals").update({
                              is_active: false,
                              completed_at: new Date().toISOString(),
                              result: eventResult.trim() || null,
                              }).eq("id", viewingEvent.id), onToast, "Couldn't update");

                            // Update pin type from goal to trophy if pinned
                            if ((profile.mantlPins || []).some(p => p.type === "goal" && String(p.id) === String(viewingEvent.id))) {
                              const updatedPins = (profile.mantlPins || []).map(p =>
                                p.type === "goal" && String(p.id) === String(viewingEvent.id) ? { ...p, type: "trophy" } : p
                              );
                              await sb(supabase.from("profiles").update({ mantl_pins: updatedPins }).eq("id", session.user.id), onToast, "Couldn't update");
                            }
                            setSavingEvent(false);
                            setCompletingEvent(false);
                            setEventResult("");
                            setViewingEvent(null);
                            // Log to feed
                            try {
                              await supabase.from("feed_activity").insert({
                                user_id: session.user.id,
                                activity_type: "event",
                                action: "completed",
                                title: viewingEvent.title,
                                item_title: viewingEvent.title,
                                item_cover: viewingEvent.locationImage || null,
                                item_author: viewingEvent.location || null,
                                rating: null,
                              });
                            } catch (e) { console.error("Feed activity error:", e); }
                            if (onRefresh) onRefresh();
                            onToast("🏆 Moved to Trophy Case!");
                          }}>
                            {savingEvent ? "Saving..." : "🏆 Move to Trophy Case"}
                          </button>
                          <button className="btn-edit-rating" style={{ flex: 0 }} onClick={() => { setCompletingEvent(false); setEventResult(""); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{ marginTop: 16, padding: "12px 16px", background: "rgba(196, 115, 79, 0.08)", borderRadius: 10, border: "1px solid rgba(196, 115, 79, 0.2)", cursor: "pointer", textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--terracotta)", letterSpacing: "0.02em" }}
                        onClick={() => { setCompletingEvent(true); setEventResult(""); }}
                      >
                        🏆 Event day{new Date(viewingEvent.targetDate + "T23:59:59") < new Date(new Date().setHours(0,0,0,0)) ? " has passed" : "!"} — Log your result
                      </div>
                    )
                  )}

                  <div className="item-detail-actions" style={{ marginTop: 20 }}>
                    <button className="btn-edit-rating" onClick={() => {
                      setEditingEvent(true);
                      if (viewingEvent._isTrophy) {
                        setEventForm({ name: viewingEvent.title, location: viewingEvent.location || "", date: viewingEvent.completedAt ? viewingEvent.completedAt.slice(0, 10) : "", result: viewingEvent.result || "", distance: viewingEvent.distance || "" });
                      } else {
                        setEventForm({ name: viewingEvent.title, location: viewingEvent.location || "", date: viewingEvent.targetDate || "", goal: viewingEvent.goal || "", distance: viewingEvent.distance || "" });
                      }
                    }}>Edit</button>
                    <button className="btn-remove" onClick={() => setConfirmDeleteEvent(true)}>Remove</button>
                  </div>

                  {confirmDeleteEvent && (
                    <div className="confirm-delete">
                      <div className="confirm-delete-text">
                        Remove <strong>{viewingEvent.title}</strong>{viewingEvent._isTrophy ? " from your trophy case?" : "? This won't affect your trophy case."}
                      </div>
                      <div className="confirm-delete-btns">
                        <button className="btn-confirm-yes" onClick={async () => {
                          await sb(supabase.from("workout_goals").delete().eq("id", viewingEvent.id), onToast, "Couldn't delete");
                          // Auto-unpin if pinned
                          if ((profile.mantlPins || []).some(p => p.type === "goal" && String(p.id) === String(viewingEvent.id))) {
                            onUnpin("goal", viewingEvent.id);
                          }
                          setViewingEvent(null);
                          setConfirmDeleteEvent(false);
                          if (onRefresh) onRefresh();
                        }}>Yes, Remove</button>
                        <button className="btn-confirm-no" onClick={() => setConfirmDeleteEvent(false)}>Keep It</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Passport Modals (Add Country, Country Detail, Map) ══ */}
      {/* Add Country Modal */}
      {addingCountry && (
        <div className="overlay" onClick={() => { setAddingCountry(false); setPendingCountry(null); setMultiSelectCountries(new Set()); }}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Add Country</div>
              <div className="pin-picker-close" onClick={() => { setAddingCountry(false); setPendingCountry(null); setMultiSelectCountries(new Set()); }}>✕</div>
            </div>
            <div style={{ padding: "0 16px" }}>
              <input
                ref={el => { if (el && !el.dataset.init) { el.dataset.init = "1"; setTimeout(() => el.blur(), 10); } }}
                className="pin-picker-search"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
              />
            </div>
            <div style={{ padding: "0 16px 8px" }}>
              <div className="passport-tabs" style={{ marginBottom: 0 }}>
                <div className={`passport-tab${passportTab === "been" ? " active" : ""}`} onClick={() => { setPassportTab("been"); setMultiSelectCountries(new Set()); setPendingCountry(null); }}>Been</div>
                <div className={`passport-tab${passportTab === "bucket_list" ? " active" : ""}`} onClick={() => { setPassportTab("bucket_list"); setMultiSelectCountries(new Set()); setPendingCountry(null); }}>Bucket List</div>
              </div>
            </div>

            {/* Multi-select hint for Been tab */}
            {passportTab === "been" && multiSelectCountries.size === 0 && !pendingCountry && (
              <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", padding: "0 16px 8px", lineHeight: 1.5 }}>
                Tap to select multiple · Long-press for date
              </div>
            )}

            <div className="pin-picker-list" style={{ paddingBottom: passportTab === "been" && multiSelectCountries.size > 0 ? 60 : 0 }}>
              {(() => {
                const bucketCount = shelves.countries?.filter(sc => sc.status === "bucket_list").length || 0;
                const bucketFull = passportTab === "bucket_list" && bucketCount >= 4;
                if (bucketFull) return (
                  <div className="passport-empty-tab" style={{ padding: "24px 16px" }}>
                    Your bucket list is full! Visit one of your 4 countries first, then add more.
                    <div className="shelf-empty-cta" onClick={() => setPassportTab("been")} style={{ marginTop: 8 }}>Switch to Been →</div>
                  </div>
                );
                return COUNTRIES.filter(c => {
                  if (!countrySearch) return true;
                  return c.name.toLowerCase().includes(countrySearch.toLowerCase());
                }).map(c => {
                const alreadyAdded = shelves.countries?.some(sc => sc.countryCode === c.code);
                const isPending = pendingCountry?.code === c.code;
                const isMultiSelected = multiSelectCountries.has(c.code);
                return (
                  <div key={c.code}>
                    <div
                      className={`pin-picker-item${alreadyAdded ? " pinned" : ""}${isPending || isMultiSelected ? " pinned" : ""}`}
                      onClick={() => {
                        if (alreadyAdded) return;
                        if (passportTab === "been") {
                          // Multi-select mode: toggle checkbox
                          setPendingCountry(null);
                          setMultiSelectCountries(prev => {
                            const next = new Set(prev);
                            if (next.has(c.code)) next.delete(c.code); else next.add(c.code);
                            return next;
                          });
                        } else {
                          // Bucket list: single select with date picker
                          if (isPending) { setPendingCountry(null); return; }
                          setPendingCountry(c);
                          setPendingTripMonth("");
                          setPendingTripYear("");
                        }
                      }}
                      onContextMenu={(e) => {
                        // Long-press / right-click: single-add with date (Been tab)
                        if (passportTab !== "been" || alreadyAdded) return;
                        e.preventDefault();
                        setMultiSelectCountries(new Set());
                        if (isPending) { setPendingCountry(null); return; }
                        setPendingCountry(c);
                        setPendingVisitMonth("");
                        setPendingVisitYear("");
                      }}
                    >
                      <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt="" style={{ width: 28, borderRadius: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      </div>
                      {passportTab === "been" && !alreadyAdded && (
                        <div style={{ fontSize: 16, color: isMultiSelected ? "var(--terracotta)" : "var(--text-faint)", transition: "all 0.15s" }}>
                          {isMultiSelected ? "✓" : "○"}
                        </div>
                      )}
                      {passportTab === "bucket_list" && (
                        <div style={{ fontSize: 16, color: alreadyAdded ? "var(--terracotta)" : isPending ? "var(--terracotta)" : "var(--text-faint)" }}>
                          {alreadyAdded ? "✓" : isPending ? "▾" : "+"}
                        </div>
                      )}
                      {passportTab === "been" && alreadyAdded && (
                        <div style={{ fontSize: 16, color: "var(--terracotta)" }}>✓</div>
                      )}
                    </div>
                    {/* Single-add date picker for Been (via long-press) */}
                    {isPending && passportTab === "been" && (
                      <div style={{ padding: "12px 16px", background: "rgba(196,115,79,0.04)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                          Last visited (optional)
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select value={pendingVisitMonth} onChange={e => setPendingVisitMonth(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                            <option value="">Month</option>
                            {VISIT_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                          </select>
                          <select value={pendingVisitYear} onChange={e => setPendingVisitYear(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                            <option value="">Year</option>
                            {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <button className="btn-save-profile" style={{ fontSize: 12, padding: "8px 16px", whiteSpace: "nowrap", opacity: savingCountry ? 0.5 : 1 }} disabled={savingCountry} onClick={async (e) => {
                            e.stopPropagation();
                            if (savingCountry) return;
                            const m = pendingVisitMonth ? parseInt(pendingVisitMonth) : null;
                            const y = pendingVisitYear ? parseInt(pendingVisitYear) : null;
                            const countryName = c.name;
                            const countryCode = c.code;
                            const countryFlag = c.flag;
                            setSavingCountry(true);
                            const visitedAt = y ? new Date(y, m ? m - 1 : 0, 1).toISOString() : new Date().toISOString();
                            const photo = null;
                            const { error } = await supabase.from("countries").insert({
                              user_id: session.user.id,
                              country_code: countryCode,
                              country_name: countryName,
                              status: "been",
                              photo_url: photo || null,
                              visited_at: visitedAt,
                              visit_month: m,
                              visit_year: y,
                            });
                            if (!error) { await onRefresh(); onToast(`${countryFlag} ${countryName} added!`); }
                            setSavingCountry(false);
                            setPendingCountry(null);
                          }}>{savingCountry ? "Adding..." : "Add"}</button>
                        </div>
                      </div>
                    )}
                    {isPending && passportTab === "bucket_list" && (
                      <div style={{ padding: "12px 16px", background: "rgba(139,158,126,0.06)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                          ✈ Planned trip? (optional)
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select value={pendingTripMonth} onChange={e => setPendingTripMonth(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                            <option value="">Month</option>
                            {VISIT_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                          </select>
                          <select value={pendingTripYear} onChange={e => setPendingTripYear(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                            <option value="">Year</option>
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <button className="btn-save-profile" style={{ fontSize: 12, padding: "8px 16px", whiteSpace: "nowrap", background: "var(--sage)", opacity: savingCountry ? 0.5 : 1 }} disabled={savingCountry} onClick={async (e) => {
                            e.stopPropagation();
                            if (savingCountry) return;
                            const tm = pendingTripMonth ? parseInt(pendingTripMonth) : null;
                            const ty = pendingTripYear ? parseInt(pendingTripYear) : null;
                            const countryName = c.name;
                            const countryCode = c.code;
                            const countryFlag = c.flag;
                            setSavingCountry(true);
                            const photo = null;
                            const { error } = await supabase.from("countries").insert({
                              user_id: session.user.id,
                              country_code: countryCode,
                              country_name: countryName,
                              status: "bucket_list",
                              photo_url: photo || null,
                              trip_month: tm,
                              trip_year: ty,
                            });
                            if (!error) { await onRefresh(); onToast(`${countryFlag} ${countryName} added!`); }
                            setSavingCountry(false);
                            setPendingCountry(null);
                            setAddingCountry(false);
                          }}>{savingCountry ? "Adding..." : "Add"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
              })()}
            </div>

            {/* Bulk add bar for Been tab */}
            {passportTab === "been" && multiSelectCountries.size > 0 && (
              <div style={{
                position: "sticky", bottom: 0, padding: "12px 16px", background: "var(--cream)",
                borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12,
              }}>
                <div className="mono" style={{ flex: 1, fontSize: 11, color: "var(--text-dim)" }}>
                  {multiSelectCountries.size} countr{multiSelectCountries.size === 1 ? "y" : "ies"} selected
                </div>
                <button className="mono" onClick={() => setMultiSelectCountries(new Set())}
                  style={{ fontSize: 10, padding: "8px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--text-dim)" }}>
                  Clear
                </button>
                <button className="btn-shelf-it" disabled={bulkAdding}
                  style={{ fontSize: 12, padding: "8px 16px", width: "auto", flex: "none" }}
                  onClick={async () => {
                    setBulkAdding(true);
                    const codes = [...multiSelectCountries];
                    const selected = codes.map(code => COUNTRIES.find(c => c.code === code)).filter(Boolean);
                    // Insert in batches of 5
                    let added = 0;
                    for (let i = 0; i < selected.length; i += 5) {
                      const batch = selected.slice(i, i + 5);
                      const rows = batch.map((c) => ({
                        user_id: session.user.id,
                        country_code: c.code,
                        country_name: c.name,
                        status: "been",
                        photo_url: null,
                        visited_at: new Date().toISOString(),
                      }));
                      const { error } = await supabase.from("countries").insert(rows);
                      if (!error) added += batch.length;
                    }
                    await onRefresh();
                    onToast(`🌍 ${added} countr${added === 1 ? "y" : "ies"} added!`);
                    setMultiSelectCountries(new Set());
                    setBulkAdding(false);
                    setAddingCountry(false);
                  }}
                >
                  {bulkAdding ? "Adding..." : `Add ${multiSelectCountries.size}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Country Detail Overlay */}
      {viewingCountry && (
        <div className="item-detail-overlay" onClick={() => setViewingCountry(null)}>
          <div className="item-detail-sheet" onClick={e => e.stopPropagation()}>
            {viewingCountry.photoUrl && (
              <div className="passport-detail-hero" style={{ backgroundImage: `url(${viewingCountry.photoUrl})` }}>
                <div className="passport-detail-hero-overlay">
                  <img src={`https://flagcdn.com/w160/${viewingCountry.countryCode.toLowerCase()}.png`} alt="" className="passport-detail-flag-img" />
                  <div className="passport-detail-name">{viewingCountry.countryName}</div>
                </div>
              </div>
            )}
            {!viewingCountry.photoUrl && (
              <div style={{ padding: "24px 20px 0", textAlign: "center" }}>
                <img src={`https://flagcdn.com/w160/${viewingCountry.countryCode.toLowerCase()}.png`} alt="" style={{ width: 64, borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
                <div className="passport-detail-name" style={{ color: "var(--charcoal)", marginTop: 8 }}>{viewingCountry.countryName}</div>
              </div>
            )}
            <div style={{ padding: "16px 20px 24px" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {viewingCountry.status === "been" ? "Visited" : "Bucket List"}
                {viewingCountry.status === "been" && (viewingCountry.visitMonth || viewingCountry.visitYear) ? ` · ${formatVisitDate(viewingCountry.visitMonth, viewingCountry.visitYear)}` : ""}
                {viewingCountry.status === "bucket_list" && (viewingCountry.tripMonth || viewingCountry.tripYear) ? ` · ✈ ${formatVisitDate(viewingCountry.tripMonth, viewingCountry.tripYear)}` : ""}
              </div>
              {viewingCountry.status === "been" && !editingCountryDate && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 12, color: "var(--terracotta)", cursor: "pointer" }} onClick={() => {
                    setEditingCountryDate(true);
                    setEditVisitMonth(viewingCountry.visitMonth ? String(viewingCountry.visitMonth) : "");
                    setEditVisitYear(viewingCountry.visitYear ? String(viewingCountry.visitYear) : "");
                  }}>
                    {(viewingCountry.visitMonth || viewingCountry.visitYear) ? "Edit date" : "+ Add visit date"}
                  </span>
                </div>
              )}
              {viewingCountry.status === "bucket_list" && !editingCountryDate && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 12, color: "var(--sage)", cursor: "pointer" }} onClick={() => {
                    setEditingCountryDate(true);
                    setEditVisitMonth(viewingCountry.tripMonth ? String(viewingCountry.tripMonth) : "");
                    setEditVisitYear(viewingCountry.tripYear ? String(viewingCountry.tripYear) : "");
                  }}>
                    {(viewingCountry.tripMonth || viewingCountry.tripYear) ? "Edit trip date" : "+ Add planned trip"}
                  </span>
                </div>
              )}
              {editingCountryDate && viewingCountry.status === "been" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <select value={editVisitMonth} onChange={e => setEditVisitMonth(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                    <option value="">Month</option>
                    {VISIT_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <select value={editVisitYear} onChange={e => setEditVisitYear(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                    <option value="">Year</option>
                    {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button className="btn-save-profile" style={{ fontSize: 11, padding: "8px 14px", whiteSpace: "nowrap" }} onClick={async () => {
                    const m = editVisitMonth ? parseInt(editVisitMonth) : null;
                    const y = editVisitYear ? parseInt(editVisitYear) : null;
                    const visitedAt = y ? new Date(y, m ? m - 1 : 0, 1).toISOString() : null;
                    await sb(supabase.from("countries").update({ visit_month: m, visit_year: y, visited_at: visitedAt || viewingCountry.visited_at }).eq("id", viewingCountry.id), onToast, "Couldn't update");
                    await onRefresh();
                    setViewingCountry({ ...viewingCountry, visitMonth: m, visitYear: y });
                    setEditingCountryDate(false);
                    onToast("Date updated");
                  }}>Save</button>
                </div>
              )}
              {editingCountryDate && viewingCountry.status === "bucket_list" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <select value={editVisitMonth} onChange={e => setEditVisitMonth(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                    <option value="">Month</option>
                    {VISIT_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <select value={editVisitYear} onChange={e => setEditVisitYear(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, background: "white", color: "var(--charcoal)" }}>
                    <option value="">Year</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button className="btn-save-profile" style={{ fontSize: 11, padding: "8px 14px", whiteSpace: "nowrap", background: "var(--sage)" }} onClick={async () => {
                    const m = editVisitMonth ? parseInt(editVisitMonth) : null;
                    const y = editVisitYear ? parseInt(editVisitYear) : null;
                    await sb(supabase.from("countries").update({ trip_month: m, trip_year: y }).eq("id", viewingCountry.id), onToast, "Couldn't update");
                    await onRefresh();
                    setViewingCountry({ ...viewingCountry, tripMonth: m, tripYear: y });
                    setEditingCountryDate(false);
                    onToast("Trip date updated");
                  }}>Save</button>
                </div>
              )}
              {viewingCountry.notes && (
                <div style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "var(--text-dim)", fontStyle: "italic", marginBottom: 12 }}>
                  {viewingCountry.notes}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {viewingCountry.status === "bucket_list" && (
                <button className="btn-save-profile" style={{ flex: 1, fontSize: 12, padding: 10 }} onClick={async () => {
                  const updateData = { status: "been" };
                  updateData.visit_month = viewingCountry.tripMonth || null;
                  updateData.visit_year = viewingCountry.tripYear || null;
                  const y = updateData.visit_year;
                  const m = updateData.visit_month;
                  updateData.visited_at = y ? new Date(y, m ? m - 1 : 0, 1).toISOString() : new Date().toISOString();
                  await sb(supabase.from("countries").update(updateData).eq("id", viewingCountry.id), onToast, "Couldn't update");
                  await onRefresh();
                  setViewingCountry(null);
                  onToast("Moved to Been ✓");
                }}>
                  Mark as Visited ✓
                </button>
                )}
              </div>
              {!confirmDeleteCountry ? (
                <div className="strava-disconnect" style={{ textAlign: "center", marginTop: 12 }} onClick={() => setConfirmDeleteCountry(true)}>
                  Remove from Passport
                </div>
              ) : (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>Remove {viewingCountry.countryName}?</div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button className="btn-save-profile" style={{ fontSize: 11, padding: "8px 16px", background: "#C45043" }} onClick={async () => {
                      await sb(supabase.from("countries").delete().eq("id", viewingCountry.id), onToast, "Couldn't delete");
                      await onRefresh();
                      setViewingCountry(null);
                      onToast(`${viewingCountry.flag} removed`);
                    }}>Remove</button>
                    <button className="btn-save-profile" style={{ fontSize: 11, padding: "8px 16px", background: "var(--text-faint)" }} onClick={() => setConfirmDeleteCountry(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Passport World Map */}
      {showPassportMap && (
        <div className="passport-map-overlay">
          <div className="passport-map-header">
            <div className="passport-map-title">🌍 Your Passport</div>
            <div className="passport-map-close" onClick={() => { setShowPassportMap(false); setMapTooltip(null); }}>✕</div>
          </div>
          <div className="passport-map-body">
            {(() => {
              const visitedCodes = new Set(shelves.countries?.filter(c => c.status === "been").map(c => c.countryCode) || []);
              const bucketCodes = new Set(shelves.countries?.filter(c => c.status === "bucket_list").map(c => c.countryCode) || []);
              const homeCode = profile.homeCountry || null;
              const visitedCount = visitedCodes.size;
              const bucketCount = bucketCodes.size;
              const countryLookup = {};
              (shelves.countries || []).forEach(c => { countryLookup[c.countryCode] = c; });
              const MW = 800, MH = 450;
              return (
                <>
                  <div className="passport-map-stats">
                    <div className="passport-map-stat">
                      <div className="passport-map-stat-num">{visitedCount}</div>
                      <div className="passport-map-stat-label">Visited</div>
                    </div>
                    <div className="passport-map-stat">
                      <div className="passport-map-stat-num">{bucketCount}</div>
                      <div className="passport-map-stat-label">Bucket List</div>
                    </div>
                    <div className="passport-map-stat">
                      <div className="passport-map-stat-num">{Math.round((visitedCount / 195) * 100)}%</div>
                      <div className="passport-map-stat-label">of the world</div>
                    </div>
                  </div>
                  <div className="passport-map-legend">
                    {homeCode && (
                      <div className="passport-map-legend-item">
                        <img src={`https://flagcdn.com/w40/${homeCode.toLowerCase()}.png`} alt="" style={{ width: 14, height: 10, borderRadius: 1, objectFit: "cover" }} />
                        Home
                      </div>
                    )}
                    <div className="passport-map-legend-item">
                      <div className="passport-map-legend-dot" style={{ background: "var(--terracotta)" }} />
                      Visited
                    </div>
                    <div className="passport-map-legend-item">
                      <div className="passport-map-legend-dot" style={{ background: "var(--sage)" }} />
                      Bucket List
                    </div>
                  </div>
                  <div className="passport-map-container" style={{ marginTop: 12 }}>
                    {!mapData ? (
                      <div className="passport-map-loading">Loading map...</div>
                    ) : (
                      <svg viewBox={`0 0 ${MW} ${MH}`} xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          {homeCode && (
                            <pattern id="home-flag-pattern" patternUnits="objectBoundingBox" width="1" height="1">
                              <image href={`https://flagcdn.com/w320/${homeCode.toLowerCase()}.png`} width="100%" height="100%" preserveAspectRatio="none" />
                            </pattern>
                          )}
                        </defs>
                        <rect width={MW} height={MH} fill="rgba(166,200,222,0.15)" />
                        {mapData.map((country, i) => {
                          const code = ISO_NUM_A2[country.id];
                          const isHome = code && homeCode && code === homeCode;
                          const isVisited = code && visitedCodes.has(code);
                          const isBucket = code && bucketCodes.has(code);
                          const fill = isHome ? "url(#home-flag-pattern)" : isVisited ? "var(--terracotta)" : isBucket ? "var(--sage)" : "rgba(0,0,0,0.06)";
                          const stroke = isHome ? "var(--gold)" : isVisited || isBucket ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.08)";
                          const strokeW = isHome ? 1 : isVisited || isBucket ? 0.5 : 0.3;
                          const cls = (isHome || isVisited) ? "visited-country" : isBucket ? "bucket-country" : "";
                          const d = country.type === "Polygon"
                            ? geoPathStr(country.coords, MW, MH)
                            : country.coords.map(poly => geoPathStr(poly, MW, MH)).join("");
                          return (
                            <path
                              key={i}
                              d={d}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={strokeW}
                              className={cls}
                              onMouseEnter={e => {
                                if (!code || (!isVisited && !isBucket && !isHome)) return;
                                const c = countryLookup[code];
                                const hc = isHome && !c ? COUNTRIES.find(x => x.code === homeCode) : null;
                                const name = c ? c.countryName : hc ? hc.name : "";
                                const cCode = c ? c.countryCode : homeCode;
                                const date = c ? formatVisitDate(c.visitMonth, c.visitYear) : "";
                                const status = c ? c.status : "home";
                                if (name) setMapTooltip({ name, code: cCode, x: e.clientX, y: e.clientY, date, status });
                              }}
                              onMouseMove={e => {
                                if (mapTooltip) setMapTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
                              }}
                              onMouseLeave={() => setMapTooltip(null)}
                              onClick={() => {
                                if (!code) return;
                                const c = countryLookup[code];
                                if (c) {
                                  setViewingCountry(c);
                                  setConfirmDeleteCountry(false);
                                  setEditingCountryDate(false);
                                  setShowPassportMap(false);
                                  setMapTooltip(null);
                                }
                              }}
                            />
                          );
                        })}
                      </svg>
                    )}
                  </div>
                  {profile.username && (
                    <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      @{profile.username}'s passport
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          {mapTooltip && (
            <div className="passport-map-country-tooltip" style={{ left: mapTooltip.x, top: mapTooltip.y }}>
              <img src={`https://flagcdn.com/w40/${mapTooltip.code.toLowerCase()}.png`} alt="" className="tooltip-flag" />
              {mapTooltip.name}
              {mapTooltip.status === "home" ? " · Home" : ""}
              {mapTooltip.date ? ` · ${mapTooltip.date}` : ""}
            </div>
          )}
        </div>
      )}

      {/* ── Diary / See All Overlay ── */}

      {/* ══ Diary / See All Overlay ══ */}
      {diaryShelf && (() => {
        const cfg = shelfConfig[diaryShelf];
        const items = shelves[diaryShelf] || [];
        const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

        // Group items
        let sortedGroups;
        if (diaryShelf === "games") {
          // Games: group by status (Playing → Backlog → Beat)
          const playing = items.filter(i => i.status === "playing" || i.isPlaying);
          const backlog = items.filter(i => i.status === "completed" || (!i.isPlaying && i.status !== "beat" && i.status !== "playing"));
          const beat = items.filter(i => i.status === "beat");
          // Sort each group by playtime (parsed from notes)
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
          // Group by rating, exclude unrated
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
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => (b._date || 0) - (a._date || 0)),
            }));
        } else {
          // Non-games: group by month
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
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => dateAsc ? (a._date || Infinity) - (b._date || Infinity) : (b._date || 0) - (a._date || 0)),
            }));
          if (undatedGroup) sortedGroups.push(undatedGroup);
        }

        return (
          <div className="item-detail-overlay" onClick={(e) => e.target === e.currentTarget && setDiaryShelf(null)}>
            <div className="item-detail-sheet" style={{ maxHeight: "92vh" }}>
              <div className="modal-handle" />
              <button className="item-detail-close" onClick={() => setDiaryShelf(null)}>← Close</button>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div className="bb" style={{ fontSize: 20 }}>{cfg?.icon} {cfg?.label}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
                    {items.length} total
                    {diaryShelf === "games" && (() => {
                      const beat = items.filter(i => i.status === "beat").length;
                      const backlog = items.filter(i => i.status !== "beat").length;
                      return beat > 0 || backlog > 0 ? ` · ${beat} beat · ${backlog} to go` : "";
                    })()}
                  </div>
                </div>
                {/* View toggle */}
                <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                  <button className="mono" onClick={() => setDiaryView("diary")}
                    style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                      background: diaryView === "diary" ? "rgba(255,255,255,0.12)" : "transparent",
                      color: diaryView === "diary" ? "var(--text-primary)" : "var(--text-muted)" }}>
                    Diary
                  </button>
                  <button className="mono" onClick={() => setDiaryView("grid")}
                    style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                      background: diaryView === "grid" ? "rgba(255,255,255,0.12)" : "transparent",
                      color: diaryView === "grid" ? "var(--text-primary)" : "var(--text-muted)" }}>
                    Grid
                  </button>
                </div>
              </div>

              {/* Sort controls */}
              {diaryShelf !== "games" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {[
                    { key: "date-desc", label: "Newest" },
                    { key: "date-asc", label: "Oldest" },
                    { key: "rating", label: "★ Highest" },
                    { key: "rating-asc", label: "★ Lowest" },
                  ].map(s => (
                    <button key={s.key} className="mono" onClick={() => setDiarySort(s.key)}
                      style={{
                        padding: "5px 12px", fontSize: 10, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, cursor: "pointer",
                        background: diarySort === s.key ? "rgba(255,255,255,0.12)" : "transparent",
                        color: diarySort === s.key ? "var(--text-primary)" : "var(--text-muted)",
                        borderColor: diarySort === s.key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid View */}
              {diaryView === "grid" && (() => {
                let gridItems = diaryShelf === "games" ? items : [...items];
                if (diaryShelf !== "games") {
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
                        background: item.cover ? `url(${item.cover}) center/cover` : "rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: diaryShelf === "games" && item.status === "beat" ? 0.5 : 1,
                      }}>
                        {!item.cover && <span style={{ fontSize: 24 }}>{cfg?.icon}</span>}
                      </div>
                      {diaryShelf === "games" && item.status === "beat" && (
                        <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%", background: "var(--accent-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: "white" }}>✓</span>
                        </div>
                      )}
                      {item.rating > 0 && (
                        <div style={{ fontSize: 10, color: "var(--accent-terra)", marginTop: 3, letterSpacing: 1 }}>
                          {renderStars(item.rating)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                );
              })()}

              {/* Diary View */}
              {diaryView === "diary" && (
                <div style={{ paddingBottom: 20 }}>
                  {sortedGroups.map((group, gi) => (
                    <div key={gi} style={{ marginBottom: 20 }}>
                      <div className="bb" style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8, letterSpacing: "0.04em" }}>
                        {group.label}
                      </div>
                      {group.items.map((item, i) => {
                        const day = item._date ? item._date.getDate() : null;
                        const isGame = diaryShelf === "games";
                        return (
                          <div key={i} className={beatAnimId === item.id && item.status !== "beat" ? "beat-fade" : ""} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            opacity: isGame && item.status === "beat" && beatAnimId !== item.id ? 0.65 : 1,
                          }}>
                            {/* Left column: date for non-games, beat toggle for games */}
                            {isGame ? (
                              <div onClick={(e) => { e.stopPropagation(); toggleBeat(item.id, item.status); }}
                                className={beatAnimId === item.id ? "beat-pop" : ""}
                                style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: item.status === "beat" ? "var(--accent-green)" : "rgba(255,255,255,0.06)",
                                  border: item.status === "beat" ? "none" : "2px solid rgba(255,255,255,0.1)",
                                  transition: "all 0.2s ease",
                                }}>
                                {item.status === "beat" ? <span style={{ fontSize: 14, color: "white" }}>✓</span> : ""}
                              </div>
                            ) : (
                              <div className="mono" style={{ width: 28, fontSize: 13, fontWeight: 600, color: "var(--text-dim)", textAlign: "center", flexShrink: 0 }}>
                                {day || "—"}
                              </div>
                            )}
                            {/* Poster */}
                            <div style={{
                              width: 36, height: 54, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                              background: item.cover ? `url(${item.cover}) center/cover` : "rgba(255,255,255,0.06)",
                              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                              {!item.cover && <span style={{ fontSize: 14 }}>{cfg?.icon}</span>}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setViewingItem({ ...item, shelfType: diaryShelf }); setDiaryShelf(null); }}>
                              <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isGame && item.status === "beat" ? "line-through" : "none" }}>
                                {item.title}
                              </div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                                {isGame ? (
                                  <>{item.notes || item.platform || ""}</>
                                ) : (
                                  <>{item.director || item.author || ""}{item.year ? ` · ${item.year}` : ""}</>
                                )}
                              </div>
                            </div>
                            {/* Right: rating/source */}
                            <div style={{ flexShrink: 0, textAlign: "right" }}>
                              {item.rating > 0 && (
                                <div style={{ fontSize: 11, color: "var(--accent-terra)", letterSpacing: 1 }}>
                                  {renderStars(item.rating)}
                                </div>
                              )}
                              {item.source === "letterboxd" && (
                                <div style={{ display: "flex", gap: 2, justifyContent: "flex-end", marginTop: 2 }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E054" }} />
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#40BCF4" }} />
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF8000" }} />
                                </div>
                              )}
                              {isGame && item.status === "beat" && (
                                <div className="mono" style={{ fontSize: 9, color: "var(--accent-green)", marginTop: 2 }}>BEAT</div>
                              )}
                              {isGame && item.isPlaying && (
                                <div className="mono" style={{ fontSize: 9, color: "var(--accent-terra)", marginTop: 2 }}>PLAYING</div>
                              )}
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
      })()}


      {/* ══ Item Detail Modal (dark) ══ */}
      {viewingItem && (
        <ItemDetailModal
          item={viewingItem}
          session={session}
          profile={profile}
          onClose={() => setViewingItem(null)}
          onRefresh={onRefresh}
          onPin={onPin}
          onUnpin={onUnpin}
          onToast={onToast}
          onAutoComplete={onAutoComplete}
        />
      )}

      {/* ══ Pin Picker ══ */}
      {showPinPicker && (
        <div className="overlay" onClick={() => setShowPinPicker(false)}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Pin to Mantl</div>
              <div className="pin-picker-close" onClick={() => setShowPinPicker(false)}>✕</div>
            </div>
            {(() => {
              const pins = profile.mantlPins || [];
              const isPinned = (type, id) => pins.some(p => p.type === type && String(p.id) === String(id));
              const categories = [
                { key: "book", label: "Books", emoji: "📖", items: (shelves.books || []).map(b => ({ ...b, _pinType: "book" })) },
                { key: "movie", label: "Films", emoji: "🎬", items: (shelves.movies || []).map(m => ({ ...m, _pinType: "movie" })) },
                { key: "show", label: "Shows", emoji: "📺", items: (shelves.shows || []).map(s => ({ ...s, _pinType: "show" })) },
                { key: "game", label: "Games", emoji: "🎮", items: (shelves.games || []).map(g => ({ ...g, _pinType: "game" })) },
                { key: "trophy", label: "Trophies", emoji: "🏆", items: (shelves.trophies || []).map(t => ({ ...t, _pinType: "trophy" })) },
                { key: "goal", label: "Training", emoji: "🏁", items: (shelves.goals || []).map(g => ({ ...g, _pinType: "goal" })) },
                { key: "country", label: "Countries", emoji: "🌍", items: (shelves.countries || []).map(c => ({ ...c, _pinType: "country", title: c.countryName, cover: c.photoUrl })) },
              ].filter(cat => cat.items.length > 0);

              // ── Category tiles (no category selected & no search) ──
              if (!pinCategory && !pinSearch) {
                return (
                  <div style={{ padding: "12px 12px 8px" }}>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)",
                      textAlign: "center", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>Pick a shelf ({pins.length}/4 pinned)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {categories.map(cat => (
                        <div key={cat.key} onClick={() => setPinCategory(cat.key)} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "14px 14px", borderRadius: 10, cursor: "pointer",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          transition: "background 0.15s",
                        }}>
                          <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                          <div>
                            <div style={{
                              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                              color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.03em",
                            }}>{cat.label}</div>
                            <div style={{
                              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)",
                            }}>{cat.items.length} item{cat.items.length !== 1 ? "s" : ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {categories.length === 0 && (
                      <div className="pin-picker-empty">No items on your shelves yet. Shelf something first!</div>
                    )}
                  </div>
                );
              }

              // ── Filtered item list (category selected or searching) ──
              const activeCat = categories.find(c => c.key === pinCategory);
              const q = pinSearch.toLowerCase();
              const itemsToShow = (activeCat ? activeCat.items : categories.flatMap(c => c.items))
                .filter(it => !q || it.title.toLowerCase().includes(q));

              return (
                <>
                  {/* Back + search bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 4px" }}>
                    <div onClick={() => { setPinCategory(null); setPinSearch(""); }} style={{
                      fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700,
                      color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px",
                      flexShrink: 0,
                    }}>← Back</div>
                    <input
                      className="pin-picker-search"
                      placeholder={`Search ${activeCat ? activeCat.label.toLowerCase() : "all"}...`}
                      value={pinSearch}
                      onChange={e => setPinSearch(e.target.value)}
                      style={{ margin: 0, flex: 1 }}
                      autoFocus
                    />
                  </div>

                  {/* Category tabs (when coming from a category) */}
                  {!pinSearch && (
                    <div style={{
                      display: "flex", gap: 6, padding: "6px 12px", overflowX: "auto",
                      WebkitOverflowScrolling: "touch",
                    }}>
                      {categories.map(cat => (
                        <div key={cat.key} onClick={() => setPinCategory(cat.key)} style={{
                          padding: "5px 12px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap",
                          fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700,
                          letterSpacing: "0.03em", textTransform: "uppercase",
                          background: pinCategory === cat.key ? "rgba(255,255,255,0.1)" : "transparent",
                          color: pinCategory === cat.key ? "var(--text-primary)" : "var(--text-faint)",
                          border: `1px solid ${pinCategory === cat.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
                          transition: "all 0.15s",
                        }}>{cat.emoji} {cat.label}</div>
                      ))}
                    </div>
                  )}

                  {/* Item list */}
                  <div className="pin-picker-list">
                    {itemsToShow.length === 0 ? (
                      <div className="pin-picker-empty">No matches found</div>
                    ) : (
                      itemsToShow.map(item => {
                        const pinned = isPinned(item._pinType, item.id);
                        const full = pins.length >= 4 && !pinned;
                        const isPending = pendingPin && pendingPin.type === item._pinType && String(pendingPin.id) === String(item.id);
                        return (
                          <div key={`${item._pinType}-${item.id}`}>
                            <div
                              className={`pin-picker-item${pinned ? " pinned" : ""}${full ? " disabled" : ""}`}
                              onClick={() => {
                                if (full) return;
                                if (pinned) { onUnpin(item._pinType, item.id); }
                                else {
                                  setPendingPin({ type: item._pinType, id: item.id, title: item.title });
                                  setPinNote("");
                                }
                              }}
                            >
                              <div className="pin-picker-item-cover">
                                {(item.cover || item.locationImage) ? (
                                  <img src={item.cover || item.locationImage} alt="" />
                                ) : (
                                  <span>{item.emoji || ({ book: "📖", movie: "🎬", show: "📺", game: "🎮", trophy: "🏆", goal: "🎯" })[item._pinType]}</span>
                                )}
                              </div>
                              <div className="pin-picker-item-info">
                                <div className="pin-picker-item-title">{item.title}</div>
                                {item.rating && <div className="pin-picker-item-meta">{renderStars(item.rating)}</div>}
                                {item.isReading && <div className="pin-picker-item-meta">Currently reading</div>}
                                {item.isWatching && <div className="pin-picker-item-meta">Currently watching</div>}
                                {item.isPlaying && <div className="pin-picker-item-meta">Currently playing</div>}
                              </div>
                              <div className="pin-picker-item-action">
                                {pinned ? "📌" : full ? "" : isPending ? "▾" : "+"}
                              </div>
                            </div>
                            {isPending && (
                              <div style={{ padding: "8px 12px 12px", display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
                                <input
                                  style={{
                                    flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)",
                                    fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13,
                                    outline: "none",
                                  }}
                                  placeholder="Add a note (optional)..."
                                  value={pinNote}
                                  onChange={e => setPinNote(e.target.value.slice(0, 120))}
                                  maxLength={120}
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === "Enter") {
                                      onPin(pendingPin.type, pendingPin.id, pinNote.trim());
                                      setPendingPin(null);
                                      setPinNote("");
                                    }
                                  }}
                                />
                                <div
                                  style={{
                                    fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                                    color: "var(--accent-green)", cursor: "pointer", whiteSpace: "nowrap",
                                    padding: "8px 12px", background: "rgba(74,222,128,0.1)",
                                    borderRadius: 8, textTransform: "uppercase", letterSpacing: "0.04em",
                                  }}
                                  onClick={() => {
                                    onPin(pendingPin.type, pendingPin.id, pinNote.trim());
                                    setPendingPin(null);
                                    setPinNote("");
                                  }}
                                >📌 Pin</div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </>
  );
}

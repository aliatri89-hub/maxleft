import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { updateGameStatus } from "../../utils/mediaWrite";
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
  addingCountry, setAddingCountry,
  viewingCountry, setViewingCountry,
  showPassportMap, setShowPassportMap,
  diaryShelf, setDiaryShelf,
  viewingItem, setViewingItem,
  // Data
  shelves, profile, session,
  // Callbacks
  onRefresh, onToast, onShelfIt, onUpdateProfile,
}) {
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
  const [diarySearch, setDiarySearch] = useState("");
  const [diaryDecade, setDiaryDecade] = useState(null); // e.g. 2020, 2010, ...
  const [diaryRatingFilter, setDiaryRatingFilter] = useState(null); // null | "rated" | "unrated" | 5 | 4.5 | 4 ...
  const [diaryYear, setDiaryYear] = useState(null); // specific year within a decade

  const toggleBeat = async (gameId, currentStatus) => {
    const newStatus = currentStatus === "beat" ? "playing" : "beat";
    setBeatAnimId(gameId);
    const ok = await updateGameStatus(gameId, newStatus);
    if (ok) onRefresh();
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

  // Load world map data
  useEffect(() => {
    if (addingCountry) { setCountrySearch(""); setPendingCountry(null); setMultiSelectCountries(new Set()); }
  }, [addingCountry]);

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
                    onToast(`${added} countr${added === 1 ? "y" : "ies"} added!`);
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
            <div className="passport-map-title">Your Passport</div>
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
        const allItems = shelves[diaryShelf] || [];
        const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const accent = "#EF9F27";

        // ── Filtering pipeline ──
        let items = [...allItems];

        // Search filter
        if (diarySearch.trim()) {
          const q = diarySearch.toLowerCase().trim();
          items = items.filter(i =>
            (i.title || "").toLowerCase().includes(q) ||
            (i.director || "").toLowerCase().includes(q) ||
            (i.author || "").toLowerCase().includes(q)
          );
        }

        // Decade / year filter (by release year)
        if (diaryDecade !== null) {
          if (diaryYear !== null) {
            items = items.filter(i => i.year === diaryYear);
          } else {
            items = items.filter(i => i.year >= diaryDecade && i.year < diaryDecade + 10);
          }
        }

        // Rating filter
        if (diaryRatingFilter === "rated") {
          items = items.filter(i => i.rating > 0);
        } else if (diaryRatingFilter === "unrated") {
          items = items.filter(i => !i.rating || i.rating === 0);
        } else if (typeof diaryRatingFilter === "number") {
          items = items.filter(i => {
            const r = i.rating || 0;
            return r >= diaryRatingFilter && r < diaryRatingFilter + 0.5;
          });
        }

        // ── Compute available decades from full unfiltered set ──
        const decades = [...new Set(allItems.filter(i => i.year).map(i => Math.floor(i.year / 10) * 10))].sort((a, b) => b - a);

        // Years within selected decade
        const yearsInDecade = diaryDecade !== null
          ? [...new Set(allItems.filter(i => i.year >= diaryDecade && i.year < diaryDecade + 10).map(i => i.year))].sort((a, b) => b - a)
          : [];

        // Active filter count
        const activeFilters = (diarySearch.trim() ? 1 : 0) + (diaryDecade !== null ? 1 : 0) + (diaryRatingFilter !== null ? 1 : 0);

        // ── Grouping + sorting ──
        let sortedGroups;
        if (diaryShelf === "games") {
          const playing = items.filter(i => i.status === "playing" || i.isPlaying);
          const backlog = items.filter(i => i.status === "backlog" || (!i.isPlaying && i.status !== "beat" && i.status !== "playing"));
          const beat = items.filter(i => i.status === "beat");
          const byPlaytime = (a, b) => {
            const hA = parseFloat((a.notes || "").match(/^([\d.]+)h/)?.[1] || "0");
            const hB = parseFloat((b.notes || "").match(/^([\d.]+)h/)?.[1] || "0");
            return hB - hA;
          };
          sortedGroups = [
            ...(playing.length > 0 ? [{ label: `Now Playing · ${playing.length}`, items: playing.sort(byPlaytime).map(i => ({ ...i, _date: i.createdAt ? new Date(i.createdAt) : null })) }] : []),
            ...(backlog.length > 0 ? [{ label: `Backlog · ${backlog.length}`, items: backlog.sort(byPlaytime).map(i => ({ ...i, _date: i.createdAt ? new Date(i.createdAt) : null })) }] : []),
            ...(beat.length > 0 ? [{ label: `Beat · ${beat.length}`, items: beat.sort(byPlaytime).map(i => ({ ...i, _date: i.createdAt ? new Date(i.createdAt) : null })) }] : []),
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
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => (b._date || 0) - (a._date || 0)),
            }));
        } else if (diarySort === "alpha") {
          // A-Z grouping
          const grouped = {};
          items.forEach(item => {
            const dateStr = item.watchedAt || item.finishedAt || item.createdAt || item.completedAt;
            const d = dateStr ? new Date(dateStr) : null;
            const letter = (item.title || "?")[0].toUpperCase();
            const key = /[A-Z]/.test(letter) ? letter : "#";
            if (!grouped[key]) grouped[key] = { label: key, items: [] };
            grouped[key].items.push({ ...item, _date: d });
          });
          sortedGroups = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, g]) => ({
              ...g,
              items: g.items.sort((a, b) => (a.title || "").localeCompare(b.title || "")),
            }));
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
              <button className="item-detail-close" onClick={() => { setDiaryShelf(null); setDiarySearch(""); setDiaryDecade(null); setDiaryYear(null); setDiaryRatingFilter(null); }}>← Close</button>

              {/* ── Header — sharpie label + count ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{
                    fontFamily: "'Permanent Marker', cursive", fontSize: 24,
                    color: accent, letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    {cfg?.label}
                  </div>
                  {/* View toggle */}
                  <div style={{ display: "flex", background: `${accent}0a`, border: `1px solid ${accent}18`, borderRadius: 8, overflow: "hidden" }}>
                    <button className="mono" onClick={() => setDiaryView("diary")}
                      style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                        background: diaryView === "diary" ? `${accent}20` : "transparent",
                        color: diaryView === "diary" ? accent : "var(--text-muted)" }}>
                      List
                    </button>
                    <button className="mono" onClick={() => setDiaryView("grid")}
                      style={{ padding: "6px 14px", fontSize: 10, border: "none", cursor: "pointer",
                        background: diaryView === "grid" ? `${accent}20` : "transparent",
                        color: diaryView === "grid" ? accent : "var(--text-muted)" }}>
                      Grid
                    </button>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", letterSpacing: "0.06em" }}>
                  {items.length === allItems.length ? `${allItems.length} total` : `${items.length} of ${allItems.length}`}
                  {diaryShelf === "games" && (() => {
                    const beat = items.filter(i => i.status === "beat").length;
                    const playing = items.filter(i => i.status === "playing" || i.isPlaying).length;
                    return beat > 0 || playing > 0 ? ` · ${beat} beat · ${playing} playing` : "";
                  })()}
                </div>
              </div>

              {/* ── Search bar ── */}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="6" cy="6" r="4.5" stroke="var(--text-faint)" strokeWidth="1.5" />
                  <path d="M9.5 9.5L12.5 12.5" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  value={diarySearch}
                  onChange={e => setDiarySearch(e.target.value)}
                  placeholder={`Search ${allItems.length} ${cfg?.label?.toLowerCase() || "items"}...`}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 12px 10px 34px",
                    fontFamily: "var(--font-body)", fontSize: 13,
                    color: "var(--text-primary)",
                    background: `${accent}06`,
                    border: `1px solid ${accent}18`,
                    borderRadius: 10, outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = `${accent}40`}
                  onBlur={e => e.target.style.borderColor = `${accent}18`}
                />
                {diarySearch && (
                  <div onClick={() => setDiarySearch("")} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    cursor: "pointer", fontSize: 16, color: "var(--text-faint)", lineHeight: 1,
                  }}>×</div>
                )}
              </div>

              {/* ── Sort pills ── */}
              {diaryShelf !== "games" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {[
                    { key: "date-desc", label: "Newest" },
                    { key: "date-asc", label: "Oldest" },
                    { key: "rating", label: "★ High" },
                    { key: "rating-asc", label: "★ Low" },
                    { key: "alpha", label: "A–Z" },
                  ].map(s => (
                    <button key={s.key} className="mono" onClick={() => setDiarySort(s.key)}
                      style={{
                        padding: "5px 12px", fontSize: 10, borderRadius: 20, cursor: "pointer",
                        background: diarySort === s.key ? `${accent}20` : "transparent",
                        color: diarySort === s.key ? accent : "var(--text-muted)",
                        border: `1px solid ${diarySort === s.key ? `${accent}40` : "rgba(255,255,255,0.08)"}`,
                        transition: "all 0.15s",
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Decade filter pills ── */}
              {decades.length > 0 && diaryShelf !== "games" && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {diaryDecade !== null && (
                      <button className="mono" onClick={() => { setDiaryDecade(null); setDiaryYear(null); }}
                        style={{
                          padding: "5px 10px", fontSize: 10, borderRadius: 20, cursor: "pointer",
                          background: "rgba(255,80,80,0.1)", color: "#ff6b6b",
                          border: "1px solid rgba(255,80,80,0.2)", transition: "all 0.15s",
                        }}>
                        × Clear
                      </button>
                    )}
                    {decades.map(d => (
                      <button key={d} className="mono" onClick={() => { setDiaryDecade(diaryDecade === d ? null : d); setDiaryYear(null); }}
                        style={{
                          padding: "5px 10px", fontSize: 10, borderRadius: 20, cursor: "pointer",
                          background: diaryDecade === d ? `${accent}20` : "transparent",
                          color: diaryDecade === d ? accent : "var(--text-faint)",
                          border: `1px solid ${diaryDecade === d ? `${accent}40` : "rgba(255,255,255,0.06)"}`,
                          transition: "all 0.15s",
                        }}>
                        {d}s
                      </button>
                    ))}
                  </div>
                  {/* Year pills within selected decade */}
                  {diaryDecade !== null && yearsInDecade.length > 1 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      <button className="mono" onClick={() => setDiaryYear(null)}
                        style={{
                          padding: "4px 9px", fontSize: 9, borderRadius: 16, cursor: "pointer",
                          background: diaryYear === null ? `${accent}15` : "transparent",
                          color: diaryYear === null ? accent : "var(--text-faint)",
                          border: `1px solid ${diaryYear === null ? `${accent}30` : "rgba(255,255,255,0.05)"}`,
                        }}>
                        All
                      </button>
                      {yearsInDecade.map(y => (
                        <button key={y} className="mono" onClick={() => setDiaryYear(diaryYear === y ? null : y)}
                          style={{
                            padding: "4px 9px", fontSize: 9, borderRadius: 16, cursor: "pointer",
                            background: diaryYear === y ? `${accent}15` : "transparent",
                            color: diaryYear === y ? accent : "var(--text-faint)",
                            border: `1px solid ${diaryYear === y ? `${accent}30` : "rgba(255,255,255,0.05)"}`,
                          }}>
                          {y}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Rating filter ── */}
              {diaryShelf !== "games" && (
                <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                  {[
                    { key: "rated", label: "Rated" },
                    { key: "unrated", label: "Unrated" },
                    { key: 5, label: "★★★★★" },
                    { key: 4, label: "★★★★" },
                    { key: 3, label: "★★★" },
                    { key: 2, label: "★★" },
                    { key: 1, label: "★" },
                  ].map(f => (
                    <button key={f.key} className="mono" onClick={() => setDiaryRatingFilter(diaryRatingFilter === f.key ? null : f.key)}
                      style={{
                        padding: "5px 10px", fontSize: typeof f.key === "number" ? 11 : 10, borderRadius: 20, cursor: "pointer",
                        background: diaryRatingFilter === f.key ? `${accent}20` : "transparent",
                        color: diaryRatingFilter === f.key ? accent : "var(--text-faint)",
                        border: `1px solid ${diaryRatingFilter === f.key ? `${accent}40` : "rgba(255,255,255,0.06)"}`,
                        letterSpacing: typeof f.key === "number" ? 1 : "0.04em",
                        transition: "all 0.15s",
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Empty state after filtering ── */}
              {items.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 16px" }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", marginBottom: 8 }}>
                    No matches
                  </div>
                  <button className="mono" onClick={() => { setDiarySearch(""); setDiaryDecade(null); setDiaryYear(null); setDiaryRatingFilter(null); }}
                    style={{
                      padding: "6px 16px", fontSize: 11, borderRadius: 20, cursor: "pointer",
                      background: `${accent}15`, color: accent,
                      border: `1px solid ${accent}30`,
                    }}>
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Grid View */}
              {diaryView === "grid" && items.length > 0 && (() => {
                let gridItems = diaryShelf === "games" ? items : [...items];
                if (diaryShelf !== "games") {
                  if (diarySort === "rating" || diarySort === "rating-asc") {
                    gridItems = gridItems.filter(i => i.rating > 0);
                    gridItems.sort((a, b) => diarySort === "rating-asc" ? (a.rating || 0) - (b.rating || 0) : (b.rating || 0) - (a.rating || 0));
                  } else if (diarySort === "alpha") {
                    gridItems.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
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
                        border: `1px solid ${accent}12`,
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
                        <div style={{ fontSize: 10, color: accent, marginTop: 3, letterSpacing: 1 }}>
                          {renderStars(item.rating)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                );
              })()}

              {/* Diary View */}
              {diaryView === "diary" && items.length > 0 && (
                <div style={{ paddingBottom: 20 }}>
                  {sortedGroups.map((group, gi) => (
                    <div key={gi} style={{ marginBottom: 20 }}>
                      <div style={{
                        fontFamily: "'Permanent Marker', cursive", fontSize: 13,
                        color: `${accent}90`, marginBottom: 10, letterSpacing: "0.04em",
                        paddingBottom: 6,
                        borderBottom: `1px solid ${accent}12`,
                      }}>
                        {group.label}
                      </div>
                      {group.items.map((item, i) => {
                        const day = item._date ? item._date.getDate() : null;
                        const isGame = diaryShelf === "games";
                        return (
                          <div key={i} className={beatAnimId === item.id && item.status !== "beat" ? "beat-fade" : ""} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
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
                              border: `1px solid ${accent}10`,
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
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>
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
                                <div style={{ fontSize: 11, color: accent, letterSpacing: 1 }}>
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
          onToast={onToast}
        />
      )}

    </>
  );
}

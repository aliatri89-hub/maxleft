import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabase";

/**
 * PinToMantl — Drop-in "Pin to MANTL" button for any community log modal.
 *
 * Self-contained: fetches current pins, resolves shelf item ID, handles
 * pin/unpin, shows replacement picker when shelf is full, and renders
 * its own animated toast with "View my shelf →".
 *
 * Usage in any log modal:
 *
 *   <PinToMantl
 *     userId={userId}
 *     isCompleted={isCompleted}
 *     itemType="movie"
 *     itemTitle={item.title}
 *     tmdbId={item.tmdb_id}
 *     coverUrl={coverUrl}
 *     communitySlug="nowplaying"
 *     onViewMantl={onViewMantl}
 *   />
 */

/* ── Shelf table config per media type ── */
const SHELF_CONFIG = {
  movie: { table: "movies", pinType: "movie", coverCol: "poster_url" },
  book:  { table: "books",  pinType: "book",  coverCol: "cover_url" },
  game:  { table: "games",  pinType: "game",  coverCol: "cover_url" },
  show:  { table: "shows",  pinType: "show",  coverCol: "poster_url" },
};

const TYPE_EMOJI = { movie: "🎬", book: "📖", game: "🎮", show: "📺", trophy: "🏆", goal: "🎯", country: "🌍" };

export default function PinToMantl({
  userId,
  isCompleted,
  itemType = "movie",
  itemTitle,
  tmdbId,
  coverUrl,
  communitySlug,
  onViewMantl,
  onClose,
  compact = false,
}) {
  const [pins, setPins] = useState(null);
  const [shelfItemId, setShelfItemId] = useState(null);
  const [lookupDone, setLookupDone] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  const [pinDetails, setPinDetails] = useState([]);  // { type, id, title, cover }[]
  const [badgeExpanded, setBadgeExpanded] = useState(false);
  const toastTimer = useRef(null);

  /* ── 1. Fetch current pins + resolve shelf item ── */
  useEffect(() => {
    if (!userId || !isCompleted) return;
    let cancelled = false;

    (async () => {
      try {
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("mantl_pins")
          .eq("id", userId)
          .single();

        if (profileErr) console.warn("[PinToMantl] Profile fetch error:", profileErr.message);
        if (cancelled) return;

        const currentPins = profile?.mantl_pins || [];
        setPins(currentPins);

        // Resolve shelf item ID for this item
        const cfg = SHELF_CONFIG[itemType];
        if (!cfg) { setLookupDone(true); return; }

        let shelfId = null;

        if (itemType === "movie" || itemType === "show") {
          if (tmdbId) {
            const { data: byTmdb } = await supabase.from(cfg.table).select("id")
              .eq("user_id", userId).eq("tmdb_id", tmdbId).limit(1);
            if (byTmdb?.[0]) {
              shelfId = byTmdb[0].id;
            } else {
              const coerced = typeof tmdbId === "string" ? Number(tmdbId) : String(tmdbId);
              if (!isNaN(coerced)) {
                const { data: byCoerced } = await supabase.from(cfg.table).select("id")
                  .eq("user_id", userId).eq("tmdb_id", coerced).limit(1);
                if (byCoerced?.[0]) shelfId = byCoerced[0].id;
              }
            }
          }
          if (!shelfId && itemTitle) {
            const { data: byTitle } = await supabase.from(cfg.table).select("id, title").eq("user_id", userId);
            if (byTitle) {
              const t = itemTitle.toLowerCase();
              const m = byTitle.find(r => r.title.toLowerCase() === t)
                || byTitle.find(r => r.title.toLowerCase().includes(t) || t.includes(r.title.toLowerCase()));
              if (m) shelfId = m.id;
            }
          }
        } else if (itemTitle) {
          const { data } = await supabase.from(cfg.table).select("id, title").eq("user_id", userId);
          if (data) {
            const t = itemTitle.toLowerCase();
            const m = data.find(r => r.title.toLowerCase() === t)
              || data.find(r => r.title.toLowerCase().includes(t) || t.includes(r.title.toLowerCase()));
            if (m) shelfId = m.id;
          }
        }

        if (cancelled) return;

        if (shelfId) {
          console.log(`[PinToMantl] Resolved "${itemTitle}" → shelf id ${shelfId}`);
        } else {
          console.log(`[PinToMantl] No shelf match for "${itemTitle}" (${itemType}, tmdb: ${tmdbId}) — button hidden`);
        }

        setShelfItemId(shelfId);
        setLookupDone(true);

        if (shelfId) {
          const alreadyPinned = currentPins.some(
            (p) => p.type === cfg.pinType && String(p.id) === String(shelfId)
          );
          setIsPinned(alreadyPinned);
        }

        // Pre-fetch details for current pins (for replacement picker)
        if (currentPins.length >= 4) {
          fetchPinDetails(currentPins, userId, cancelled);
        }
      } catch (err) {
        console.warn("[PinToMantl] Unexpected error:", err);
        setLookupDone(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, isCompleted, itemType, itemTitle, tmdbId]);

  /* ── Fetch cover + title for each current pin ── */
  const fetchPinDetails = async (currentPins, uid, cancelled) => {
    try {
      // Group pins by type for efficient queries
      const byType = {};
      currentPins.forEach((p, idx) => {
        if (!byType[p.type]) byType[p.type] = [];
        byType[p.type].push({ ...p, _idx: idx });
      });

      const details = new Array(currentPins.length).fill(null);

      for (const [type, group] of Object.entries(byType)) {
        const cfg = SHELF_CONFIG[type];
        if (!cfg) {
          // Non-shelf types (trophy, goal, country) — just use emoji
          group.forEach(p => {
            details[p._idx] = { type, id: p.id, title: type, cover: null };
          });
          continue;
        }

        const ids = group.map(p => p.id);
        const { data } = await supabase
          .from(cfg.table)
          .select(`id, title, ${cfg.coverCol}`)
          .eq("user_id", uid)
          .in("id", ids);

        if (cancelled) return;

        const dataMap = {};
        (data || []).forEach(row => { dataMap[row.id] = row; });

        group.forEach(p => {
          const row = dataMap[p.id];
          details[p._idx] = {
            type,
            id: p.id,
            title: row?.title || type,
            cover: row?.[cfg.coverCol] || null,
          };
        });
      }

      if (!cancelled) setPinDetails(details.filter(Boolean));
    } catch (err) {
      console.warn("[PinToMantl] Pin details fetch error:", err);
    }
  };

  /* ── 2. Pin action (or show picker if full) ── */
  const handlePin = useCallback(async () => {
    if (!userId || !shelfItemId || saving) return;

    const currentPins = pins || [];

    // If full, show replacement picker instead of pinning
    if (currentPins.length >= 4) {
      setShowReplacePicker(true);
      return;
    }

    await doPin(currentPins);
  }, [userId, shelfItemId, pins, itemType, communitySlug, saving]);

  /* ── Actually write the pin ── */
  const doPin = useCallback(async (currentPins, replaceIndex) => {
    setSaving(true);

    const cfg = SHELF_CONFIG[itemType];
    const newPin = {
      type: cfg.pinType,
      id: shelfItemId,
      note: "",
      source: communitySlug || null,
      pinned_at: new Date().toISOString(),
    };

    let updatedPins;
    if (replaceIndex !== undefined) {
      // Replace specific slot
      updatedPins = [...currentPins];
      updatedPins[replaceIndex] = newPin;
    } else {
      // Append (has room)
      updatedPins = [...currentPins, newPin];
    }

    const { error } = await supabase
      .from("profiles")
      .update({ mantl_pins: updatedPins })
      .eq("id", userId);

    if (!error) {
      setPins(updatedPins);
      setIsPinned(true);
      setShowReplacePicker(false);
      showToast("Pinned to your MANTL!", true);
    } else {
      console.warn("[PinToMantl] Pin save error:", error.message);
      showToast("Couldn't pin — try again", false);
    }

    setSaving(false);
  }, [userId, shelfItemId, itemType, communitySlug]);

  /* ── Replace a specific pin ── */
  const handleReplace = useCallback((replaceIndex) => {
    if (saving) return;
    doPin(pins || [], replaceIndex);
  }, [pins, saving, doPin]);

  /* ── 3. Unpin action ── */
  const handleUnpin = useCallback(async () => {
    if (!userId || !shelfItemId || saving) return;
    setSaving(true);

    const cfg = SHELF_CONFIG[itemType];
    const currentPins = pins || [];
    const updatedPins = currentPins.filter(
      (p) => !(p.type === cfg.pinType && String(p.id) === String(shelfItemId))
    );

    const { error } = await supabase
      .from("profiles")
      .update({ mantl_pins: updatedPins })
      .eq("id", userId);

    if (!error) {
      setPins(updatedPins);
      setIsPinned(false);
      showToast("Removed from your MANTL", false);
    }

    setSaving(false);
  }, [userId, shelfItemId, pins, itemType, saving]);

  /* ── 4. Toast ── */
  const showToast = useCallback((message, showAction) => {
    clearTimeout(toastTimer.current);
    setToast({ message, showAction });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Guards ── */
  if (!userId || !isCompleted) return null;
  if (!lookupDone) return null;
  if (!shelfItemId) return null;

  /* ── Compact badge mode (overlay on poster) ── */
  if (compact) {
    const handleBadgeTap = (e) => {
      e.stopPropagation();
      if (saving) return;
      if (isPinned) {
        // Expand to show unpin option
        setBadgeExpanded(!badgeExpanded);
      } else {
        handlePin();
      }
    };

    return (
      <>
        <style>{`
          @keyframes mantlBadgeIn {
            from { opacity: 0; transform: scale(0.6); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes mantlBadgePop {
            0% { transform: scale(1); }
            50% { transform: scale(1.25); }
            100% { transform: scale(1); }
          }
          @keyframes mantlExpandIn {
            from { opacity: 0; transform: translateX(-4px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        {/* Badge */}
        <div
          onClick={handleBadgeTap}
          style={{
            position: "absolute",
            top: 6, left: 6,
            zIndex: 5,
            display: "flex", alignItems: "center", gap: 0,
            cursor: saving ? "wait" : "pointer",
            animation: "mantlBadgeIn 0.3s ease",
          }}
        >
          <div style={{
            width: 28, height: 28,
            borderRadius: "50%",
            background: isPinned
              ? "linear-gradient(135deg, rgba(196,115,79,0.95), rgba(180,100,60,0.9))"
              : "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            border: isPinned
              ? "1.5px solid rgba(232,196,160,0.4)"
              : "1.5px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isPinned
              ? "0 2px 8px rgba(196,115,79,0.4)"
              : "0 2px 6px rgba(0,0,0,0.4)",
            transition: "all 0.2s ease",
            animation: saving ? "mantlBadgePop 0.4s ease" : "none",
          }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>📌</span>
          </div>

          {/* Expanded unpin label */}
          {badgeExpanded && isPinned && (
            <div
              onClick={(e) => { e.stopPropagation(); handleUnpin(); setBadgeExpanded(false); }}
              style={{
                marginLeft: 4,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                borderRadius: 8,
                padding: "5px 10px",
                display: "flex", alignItems: "center", gap: 5,
                animation: "mantlExpandIn 0.2s ease",
                border: "1px solid rgba(196,115,79,0.25)",
              }}
            >
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: "#e8c4a0",
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                {saving ? "..." : "Unpin"}
              </span>
            </div>
          )}
        </div>

        {/* Replacement picker — fixed overlay in compact mode */}
        {showReplacePicker && !isPinned && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24,
              animation: "mantlPickerIn 0.25s ease",
            }}
          >
            <style>{`
              @keyframes mantlPickerIn {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div style={{
              width: "100%", maxWidth: 320,
              background: "linear-gradient(135deg, #1e1a16 0%, #0f0f1a 100%)",
              border: "1px solid rgba(196,115,79,0.3)",
              borderRadius: 16,
              padding: "16px 14px",
            }}>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: "#e8c4a0",
                textAlign: "center",
                marginBottom: 12,
                fontFamily: "'Barlow Condensed', var(--font-display), sans-serif",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>
                Your MANTL is full — replace one
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                marginBottom: 12,
              }}>
                {pinDetails.map((pin, i) => (
                  <div
                    key={`replace-${i}`}
                    onClick={() => handleReplace(i)}
                    style={{
                      position: "relative",
                      aspectRatio: "1 / 1.43",
                      borderRadius: 8,
                      overflow: "hidden",
                      cursor: saving ? "wait" : "pointer",
                      border: "1.5px solid rgba(255,255,255,0.1)",
                      transition: "border-color 0.15s, transform 0.15s",
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    {pin.cover ? (
                      <img src={pin.cover} alt={pin.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        draggable={false} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(255,255,255,0.04)", fontSize: 20,
                      }}>
                        {TYPE_EMOJI[pin.type] || "📌"}
                      </div>
                    )}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.45)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: 0.8,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "rgba(233,69,96,0.85)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 14, fontWeight: 700,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}>×</div>
                    </div>
                    <div style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      padding: "12px 4px 4px",
                      background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
                    }}>
                      <div style={{
                        fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.8)",
                        textAlign: "center", lineHeight: 1.2, overflow: "hidden",
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
                        letterSpacing: "0.02em", textTransform: "uppercase",
                      }}>{pin.title}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                onClick={() => setShowReplacePicker(false)}
                style={{
                  textAlign: "center", fontSize: 12, color: "#888",
                  cursor: "pointer", padding: "2px 0",
                  fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
                }}
              >Cancel</div>
            </div>
          </div>
        )}

        {/* Toast (same as full mode) */}
        {toast && (
          <div style={{
            position: "fixed",
            bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
            left: 16, right: 16, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px",
            background: "linear-gradient(135deg, #2a2520 0%, #1e1a16 100%)",
            border: "1px solid rgba(196,115,79,0.3)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,115,79,0.1)",
            animation: "mantlToastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <style>{`
              @keyframes mantlToastIn {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
              }
            `}</style>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📌</span>
              <span style={{
                fontFamily: "'Barlow Condensed', var(--font-display), sans-serif",
                fontSize: 14, fontWeight: 600, color: "#e8c4a0", letterSpacing: "0.02em",
              }}>{toast.message}</span>
            </div>
            {toast.showAction && (
              <button
                onClick={() => {
                  setToast(null);
                  if (onClose) onClose();
                  if (onViewMantl) { onViewMantl(); }
                  else { window.dispatchEvent(new CustomEvent("mantl:navigate", { detail: { tab: "shelf" } })); }
                }}
                style={{
                  background: "rgba(196,115,79,0.2)", border: "1px solid rgba(196,115,79,0.35)",
                  borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                  transition: "background 0.15s", flexShrink: 0,
                }}
              >
                <span style={{
                  fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
                  fontSize: 12, fontWeight: 700, color: "#e8c4a0",
                  letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
                }}>View my shelf</span>
                <span style={{ fontSize: 12, color: "#e8c4a0" }}>→</span>
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  /* ── Full-width mode (default) ── */
  return (
    <>
      {isPinned ? (
        <button
          onClick={handleUnpin}
          disabled={saving}
          style={{
            width: "100%", padding: "11px 0",
            background: "rgba(196,115,79,0.08)",
            border: "1px solid rgba(196,115,79,0.25)",
            borderRadius: 12,
            color: "rgba(196,115,79,0.9)",
            fontSize: 13, fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            transition: "background 0.2s, border-color 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>📌</span>
          {saving ? "Removing..." : "On your MANTL"}
        </button>
      ) : !showReplacePicker ? (
        <button
          onClick={handlePin}
          disabled={saving}
          style={{
            width: "100%", padding: "11px 0",
            background: "linear-gradient(135deg, rgba(196,115,79,0.15), rgba(196,115,79,0.08))",
            border: "1px solid rgba(196,115,79,0.3)",
            borderRadius: 12,
            color: "#e8c4a0",
            fontSize: 13, fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            transition: "background 0.2s, opacity 0.2s",
            opacity: saving ? 0.6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>📌</span>
          {saving ? "Pinning..." : "Pin to MANTL"}
        </button>
      ) : null}

      {/* ── Replacement picker (when shelf is full) ── */}
      {showReplacePicker && !isPinned && (
        <div style={{
          width: "100%",
          background: "rgba(196,115,79,0.06)",
          border: "1px solid rgba(196,115,79,0.2)",
          borderRadius: 12,
          padding: "12px 14px",
          animation: "mantlPickerIn 0.25s ease",
        }}>
          <style>{`
            @keyframes mantlPickerIn {
              from { opacity: 0; transform: translateY(-6px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div style={{
            fontSize: 11, fontWeight: 600,
            color: "#e8c4a0",
            textAlign: "center",
            marginBottom: 10,
            fontFamily: "'Barlow Condensed', var(--font-display), sans-serif",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            Your MANTL is full — replace one
          </div>

          {/* Pin thumbnails */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 10,
          }}>
            {pinDetails.map((pin, i) => (
              <div
                key={`replace-${i}`}
                onClick={() => handleReplace(i)}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1.43",
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: saving ? "wait" : "pointer",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  transition: "border-color 0.15s, transform 0.15s",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {pin.cover ? (
                  <img
                    src={pin.cover}
                    alt={pin.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    draggable={false}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.04)",
                    fontSize: 20,
                  }}>
                    {TYPE_EMOJI[pin.type] || "📌"}
                  </div>
                )}

                {/* × overlay */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0.8,
                  transition: "opacity 0.15s",
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "rgba(233,69,96,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}>
                    ×
                  </div>
                </div>

                {/* Title label */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "12px 4px 4px",
                  background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)",
                }}>
                  <div style={{
                    fontSize: 8, fontWeight: 600,
                    color: "rgba(255,255,255,0.8)",
                    textAlign: "center",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                  }}>
                    {pin.title}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cancel link */}
          <div
            onClick={() => setShowReplacePicker(false)}
            style={{
              textAlign: "center",
              fontSize: 12, color: "#888",
              cursor: "pointer",
              padding: "2px 0",
              fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
            }}
          >
            Cancel
          </div>
        </div>
      )}

      {/* ── Animated toast ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
            left: 16, right: 16,
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px",
            background: "linear-gradient(135deg, #2a2520 0%, #1e1a16 100%)",
            border: "1px solid rgba(196,115,79,0.3)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,115,79,0.1)",
            animation: "mantlToastIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <style>{`
            @keyframes mantlToastIn {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>📌</span>
            <span style={{
              fontFamily: "'Barlow Condensed', var(--font-display), sans-serif",
              fontSize: 14, fontWeight: 600,
              color: "#e8c4a0",
              letterSpacing: "0.02em",
            }}>
              {toast.message}
            </span>
          </div>

          {toast.showAction && (
            <button
              onClick={() => {
                setToast(null);
                if (onClose) onClose();
                if (onViewMantl) {
                  onViewMantl();
                } else {
                  // Fallback: dispatch custom event that App/tab bar can listen for
                  window.dispatchEvent(new CustomEvent("mantl:navigate", { detail: { tab: "shelf" } }));
                }
              }}
              style={{
                background: "rgba(196,115,79,0.2)",
                border: "1px solid rgba(196,115,79,0.35)",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <span style={{
                fontFamily: "var(--font-display, 'Barlow Condensed', sans-serif)",
                fontSize: 12, fontWeight: 700,
                color: "#e8c4a0",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}>
                View my shelf
              </span>
              <span style={{ fontSize: 12, color: "#e8c4a0" }}>→</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}

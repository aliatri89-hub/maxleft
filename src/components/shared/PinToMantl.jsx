import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";

/**
 * PinToMantl — Drop-in "Pin to MANTL" button for any community log modal.
 *
 * Self-contained: fetches current pins, resolves shelf item ID, handles
 * pin/unpin, and renders its own animated toast with "View my shelf →".
 *
 * Usage in any log modal:
 *
 *   <PinToMantl
 *     userId={userId}
 *     isCompleted={isCompleted}
 *     itemType="movie"            // "movie" | "book" | "game" | "show"
 *     itemTitle={item.title}
 *     tmdbId={item.tmdb_id}       // films only — used to look up shelf item
 *     coverUrl={coverUrl}
 *     communitySlug="nowplaying"   // community slug for source attribution
 *     onViewMantl={onViewMantl}    // optional — navigates to My Mantl tab
 *   />
 */

/* ── Shelf table config per media type ── */
const SHELF_CONFIG = {
  movie: { table: "movies", pinType: "movie" },
  book:  { table: "books",  pinType: "book" },
  game:  { table: "games",  pinType: "game" },
  show:  { table: "shows",  pinType: "show" },
};

export default function PinToMantl({
  userId,
  isCompleted,
  itemType = "movie",
  itemTitle,
  tmdbId,
  coverUrl,
  communitySlug,
  onViewMantl,
}) {
  const [pins, setPins] = useState(null);       // current mantl_pins array
  const [shelfItemId, setShelfItemId] = useState(null); // resolved shelf row id
  const [lookupDone, setLookupDone] = useState(false);  // tracks whether lookup finished
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);     // { message, showAction }
  const toastTimer = useRef(null);

  /* ── 1. Fetch current pins + resolve shelf item ── */
  useEffect(() => {
    if (!userId || !isCompleted) return;
    let cancelled = false;

    (async () => {
      try {
        // Fetch profile pins
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("mantl_pins")
          .eq("id", userId)
          .single();

        if (profileErr) {
          console.warn("[PinToMantl] Profile fetch error:", profileErr.message);
        }

        if (cancelled) return;
        const currentPins = profile?.mantl_pins || [];
        setPins(currentPins);

        // Resolve shelf item ID
        const cfg = SHELF_CONFIG[itemType];
        if (!cfg) {
          console.warn("[PinToMantl] Unknown itemType:", itemType);
          setLookupDone(true);
          return;
        }

        let shelfId = null;

        if (itemType === "movie") {
          // Films: try tmdb_id first (both as-is and coerced), then fall back to title
          if (tmdbId) {
            const { data: byTmdb } = await supabase
              .from(cfg.table)
              .select("id")
              .eq("user_id", userId)
              .eq("tmdb_id", tmdbId)
              .limit(1);

            if (byTmdb?.[0]) {
              shelfId = byTmdb[0].id;
            } else {
              // Try coerced type — handles string vs number mismatch
              const coerced = typeof tmdbId === "string" ? Number(tmdbId) : String(tmdbId);
              if (!isNaN(coerced)) {
                const { data: byCoerced } = await supabase
                  .from(cfg.table)
                  .select("id")
                  .eq("user_id", userId)
                  .eq("tmdb_id", coerced)
                  .limit(1);

                if (byCoerced?.[0]) shelfId = byCoerced[0].id;
              }
            }
          }

          // Fallback: title match for movies too
          if (!shelfId && itemTitle) {
            const { data: byTitle } = await supabase
              .from(cfg.table)
              .select("id, title")
              .eq("user_id", userId);

            if (byTitle) {
              const target = itemTitle.toLowerCase();
              const match = byTitle.find(r => r.title.toLowerCase() === target)
                || byTitle.find(r => r.title.toLowerCase().includes(target) || target.includes(r.title.toLowerCase()));
              if (match) shelfId = match.id;
            }
          }
        } else {
          // Books/games/shows: match by title
          if (itemTitle) {
            const { data } = await supabase
              .from(cfg.table)
              .select("id, title")
              .eq("user_id", userId);

            if (data) {
              const target = itemTitle.toLowerCase();
              const match = data.find(r => r.title.toLowerCase() === target)
                || data.find(r => r.title.toLowerCase().includes(target) || target.includes(r.title.toLowerCase()));
              if (match) shelfId = match.id;
            }
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

        // Check if already pinned
        if (shelfId) {
          const alreadyPinned = currentPins.some(
            (p) => p.type === cfg.pinType && String(p.id) === String(shelfId)
          );
          setIsPinned(alreadyPinned);
        }
      } catch (err) {
        console.warn("[PinToMantl] Unexpected error:", err);
        setLookupDone(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, isCompleted, itemType, itemTitle, tmdbId]);

  /* ── 2. Pin action ── */
  const handlePin = useCallback(async () => {
    if (!userId || !shelfItemId || saving) return;
    setSaving(true);

    const cfg = SHELF_CONFIG[itemType];
    const currentPins = pins || [];

    const newPin = {
      type: cfg.pinType,
      id: shelfItemId,
      note: "",
      source: communitySlug || null,
      pinned_at: new Date().toISOString(),
    };

    // Check slot limit (4 pins max) — replace oldest if full
    let updatedPins;
    if (currentPins.length >= 4) {
      updatedPins = [...currentPins.slice(1), newPin];
    } else {
      updatedPins = [...currentPins, newPin];
    }

    const { error } = await supabase
      .from("profiles")
      .update({ mantl_pins: updatedPins })
      .eq("id", userId);

    if (!error) {
      setPins(updatedPins);
      setIsPinned(true);
      showToast("Pinned to your MANTL!", true);
    } else {
      console.warn("[PinToMantl] Pin save error:", error.message);
      showToast("Couldn't pin — try again", false);
    }

    setSaving(false);
  }, [userId, shelfItemId, pins, itemType, communitySlug, saving]);

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

  /* ── Don't render if not logged or no user ── */
  if (!userId || !isCompleted) return null;

  /* ── Still loading ── */
  if (!lookupDone) return null;

  /* ── Shelf item not found — don't block the modal, just hide pin ── */
  if (!shelfItemId) return null;

  return (
    <>
      {/* Pin / Unpin button */}
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
      ) : (
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

          {toast.showAction && onViewMantl && (
            <button
              onClick={() => {
                setToast(null);
                onViewMantl();
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

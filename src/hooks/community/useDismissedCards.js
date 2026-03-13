import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase";

/**
 * useDismissedCards — manages dismissed feed nudges.
 *
 * Loads the user's dismissed card set once, then provides:
 *   isDismissed(cardType, cardKey) — check before rendering
 *   dismiss(cardType, cardKey)     — persist + update local state
 *
 * Dismissed cards are keyed by (card_type, card_key):
 *   - badge nudges:  ("badge", badge_id)
 *   - up_next:       ("up_next", miniseries_id)
 *   - milestones:    ("milestone", milestone_key)
 */
export function useDismissedCards(userId) {
  const [dismissedSet, setDismissedSet] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  // ── Load dismissed cards on mount ──
  useEffect(() => {
    mountedRef.current = true;
    if (!userId) { setLoaded(true); return; }

    (async () => {
      const { data, error } = await supabase
        .from("feed_dismissed_cards")
        .select("card_type, card_key")
        .eq("user_id", userId);

      if (!mountedRef.current) return;

      if (!error && data) {
        const set = new Set(data.map(d => `${d.card_type}::${d.card_key}`));
        setDismissedSet(set);
      }
      setLoaded(true);
    })();

    return () => { mountedRef.current = false; };
  }, [userId]);

  // ── Check if a card is dismissed ──
  const isDismissed = useCallback((cardType, cardKey) => {
    return dismissedSet.has(`${cardType}::${cardKey}`);
  }, [dismissedSet]);

  // ── Dismiss a card (optimistic) ──
  const dismiss = useCallback(async (cardType, cardKey) => {
    if (!userId) return;

    const key = `${cardType}::${cardKey}`;

    // Optimistic: update local set immediately
    setDismissedSet(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // Persist to Supabase (fire and forget — local set is source of truth for this session)
    const { error } = await supabase
      .from("feed_dismissed_cards")
      .upsert({
        user_id: userId,
        card_type: cardType,
        card_key: cardKey,
      }, { onConflict: "user_id,card_type,card_key" });

    if (error) {
      console.error("[DismissedCards] Failed to persist dismiss:", error);
      // Roll back optimistic update
      if (mountedRef.current) {
        setDismissedSet(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    }
  }, [userId]);

  return { isDismissed, dismiss, loaded };
}

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

/**
 * useNotifications — fetches in-app notifications from user_notifications.
 *
 * Returns:
 *   notifications   — array of notification objects (newest first, max 50)
 *   unreadCount     — number of unseen notifications
 *   markAllSeen     — function to mark all as seen (call on panel open)
 *   refresh         — force-refetch
 *   loading         — true during initial fetch
 */
export default function useNotifications(session) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const userId = session?.user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch notifications
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useNotifications] fetch error:", error.message);
        return;
      }

      if (!mountedRef.current) return;

      const rows = data || [];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.seen_at).length);
    } catch (err) {
      console.error("[useNotifications] unexpected error:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  // Mark all unseen as seen
  const markAllSeen = useCallback(async () => {
    if (!userId || unreadCount === 0) return;

    // Optimistic update
    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => (n.seen_at ? n : { ...n, seen_at: new Date().toISOString() }))
    );

    const { error } = await supabase
      .from("user_notifications")
      .update({ seen_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("seen_at", null);

    if (error) {
      console.error("[useNotifications] markAllSeen error:", error.message);
      // Refetch to correct state
      fetchNotifications();
    }
  }, [userId, unreadCount, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();
    return () => { mountedRef.current = false; };
  }, [fetchNotifications]);

  // Refetch on app focus (covers background → foreground)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchNotifications]);

  // Lightweight poll — catches notifications written by background processes
  // (badge digests after import, coverage alerts, etc.) without needing signals.
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(fetchNotifications, 15_000);
    return () => clearInterval(id);
  }, [userId, fetchNotifications]);

  return { notifications, unreadCount, markAllSeen, refresh: fetchNotifications, loading };
}

import { t } from "../theme";
// src/admin/PodcastRequestsManager.jsx
//
// Admin view: review user-submitted podcast requests.
// Sorted by popularity (upvotes desc), with status management.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const STATUS_OPTIONS = ["pending", "approved", "declined", "launched"];

const STATUS_COLORS = {
  pending:  { bg: "rgba(250,204,21,0.10)", text: "#facc15", border: "rgba(250,204,21,0.25)" },
  approved: { bg: "rgba(74,222,128,0.10)", text: "#4ade80", border: "rgba(74,222,128,0.25)" },
  declined: { bg: "rgba(233,69,96,0.10)", text: "#e94560", border: "rgba(233,69,96,0.25)" },
  launched: { bg: "rgba(34,211,238,0.10)", text: "#22d3ee", border: "rgba(34,211,238,0.25)" },
};

export default function PodcastRequestsManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // null = all
  const [toast, setToast] = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch requests ──
  const loadRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("podcast_requests")
      .select("*, profiles:user_id(username)")
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });

    if (filter) query = query.eq("status", filter);

    const { data, error } = await query;

    if (error) {
      console.error("[PodcastRequests] Load error:", error);
      // Fallback without join if profiles table doesn't exist
      const { data: fallback } = await supabase
        .from("podcast_requests")
        .select("*")
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false })
        .eq("status", filter || "pending");

      setRequests(fallback || []);
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── Update status ──
  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from("podcast_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      showToast("Failed to update status", true);
    } else {
      showToast(`Marked as ${newStatus}`);
      setRequests(prev => prev.map(r =>
        r.id === id ? { ...r, status: newStatus } : r
      ));
    }
  };

  // ── Delete request ──
  const deleteRequest = async (id) => {
    if (!confirm("Delete this request permanently?")) return;
    const { error } = await supabase
      .from("podcast_requests")
      .delete()
      .eq("id", id);

    if (error) {
      showToast("Failed to delete", true);
    } else {
      showToast("Deleted");
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  // ── Count by status ──
  const counts = {};
  // We'll show counts from the full unfiltered set, but that requires an extra query.
  // For simplicity, just show the current filter's count.

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "10px 20px", borderRadius: 8,
          background: toast.isError ? "rgba(233,69,96,0.9)" : "rgba(74,222,128,0.9)",
          color: "#000", fontSize: 13, fontWeight: 600,
          fontFamily: "var(--font-display)",
          animation: "admin-toast-in 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 28, fontFamily: "var(--font-display)",
          fontWeight: 700, color: t.cream,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          Podcast Requests
        </div>
        <div style={{
          fontSize: 12, fontFamily: "var(--font-mono)",
          color: "rgba(240,235,225,0.35)", marginTop: 4,
        }}>
          User-submitted community requests, sorted by popularity
        </div>
      </div>

      {/* Status filter tabs */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 24,
        flexWrap: "wrap",
      }}>
        {[null, ...STATUS_OPTIONS].map((status) => {
          const label = status || "all";
          const isActive = filter === status;
          const colors = status ? STATUS_COLORS[status] : null;
          return (
            <button
              key={label}
              onClick={() => setFilter(status)}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: isActive
                  ? `1px solid ${colors?.border || "rgba(240,235,225,0.3)"}`
                  : "1px solid rgba(255,255,255,0.08)",
                background: isActive
                  ? (colors?.bg || "rgba(240,235,225,0.08)")
                  : "transparent",
                color: isActive
                  ? (colors?.text || t.cream)
                  : "rgba(240,235,225,0.45)",
                fontSize: 11,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Request list */}
      {loading ? (
        <div style={{
          textAlign: "center", padding: 48,
          color: "rgba(240,235,225,0.3)", fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}>
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 48,
          color: "rgba(240,235,225,0.3)", fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}>
          No {filter || ""} requests yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {requests.map((req) => {
            const colors = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
            const username = req.profiles?.username || req.user_id?.slice(0, 8) || "anon";
            const date = new Date(req.created_at).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            });

            return (
              <div
                key={req.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "16px 20px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Upvote count */}
                <div style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2,
                  minWidth: 48, paddingTop: 2,
                }}>
                  <span style={{
                    fontSize: 11, color: "rgba(240,235,225,0.3)",
                  }}>▲</span>
                  <span style={{
                    fontSize: 20, fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color: req.upvotes > 1 ? t.gold : "rgba(240,235,225,0.5)",
                  }}>
                    {req.upvotes || 0}
                  </span>
                  <span style={{
                    fontSize: 8, color: "rgba(240,235,225,0.25)",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                  }}>
                    votes
                  </span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      fontSize: 16, fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      color: t.cream,
                    }}>
                      {req.podcast_name}
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}>
                      {req.status}
                    </span>
                  </div>

                  {/* Meta */}
                  <div style={{
                    fontSize: 11, color: "rgba(240,235,225,0.35)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 4,
                  }}>
                    by @{username} · {date}
                  </div>

                  {/* URL */}
                  {req.podcast_url && (
                    <a
                      href={req.podcast_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block", marginTop: 6,
                        fontSize: 11, fontFamily: "var(--font-mono)",
                        color: t.cyan,
                        textDecoration: "none",
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {req.podcast_url}
                    </a>
                  )}

                  {/* Note */}
                  {req.note && (
                    <div style={{
                      marginTop: 8, padding: "8px 12px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      fontSize: 12, color: "rgba(240,235,225,0.55)",
                      fontFamily: "var(--font-body)",
                      lineHeight: 1.5,
                      fontStyle: "italic",
                    }}>
                      "{req.note}"
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{
                    display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap",
                  }}>
                    {STATUS_OPTIONS.filter(s => s !== req.status).map(s => {
                      const sc = STATUS_COLORS[s];
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(req.id, s)}
                          style={{
                            padding: "4px 12px",
                            borderRadius: 5,
                            border: `1px solid ${sc.border}`,
                            background: "transparent",
                            color: sc.text,
                            fontSize: 10,
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                          }}
                        >
                          {s === "approved" ? "Approve" :
                           s === "declined" ? "Decline" :
                           s === "launched" ? "Mark Launched" : "Set Pending"}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => deleteRequest(req.id)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 5,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "transparent",
                        color: "rgba(240,235,225,0.3)",
                        fontSize: 10,
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

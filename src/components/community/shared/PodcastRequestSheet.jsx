import { t } from "../../../theme";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../supabase";

// ════════════════════════════════════════════════
// PODCAST REQUEST SHEET — "Don't see your pod? Request it!"
// ════════════════════════════════════════════════
// Bottom sheet with form: podcast name (required), link, note.
// Shows existing requests users can upvote.

export default function PodcastRequestSheet({ open, onClose, userId }) {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const [tab, setTab] = useState("request"); // "request" | "popular"
  const [podcastName, setPodcastName] = useState("");
  const [podcastUrl, setPodcastUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Popular requests
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState(new Set());

  // ── Prevent background scroll ──
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ── Fetch existing requests when "popular" tab opens ──
  useEffect(() => {
    if (!open || tab !== "popular") return;
    let cancelled = false;

    (async () => {
      setLoadingRequests(true);
      const { data } = await supabase
        .from("podcast_requests")
        .select("*")
        .eq("status", "pending")
        .order("upvotes", { ascending: false })
        .limit(20);

      if (!cancelled && data) setRequests(data);

      // Fetch user's upvotes
      if (userId) {
        const { data: votes } = await supabase
          .from("podcast_request_upvotes")
          .select("request_id")
          .eq("user_id", userId);
        if (!cancelled && votes) {
          setUserUpvotes(new Set(votes.map(v => v.request_id)));
        }
      }

      if (!cancelled) setLoadingRequests(false);
    })();

    return () => { cancelled = true; };
  }, [open, tab, userId]);

  // ── Submit request ──
  const handleSubmit = async () => {
    if (!podcastName.trim() || !userId) return;
    setSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase
        .from("podcast_requests")
        .insert({
          user_id: userId,
          podcast_name: podcastName.trim(),
          podcast_url: podcastUrl.trim() || null,
          note: note.trim() || null,
        });

      if (insertErr) throw insertErr;

      // Also insert the self-upvote
      // (will silently fail on unique constraint if somehow duplicated)
      const { data: newRow } = await supabase
        .from("podcast_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("podcast_name", podcastName.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (newRow) {
        await supabase.from("podcast_request_upvotes").insert({
          request_id: newRow.id,
          user_id: userId,
        });
      }

      setSubmitted(true);
      setPodcastName("");
      setPodcastUrl("");
      setNote("");
    } catch (err) {
      console.error("[PodcastRequest] Submit error:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Upvote ──
  const handleUpvote = async (requestId) => {
    if (!userId) return;
    const alreadyVoted = userUpvotes.has(requestId);

    if (alreadyVoted) {
      // Remove upvote
      await supabase.from("podcast_request_upvotes")
        .delete()
        .eq("request_id", requestId)
        .eq("user_id", userId);

      // Decrement count
      const req = requests.find(r => r.id === requestId);
      if (req) {
        await supabase.from("podcast_requests")
          .update({ upvotes: Math.max(0, (req.upvotes || 1) - 1) })
          .eq("id", requestId);
      }

      setUserUpvotes(prev => { const s = new Set(prev); s.delete(requestId); return s; });
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, upvotes: Math.max(0, (r.upvotes || 1) - 1) } : r
      ));
    } else {
      // Add upvote
      await supabase.from("podcast_request_upvotes")
        .insert({ request_id: requestId, user_id: userId });

      const req = requests.find(r => r.id === requestId);
      if (req) {
        await supabase.from("podcast_requests")
          .update({ upvotes: (req.upvotes || 0) + 1 })
          .eq("id", requestId);
      }

      setUserUpvotes(prev => new Set([...prev, requestId]));
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r
      ));
    }
  };

  // ── Drag-to-dismiss ──
  const onTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  };
  const onTouchMove = (e) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      currentY.current = diff;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${diff}px)`;
      }
    }
  };
  const onTouchEnd = () => {
    if (currentY.current > 120) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    currentY.current = 0;
  };

  const handleClose = () => {
    setSubmitted(false);
    setError(null);
    setTab("request");
    onClose();
  };

  if (!open) return null;

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid var(--border-medium)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: t.fontBody,
    outline: "none",
  };

  const labelStyle = {
    fontSize: 10,
    fontFamily: t.fontBody,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 6,
  };

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleClose}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: t.bgCard,
          borderRadius: "20px 20px 0 0",
          maxHeight: "85vh",
          overflowY: "auto",
          transition: "transform 0.2s ease",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: "flex", justifyContent: "center",
          padding: "12px 0 8px",
        }}>
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.15)",
          }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 24px 16px", textAlign: "center" }}>
          <div style={{
            fontFamily: t.fontSharpie,
            fontSize: 22,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}>
            Request a Podcast
          </div>
          <div style={{
            fontSize: 12, color: "var(--text-muted)",
            fontFamily: t.fontBody,
            lineHeight: 1.4,
          }}>
            Tell us which film podcast you want on MANTL.
            <br />
            Popular requests get built first.
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: "flex", gap: 0, margin: "0 24px 16px",
          borderRadius: 10, overflow: "hidden",
          border: "1px solid var(--border-subtle)",
        }}>
          {[
            { key: "request", label: "Submit" },
            { key: "popular", label: "Popular Requests" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: "10px 0",
                background: tab === key ? "rgba(255,255,255,0.08)" : "transparent",
                border: "none",
                color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 12,
                fontFamily: t.fontBody,
                fontWeight: tab === key ? 600 : 400,
                cursor: "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          {tab === "request" ? (
            submitted ? (
              /* ── Success state ── */
              <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📼</div>
                <div style={{
                  fontFamily: t.fontSharpie,
                  fontSize: 18, color: "var(--text-primary)",
                  marginBottom: 6,
                }}>
                  Request submitted!
                </div>
                <div style={{
                  fontSize: 12, color: "var(--text-muted)",
                  fontFamily: t.fontBody, lineHeight: 1.5,
                }}>
                  We'll review it and let the community decide.
                  <br />
                  Check the Popular Requests tab to see what's trending.
                </div>
                <button
                  onClick={() => { setSubmitted(false); }}
                  style={{
                    marginTop: 16,
                    padding: "10px 24px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: 13, fontFamily: t.fontBody,
                    cursor: "pointer",
                  }}
                >
                  Submit another
                </button>
              </div>
            ) : (
              /* ── Request form ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Podcast name */}
                <div>
                  <div style={labelStyle}>Podcast name *</div>
                  <input
                    type="text"
                    value={podcastName}
                    onChange={e => setPodcastName(e.target.value)}
                    placeholder="e.g. The Rewatchables"
                    style={inputStyle}
                    maxLength={120}
                  />
                </div>

                {/* Link */}
                <div>
                  <div style={labelStyle}>Link (optional)</div>
                  <input
                    type="url"
                    value={podcastUrl}
                    onChange={e => setPodcastUrl(e.target.value)}
                    placeholder="Apple Podcasts, Spotify, or RSS link"
                    style={inputStyle}
                  />
                </div>

                {/* Note */}
                <div>
                  <div style={labelStyle}>Why this pod? (optional)</div>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="What makes this podcast great for a MANTL community?"
                    rows={3}
                    maxLength={500}
                    style={{
                      ...inputStyle,
                      resize: "none",
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    fontSize: 12, color: t.red,
                    fontFamily: t.fontBody,
                  }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!podcastName.trim() || submitting || !userId}
                  style={{
                    padding: "14px 0",
                    borderRadius: 12,
                    border: "none",
                    background: podcastName.trim() && userId
                      ? t.red
                      : "rgba(255,255,255,0.06)",
                    color: podcastName.trim() && userId
                      ? "#fff"
                      : "var(--text-faint)",
                    fontSize: 14,
                    fontFamily: t.fontBody,
                    fontWeight: 600,
                    cursor: podcastName.trim() ? "pointer" : "default",
                    opacity: submitting ? 0.6 : 1,
                    letterSpacing: "0.02em",
                  }}
                >
                  {submitting ? "Submitting..." : !userId ? "Sign in to request" : "Submit Request"}
                </button>
              </div>
            )
          ) : (
            /* ── Popular requests tab ── */
            <div>
              {loadingRequests ? (
                <div style={{
                  textAlign: "center", padding: 32,
                  fontSize: 12, color: "var(--text-muted)",
                  fontFamily: t.fontBody,
                }}>
                  Loading requests...
                </div>
              ) : requests.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: 32,
                  fontSize: 12, color: "var(--text-muted)",
                  fontFamily: t.fontBody, lineHeight: 1.5,
                }}>
                  No requests yet — be the first!
                  <br />
                  <button
                    onClick={() => setTab("request")}
                    style={{
                      marginTop: 12, padding: "8px 20px",
                      borderRadius: 8, border: "1px solid var(--border-subtle)",
                      background: "transparent", color: "var(--text-primary)",
                      fontSize: 12, fontFamily: t.fontBody, cursor: "pointer",
                    }}
                  >
                    Submit a request
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {requests.map((req) => {
                    const voted = userUpvotes.has(req.id);
                    return (
                      <div
                        key={req.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 14px",
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {/* Upvote button */}
                        <button
                          onClick={() => handleUpvote(req.id)}
                          disabled={!userId}
                          style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", gap: 2,
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: voted
                              ? `1px solid ${t.red}`
                              : "1px solid var(--border-subtle)",
                            background: voted
                              ? "rgba(233,69,96,0.12)"
                              : "transparent",
                            cursor: userId ? "pointer" : "default",
                            minWidth: 44,
                          }}
                        >
                          <span style={{
                            fontSize: 14,
                            transform: voted ? "none" : "scaleY(0.8)",
                            opacity: voted ? 1 : 0.5,
                          }}>
                            ▲
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 700,
                            fontFamily: t.fontBody,
                            color: voted ? t.red : "var(--text-muted)",
                          }}>
                            {req.upvotes || 0}
                          </span>
                        </button>

                        {/* Podcast info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            fontFamily: t.fontBody,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                            {req.podcast_name}
                          </div>
                          {req.note && (
                            <div style={{
                              fontSize: 11, color: "var(--text-muted)",
                              fontFamily: t.fontBody,
                              marginTop: 3, lineHeight: 1.4,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                              {req.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

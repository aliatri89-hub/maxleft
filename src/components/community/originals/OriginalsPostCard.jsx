import { t } from "../../../theme";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../../supabase";

/**
 * OriginalsPostCard — Tappable liner notes card above each miniseries shelf.
 * Fetches the blog post linked to a miniseries, shows title + preview.
 * Tap → full-screen reader overlay with readable text sizing.
 */
export default function OriginalsPostCard({ miniseriesId, accent }) {
  const [post, setPost] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!miniseriesId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("originals_posts")
        .select("*")
        .eq("miniseries_id", miniseriesId)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setPost(data || null);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [miniseriesId]);

  if (loading || !post) return null;

  const preview = post.body.split(/\n\n/)[0] || "";

  const cleanPreview = preview.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#+ /g, "");

  return (
    <>
      {/* ── Compact card ── */}
      <div
        onClick={() => setOpen(true)}
        style={{
          margin: "0 16px 12px",
          borderRadius: 12,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          minHeight: 80,
          border: `1px solid ${t.bgHover}`,
          background: t.bgElevated,
        }}
      >
        {/* Backdrop image */}
        {post.cover_image_url && (
          <>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${post.cover_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.35,
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(15,13,11,0.85) 40%, rgba(15,13,11,0.4) 100%)",
            }} />
          </>
        )}

        {/* Content row */}
        <div style={{
          position: "relative",
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: t.textPrimary,
              fontFamily: t.fontDisplay,
              letterSpacing: "0.02em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginBottom: 5,
            }}>
              {post.title}
            </div>
            <div style={{
              fontSize: 11, color: t.textSecondary,
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {cleanPreview.slice(0, 220)}
            </div>
          </div>

          <div style={{
            fontSize: 10, color: accent, fontWeight: 600,
            fontFamily: t.fontBody,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}>
            Read
          </div>
        </div>
      </div>

      {/* ── Full-screen reader overlay ── */}
      {open && createPortal(
        <ReaderOverlay post={post} accent={accent} onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}


// ════════════════════════════════════════════════
// READER OVERLAY — full-screen markdown reader
// ════════════════════════════════════════════════

function ReaderOverlay({ post, accent, onClose }) {
  const [authorData, setAuthorData] = useState(null);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fetch author avatar
  useEffect(() => {
    const authorName = post.author || "Ali";
    supabase.from("originals_authors").select("name, avatar_url, bio")
      .eq("name", authorName).maybeSingle()
      .then(({ data }) => setAuthorData(data));
  }, [post.author]);

  // Simple markdown → HTML
  const renderMarkdown = (md) => {
    const paragraphs = md.split(/\n\n+/).filter(Boolean);
    return paragraphs.map((p, i) => {
      let html = p
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" style="color:${accent};text-decoration:underline" target="_blank" rel="noopener">$1</a>`)
        .replace(/\n/g, '<br/>');

      return (
        <p
          key={i}
          style={{
            fontSize: 17, lineHeight: 1.75,
            color: t.textSecondary,
            margin: "0 0 20px",
            fontFamily: "'Georgia', 'Times New Roman', serif",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  };

  const publishDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: t.bgPrimary,
      display: "flex", flexDirection: "column",
      paddingTop: "var(--sat)",
    }}>
      {/* ── Sticky header ── */}
      <div style={{
        flexShrink: 0,
        padding: "12px 16px",
        background: "rgba(15,13,11,0.97)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${t.borderSubtle}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: accent,
            fontSize: 15, cursor: "pointer", padding: "4px 8px 4px 0",
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <div style={{
          flex: 1, textAlign: "center",
          fontSize: 11, fontWeight: 600, color: t.textMuted,
          fontFamily: t.fontBody,
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          MANTL Originals
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* ── Scrollable content ── */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "calc(40px + var(--sab))",
      }}>
        {/* Title block — backdrop hero if cover image, plain if not */}
        {post.cover_image_url ? (
          <div style={{
            position: "relative",
            minHeight: 360,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            overflow: "hidden",
          }}>
            {/* Background image */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${post.cover_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }} />
            {/* Dark gradient overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(to bottom, rgba(15,13,11,0.05) 0%, rgba(15,13,11,0.5) 65%, ${t.bgPrimary} 100%)`,
            }} />
            {/* Content over backdrop */}
            <div style={{ position: "relative", padding: "32px 24px 20px" }}>
              <div style={{
                fontSize: 28, fontWeight: 800, color: "#fff",
                fontFamily: t.fontDisplay,
                letterSpacing: "0.01em",
                lineHeight: 1.15,
                marginBottom: 12,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}>
                {post.title}
              </div>

              <div style={{
                display: "flex", alignItems: "center", gap: 10,
              }}>
                {authorData?.avatar_url && (
                  <img src={authorData.avatar_url} alt="" style={{
                    width: 55, height: 55, borderRadius: "50%", objectFit: "cover",
                    border: "2px solid rgba(255,255,255,0.3)",
                  }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: "#fff",
                      fontFamily: t.fontBody,
                      letterSpacing: "0.03em",
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}>
                      by {post.author || "Ali"}
                    </div>
                    {publishDate && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>·</span>
                        <div style={{
                          fontSize: 11, color: "rgba(255,255,255,0.7)",
                          fontFamily: t.fontBody,
                          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                        }}>
                          {publishDate}
                        </div>
                      </>
                    )}
                  </div>
                  {authorData?.bio && (
                    <div style={{
                      fontSize: 11, color: "rgba(255,255,255,0.6)",
                      fontFamily: t.fontBody,
                      lineHeight: 1.3,
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}>
                      {authorData.bio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "32px 24px 0" }}>
            <div style={{
              fontSize: 28, fontWeight: 800, color: t.textPrimary,
              fontFamily: t.fontDisplay,
              letterSpacing: "0.01em",
              lineHeight: 1.15,
              marginBottom: 12,
            }}>
              {post.title}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 28,
            }}>
              {authorData?.avatar_url && (
                <img src={authorData.avatar_url} alt="" style={{
                  width: 55, height: 55, borderRadius: "50%", objectFit: "cover",
                  border: `1.5px solid ${accent}40`,
                }} />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: accent,
                    fontFamily: t.fontBody,
                    letterSpacing: "0.03em",
                  }}>
                    by {post.author || "Ali"}
                  </div>
                  {publishDate && (
                    <>
                      <span style={{ color: t.textSecondary }}>·</span>
                      <div style={{
                        fontSize: 11, color: t.textMuted,
                        fontFamily: t.fontBody,
                      }}>
                        {publishDate}
                      </div>
                    </>
                  )}
                </div>
                {authorData?.bio && (
                  <div style={{
                    fontSize: 11, color: t.textMuted,
                    fontFamily: t.fontBody,
                    lineHeight: 1.3,
                  }}>
                    {authorData.bio}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{
              height: 1,
              background: `linear-gradient(90deg, ${accent}40, transparent)`,
              marginBottom: 28,
            }} />
          </div>
        )}

        {/* Body */}
        <div style={{ padding: `${post.cover_image_url ? 24 : 0}px 24px 0` }}>
          {renderMarkdown(post.body)}
        </div>

        {/* Footer */}
        <div style={{
          padding: "32px 24px 0",
          borderTop: `1px solid ${t.borderSubtle}`,
          marginTop: 12,
        }}>
          <div style={{
            fontSize: 11, color: t.textSecondary,
            fontFamily: t.fontBody,
            textAlign: "center",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
            ▶ MANTL Originals
          </div>
        </div>
      </div>
    </div>
  );
}

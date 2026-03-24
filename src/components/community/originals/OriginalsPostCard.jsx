import { useState, useEffect } from "react";
import { supabase } from "../../../supabase";

/**
 * OriginalsPostCard — Tappable liner notes card above each miniseries shelf.
 * Fetches the blog post linked to a miniseries, shows title + preview.
 * Tap → expand inline to show full markdown body.
 */
export default function OriginalsPostCard({ miniseriesId, accent }) {
  const [post, setPost] = useState(null);
  const [expanded, setExpanded] = useState(false);
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

  // Simple markdown → JSX (bold, italic, links, paragraphs)
  const renderMarkdown = (md) => {
    const paragraphs = md.split(/\n\n+/).filter(Boolean);
    return paragraphs.map((p, i) => {
      // Process inline markdown
      let html = p
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:' + accent + ';text-decoration:underline" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, '<br/>');

      return (
        <p
          key={i}
          style={{
            fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.82)",
            margin: "0 0 12px",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  };

  const preview = post.body.split(/\n\n/)[0] || "";

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        margin: "0 16px 12px",
        padding: "14px 16px",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${expanded ? accent + "40" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: expanded ? 12 : 0,
      }}>
        {/* Liner notes icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `${accent}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14 }}>📝</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {post.title}
          </div>
          {!expanded && (
            <div style={{
              fontSize: 11, color: "rgba(255,255,255,0.4)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              marginTop: 2,
            }}>
              {preview.replace(/\*\*/g, "").replace(/\*/g, "").slice(0, 80)}…
            </div>
          )}
        </div>

        <div style={{
          fontSize: 10, color: accent, fontWeight: 600,
          fontFamily: "'IBM Plex Mono', monospace",
          textTransform: "uppercase",
          flexShrink: 0,
        }}>
          {expanded ? "Close" : "Read"}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 12,
        }}>
          {renderMarkdown(post.body)}
        </div>
      )}
    </div>
  );
}

export default function ActivityPane({ items, loading }) {
  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 13 }}>Loading activity...</div>;
  }
  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 6 }}>No activity yet</div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "var(--text-muted)" }}>Shelf a book, finish a film, or start tracking habits — it'll all show up here.</div>
      </div>
    );
  }

  return (
    <div>
      {items.map((item, i) => {
        const actionText = item.activity_type === "book" ? (item.action === "finished" ? "finished reading" : item.action === "started" ? "started reading" : "shelved")
          : item.activity_type === "movie" ? (item.action === "finished" ? "finished watching" : "shelved")
          : item.activity_type === "show" ? (item.action === "finished" ? "finished watching" : item.action === "started" ? "started watching" : item.action === "progress" ? "updated progress on" : "shelved")
          : item.activity_type === "game" ? (item.action === "finished" ? "finished playing" : item.action === "beat" ? "beat" : "shelved")
          : item.activity_type === "event" ? (item.action === "completed" ? "completed" : item.action === "countdown_month" ? "is training for" : "added")
          : item.activity_type === "challenge" ? (item.action || "tracked")
          : item.activity_type === "country" ? "visited"
          : item.action || "logged";
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
        const icon = item.activity_type === "book" ? "📖" : item.activity_type === "movie" ? "🎬" : item.activity_type === "show" ? "📺" : item.activity_type === "game" ? "🎮" : item.activity_type === "event" ? "🏁" : item.activity_type === "country" ? "🌍" : "📊";
        return (
          <div key={item.id || i} style={{
            display: "flex", gap: 12, padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)", alignItems: "center",
          }}>
            {item.item_cover ? (
              <img src={item.item_cover} alt="" style={{ width: 40, height: 58, objectFit: "cover", borderRadius: "var(--radius-sm)", flexShrink: 0, boxShadow: "var(--shadow-poster)" }} />
            ) : (
              <div style={{ width: 40, height: 58, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-faint)", marginBottom: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>{actionText}</div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.item_title || item.title || "Activity"}</div>
              {item.item_author && <div style={{ fontFamily: "var(--font-serif)", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{item.item_author}</div>}
              {item.rating > 0 && <div style={{ fontSize: 11, color: "var(--accent-gold)", marginTop: 2 }}>{"★".repeat(item.rating)}</div>}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-faint)", flexShrink: 0 }}>{dateStr}</div>
          </div>
        );
      })}
    </div>
  );
}

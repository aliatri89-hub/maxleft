export default function CommunityFilter({ value = "all", onChange, accent = "#e94560" }) {
  const options = [
    { key: "all", label: "All" },
    { key: "seen", label: "Seen" },
    { key: "unseen", label: "Unseen" },
  ];

  return (
    <div style={{
      display: "flex", gap: 6,
      padding: "8px 16px",
    }}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              background: active ? accent + "22" : "rgba(255,255,255,0.05)",
              border: active ? "1px solid " + accent : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "5px 14px",
              color: active ? accent : "#888",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

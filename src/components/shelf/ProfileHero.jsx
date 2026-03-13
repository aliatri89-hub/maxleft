export default function ProfileHero({ profile }) {
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
      background: "var(--bg-card)",
      marginBottom: 4,
    }}>
      {profile.locationImage && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${profile.locationImage})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "brightness(0.55) saturate(1.1)",
        }} />
      )}
      <div style={{
        position: "relative",
        padding: "28px 20px 22px",
        background: profile.locationImage
          ? "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 100%)"
          : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--bg-elevated)",
            border: "2px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, overflow: "hidden", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (profile.avatar || "👤")
            }
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 20, color: "#fff",
              letterSpacing: "0.02em",
              textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            }}>@{profile.username}</div>
            {profile.location && (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "rgba(255,255,255,0.8)", marginTop: 3,
                letterSpacing: "0.04em",
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }}>📍 {profile.location}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

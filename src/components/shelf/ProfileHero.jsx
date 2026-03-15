import InitialAvatar from "../InitialAvatar";

export default function ProfileHero({ profile }) {
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
      background: "var(--bg-card)",
      marginBottom: 4,
    }}>
      <div style={{
        position: "relative",
        padding: "28px 20px 22px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.25)",
            overflow: "hidden", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <InitialAvatar username={profile.username} size={52} />
            }
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: 20, color: "#fff",
              letterSpacing: "0.02em",
              textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            }}>@{profile.username}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

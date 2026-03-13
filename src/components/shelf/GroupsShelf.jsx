import { GROUP_TYPE_CONFIG } from "../../utils/constants";

const S = {
  section: { padding: "0 16px", marginBottom: 28 },
  labelRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 0 14px",
  },
  label: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 20, color: "var(--text-primary)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "flex", alignItems: "center", gap: 8,
  },
  count: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--text-faint)", fontWeight: 400,
  },
  empty: {
    textAlign: "center", padding: "40px 16px",
  },
  emptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  emptyTitle: {
    fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 14, color: "var(--text-secondary)", marginBottom: 4,
  },
  emptyHint: {
    fontFamily: "var(--font-serif)", fontSize: 13,
    color: "var(--text-muted)", fontStyle: "italic",
  },
  groupRow: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "13px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    cursor: "pointer",
  },
  groupName: {
    fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 15, color: "var(--text-primary)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  groupMeta: {
    fontFamily: "var(--font-mono)", fontSize: 11,
    color: "var(--text-muted)", marginTop: 3,
  },
};

export default function GroupsShelf({ userGroups, onOpenGroup }) {
  return (
    <div style={S.section}>
      <div style={S.labelRow}>
        <div style={S.label}>
          👥 Groups
          {userGroups?.length > 0 && <span style={S.count}>{userGroups.length}</span>}
        </div>
      </div>

      {(!userGroups || userGroups.length === 0) ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>👥</div>
          <div style={S.emptyTitle}>No groups yet</div>
          <div style={S.emptyHint}>Join or create a group in Settings → My Groups</div>
        </div>
      ) : (
        <div>
          {userGroups.map((g, i) => {
            const cfg = GROUP_TYPE_CONFIG[g.type] || GROUP_TYPE_CONFIG.training;
            return (
              <div key={g.id} onClick={() => onOpenGroup(g.id)}
                style={{ ...S.groupRow, ...(i === userGroups.length - 1 ? { borderBottom: "none" } : {}) }}>
                <span style={{ fontSize: 28 }}>{g.emoji || cfg.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.groupName}>{g.name}</div>
                  <div style={S.groupMeta}>
                    {cfg.label} · {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
                    {g.role === "admin" ? " · Admin" : ""}
                  </div>
                </div>
                <div style={{ color: "var(--text-faint)", fontSize: 14 }}>→</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

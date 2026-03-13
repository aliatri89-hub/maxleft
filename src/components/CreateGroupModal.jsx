import { useState } from "react";
import { GROUP_TYPE_CONFIG } from "../utils/constants";

function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("training");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const group = await onCreate(name.trim(), type, description.trim());
    setCreating(false);
    if (group) onClose(group);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="pin-picker" onClick={e => e.stopPropagation()} style={{ maxHeight: "85vh", overflow: "auto" }}>
        <div className="pin-picker-header">
          <div className="pin-picker-title">Create Group</div>
          <div className="pin-picker-close" onClick={onClose}>✕</div>
        </div>
        <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Type selector */}
          <div>
            <div className="event-form-label">Type</div>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(GROUP_TYPE_CONFIG).map(([key, cfg]) => (
                <div key={key} onClick={() => setType(key)} style={{
                  flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
                  background: type === key ? "var(--charcoal)" : "var(--warm-white)",
                  border: `2px solid ${type === key ? "var(--terracotta)" : "var(--border-med)"}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{cfg.emoji}</div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11,
                    textTransform: "uppercase", letterSpacing: "0.02em",
                    color: type === key ? "var(--cream)" : "var(--charcoal)",
                  }}>{cfg.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="event-form-label">Group Name</div>
            <input className="event-form-input" placeholder={type === "training" ? "e.g. Lisbon Marathon Crew" : type === "bookclub" ? "e.g. Sunday Book Club" : "e.g. Movie Night Squad"} value={name} onChange={e => setName(e.target.value)} autoFocus maxLength={50} />
          </div>

          <div>
            <div className="event-form-label">Description <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span></div>
            <input className="event-form-input" placeholder="What's this group about?" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
          </div>

          <button className="btn-shelf-it" disabled={!name.trim() || creating} onClick={handleCreate}>
            {creating ? "Creating..." : `${GROUP_TYPE_CONFIG[type].emoji} Create Group`}
          </button>
        </div>
      </div>
    </div>
  );
}


export default CreateGroupModal;

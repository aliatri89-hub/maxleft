import { t } from "../theme";
// src/admin/ConfigFlags.jsx
//
// Feature flags manager + quick reference config.
// Server flags stored in `feature_flags` table.
// Hardcoded flags listed as read-only reference.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

const HARDCODED_FLAGS = [
  { file: "ActivityCard.jsx", key: "USE_TITLE_BACKDROPS", value: true, note: "TMDB title backdrops on activity feed cards" },
  { file: "NPPDashboard.jsx", key: "SHOW_COMMUNITY_STATS", value: false, note: "Member counts on NPP dashboard" },
  { file: "NPPDashboard.jsx", key: "SHOW_VOTING", value: false, note: "Voting UI on NPP film cards" },
  { file: "BlankCheckDashboard.jsx", key: "SHOW_COMMUNITY_STATS", value: false, note: "Member counts on BC dashboard" },
];

const QUICK_REF = [
  { label: "Supabase Project", value: "gfjobhkofftvmluocxyw" },
  { label: "Admin User ID", value: "19410e64-d610-4fab-9c26-d24fafc94696" },
  { label: "Custom Domain", value: "mymantl.app / api.mymantl.app" },
  { label: "Firebase Project", value: "mantl-6c5d1" },
  { label: "Repo", value: "github.com/aliatri89-hub/mantl" },
  { label: "LLC", value: "mymantl LLC (Wyoming)" },
];

export default function ConfigFlags({ session }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // key being saved
  const [newFlag, setNewFlag] = useState({ key: "", description: "" });
  const [showAdd, setShowAdd] = useState(false);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("key");
    if (!error) setFlags(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggleFlag = async (key, currentValue) => {
    setSaving(key);
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: !currentValue, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (!error) {
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !currentValue, updated_at: new Date().toISOString() } : f));
    }
    setSaving(null);
  };

  const addFlag = async () => {
    const key = newFlag.key.trim().toUpperCase().replace(/\s+/g, "_");
    if (!key) return;
    setSaving("__new__");
    const { error } = await supabase
      .from("feature_flags")
      .insert({ key, enabled: false, description: newFlag.description.trim() || null });

    if (!error) {
      setNewFlag({ key: "", description: "" });
      setShowAdd(false);
      fetchFlags();
    }
    setSaving(null);
  };

  const deleteFlag = async (key) => {
    if (!window.confirm(`Delete flag "${key}"?`)) return;
    setSaving(key);
    await supabase.from("feature_flags").delete().eq("key", key);
    setFlags(prev => prev.filter(f => f.key !== key));
    setSaving(null);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Config & Flags</h1>
          <div style={s.subtitle}>Feature toggles and reference</div>
        </div>
        <button onClick={fetchFlags} disabled={loading} style={s.refreshBtn}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {/* ═══ SERVER FLAGS ═══ */}
      <SectionHeader title="Server-Side Feature Flags" />
      <div style={s.helperText}>
        These flags live in the <code style={s.code}>feature_flags</code> table. 
        Use <code style={s.code}>useFeatureFlags()</code> hook to read them in components. 
        Changes take effect on next app load.
      </div>
      <div style={s.chartCard}>
        {loading ? (
          <div style={s.emptyState}>Loading…</div>
        ) : flags.length === 0 ? (
          <div style={s.emptyState}>No flags configured</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Flag</th>
                <th style={s.th}>Description</th>
                <th style={{ ...s.th, textAlign: "center", width: 80 }}>Status</th>
                <th style={{ ...s.th, textAlign: "center", width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {flags.map(flag => (
                <tr key={flag.key}>
                  <td style={s.td}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: t.cream, fontWeight: 600 }}>{flag.key}</span>
                  </td>
                  <td style={{ ...s.td, fontSize: 11, color: "rgba(240,235,225,0.4)" }}>
                    {flag.description || "—"}
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    <button
                      onClick={() => toggleFlag(flag.key, flag.enabled)}
                      disabled={saving === flag.key}
                      style={{
                        ...s.toggleBtn,
                        background: flag.enabled ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.1)",
                        color: flag.enabled ? t.green : t.red,
                        borderColor: flag.enabled ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.2)",
                      }}
                    >
                      {saving === flag.key ? "…" : flag.enabled ? "ON" : "OFF"}
                    </button>
                  </td>
                  <td style={{ ...s.td, textAlign: "center" }}>
                    <button
                      onClick={() => deleteFlag(flag.key)}
                      style={s.deleteBtn}
                      title="Delete flag"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Add flag */}
        <div style={{ marginTop: 12 }}>
          {showAdd ? (
            <div style={s.addRow}>
              <input
                value={newFlag.key}
                onChange={e => setNewFlag(p => ({ ...p, key: e.target.value }))}
                placeholder="FLAG_KEY"
                style={{ ...s.input, width: 200 }}
              />
              <input
                value={newFlag.description}
                onChange={e => setNewFlag(p => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                style={{ ...s.input, flex: 1 }}
              />
              <button onClick={addFlag} disabled={!newFlag.key.trim() || saving === "__new__"} style={s.addBtn}>
                {saving === "__new__" ? "…" : "Add"}
              </button>
              <button onClick={() => setShowAdd(false)} style={s.cancelBtn}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} style={s.addTrigger}>+ Add Flag</button>
          )}
        </div>
      </div>

      {/* ═══ HARDCODED FLAGS ═══ */}
      <SectionHeader title="Hardcoded Flags (read-only)" />
      <div style={s.helperText}>
        These flags are constants in component files. Changing them requires a code deploy.
        Convert to server flags above when you want runtime toggles.
      </div>
      <div style={s.chartCard}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Flag</th>
              <th style={s.th}>File</th>
              <th style={{ ...s.th, textAlign: "center", width: 80 }}>Value</th>
              <th style={s.th}>Note</th>
            </tr>
          </thead>
          <tbody>
            {HARDCODED_FLAGS.map((f, i) => (
              <tr key={i}>
                <td style={s.td}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(240,235,225,0.6)" }}>{f.key}</span>
                </td>
                <td style={{ ...s.td, fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.3)" }}>{f.file}</td>
                <td style={{ ...s.td, textAlign: "center" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)",
                    color: f.value ? t.green : t.red,
                  }}>
                    {f.value ? "TRUE" : "FALSE"}
                  </span>
                </td>
                <td style={{ ...s.td, fontSize: 11, color: "rgba(240,235,225,0.35)" }}>{f.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ QUICK REFERENCE ═══ */}
      <SectionHeader title="Quick Reference" />
      <div style={s.chartCard}>
        <table style={s.table}>
          <tbody>
            {QUICK_REF.map((r, i) => (
              <tr key={i}>
                <td style={{ ...s.td, fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "rgba(240,235,225,0.45)", width: 160 }}>
                  {r.label}
                </td>
                <td style={{ ...s.td, fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(240,235,225,0.6)" }}>
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

function SectionHeader({ title }) {
  return <div style={s.sectionHeader}>{title}</div>;
}


// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const s = {
  page: { padding: "32px 40px 60px", maxWidth: 1100 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", color: t.cream, margin: 0 },
  subtitle: { fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)", marginTop: 6 },
  refreshBtn: { padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(196,115,79,0.25)", background: "rgba(196,115,79,0.08)", color: t.terra, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" },
  sectionHeader: { fontSize: 11, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(240,235,225,0.3)", marginTop: 32, marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" },
  chartCard: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px" },
  helperText: { fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.3)", marginBottom: 12, lineHeight: 1.6 },
  code: { background: "rgba(196,115,79,0.1)", color: t.terra, padding: "1px 6px", borderRadius: 4, fontSize: 11 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(240,235,225,0.3)", textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  td: { fontSize: 12, color: "rgba(240,235,225,0.6)", padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  toggleBtn: { padding: "4px 14px", borderRadius: 6, border: "1px solid", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.15s" },
  deleteBtn: { background: "none", border: "none", color: "rgba(240,235,225,0.2)", fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1 },
  addRow: { display: "flex", gap: 8, alignItems: "center" },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: t.cream, fontSize: 12, fontFamily: "var(--font-mono)", outline: "none" },
  addBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.1)", color: t.green, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", cursor: "pointer" },
  cancelBtn: { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(240,235,225,0.4)", fontSize: 11, fontFamily: "var(--font-display)", cursor: "pointer" },
  addTrigger: { background: "none", border: "none", color: t.terra, fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", cursor: "pointer", padding: "4px 0" },
  emptyState: { textAlign: "center", padding: "24px 0", fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.25)" },
};

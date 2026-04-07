import { t } from "../theme";
import { useState } from "react";
import { supabase } from "../supabase";

export default function UsernameSetup({ session, onComplete }) {
  const [username, setUsername]   = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean || clean.length < 3) { setError("At least 3 characters."); return; }
    if (clean.length > 20)          { setError("Max 20 characters."); return; }

    setLoading(true);
    setError("");

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, username: clean }, { onConflict: "id" });

    if (upsertErr) {
      setError(upsertErr.message.includes("unique") ? "That username is taken." : upsertErr.message);
      setLoading(false);
      return;
    }

    onComplete();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", padding: "0 32px", background: t.bgPrimary }}>
      <div style={{ fontWeight: 800, fontSize: 28, color: t.textPrimary, marginBottom: 8, letterSpacing: "-0.02em" }}>
        Max <span style={{ color: "#C4734F" }}>Left</span>
      </div>
      <div style={{ fontSize: 14, color: t.textSecondary, marginBottom: 32 }}>Choose a username to get started</div>

      <input
        value={username}
        onChange={e => setUsername(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="username"
        maxLength={20}
        style={{ width: "100%", maxWidth: 320, padding: "12px 16px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textPrimary, fontSize: 16, marginBottom: 12, boxSizing: "border-box" }}
      />

      {error && <div style={{ color: "#E24B4A", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ width: "100%", maxWidth: 320, padding: "13px 0", borderRadius: 10, border: "none", background: "#C4734F", color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "Saving…" : "Get started"}
      </button>
    </div>
  );
}

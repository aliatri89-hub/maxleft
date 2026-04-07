import { t } from "../theme";
import { useState } from "react";
import { supabase } from "../supabase";

export default function LandingScreen({ onAuth }) {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleMagicLink = async () => {
    if (!email.trim()) { setError("Enter your email."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", padding: "0 32px", background: t.bgPrimary }}>
      <div style={{ fontWeight: 800, fontSize: 42, color: t.textPrimary, marginBottom: 8, letterSpacing: "-0.03em" }}>
        Max <span style={{ color: "#C4734F" }}>Left</span>
      </div>
      <div style={{ fontSize: 15, color: t.textSecondary, marginBottom: 48, textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
        The podcast app for the progressive left
      </div>

      {sent ? (
        <div style={{ fontSize: 15, color: t.textPrimary, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>
          Check your email — we sent a magic link to <strong>{email}</strong>.
        </div>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleMagicLink()}
            placeholder="your@email.com"
            style={{ width: "100%", maxWidth: 320, padding: "13px 16px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textPrimary, fontSize: 16, marginBottom: 12, boxSizing: "border-box" }}
          />
          {error && <div style={{ color: "#E24B4A", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            onClick={handleMagicLink}
            disabled={loading}
            style={{ width: "100%", maxWidth: 320, padding: "13px 0", borderRadius: 10, border: "none", background: "#C4734F", color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Sending…" : "Continue with email"}
          </button>
        </>
      )}
    </div>
  );
}

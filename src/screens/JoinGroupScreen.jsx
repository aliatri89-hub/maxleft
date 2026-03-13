import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { GROUP_TYPE_CONFIG } from "../utils/constants";

function JoinGroupScreen({ code, onSignIn, onJoined }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from("groups").select("*").eq("invite_code", code.toUpperCase()).maybeSingle();
        if (error) console.error("Join group lookup error:", error);
        if (data) {
          setGroup(data);
          const { count } = await supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", data.id);
          setMemberCount(count || 0);
        }
      } catch (e) {
        console.error("Join group screen error:", e);
      }
      setLoading(false);
    };
    load();
  }, [code]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)" }}>
      <div className="spinner" />
    </div>
  );

  if (!group) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--cream)", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
      <div className="bb" style={{ fontSize: 18, marginBottom: 8 }}>Group not found</div>
      <div className="lr" style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 24 }}>This invite code doesn't match any group.</div>
      <button className="btn-primary" onClick={() => window.location.href = "/"}>Go to Mantl</button>
    </div>
  );

  const config = GROUP_TYPE_CONFIG[group.type] || GROUP_TYPE_CONFIG.training;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      {/* Group card */}
      <div style={{
        background: "linear-gradient(170deg, #1c1c1e 0%, #0f0f10 40%, #141416 100%)",
        borderRadius: 24, padding: "40px 32px", width: "100%", maxWidth: 340,
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #c4734f, #d4a843, transparent)" }} />
        {/* Grain */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{group.emoji || config.emoji}</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: "#f4f0ea", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.1, marginBottom: 6 }}>{group.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "rgba(244,240,234,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>{config.label} · {memberCount} member{memberCount !== 1 ? "s" : ""}</div>
          {group.description && <div style={{ fontFamily: "'Lora', serif", fontSize: 14, color: "rgba(244,240,234,0.6)", fontStyle: "italic", lineHeight: 1.4, marginBottom: 20 }}>{group.description}</div>}
        </div>
      </div>

      {/* CTA */}
      <div style={{ marginTop: 28, textAlign: "center", width: "100%", maxWidth: 340 }}>
        <button className="btn-primary" style={{ width: "100%" }} onClick={onSignIn}>
          Join {group.name}
        </button>
        <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 12, letterSpacing: "0.04em" }}>
          Sign in with Google to join · Free forever
        </div>
      </div>

      {/* Branding */}
      <div style={{ marginTop: 40 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>MANTL</div>
        <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.06em", marginTop: 2 }}>Shelf what you're made of</div>
      </div>
    </div>
  );
}


export default JoinGroupScreen;

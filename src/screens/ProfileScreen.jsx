import { t } from "../theme";
import { useState } from "react";
import { supabase } from "../supabase";
import InitialAvatar from "../components/InitialAvatar";

export default function ProfileScreen({ session }) {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  const user = session?.user;
  const email = user?.email || "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: "24px 16px", background: t.bgPrimary, minHeight: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
        <InitialAvatar initials={initials} size={52} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>{email}</div>
          <div style={{ fontSize: 13, color: t.textTertiary, marginTop: 2 }}>Max Left member</div>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${t.border}`, background: "none", color: t.textSecondary, fontSize: 14, cursor: "pointer" }}
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

import { t } from "../theme";

export default function AboutScreen({ onBack }) {
  return (
    <div style={{ padding: "24px 16px", background: t.bgPrimary, minHeight: "100%" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>
        About Max Left
      </div>
      <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>
        Max Left is a curated podcast app for the progressive left — 12 independent shows, a live news feed from left publications, and a Bluesky social feed from the hosts and journalists you already follow.
      </div>
      <div style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.7 }}>
        Built by one person. No corporate umbrella. No ads.
      </div>
    </div>
  );
}

import { t } from "../theme";
import { useState } from "react";
import PodcastPane from "../components/feed/PodcastPane";

// Stub panes — will be built out
function NewsPane() {
  return <div style={{ padding: 24, color: t.textSecondary, fontSize: 14 }}>News feed coming soon.</div>;
}
function BlueSkyPane() {
  return <div style={{ padding: 24, color: t.textSecondary, fontSize: 14 }}>Bluesky feed coming soon.</div>;
}

const FEED_TABS = [
  { id: "podcasts", label: "Podcasts" },
  { id: "news",     label: "News"     },
  { id: "bluesky",  label: "Bluesky"  },
];

export default function FeedScreen({ session, isActive }) {
  const [tab, setTab] = useState("podcasts");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `0.5px solid ${t.border}`, flexShrink: 0, background: t.bgPrimary }}>
        {FEED_TABS.map(ft => (
          <button
            key={ft.id}
            onClick={() => setTab(ft.id)}
            style={{
              flex: 1, padding: "12px 0", border: "none", background: "none",
              color: tab === ft.id ? "#C4734F" : t.textSecondary,
              fontSize: 13, fontWeight: tab === ft.id ? 600 : 400,
              cursor: "pointer",
              borderBottom: tab === ft.id ? "2px solid #C4734F" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {ft.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "podcasts" && <PodcastPane isVisible={isActive && tab === "podcasts"} userId={session?.user?.id} />}
        {tab === "news"     && <NewsPane />}
        {tab === "bluesky"  && <BlueSkyPane />}
      </div>

    </div>
  );
}

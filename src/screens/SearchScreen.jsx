import { t } from "../theme";
import { useState, useCallback, useRef } from "react";
import { supabase } from "../supabase";
import { useAudioPlayer } from "../components/community/shared/AudioPlayerProvider";
import decodeEntities from "../utils/decodeEntities";

export default function SearchScreen({ session, isActive }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const { playEpisode } = useAudioPlayer();

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("podcast_episodes")
        .select("id, title, audio_url, air_date, description, podcast_id, podcasts(name, artwork_url)")
        .ilike("title", `%${q}%`)
        .order("air_date", { ascending: false })
        .limit(40);
      setResults(data || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handlePlay = (ep) => {
    playEpisode({
      guid: ep.id,
      title: decodeEntities(ep.title),
      enclosureUrl: ep.audio_url,
      community: ep.podcasts?.name,
      artwork: ep.podcasts?.artwork_url,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bgPrimary }}>
      <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${t.border}`, flexShrink: 0 }}>
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search episodes…"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgCard, color: t.textPrimary, fontSize: 15, boxSizing: "border-box" }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && <div style={{ padding: 24, color: t.textTertiary, fontSize: 14, textAlign: "center" }}>Searching…</div>}
        {!loading && results.length === 0 && query.trim() && (
          <div style={{ padding: 24, color: t.textTertiary, fontSize: 14, textAlign: "center" }}>No episodes found.</div>
        )}
        {results.map(ep => (
          <div
            key={ep.id}
            onClick={() => handlePlay(ep)}
            style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: `0.5px solid ${t.border}`, cursor: "pointer" }}
          >
            {ep.podcasts?.artwork_url && (
              <img src={ep.podcasts.artwork_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0, objectFit: "cover" }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, lineHeight: 1.3, marginBottom: 3 }}>{decodeEntities(ep.title)}</div>
              <div style={{ fontSize: 12, color: t.textTertiary }}>{ep.podcasts?.name} · {ep.air_date?.slice(0, 10)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

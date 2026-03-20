/**
 * SearchScreen — Global search with podcast coverage overlay.
 *
 * TODO (Phase 4):
 *   - Full TMDB catalog search
 *   - Poster card results (not VHS tapes)
 *   - Films with coverage: stacked podcast avatars + terracotta episode count + play button
 *   - Films without coverage: + log button
 *   - Covered results sorted above uncovered, separated by "no coverage yet" divider
 *   - search_covered_films() RPC for coverage-aware results
 */

export default function SearchScreen({ session, isActive }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary, #0f0d0b)",
      paddingBottom: "calc(120px + env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{
        padding: "40px 24px", textAlign: "center",
        color: "var(--text-muted, #8892a8)", fontSize: 13,
        fontFamily: "var(--font-body)",
      }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
        Search — coming soon
      </div>
    </div>
  );
}

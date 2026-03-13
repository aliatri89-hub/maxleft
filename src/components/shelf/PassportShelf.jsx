import { useState } from "react";
import { COUNTRIES } from "../../utils/countries";
import { formatVisitDate } from "../../utils/constants";

const S = {
  section: { padding: "0 16px", marginBottom: 28 },
  labelRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 0 14px",
  },
  label: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 20, color: "var(--text-primary)",
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "flex", alignItems: "center", gap: 8,
    cursor: "pointer",
  },
  count: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--text-faint)", fontWeight: 400,
  },
  btnRow: { display: "flex", gap: 10, alignItems: "center" },
  mapBtn: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-green)", fontWeight: 600, cursor: "pointer",
  },
  addBtn: {
    fontFamily: "var(--font-mono)", fontSize: 13,
    color: "var(--accent-green)", fontWeight: 600, cursor: "pointer",
  },

  /* ── Empty ── */
  empty: { textAlign: "center", padding: "40px 16px" },
  emptyIcon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  emptyText: {
    fontFamily: "var(--font-serif)", fontSize: 14,
    color: "var(--text-muted)", fontStyle: "italic",
  },
  emptyCta: {
    fontFamily: "var(--font-mono)", fontSize: 12,
    color: "var(--accent-green)", cursor: "pointer", marginTop: 10,
  },

  /* ── Home country ── */
  homeRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 0", marginBottom: 6,
  },
  homeName: {
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 15, color: "var(--text-secondary)", letterSpacing: "0.02em",
  },
  homeLabel: {
    fontFamily: "var(--font-mono)", fontSize: 9,
    color: "var(--text-faint)", letterSpacing: "0.06em",
    textTransform: "uppercase",
  },

  /* ── Tabs ── */
  tabs: {
    display: "flex", gap: 0, marginBottom: 12,
  },
  tab: (active) => ({
    flex: 1, textAlign: "center",
    padding: "8px 0",
    fontFamily: "var(--font-display)", fontWeight: 700,
    fontSize: 13, textTransform: "uppercase",
    letterSpacing: "0.06em", cursor: "pointer",
    color: active ? "var(--text-primary)" : "var(--text-faint)",
    borderBottom: `2px solid ${active ? "var(--accent-green)" : "rgba(255,255,255,0.06)"}`,
    transition: "all 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
  }),
  tabCount: {
    fontFamily: "var(--font-mono)", fontSize: 10,
    opacity: 0.6,
  },

  /* ── Country rows ── */
  row: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    cursor: "pointer",
  },
  rowFlag: {
    width: 32, height: 22, objectFit: "cover",
    borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },
  rowName: {
    fontFamily: "var(--font-body)", fontWeight: 600,
    fontSize: 14, color: "var(--text-secondary)",
    flex: 1,
  },
  rowYear: {
    fontFamily: "var(--font-mono)", fontSize: 11,
    color: "var(--text-faint)",
  },
  expandBtn: {
    textAlign: "center", paddingTop: 14,
    fontFamily: "var(--font-display)", fontSize: 14,
    fontWeight: 600, letterSpacing: "0.06em",
    color: "rgba(255,255,255,0.35)", cursor: "pointer",
  },
  emptyTab: {
    fontFamily: "var(--font-serif)", fontSize: 13,
    color: "var(--text-muted)", fontStyle: "italic",
    textAlign: "center", padding: "20px 8px",
  },
};

export default function PassportShelf({ countries, profile, onAddCountry, onViewCountry, onOpenMap }) {
  const [tab, setTab] = useState("been");
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={S.section}>
      <div style={S.labelRow}>
        <div style={S.label} onClick={onOpenMap}>
          🌍 Passport
          {(countries?.length || 0) > 0 && <span style={S.count}>{countries.length} {countries.length === 1 ? "country" : "countries"}</span>}
        </div>
        <div style={S.btnRow}>
          {(countries?.length || 0) > 0 && (
            <div style={S.mapBtn} onClick={onOpenMap}>🗺 Map</div>
          )}
          <div style={S.addBtn} onClick={onAddCountry}>+ Add</div>
        </div>
      </div>

      {(!countries || countries.length === 0) && !profile.homeCountry ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>🌍</div>
          <div style={S.emptyText}>Where have you been?</div>
          <div style={S.emptyCta} onClick={onAddCountry}>Add a country</div>
        </div>
      ) : (
        <>
          {profile.homeCountry && (() => {
            const hc = COUNTRIES.find(c => c.code === profile.homeCountry);
            if (!hc) return null;
            return (
              <div style={S.homeRow}>
                <img src={`https://flagcdn.com/w40/${profile.homeCountry.toLowerCase()}.png`} alt="" style={{ width: 28, height: 20, objectFit: "cover", borderRadius: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                <span style={S.homeName}>{hc.name}</span>
                <span style={S.homeLabel}>Issued in</span>
              </div>
            );
          })()}
          {(!countries || countries.length === 0) ? (
            <div style={{ ...S.empty, paddingTop: 8 }}>
              <div style={S.emptyText}>Where else have you been?</div>
              <div style={S.emptyCta} onClick={onAddCountry}>Add a country</div>
            </div>
          ) : (
            <>
              <div style={S.tabs}>
                <div style={S.tab(tab === "been")} onClick={() => { setTab("been"); setExpanded(false); }}>
                  Been <span style={S.tabCount}>{countries.filter(c => c.status === "been").length}</span>
                </div>
                <div style={S.tab(tab === "bucket_list")} onClick={() => { setTab("bucket_list"); setExpanded(false); }}>
                  Bucket List <span style={S.tabCount}>{countries.filter(c => c.status === "bucket_list").length}</span>
                </div>
              </div>
              {(() => {
                const filtered = countries.filter(c => c.status === tab)
                  .sort((a, b) => {
                    const aHasDate = a.visitYear || 0;
                    const bHasDate = b.visitYear || 0;
                    if (aHasDate && bHasDate) {
                      if (b.visitYear !== a.visitYear) return b.visitYear - a.visitYear;
                      return (b.visitMonth || 0) - (a.visitMonth || 0);
                    }
                    if (aHasDate !== bHasDate) return bHasDate - aHasDate;
                    return a.countryName.localeCompare(b.countryName);
                  });
                if (filtered.length === 0) return (
                  <div style={S.emptyTab}>
                    {tab === "been" ? "No countries yet — start stamping!" : "Where's next? Pick up to 4."}
                    <div style={S.emptyCta} onClick={onAddCountry}>+ Add</div>
                  </div>
                );
                const displayLimit = 5;
                const visible = expanded ? filtered : filtered.slice(0, displayLimit);
                return (
                  <>
                    <div>
                      {visible.map((c, i) => (
                        <div style={{ ...S.row, ...(i === visible.length - 1 ? { borderBottom: "none" } : {}) }} key={c.id || i} onClick={() => onViewCountry(c)}>
                          <img src={`https://flagcdn.com/w80/${c.countryCode.toLowerCase()}.png`} alt="" style={S.rowFlag} />
                          <div style={S.rowName}>{c.countryName}</div>
                          {c.status === "been" && c.visitYear && <div style={S.rowYear}>{c.visitYear}</div>}
                          {c.status === "bucket_list" && (c.tripMonth || c.tripYear) && (
                            <div style={{ ...S.rowYear, color: "var(--accent-green)" }}>
                              ✈ {formatVisitDate(c.tripMonth, c.tripYear)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {filtered.length > displayLimit && (
                      <div style={S.expandBtn} onClick={() => setExpanded(!expanded)}>
                        {expanded ? "Show less" : `Show all ${filtered.length}`} →
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
}

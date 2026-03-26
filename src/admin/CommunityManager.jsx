// src/admin/CommunityManager.jsx
//
// Phase 3 admin: Community management.
// Community picker → Tabs: Items | Shelves | Badges
//
// Items: browse, search, edit, add new items with TMDB search
// Shelves: create/edit miniseries, set status
// Badges: create/edit badges, link to miniseries, toggle active

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabase";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const SUPABASE_URL = "https://api.mymantl.app";
const STORAGE_BASE = "https://gfjobhkofftvmluocxyw.supabase.co/storage/v1/object/public/banners";

async function searchTMDB(query, type = "movie") {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/api-proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tmdb_search", query, type }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results || []).slice(0, 8);
  } catch { return []; }
}

const TABS = [
  { key: "items", label: "Items" },
  { key: "shelves", label: "Shelves" },
  { key: "badges", label: "Badges" },
  { key: "posts", label: "Posts" },
];

export default function CommunityManager({ session }) {
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [activeTab, setActiveTab] = useState("items");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("community_pages")
        .select("id, slug, name, logo_url, sort_order")
        .order("sort_order");
      setCommunities(data || []);
      if (data?.length > 0) setSelectedCommunity(data[0]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div style={S.emptyState}><div style={S.spinner} /></div>;
  }

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Header + Community picker */}
      <div style={S.header}>
        <h1 style={S.title}>Communities</h1>
        <select
          value={selectedCommunity?.id || ""}
          onChange={(e) => setSelectedCommunity(communities.find(c => c.id === e.target.value))}
          style={S.communitySelect}
        >
          {communities.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{ ...S.tab, ...(activeTab === tab.key ? S.tabActive : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedCommunity && activeTab === "items" && (
        <ItemsPanel community={selectedCommunity} showToast={showToast} />
      )}
      {selectedCommunity && activeTab === "shelves" && (
        <ShelvesPanel community={selectedCommunity} showToast={showToast} />
      )}
      {selectedCommunity && activeTab === "badges" && (
        <BadgesPanel community={selectedCommunity} showToast={showToast} />
      )}
      {selectedCommunity && activeTab === "posts" && (
        <PostsPanel community={selectedCommunity} showToast={showToast} />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════
// ITEMS PANEL
// ═══════════════════════════════════════════════════

function ItemsPanel({ community, showToast }) {
  const [items, setItems] = useState([]);
  const [miniseries, setMiniseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterShelf, setFilterShelf] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: ms }, { data: it }] = await Promise.all([
      supabase.from("community_miniseries").select("id, title, sort_order, status, tab_key, director_name")
        .eq("community_id", community.id).order("sort_order"),
      supabase.from("community_items").select("id, title, year, tmdb_id, tmdb_tv_id, media_type, poster_path, sort_order, miniseries_id, creator, episode_url, air_date, extra_data")
        .in("miniseries_id", [])  // placeholder — we'll fetch differently
    ]);
    setMiniseries(ms || []);

    // Fetch items for all miniseries in this community
    const msIds = (ms || []).map(m => m.id);
    if (msIds.length > 0) {
      const { data: allItems } = await supabase
        .from("community_items")
        .select("id, title, year, tmdb_id, tmdb_tv_id, media_type, poster_path, sort_order, miniseries_id, creator, episode_url, air_date, extra_data")
        .in("miniseries_id", msIds)
        .order("sort_order");
      setItems(allItems || []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [community.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = items;
    if (filterShelf !== "all") {
      list = list.filter(i => i.miniseries_id === filterShelf);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.title?.toLowerCase().includes(q));
    }
    return list;
  }, [items, search, filterShelf]);

  const shelfName = (msId) => miniseries.find(m => m.id === msId)?.title || "—";

  if (loading) return <div style={S.emptyState}><div style={S.spinner} /></div>;

  return (
    <div>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            style={S.searchInput}
          />
          <select value={filterShelf} onChange={(e) => setFilterShelf(e.target.value)} style={S.filterSelect}>
            <option value="all">All shelves ({items.length})</option>
            {miniseries.map(m => (
              <option key={m.id} value={m.id}>
                {m.title} ({items.filter(i => i.miniseries_id === m.id).length})
              </option>
            ))}
          </select>
        </div>
        <div style={S.toolbarRight}>
          <span style={S.toolCount}>{filtered.length} items</span>
          <button onClick={() => setShowAdd(!showAdd)} style={S.addBtn}>
            {showAdd ? "Cancel" : "+ Add Item"}
          </button>
        </div>
      </div>

      {/* Add Item form */}
      {showAdd && (
        <AddItemForm
          communityId={community.id}
          miniseries={miniseries}
          showToast={showToast}
          onAdded={() => { setShowAdd(false); fetchData(); }}
        />
      )}

      {/* Items table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}></th>
              <th style={S.th}>Title</th>
              <th style={S.th}>Year</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Shelf</th>
              <th style={S.th}>TMDB</th>
              <th style={S.th}>Order</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              editingId === item.id ? (
                <EditItemRow
                  key={item.id}
                  item={item}
                  miniseries={miniseries}
                  communitySlug={community.slug}
                  showToast={showToast}
                  onSaved={() => { setEditingId(null); fetchData(); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={item.id} style={S.tr}>
                  <td style={S.td}>
                    {item.poster_path ? (
                      <img src={`${TMDB_IMG}/w92${item.poster_path}`} alt="" style={S.thumbPoster} />
                    ) : item.extra_data?.cover_url ? (
                      <img src={item.extra_data.cover_url} alt="" style={S.thumbPoster} />
                    ) : (
                      <div style={S.thumbEmpty}>🎬</div>
                    )}
                  </td>
                  <td style={S.td}><div style={S.cellTitle}>{item.title}{item.extra_data?.editorial_blurb ? " 📝" : ""}</div></td>
                  <td style={S.td}><div style={S.cellSub}>{item.year || "—"}</div></td>
                  <td style={S.td}><div style={S.typePill}>{item.media_type}</div></td>
                  <td style={S.td}><div style={S.cellSub}>{shelfName(item.miniseries_id)}</div></td>
                  <td style={S.td}><div style={S.cellMono}>{item.tmdb_id || item.tmdb_tv_id || "—"}</div></td>
                  <td style={S.td}><div style={S.cellMono}>{item.sort_order}</div></td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditingId(item.id)} style={S.editBtn}>Edit</button>
                      <button onClick={async () => {
                        if (!confirm(`Delete "${item.title}"?`)) return;
                        await supabase.from("community_user_progress").delete().eq("item_id", item.id);
                        await supabase.from("community_items").delete().eq("id", item.id);
                        showToast(`Deleted "${item.title}"`);
                        fetchData();
                      }} style={S.deleteBtn}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ── Inline edit row ──

function EditItemRow({ item, miniseries, communitySlug, showToast, onSaved, onCancel }) {
  const [title, setTitle] = useState(item.title || "");
  const [year, setYear] = useState(item.year || "");
  const [tmdbId, setTmdbId] = useState(item.tmdb_id || "");
  const [sortOrder, setSortOrder] = useState(item.sort_order ?? "");
  const [shelfId, setShelfId] = useState(item.miniseries_id || "");
  const [creator, setCreator] = useState(item.creator || "");
  const [blurb, setBlurb] = useState(item.extra_data?.editorial_blurb || "");
  const [blurbAuthor, setBlurbAuthor] = useState(item.extra_data?.blurb_author || "Ali");
  const [saving, setSaving] = useState(false);

  const isOriginals = communitySlug === "originals";

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      title: title.trim(),
      year: year ? parseInt(year) : null,
      tmdb_id: tmdbId ? parseInt(tmdbId) : null,
      sort_order: sortOrder !== "" ? parseInt(sortOrder) : null,
      creator: creator.trim() || null,
    };
    if (shelfId && shelfId !== item.miniseries_id) {
      updates.miniseries_id = shelfId;
    }
    // Merge blurb into extra_data for originals
    if (isOriginals) {
      const existingExtra = item.extra_data || {};
      const newExtra = { ...existingExtra };
      if (blurb.trim()) {
        newExtra.editorial_blurb = blurb.trim();
        newExtra.blurb_author = blurbAuthor.trim() || "Ali";
      } else {
        delete newExtra.editorial_blurb;
        delete newExtra.blurb_author;
      }
      updates.extra_data = Object.keys(newExtra).length > 0 ? newExtra : null;
    }
    const { error } = await supabase.from("community_items").update(updates).eq("id", item.id);
    if (error) { showToast(`Error: ${error.message}`); }
    else { showToast("Updated ✓"); onSaved(); }
    setSaving(false);
  };

  return (
    <>
      <tr style={{ ...S.tr, background: "rgba(196,115,79,0.04)", borderBottom: isOriginals ? "none" : undefined }}>
        <td style={S.td}>
          {item.poster_path ? (
            <img src={`${TMDB_IMG}/w92${item.poster_path}`} alt="" style={S.thumbPoster} />
          ) : <div style={S.thumbEmpty}>🎬</div>}
        </td>
        <td style={S.td}><input value={title} onChange={e => setTitle(e.target.value)} style={S.inlineInput} /></td>
        <td style={S.td}><input value={year} onChange={e => setYear(e.target.value)} style={{ ...S.inlineInput, width: 60 }} type="number" /></td>
        <td style={S.td}><div style={S.typePill}>{item.media_type}</div></td>
        <td style={S.td}>
          <select value={shelfId} onChange={e => setShelfId(e.target.value)} style={S.inlineSelect}>
            {miniseries.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </td>
        <td style={S.td}><input value={tmdbId} onChange={e => setTmdbId(e.target.value)} style={{ ...S.inlineInput, width: 70 }} /></td>
        <td style={S.td}><input value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ ...S.inlineInput, width: 50 }} type="number" /></td>
        <td style={S.td}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleSave} disabled={saving} style={S.saveBtn}>{saving ? "…" : "Save"}</button>
            <button onClick={onCancel} style={S.cancelBtn}>Cancel</button>
          </div>
        </td>
      </tr>
      {/* Editorial blurb row — originals only */}
      {isOriginals && (
        <tr style={{ ...S.tr, background: "rgba(196,115,79,0.04)" }}>
          <td colSpan={8} style={{ ...S.td, paddingTop: 0 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <label style={S.fieldLabel}>Editorial Blurb <span style={S.fieldHint}>— shown in log modal above TMDB synopsis</span></label>
                <textarea
                  value={blurb}
                  onChange={e => setBlurb(e.target.value)}
                  placeholder="Why this film matters to this shelf…"
                  rows={3}
                  style={{ ...S.formInput, resize: "vertical", fontFamily: "'Georgia', serif", fontSize: 13, lineHeight: 1.6 }}
                />
              </div>
              <div style={{ width: 140 }}>
                <label style={S.fieldLabel}>Blurb Author</label>
                <input
                  value={blurbAuthor}
                  onChange={e => setBlurbAuthor(e.target.value)}
                  placeholder="Ali"
                  style={S.formInput}
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


// ── Add Item form ──

function AddItemForm({ communityId, miniseries, showToast, onAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mediaType, setMediaType] = useState("movie");
  const [shelfId, setShelfId] = useState(miniseries[0]?.id || "");
  const [manualTitle, setManualTitle] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const r = await searchTMDB(query.trim(), mediaType === "show" ? "tv" : "movie");
    setResults(r);
    setSearching(false);
  };

  const handlePickResult = async (result) => {
    setAdding(true);
    const isTV = !!result.first_air_date || result.media_type === "tv";
    const title = isTV ? result.name : result.title;
    const dateStr = isTV ? result.first_air_date : result.release_date;
    const year = dateStr ? parseInt(dateStr.split("-")[0]) : null;

    // Get next sort_order
    const { data: maxItem } = await supabase
      .from("community_items")
      .select("sort_order")
      .eq("miniseries_id", shelfId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextSort = (maxItem?.[0]?.sort_order || 0) + 1;

    const insert = {
      miniseries_id: shelfId,
      media_type: isTV ? "show" : "film",
      title,
      year,
      poster_path: result.poster_path || null,
      backdrop_path: result.backdrop_path || null,
      sort_order: nextSort,
    };
    if (isTV) { insert.tmdb_tv_id = result.id; }
    else { insert.tmdb_id = result.id; }

    const { error } = await supabase.from("community_items").insert(insert);
    if (error) {
      showToast(`Error: ${error.message}`);
    } else {
      showToast(`Added "${title}" ✓`);
      onAdded();
    }
    setAdding(false);
  };

  const handleManualAdd = async () => {
    if (!manualTitle.trim() || !shelfId) return;
    setAdding(true);
    const { data: maxItem } = await supabase
      .from("community_items")
      .select("sort_order")
      .eq("miniseries_id", shelfId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextSort = (maxItem?.[0]?.sort_order || 0) + 1;

    const { error } = await supabase.from("community_items").insert({
      miniseries_id: shelfId,
      media_type: "film",
      title: manualTitle.trim(),
      year: manualYear ? parseInt(manualYear) : null,
      sort_order: nextSort,
    });
    if (error) { showToast(`Error: ${error.message}`); }
    else { showToast(`Added "${manualTitle.trim()}" ✓`); onAdded(); }
    setAdding(false);
  };

  return (
    <div style={S.addForm}>
      <div style={S.addFormHeader}>Add Item</div>

      {/* Shelf + media type */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Shelf</label>
          <select value={shelfId} onChange={e => setShelfId(e.target.value)} style={S.formSelect}>
            {miniseries.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div style={{ width: 120 }}>
          <label style={S.fieldLabel}>Search as</label>
          <select value={mediaType} onChange={e => setMediaType(e.target.value)} style={S.formSelect}>
            <option value="movie">Movie</option>
            <option value="show">TV Show</option>
          </select>
        </div>
      </div>

      {/* TMDB search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search TMDB…"
          style={S.formInput}
        />
        <button onClick={handleSearch} disabled={searching} style={S.formSearchBtn}>
          {searching ? "…" : "Search"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={S.resultGrid}>
          {results.map(r => {
            const isTV = !!r.first_air_date;
            const title = isTV ? r.name : r.title;
            const yr = (isTV ? r.first_air_date : r.release_date)?.split("-")[0] || "?";
            return (
              <button key={r.id} onClick={() => handlePickResult(r)} disabled={adding} style={S.resultCard}>
                {r.poster_path ? (
                  <img src={`${TMDB_IMG}/w92${r.poster_path}`} alt="" style={{ width: 40, height: 60, borderRadius: 4, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 40, height: 60, borderRadius: 4, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>🎬</div>
                )}
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(240,235,225,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                  <div style={{ fontSize: 10, color: "rgba(240,235,225,0.35)", fontFamily: "var(--font-mono)" }}>{yr} · tmdb:{r.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Manual add */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12, marginTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(240,235,225,0.3)", marginBottom: 8 }}>
          Or add manually
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Title" style={{ ...S.formInput, flex: 1 }} />
          <input value={manualYear} onChange={e => setManualYear(e.target.value)} placeholder="Year" style={{ ...S.formInput, width: 80 }} type="number" />
          <button onClick={handleManualAdd} disabled={adding || !manualTitle.trim()} style={S.formSearchBtn}>Add</button>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// SHELVES PANEL
// ═══════════════════════════════════════════════════

function ShelvesPanel({ community, showToast }) {
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchShelves = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("community_miniseries")
      .select("*, community_items(count)")
      .eq("community_id", community.id)
      .order("sort_order");
    setShelves(data || []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => { fetchShelves(); }, [fetchShelves]);

  if (loading) return <div style={S.emptyState}><div style={S.spinner} /></div>;

  return (
    <div>
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <span style={S.toolCount}>{shelves.length} shelves</span>
        </div>
        <div style={S.toolbarRight}>
          <button onClick={() => setShowCreate(!showCreate)} style={S.addBtn}>
            {showCreate ? "Cancel" : "+ New Shelf"}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateShelfForm
          communityId={community.id}
          nextSort={(shelves[shelves.length - 1]?.sort_order || 0) + 1}
          showToast={showToast}
          onCreated={() => { setShowCreate(false); fetchShelves(); }}
        />
      )}

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Title</th>
              <th style={S.th}>Director</th>
              <th style={S.th}>Tab</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Items</th>
              <th style={S.th}>Order</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shelves.map((shelf) => (
              editingId === shelf.id ? (
                <EditShelfRow
                  key={shelf.id}
                  shelf={shelf}
                  showToast={showToast}
                  onSaved={() => { setEditingId(null); fetchShelves(); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={shelf.id} style={S.tr}>
                  <td style={S.td}>
                    <div style={S.cellTitle}>
                      {shelf.director_emoji && <span style={{ marginRight: 6 }}>{shelf.director_emoji}</span>}
                      {shelf.title}
                    </div>
                  </td>
                  <td style={S.td}><div style={S.cellSub}>{shelf.director_name || "—"}</div></td>
                  <td style={S.td}><div style={S.cellMono}>{shelf.tab_key || "filmography"}</div></td>
                  <td style={S.td}>
                    <div style={{
                      ...S.statusPill,
                      color: shelf.status === "active" ? "#4ade80" : shelf.status === "completed" ? "#22d3ee" : "rgba(240,235,225,0.4)",
                      background: shelf.status === "active" ? "rgba(74,222,128,0.08)" : shelf.status === "completed" ? "rgba(34,211,238,0.08)" : "rgba(255,255,255,0.04)",
                      borderColor: shelf.status === "active" ? "rgba(74,222,128,0.2)" : shelf.status === "completed" ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.08)",
                    }}>
                      {shelf.status || "—"}
                    </div>
                  </td>
                  <td style={S.td}><div style={S.cellMono}>{shelf.community_items?.[0]?.count ?? 0}</div></td>
                  <td style={S.td}><div style={S.cellMono}>{shelf.sort_order}</div></td>
                  <td style={S.td}>
                    <button onClick={() => setEditingId(shelf.id)} style={S.editBtn}>Edit</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditShelfRow({ shelf, showToast, onSaved, onCancel }) {
  const [title, setTitle] = useState(shelf.title || "");
  const [directorName, setDirectorName] = useState(shelf.director_name || "");
  const [directorEmoji, setDirectorEmoji] = useState(shelf.director_emoji || "");
  const [tabKey, setTabKey] = useState(shelf.tab_key || "filmography");
  const [status, setStatus] = useState(shelf.status || "completed");
  const [sortOrder, setSortOrder] = useState(shelf.sort_order ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("community_miniseries").update({
      title: title.trim(),
      director_name: directorName.trim() || null,
      director_emoji: directorEmoji.trim() || null,
      tab_key: tabKey || null,
      status,
      sort_order: sortOrder !== "" ? parseInt(sortOrder) : null,
    }).eq("id", shelf.id);
    if (error) showToast(`Error: ${error.message}`);
    else { showToast("Shelf updated ✓"); onSaved(); }
    setSaving(false);
  };

  return (
    <tr style={{ ...S.tr, background: "rgba(196,115,79,0.04)" }}>
      <td style={S.td}><input value={title} onChange={e => setTitle(e.target.value)} style={S.inlineInput} /></td>
      <td style={S.td}>
        <div style={{ display: "flex", gap: 4 }}>
          <input value={directorEmoji} onChange={e => setDirectorEmoji(e.target.value)} style={{ ...S.inlineInput, width: 30 }} />
          <input value={directorName} onChange={e => setDirectorName(e.target.value)} style={S.inlineInput} />
        </div>
      </td>
      <td style={S.td}>
        <select value={tabKey} onChange={e => setTabKey(e.target.value)} style={S.inlineSelect}>
          <option value="filmography">filmography</option>
          <option value="patreon">patreon</option>
          <option value="books">books</option>
          <option value="blankies">blankies</option>
        </select>
      </td>
      <td style={S.td}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={S.inlineSelect}>
          <option value="active">active</option>
          <option value="completed">completed</option>
          <option value="upcoming">upcoming</option>
        </select>
      </td>
      <td style={S.td}><div style={S.cellMono}>{shelf.community_items?.[0]?.count ?? 0}</div></td>
      <td style={S.td}><input value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ ...S.inlineInput, width: 50 }} type="number" /></td>
      <td style={S.td}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleSave} disabled={saving} style={S.saveBtn}>{saving ? "…" : "Save"}</button>
          <button onClick={onCancel} style={S.cancelBtn}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function CreateShelfForm({ communityId, nextSort, showToast, onCreated }) {
  const [title, setTitle] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [directorEmoji, setDirectorEmoji] = useState("");
  const [tabKey, setTabKey] = useState("filmography");
  const [status, setStatus] = useState("active");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("community_miniseries").insert({
      community_id: communityId,
      title: title.trim(),
      director_name: directorName.trim() || null,
      director_emoji: directorEmoji.trim() || null,
      tab_key: tabKey || null,
      status,
      sort_order: nextSort,
    });
    if (error) showToast(`Error: ${error.message}`);
    else { showToast(`Created "${title.trim()}" ✓`); onCreated(); }
    setCreating(false);
  };

  return (
    <div style={S.addForm}>
      <div style={S.addFormHeader}>New Shelf</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 2 }}>
          <label style={S.fieldLabel}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={S.formInput} placeholder="e.g. Pod Six Express" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Director</label>
          <input value={directorName} onChange={e => setDirectorName(e.target.value)} style={S.formInput} placeholder="e.g. John Carpenter" />
        </div>
        <div style={{ width: 50 }}>
          <label style={S.fieldLabel}>Emoji</label>
          <input value={directorEmoji} onChange={e => setDirectorEmoji(e.target.value)} style={S.formInput} placeholder="🔑" />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ width: 140 }}>
          <label style={S.fieldLabel}>Tab</label>
          <select value={tabKey} onChange={e => setTabKey(e.target.value)} style={S.formSelect}>
            <option value="filmography">filmography</option>
            <option value="patreon">patreon</option>
            <option value="books">books</option>
          </select>
        </div>
        <div style={{ width: 140 }}>
          <label style={S.fieldLabel}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={S.formSelect}>
            <option value="active">active</option>
            <option value="completed">completed</option>
            <option value="upcoming">upcoming</option>
          </select>
        </div>
        <button onClick={handleCreate} disabled={creating || !title.trim()} style={S.formSearchBtn}>
          {creating ? "…" : "Create Shelf"}
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// BADGES PANEL
// ═══════════════════════════════════════════════════

function BadgesPanel({ community, showToast }) {
  const [badges, setBadges] = useState([]);
  const [miniseries, setMiniseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    const [{ data: bg }, { data: ms }] = await Promise.all([
      supabase.from("badges").select("*").eq("community_id", community.id).order("sort_order"),
      supabase.from("community_miniseries").select("id, title, director_name, sort_order")
        .eq("community_id", community.id).order("sort_order"),
    ]);
    setBadges(bg || []);
    setMiniseries(ms || []);
    setLoading(false);
  }, [community.id]);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  const handleToggleActive = async (badge) => {
    const { error } = await supabase.from("badges").update({ is_active: !badge.is_active }).eq("id", badge.id);
    if (error) showToast(`Error: ${error.message}`);
    else { showToast(`${badge.name} ${badge.is_active ? "deactivated" : "activated"} ✓`); fetchBadges(); }
  };

  if (loading) return <div style={S.emptyState}><div style={S.spinner} /></div>;

  const shelfName = (msId) => miniseries.find(m => m.id === msId)?.title || "—";

  return (
    <div>
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <span style={S.toolCount}>{badges.length} badges ({badges.filter(b => b.is_active).length} active)</span>
        </div>
        <div style={S.toolbarRight}>
          <button onClick={() => setShowCreate(!showCreate)} style={S.addBtn}>
            {showCreate ? "Cancel" : "+ New Badge"}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateBadgeForm
          communityId={community.id}
          miniseries={miniseries}
          nextSort={(badges[badges.length - 1]?.sort_order || 0) + 1}
          showToast={showToast}
          onCreated={() => { setShowCreate(false); fetchBadges(); }}
        />
      )}

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}></th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Linked Shelf</th>
              <th style={S.th}>Tagline</th>
              <th style={S.th}>Active</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {badges.map((badge) => (
              editingId === badge.id ? (
                <EditBadgeRow
                  key={badge.id}
                  badge={badge}
                  miniseries={miniseries}
                  showToast={showToast}
                  onSaved={() => { setEditingId(null); fetchBadges(); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={badge.id} style={{ ...S.tr, opacity: badge.is_active ? 1 : 0.5 }}>
                  <td style={S.td}>
                    {badge.image_url ? (
                      <img src={badge.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: badge.accent_color || "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏆</div>
                    )}
                  </td>
                  <td style={S.td}>
                    <div style={{ ...S.cellTitle, color: badge.accent_color || "#f0ebe1" }}>{badge.name}</div>
                    <div style={S.cellSub}>{badge.description}</div>
                  </td>
                  <td style={S.td}><div style={S.typePill}>{badge.badge_type?.replace(/_/g, " ")}</div></td>
                  <td style={S.td}><div style={S.cellSub}>{shelfName(badge.miniseries_id)}</div></td>
                  <td style={S.td}><div style={{ ...S.cellSub, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{badge.tagline || "—"}</div></td>
                  <td style={S.td}>
                    <button onClick={() => handleToggleActive(badge)} style={{
                      ...S.statusPill,
                      cursor: "pointer",
                      border: "1px solid",
                      color: badge.is_active ? "#4ade80" : "#f87171",
                      background: badge.is_active ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                      borderColor: badge.is_active ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)",
                    }}>
                      {badge.is_active ? "active" : "inactive"}
                    </button>
                  </td>
                  <td style={S.td}>
                    <button onClick={() => setEditingId(badge.id)} style={S.editBtn}>Edit</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditBadgeRow({ badge, miniseries, showToast, onSaved, onCancel }) {
  const [name, setName] = useState(badge.name || "");
  const [description, setDescription] = useState(badge.description || "");
  const [tagline, setTagline] = useState(badge.tagline || "");
  const [progressTagline, setProgressTagline] = useState(badge.progress_tagline || "");
  const [badgeType, setBadgeType] = useState(badge.badge_type || "miniseries_completion");
  const [msId, setMsId] = useState(badge.miniseries_id || "");
  const [imageUrl, setImageUrl] = useState(badge.image_url || "");
  const [audioUrl, setAudioUrl] = useState(badge.audio_url || "");
  const [accentColor, setAccentColor] = useState(badge.accent_color || "#e94560");
  const [sortOrder, setSortOrder] = useState(badge.sort_order ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("badges").update({
      name: name.trim(),
      description: description.trim() || null,
      tagline: tagline.trim() || null,
      progress_tagline: progressTagline.trim() || null,
      badge_type: badgeType,
      miniseries_id: msId || null,
      image_url: imageUrl.trim() || null,
      audio_url: audioUrl.trim() || null,
      accent_color: accentColor.trim() || null,
      sort_order: sortOrder !== "" ? parseInt(sortOrder) : null,
    }).eq("id", badge.id);
    if (error) showToast(`Error: ${error.message}`);
    else { showToast("Badge updated ✓"); onSaved(); }
    setSaving(false);
  };

  const FL = S.fieldLabel;
  const FI = S.formInput;

  return (
    <tr style={S.tr}>
      <td colSpan={7} style={{ padding: 0 }}>
        <div style={S.badgeEditCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {imageUrl ? (
                <img src={imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏆</div>
              )}
              <div style={S.addFormHeader}>Edit Badge</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={saving} style={S.saveBtn}>{saving ? "…" : "Save"}</button>
              <button onClick={onCancel} style={S.cancelBtn}>Cancel</button>
            </div>
          </div>

          {/* Row 1: Name + Sort order */}
          <div style={S.badgeEditRow}>
            <div style={{ flex: 2 }}>
              <label style={FL}>Badge Name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={FI} placeholder="e.g. Choose Life" />
            </div>
            <div style={{ width: 80 }}>
              <label style={FL}>Order</label>
              <input value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={FI} type="number" />
            </div>
          </div>

          {/* Row 2: Progress tagline */}
          <div style={S.badgeEditRow}>
            <div style={{ flex: 1 }}>
              <label style={FL}>Progress Tagline <span style={S.fieldHint}>— shown while working toward badge</span></label>
              <input value={progressTagline} onChange={e => setProgressTagline(e.target.value)} style={FI} placeholder="Making your way through…" />
            </div>
          </div>

          {/* Row 3: Earn tagline */}
          <div style={S.badgeEditRow}>
            <div style={{ flex: 1 }}>
              <label style={FL}>Earn Tagline <span style={S.fieldHint}>— shown when badge is earned</span></label>
              <input value={tagline} onChange={e => setTagline(e.target.value)} style={FI} placeholder="You survived every night in Haddonfield" />
            </div>
          </div>

          {/* Row 4: Description */}
          <div style={S.badgeEditRow}>
            <div style={{ flex: 1 }}>
              <label style={FL}>Description <span style={S.fieldHint}>— subtitle under badge name</span></label>
              <input value={description} onChange={e => setDescription(e.target.value)} style={FI} placeholder="Complete all Halloween franchise films" />
            </div>
          </div>

          {/* Row 5: Type + Shelf */}
          <div style={S.badgeEditRow}>
            <div style={{ flex: 1 }}>
              <label style={FL}>Badge Type</label>
              <select value={badgeType} onChange={e => setBadgeType(e.target.value)} style={S.formSelect}>
                <option value="miniseries_completion">miniseries_completion</option>
                <option value="item_set_completion">item_set_completion</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={FL}>Linked Shelf</label>
              <select value={msId} onChange={e => setMsId(e.target.value)} style={S.formSelect}>
                <option value="">No shelf link</option>
                {miniseries.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          </div>

          {/* Row 6: Image + Audio + Color */}
          <div style={S.badgeEditRow}>
            <div style={{ flex: 1 }}>
              <label style={FL}>Badge Image URL</label>
              <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={FI} placeholder="https://…/badge.png" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={FL}>Celebration Audio URL</label>
              <input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} style={FI} placeholder="https://…/celebration.mp3" />
            </div>
            <div style={{ width: 120 }}>
              <label style={FL}>Accent Color</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 28, height: 28, border: "none", cursor: "pointer", background: "none", padding: 0 }} />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ ...FI, flex: 1 }} />
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function CreateBadgeForm({ communityId, miniseries, nextSort, showToast, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [progressTagline, setProgressTagline] = useState("");
  const [badgeType, setBadgeType] = useState("miniseries_completion");
  const [msId, setMsId] = useState(miniseries[0]?.id || "");
  const [imageUrl, setImageUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#e94560");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("badges").insert({
      community_id: communityId,
      name: name.trim(),
      description: description.trim() || null,
      tagline: tagline.trim() || null,
      progress_tagline: progressTagline.trim() || null,
      badge_type: badgeType,
      miniseries_id: msId || null,
      image_url: imageUrl.trim() || null,
      accent_color: accentColor.trim() || null,
      celebration_theme: "flicker",
      sort_order: nextSort,
      is_active: true,
    });
    if (error) showToast(`Error: ${error.message}`);
    else { showToast(`Created "${name.trim()}" ✓`); onCreated(); }
    setCreating(false);
  };

  return (
    <div style={S.addForm}>
      <div style={S.addFormHeader}>New Badge</div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 2 }}>
          <label style={S.fieldLabel}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={S.formInput} placeholder="e.g. Haddonfield Historian" />
        </div>
        <div style={{ width: 160 }}>
          <label style={S.fieldLabel}>Type</label>
          <select value={badgeType} onChange={e => setBadgeType(e.target.value)} style={S.formSelect}>
            <option value="miniseries_completion">miniseries_completion</option>
            <option value="item_set_completion">item_set_completion</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Linked Shelf</label>
          <select value={msId} onChange={e => setMsId(e.target.value)} style={S.formSelect}>
            <option value="">None</option>
            {miniseries.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={S.formInput} placeholder="Complete all Halloween franchise films" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Tagline (on earn)</label>
          <input value={tagline} onChange={e => setTagline(e.target.value)} style={S.formInput} placeholder="You survived every night…" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Progress tagline</label>
          <input value={progressTagline} onChange={e => setProgressTagline(e.target.value)} style={S.formInput} placeholder="Making your way through…" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Image URL</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={S.formInput} placeholder={`${STORAGE_BASE}/badge.png`} />
        </div>
        <div style={{ width: 100 }}>
          <label style={S.fieldLabel}>Accent</label>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 28, height: 28, border: "none", cursor: "pointer", background: "none" }} />
            <input value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ ...S.formInput, flex: 1 }} />
          </div>
        </div>
      </div>

      <button onClick={handleCreate} disabled={creating || !name.trim()} style={S.formSearchBtn}>
        {creating ? "Creating…" : "Create Badge"}
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// POSTS PANEL — Blog editor for originals_posts
// ═══════════════════════════════════════════════════

function PostsPanel({ community, showToast }) {
  const [posts, setPosts] = useState([]);
  const [shelves, setShelves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null); // null = list view, object = editing
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: ms }, { data: ps }] = await Promise.all([
      supabase.from("community_miniseries").select("id, title, sort_order")
        .eq("community_id", community.id).order("sort_order"),
      supabase.from("originals_posts").select("*").order("created_at", { ascending: false }),
    ]);
    setShelves(ms || []);
    // Filter posts to those linked to this community's shelves
    const msIds = new Set((ms || []).map(m => m.id));
    setPosts((ps || []).filter(p => msIds.has(p.miniseries_id)));
    setLoading(false);
  }, [community.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const shelfName = (msId) => shelves.find(m => m.id === msId)?.title || "—";

  const handleNewPost = () => {
    setEditingPost({
      id: null,
      title: "",
      slug: "",
      body: "",
      author: "Ali",
      miniseries_id: shelves[0]?.id || "",
      published_at: null,
      cover_image_url: "",
    });
    setCreating(true);
  };

  if (loading) return <div style={S.emptyState}><div style={S.spinner} /></div>;

  // ── Editor view ──
  if (editingPost) {
    return (
      <PostEditor
        post={editingPost}
        shelves={shelves}
        isNew={creating}
        showToast={showToast}
        onSaved={() => { setEditingPost(null); setCreating(false); fetchData(); }}
        onCancel={() => { setEditingPost(null); setCreating(false); }}
      />
    );
  }

  // ── List view ──
  return (
    <div>
      <div style={S.toolbar}>
        <div style={S.toolbarLeft}>
          <span style={S.toolCount}>{posts.length} posts</span>
        </div>
        <div style={S.toolbarRight}>
          <button onClick={handleNewPost} style={S.addBtn}>+ New Post</button>
        </div>
      </div>

      {posts.length === 0 && (
        <div style={S.emptyState}>
          <div style={{ fontSize: 14, color: "rgba(240,235,225,0.4)", marginBottom: 8 }}>
            No posts yet for this community.
          </div>
          <div style={{ fontSize: 12, color: "rgba(240,235,225,0.25)" }}>
            Posts are editorial write-ups that appear above each shelf.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map(post => (
          <div
            key={post.id}
            onClick={() => { setEditingPost(post); setCreating(false); }}
            style={{
              padding: "16px 20px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              cursor: "pointer",
              transition: "border-color 0.15s",
              display: "flex", alignItems: "center", gap: 16,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(196,115,79,0.3)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f0ebe1", fontFamily: "var(--font-display)" }}>
                  {post.title || "Untitled"}
                </div>
                <div style={{
                  ...S.statusPill,
                  fontSize: 8,
                  padding: "2px 8px",
                  color: post.published_at ? "#4ade80" : "rgba(240,235,225,0.4)",
                  background: post.published_at ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
                  borderColor: post.published_at ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)",
                }}>
                  {post.published_at ? "published" : "draft"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)" }}>
                <span>📁 {shelfName(post.miniseries_id)}</span>
                <span>✍ {post.author || "Ali"}</span>
                <span>{post.body?.length || 0} chars</span>
                {post.published_at && (
                  <span>{new Date(post.published_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <button style={S.editBtn}>Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Post Editor — full blog editing tool ──

function PostEditor({ post, shelves, isNew, showToast, onSaved, onCancel }) {
  const [title, setTitle] = useState(post.title || "");
  const [slug, setSlug] = useState(post.slug || "");
  const [body, setBody] = useState(post.body || "");
  const [author, setAuthor] = useState(post.author || "Ali");
  const [shelfId, setShelfId] = useState(post.miniseries_id || "");
  const [coverUrl, setCoverUrl] = useState(post.cover_image_url || "");
  const [isPublished, setIsPublished] = useState(!!post.published_at);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auto-generate slug from title
  const autoSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

  const handleTitleChange = (val) => {
    setTitle(val);
    if (isNew || slug === autoSlug(post.title || "")) {
      setSlug(autoSlug(val));
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      showToast("Title and slug are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      body: body,
      author: author.trim() || "Ali",
      miniseries_id: shelfId || null,
      cover_image_url: coverUrl.trim() || null,
      published_at: isPublished ? (post.published_at || new Date().toISOString()) : null,
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("originals_posts").insert(payload));
    } else {
      ({ error } = await supabase.from("originals_posts").update(payload).eq("id", post.id));
    }

    if (error) {
      showToast(`Error: ${error.message}`);
    } else {
      showToast(isNew ? "Post created ✓" : "Post saved ✓");
      onSaved();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("originals_posts").delete().eq("id", post.id);
    if (error) showToast(`Error: ${error.message}`);
    else { showToast("Post deleted"); onSaved(); }
    setDeleting(false);
  };

  // Simple markdown → HTML for preview
  const renderPreview = (md) => {
    if (!md) return "<p style='color:rgba(240,235,225,0.25);font-style:italic'>Start writing…</p>";
    return md
      .split(/\n\n+/)
      .filter(Boolean)
      .map(p => {
        let html = p
          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0ebe1;font-weight:700">$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#C4734F;text-decoration:underline">$1</a>')
          .replace(/\n/g, '<br/>');
        return `<p style="margin:0 0 16px;line-height:1.75;color:rgba(240,235,225,0.78);font-family:Georgia,serif;font-size:15px">${html}</p>`;
      })
      .join("");
  };

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onCancel} style={{ ...S.cancelBtn, padding: "6px 14px", fontSize: 12 }}>← Back to list</button>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)", color: "#f0ebe1", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {isNew ? "New Post" : "Edit Post"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{ ...S.editBtn, padding: "6px 14px", fontSize: 11 }}
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          {!isNew && (
            <button onClick={handleDelete} disabled={deleting} style={{ ...S.deleteBtn, padding: "6px 12px", fontSize: 11 }}>
              {deleting ? "…" : "Delete"}
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={{ ...S.formSearchBtn, padding: "6px 20px" }}>
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
        </div>
      </div>

      {/* Metadata fields */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <label style={S.fieldLabel}>Title</label>
          <input value={title} onChange={e => handleTitleChange(e.target.value)} style={S.formInput} placeholder="e.g. Why 2002 Is the Best Year in Film" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Slug</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} style={{ ...S.formInput, fontFamily: "var(--font-mono)" }} placeholder="auto-generated" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 180 }}>
          <label style={S.fieldLabel}>Author</label>
          <input value={author} onChange={e => setAuthor(e.target.value)} style={S.formInput} placeholder="Ali" />
        </div>
        <div style={{ width: 220 }}>
          <label style={S.fieldLabel}>Linked Shelf</label>
          <select value={shelfId} onChange={e => setShelfId(e.target.value)} style={S.formSelect}>
            <option value="">None</option>
            {shelves.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Cover Image URL <span style={S.fieldHint}>optional</span></label>
          <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} style={S.formInput} placeholder="https://..." />
        </div>
        <div style={{ width: 140, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <button
            onClick={() => setIsPublished(!isPublished)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "all 0.15s",
              color: isPublished ? "#4ade80" : "rgba(240,235,225,0.4)",
              background: isPublished ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)",
              borderColor: isPublished ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)",
            }}
          >
            {isPublished ? "✓ Published" : "Draft"}
          </button>
        </div>
      </div>

      {/* Body editor + preview */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Editor */}
        <div style={{ flex: 1 }}>
          <label style={S.fieldLabel}>Body <span style={S.fieldHint}>— markdown supported (**bold**, *italic*, [links](url))</span></label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={"Start writing your post…\n\nUse **bold** for emphasis, *italic* for asides.\n\nDouble newline for new paragraphs."}
            style={{
              ...S.formInput,
              resize: "vertical",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: 14,
              lineHeight: 1.75,
              minHeight: 420,
              padding: "16px 18px",
              whiteSpace: "pre-wrap",
            }}
          />
          <div style={{ marginTop: 6, fontSize: 10, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.2)" }}>
            {body.length} characters · {body.split(/\s+/).filter(Boolean).length} words
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div style={{
            flex: 1,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "24px",
            maxHeight: 520,
            overflowY: "auto",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(240,235,225,0.2)", marginBottom: 16 }}>
              Preview
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)", color: "#f0ebe1", lineHeight: 1.2, marginBottom: 8 }}>
              {title || "Untitled"}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#C4734F", fontFamily: "var(--font-mono)" }}>
                by {author || "Ali"}
              </span>
              {isPublished && (
                <>
                  <span style={{ color: "rgba(240,235,225,0.15)" }}>·</span>
                  <span style={{ fontSize: 11, color: "rgba(240,235,225,0.3)", fontFamily: "var(--font-mono)" }}>
                    {new Date(post.published_at || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </>
              )}
            </div>
            <div style={{ height: 1, background: "linear-gradient(90deg, rgba(196,115,79,0.3), transparent)", marginBottom: 20 }} />
            <div dangerouslySetInnerHTML={{ __html: renderPreview(body) }} />
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const S = {
  page: { padding: "32px 40px 60px", maxWidth: 1200 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", color: "#f0ebe1", margin: 0 },

  communitySelect: {
    padding: "8px 14px", borderRadius: 8,
    background: "#1a1714", border: "1px solid rgba(255,255,255,0.1)",
    color: "#f0ebe1", fontSize: 14, fontFamily: "var(--font-display)", fontWeight: 700,
    cursor: "pointer", colorScheme: "dark", outline: "none",
    WebkitAppearance: "none", appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 32,
  },

  tabBar: { display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tab: { padding: "10px 20px", background: "transparent", border: "none", borderBottom: "2px solid transparent", color: "rgba(240,235,225,0.4)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", transition: "all 0.15s ease" },
  tabActive: { color: "#C4734F", borderBottomColor: "#C4734F" },

  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", marginBottom: 12 },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 12 },
  toolbarRight: { display: "flex", alignItems: "center", gap: 8 },
  toolCount: { fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)" },

  searchInput: { padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", fontSize: 13, outline: "none", fontFamily: "var(--font-mono)", width: 220 },
  filterSelect: { padding: "7px 10px", borderRadius: 8, background: "#1a1714", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", fontSize: 12, fontFamily: "var(--font-mono)", cursor: "pointer", colorScheme: "dark", outline: "none" },

  addBtn: { padding: "7px 16px", borderRadius: 8, background: "rgba(196,115,79,0.1)", border: "1px solid rgba(196,115,79,0.25)", color: "#C4734F", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" },
  editBtn: { padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,235,225,0.5)", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", cursor: "pointer" },
  deleteBtn: { padding: "4px 8px", borderRadius: 6, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171", fontSize: 11, cursor: "pointer" },
  saveBtn: { padding: "4px 12px", borderRadius: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", cursor: "pointer" },
  cancelBtn: { padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,235,225,0.4)", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", cursor: "pointer" },

  tableWrap: { overflowX: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.015)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(240,235,225,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.03)" },
  td: { padding: "8px 14px", verticalAlign: "middle" },

  cellTitle: { fontSize: 13, fontWeight: 600, color: "rgba(240,235,225,0.8)" },
  cellSub: { fontSize: 11, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.35)", marginTop: 2 },
  cellMono: { fontSize: 12, fontFamily: "var(--font-mono)", color: "rgba(240,235,225,0.5)" },

  thumbPoster: { width: 30, height: 45, borderRadius: 4, objectFit: "cover" },
  thumbEmpty: { width: 30, height: 45, borderRadius: 4, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "rgba(240,235,225,0.2)" },

  typePill: { display: "inline-block", padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", color: "rgba(240,235,225,0.45)" },
  statusPill: { display: "inline-block", padding: "3px 10px", borderRadius: 4, border: "1px solid", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em" },

  inlineInput: { padding: "5px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7", fontSize: 12, outline: "none", fontFamily: "inherit", width: "100%" },
  inlineSelect: { padding: "5px 8px", borderRadius: 6, background: "#1a1714", border: "1px solid rgba(255,255,255,0.1)", color: "#e4e4e7", fontSize: 12, cursor: "pointer", colorScheme: "dark", outline: "none", fontFamily: "inherit" },

  // ── Add form ──
  addForm: { padding: "16px 20px", background: "rgba(196,115,79,0.04)", border: "1px solid rgba(196,115,79,0.15)", borderRadius: 12, marginBottom: 16 },
  addFormHeader: { fontSize: 11, fontWeight: 800, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em", color: "#C4734F", marginBottom: 12 },
  fieldLabel: { display: "block", fontSize: 9, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(240,235,225,0.35)", marginBottom: 4 },
  formInput: { width: "100%", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", fontSize: 12, outline: "none", fontFamily: "var(--font-mono)" },
  formSelect: { width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1a1714", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", fontSize: 12, cursor: "pointer", colorScheme: "dark", outline: "none", fontFamily: "var(--font-mono)" },
  formSearchBtn: { padding: "7px 16px", borderRadius: 8, background: "rgba(196,115,79,0.12)", border: "1px solid rgba(196,115,79,0.25)", color: "#c4734f", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", textTransform: "uppercase", cursor: "pointer", flexShrink: 0 },

  // ── Badge edit card ──
  badgeEditCard: {
    padding: "20px 24px",
    background: "rgba(196,115,79,0.04)",
    borderTop: "1px solid rgba(196,115,79,0.15)",
    borderBottom: "1px solid rgba(196,115,79,0.15)",
  },
  badgeEditRow: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
  },
  fieldHint: {
    fontWeight: 400,
    fontStyle: "italic",
    letterSpacing: "0",
    textTransform: "none",
    color: "rgba(240,235,225,0.2)",
    fontSize: 9,
  },

  resultGrid: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" },
  resultCard: { display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, cursor: "pointer", color: "inherit", transition: "background 0.1s" },

  // ── Shared ──
  emptyState: { display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "60px 0", color: "rgba(240,235,225,0.3)" },
  spinner: { width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(240,235,225,0.1)", borderTopColor: "#C4734F", animation: "admin-spin 0.8s linear infinite" },
  toast: { position: "fixed", bottom: 24, right: 24, padding: "10px 20px", borderRadius: 10, background: "rgba(196,115,79,0.15)", border: "1px solid rgba(196,115,79,0.3)", color: "#C4734F", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)", zIndex: 1000, animation: "admin-toast-in 0.2s ease" },
};

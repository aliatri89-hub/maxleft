import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { GROUP_TYPE_CONFIG } from "../utils/constants";
import { searchGoogleBooksRaw } from "../utils/api";

function GroupViewScreen({ group, session, onBack, onToast }) {
  const [copied, setCopied] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [settingBook, setSettingBook] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const bookSearchTimer = useRef(null);
  const [settingEvent, setSettingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", location: "", targetDate: "", emoji: "🎯" });

  const isAdmin = group.members?.find(m => m.user_id === session?.user?.id)?.role === "admin";
  const config = GROUP_TYPE_CONFIG[group.type] || GROUP_TYPE_CONFIG.training;
  const memberIds = (group.members || []).map(m => m.user_id);

  // Load type-specific data
  useEffect(() => {
    if (!group || memberIds.length === 0) { setLoadingData(false); return; }
    const load = async () => {
      setLoadingData(true);
      try {
        if (group.type === "training") {
          // Fetch events for all members
          const { data: events } = await supabase.from("workout_goals").select("id, user_id, name, target_date, emoji, location, is_active, completed_at, result, photo_url, distance")
            .in("user_id", memberIds).eq("is_active", true).order("target_date", { ascending: true });
          const { data: trophies } = await supabase.from("workout_goals").select("id, user_id, name, emoji, completed_at, result, location, photo_url, distance")
            .in("user_id", memberIds).eq("is_active", false).not("completed_at", "is", null)
            .order("completed_at", { ascending: false }).limit(10);
          const trainingEvent = group.settings?.trainingEvent || null;
          setGroupData({ events: events || [], trophies: trophies || [], trainingEvent });
        } else if (group.type === "bookclub") {
          const settings = group.settings || {};
          const currentBook = settings.currentBook || null;
          const pastBooks = settings.pastBooks || [];
          // Fetch reading progress for current book from all members
          let memberProgress = [];
          if (currentBook) {
            const { data: books } = await supabase.from("books").select("user_id, title, current_page, total_pages, is_active, rating, finished_at")
              .in("user_id", memberIds).ilike("title", currentBook.title);
            memberProgress = (books || []).map(b => {
              const member = group.members.find(m => m.user_id === b.user_id);
              return { ...b, username: member?.username, name: member?.name, avatar: member?.avatar, avatarUrl: member?.avatarUrl };
            });
          }
          // Fetch all finished books for members to show combined stats
          const { data: allFinished } = await supabase.from("books").select("user_id, title, finished_at")
            .in("user_id", memberIds).eq("is_active", false).neq("habit_id", 7);
          const now = new Date();
          const thisMonthBooks = (allFinished || []).filter(b => {
            if (!b.finished_at) return false;
            const d = new Date(b.finished_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          setGroupData({ currentBook, pastBooks, memberProgress, booksThisMonth: thisMonthBooks.length });
        }
      } catch (e) { console.error("Load group data error:", e); }
      setLoadingData(false);
    };
    load();
  }, [group.id]);

  const copyCode = () => {
    const url = `${window.location.origin}/join/${group.invite_code}`;
    try { navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
    onToast("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareGroup = async () => {
    const url = `${window.location.origin}/join/${group.invite_code}`;
    if (navigator.share) {
      try { await navigator.share({ title: group.name, text: `Join ${group.name} on Mantl! ${config.emoji}`, url }); } catch {}
    } else { copyCode(); }
  };

  // Book search for setting current book
  const searchBooks = (q) => {
    setBookSearch(q);
    if (bookSearchTimer.current) clearTimeout(bookSearchTimer.current);
    if (!q.trim()) { setBookResults([]); return; }
    bookSearchTimer.current = setTimeout(async () => {
      setSearchingBooks(true);
      try {
        const data = await searchGoogleBooksRaw(q, 5);
        setBookResults(((data && data.items) || []).map(item => ({
          title: item.volumeInfo.title,
          author: (item.volumeInfo.authors || []).join(", "),
          cover: item.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") || null,
          pages: item.volumeInfo.pageCount || 0,
        })));
      } catch { setBookResults([]); }
      setSearchingBooks(false);
    }, 400);
  };

  const setCurrentBook = async (book) => {
    const settings = group.settings || {};
    const pastBooks = settings.pastBooks || [];
    if (settings.currentBook) pastBooks.unshift({ ...settings.currentBook, setAt: new Date().toISOString() });
    const updated = { ...settings, currentBook: { ...book, setAt: new Date().toISOString() }, pastBooks: pastBooks.slice(0, 20) };
    const { error } = await supabase.from("groups").update({ settings: updated }).eq("id", group.id);
    if (error) { console.error("Save book club settings error:", error); onToast("Couldn't save"); return; }
    setGroupData(prev => ({ ...prev, currentBook: updated.currentBook, pastBooks: updated.pastBooks }));
    setSettingBook(false);
    setBookSearch("");
    setBookResults([]);
    onToast(`📖 Set "${book.title}" as current read!`);
  };

  // ── Group training event ──
  const setGroupTrainingEvent = async (ev) => {
    const settings = group.settings || {};
    const member = group.members.find(m => m.user_id === ev.user_id);
    const trainingEvent = { id: ev.id, name: ev.name, emoji: ev.emoji || "🎯", location: ev.location || null, target_date: ev.target_date || null, user_id: ev.user_id, username: member?.username || null, setAt: new Date().toISOString() };
    const updated = { ...settings, trainingEvent };
    const { error } = await supabase.from("groups").update({ settings: updated }).eq("id", group.id);
    if (error) { console.error("Save group training event error:", error); onToast("Couldn't save"); return; }
    setGroupData(prev => ({ ...prev, trainingEvent }));
    setSettingEvent(false);
    onToast(`🏁 Set "${ev.name}" as group event!`);
  };

  const createGroupTrainingEvent = async () => {
    const { name, location, targetDate, emoji } = eventForm;
    if (!name.trim()) return;
    // Insert into workout_goals for the admin
    const { data: inserted, error: insertErr } = await supabase.from("workout_goals").insert({
      user_id: session.user.id, name: name.trim(), target_date: targetDate || null, emoji: emoji || "🎯", location: location.trim() || null,
      is_active: true, habit_id: 1, source: "mantl",
    }).select().single();
    if (insertErr || !inserted) { console.error("Create group event error:", insertErr); onToast("Couldn't create event"); return; }
    // Set as group event
    const member = group.members.find(m => m.user_id === session.user.id);
    const trainingEvent = { id: inserted.id, name: inserted.name, emoji: inserted.emoji, location: inserted.location, target_date: inserted.target_date, user_id: session.user.id, username: member?.username || null, setAt: new Date().toISOString() };
    const settings = group.settings || {};
    const updated = { ...settings, trainingEvent };
    const { error: updateErr } = await supabase.from("groups").update({ settings: updated }).eq("id", group.id);
    if (updateErr) console.error("Save group settings error:", updateErr);
    setGroupData(prev => ({ ...prev, trainingEvent, events: [...(prev.events || []), inserted] }));
    setSettingEvent(false);
    setEventForm({ name: "", location: "", targetDate: "", emoji: "🎯" });
    onToast(`🏁 Created & set "${inserted.name}" as group event!`);
  };

  // ── Training content (inline JSX, not a component, to preserve input focus) ──
  const trainingContent = (() => {
    if (!groupData || group.type !== "training") return null;
    const { events, trophies, trainingEvent } = groupData;
    const now = new Date();

    // Event picker overlay
    if (settingEvent) {
      return (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>🏁 Set Group Event</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", cursor: "pointer" }} onClick={() => setSettingEvent(false)}>Cancel</div>
          </div>

          {/* Existing member events to pick from */}
          {events.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 8 }}>Select from member events</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {events.map((e, i) => {
                  const member = group.members.find(m => m.user_id === e.user_id);
                  const isSelected = trainingEvent?.id === e.id;
                  return (
                    <div key={i} onClick={() => setGroupTrainingEvent(e)}
                      style={{
                        padding: "10px 14px", background: isSelected ? "rgba(196,115,79,0.1)" : "var(--cream)",
                        border: `1px solid ${isSelected ? "var(--terracotta)" : "var(--border)"}`,
                        borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--terracotta)"}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border)"; }}>
                      <span style={{ fontSize: 18 }}>{e.emoji || "🎯"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bb" style={{ fontSize: 13 }}>{e.name}</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                          @{member?.username || "member"}{e.location ? ` · ${e.location}` : ""}{e.target_date ? ` · ${e.target_date}` : ""}
                        </div>
                      </div>
                      <span className="mono" style={{ fontSize: 10, color: "var(--terracotta)" }}>Select</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          {events.length > 0 && <div style={{ height: 1, background: "var(--border)", margin: "4px 0 16px" }} />}

          {/* Create new event */}
          <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 8 }}>{events.length > 0 ? "Or create a new event" : "Create an event"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="event-form-input" placeholder="Event name (e.g., Lisbon Marathon)" value={eventForm.name}
              onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} autoFocus={events.length === 0}
              style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-body)" }} />
            <input className="event-form-input" placeholder="Location (optional)" value={eventForm.location}
              onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
              style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-body)" }} />
            <input type="date" value={eventForm.targetDate}
              onChange={e => setEventForm(f => ({ ...f, targetDate: e.target.value }))}
              style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-body)" }} />
            <button className="btn-primary" style={{ marginTop: 4 }} disabled={!eventForm.name.trim()}
              onClick={createGroupTrainingEvent}>Create & Set as Group Event</button>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Group training event (hero) */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>🏁 Group Event</div>
            {isAdmin && <div className="mono" style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer" }} onClick={() => setSettingEvent(true)}>{trainingEvent ? "Change" : "Set Event"}</div>}
          </div>

          {trainingEvent ? (() => {
            const daysOut = trainingEvent.target_date ? Math.max(0, Math.round((new Date(trainingEvent.target_date + "T12:00:00") - now) / (1000 * 60 * 60 * 24))) : null;
            const weeksOut = daysOut != null ? Math.round(daysOut / 7) : null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "linear-gradient(135deg, rgba(196,115,79,0.08) 0%, rgba(212,168,67,0.06) 100%)", borderRadius: 12, border: "1px solid rgba(196,115,79,0.15)" }}>
                <span style={{ fontSize: 28 }}>{trainingEvent.emoji || "🎯"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bb" style={{ fontSize: 16 }}>{trainingEvent.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                    {trainingEvent.location || ""}{trainingEvent.target_date ? `${trainingEvent.location ? " · " : ""}${trainingEvent.target_date}` : ""}
                  </div>
                </div>
                {weeksOut != null && (
                  <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", borderRadius: 100, background: daysOut <= 7 ? "rgba(196,115,79,0.12)" : "rgba(122,154,106,0.1)" }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: daysOut <= 7 ? "var(--terracotta)" : "var(--sage)" }}>
                      {daysOut <= 1 ? "Tomorrow!" : daysOut <= 7 ? `${daysOut}d` : `${weeksOut}w`}
                    </span>
                  </div>
                )}
              </div>
            );
          })() : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🏁</div>
              <div className="lr" style={{ fontSize: 12, color: "var(--text-dim)" }}>{isAdmin ? "Set a group event to rally around" : "No group event set yet"}</div>
              {isAdmin && <div className="mono" style={{ fontSize: 11, color: "var(--terracotta)", cursor: "pointer", marginTop: 8 }} onClick={() => setSettingEvent(true)}>Set Event →</div>}
            </div>
          )}
        </div>

        {/* Members' individual events */}
        {events.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>👟 Members Training</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {events.map((e, i) => {
                const member = group.members.find(m => m.user_id === e.user_id);
                const daysOut = e.target_date ? Math.max(0, Math.round((new Date(e.target_date + "T12:00:00") - now) / (1000 * 60 * 60 * 24))) : null;
                const weeksOut = daysOut != null ? Math.round(daysOut / 7) : null;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--cream)", borderRadius: 12 }}>
                    <span style={{ fontSize: 22 }}>{e.emoji || "🎯"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>
                        {member?.username ? `@${member.username}` : "Member"}{e.location ? ` · ${e.location}` : ""}
                      </div>
                    </div>
                    {weeksOut != null && (
                      <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 100, background: daysOut <= 7 ? "rgba(196,115,79,0.12)" : "rgba(122,154,106,0.1)" }}>
                        <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: daysOut <= 7 ? "var(--terracotta)" : "var(--sage)" }}>
                          {daysOut <= 1 ? "Tomorrow!" : daysOut <= 7 ? `${daysOut}d out` : `${weeksOut}w out`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent trophies */}
        {trophies.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>🏆 Recent Trophies</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trophies.slice(0, 5).map((t, i) => {
                const member = group.members.find(m => m.user_id === t.user_id);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(196,115,79,0.04) 100%)", borderRadius: 10, border: "1px solid rgba(212,168,67,0.12)" }}>
                    <span style={{ fontSize: 18 }}>{t.emoji || "🏆"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bb" style={{ fontSize: 12 }}>{t.name}</div>
                      <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)" }}>
                        @{member?.username || "member"}{t.result ? ` · ${t.result}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {events.length === 0 && trophies.length === 0 && !trainingEvent && (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "24px 16px", marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏃</div>
            <div className="bb" style={{ fontSize: 14, marginBottom: 4 }}>No events yet</div>
            <div className="lr" style={{ fontSize: 12, color: "var(--text-dim)" }}>Members' training events and trophies will appear here</div>
          </div>
        )}
      </>
    );
  })();

  // ── Book club content (inline JSX, not a component) ──
  const bookClubContent = (() => {
    if (!groupData || group.type !== "bookclub") return null;
    const { currentBook, pastBooks, memberProgress, booksThisMonth } = groupData;
    return (
      <>
        {/* Current book */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>📖 Currently Reading</div>
            {isAdmin && <div className="mono" style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer" }} onClick={() => setSettingBook(true)}>{currentBook ? "Change" : "Set Book"}</div>}
          </div>

          {currentBook ? (
            <div>
              <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                {currentBook.cover ? (
                  <img src={currentBook.cover} alt="" style={{ width: 60, height: 90, objectFit: "cover", borderRadius: 6, boxShadow: "2px 3px 8px rgba(44,36,32,0.15)", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 60, height: 90, background: "var(--charcoal)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📖</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bb" style={{ fontSize: 16, lineHeight: 1.2, marginBottom: 3 }}>{currentBook.title}</div>
                  {currentBook.author && <div className="lr" style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>{currentBook.author}</div>}
                  {currentBook.pages > 0 && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>{currentBook.pages} pages</div>}
                </div>
              </div>

              {/* Member progress */}
              {memberProgress.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Progress</div>
                  {memberProgress.map((mp, i) => {
                    const pct = mp.total_pages > 0 ? Math.round((mp.current_page / mp.total_pages) * 100) : (mp.is_active === false ? 100 : 0);
                    const finished = !mp.is_active && mp.finished_at;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {mp.avatarUrl ? (
                          <img src={mp.avatarUrl} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{mp.avatar}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span className="mono" style={{ fontSize: 10, color: "var(--charcoal)" }}>@{mp.username}</span>
                            {finished && <span className="mono" style={{ fontSize: 9, color: "var(--sage)", fontWeight: 600 }}>✓ Done</span>}
                            {mp.rating > 0 && <span style={{ fontSize: 10, color: "#d4a843" }}>{"★".repeat(mp.rating)}</span>}
                          </div>
                          <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: finished ? "var(--sage)" : "var(--terracotta)", borderRadius: 3, transition: "width 0.3s" }} />
                          </div>
                        </div>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "center", padding: "8px 0" }}>
                  Members who add this book will appear here
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
              <div className="lr" style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>No book set yet</div>
              {isAdmin && <button className="btn-shelf-it" style={{ fontSize: 12, padding: "8px 20px" }} onClick={() => setSettingBook(true)}>Set Current Book</button>}
            </div>
          )}
        </div>

        {/* Group stats */}
        {booksThisMonth > 0 && (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>📊 This Month</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: "var(--charcoal)" }}>{booksThisMonth}</div>
              <div className="lr" style={{ fontSize: 13, color: "var(--text-dim)" }}>book{booksThisMonth !== 1 ? "s" : ""} finished by the group</div>
            </div>
          </div>
        )}

        {/* Past picks */}
        {pastBooks.length > 0 && (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginTop: 16 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>📚 Past Picks</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {pastBooks.map((b, i) => (
                <div key={i} style={{ flexShrink: 0, width: 60 }}>
                  {b.cover ? (
                    <img src={b.cover} alt="" style={{ width: 60, height: 90, objectFit: "cover", borderRadius: 6, display: "block" }} />
                  ) : (
                    <div style={{ width: 60, height: 90, background: "var(--charcoal)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📖</div>
                  )}
                  <div className="bb" style={{ fontSize: 9, marginTop: 4, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  })();

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(170deg, #1c1c1e 0%, #0f0f10 50%, #141416 100%)",
        borderRadius: "0 0 24px 24px", padding: "48px 24px 28px", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #c4734f, #d4a843, transparent)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, pointerEvents: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div onClick={onBack} style={{ position: "absolute", top: 16, left: 16, color: "rgba(244,240,234,0.5)", fontSize: 18, cursor: "pointer", zIndex: 2, padding: "8px" }}>←</div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 40 }}>{group.emoji || config.emoji}</div>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: "#f4f0ea", textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1.1 }}>{group.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "rgba(244,240,234,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{config.label} · {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? "s" : ""}</div>
            </div>
          </div>
          {group.description && <div style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "rgba(244,240,234,0.55)", fontStyle: "italic", lineHeight: 1.4 }}>{group.description}</div>}
        </div>
      </div>

      <div style={{ padding: "20px 16px 100px" }}>
        {/* Invite link */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px", marginBottom: 16 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Invite Link</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="mono" style={{ flex: 1, fontSize: 13, color: "var(--charcoal)", background: "var(--cream)", borderRadius: 8, padding: "10px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              mymantl.app/join/{group.invite_code}
            </div>
            <button onClick={shareGroup} style={{
              background: "var(--charcoal)", color: "var(--cream)", border: "none", borderRadius: 10,
              padding: "10px 16px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", whiteSpace: "nowrap",
            }}>
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {/* Members */}
        <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "16px" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Members</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(group.members || []).map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{m.avatar}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="bb" style={{ fontSize: 14 }}>{m.name || m.username}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)" }}>@{m.username}</div>
                </div>
                {m.role === "admin" && <div className="mono" style={{ fontSize: 9, color: "var(--terracotta)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Admin</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Type-specific content */}
        {loadingData ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}><div className="spinner" /></div>
        ) : group.type === "training" ? (
          trainingContent
        ) : group.type === "bookclub" ? (
          bookClubContent
        ) : (
          <div style={{ background: "white", borderRadius: 14, border: "1px solid var(--border)", padding: "24px 16px", marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
            <div className="bb" style={{ fontSize: 14, marginBottom: 4 }}>Coming Soon</div>
            <div className="lr" style={{ fontSize: 12, color: "var(--text-dim)" }}>Watch party features are on the way</div>
          </div>
        )}
      </div>

      {/* Book search modal (top level for proper overlay) */}
      {settingBook && (
        <div className="overlay" onClick={() => { setSettingBook(false); setBookSearch(""); setBookResults([]); }}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Set Current Book</div>
              <div className="pin-picker-close" onClick={() => { setSettingBook(false); setBookSearch(""); setBookResults([]); }}>✕</div>
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <input className="event-form-input" placeholder="Search for a book..." value={bookSearch} onChange={e => searchBooks(e.target.value)} autoFocus />
              {searchingBooks && <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 8, textAlign: "center" }}>Searching...</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, maxHeight: 300, overflow: "auto" }}>
                {bookResults.map((b, i) => (
                  <div key={i} onClick={() => setCurrentBook(b)} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "var(--cream)", borderRadius: 10, cursor: "pointer" }}>
                    {b.cover ? <img src={b.cover} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 40, height: 60, background: "var(--charcoal)", borderRadius: 4, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                      {b.author && <div className="lr" style={{ fontSize: 11, color: "var(--text-dim)" }}>{b.author}</div>}
                      {b.pages > 0 && <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>{b.pages} pages</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default GroupViewScreen;

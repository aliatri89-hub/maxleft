import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { HABITS, TIERS, getTargetDays, getDaysInMonth } from "../utils/constants";
import { searchGoogleBooks, searchGoogleBooksRaw, sb } from "../utils/api";

function ChallengeScreen({ session, onToast }) {
  const [challengeData, setChallengeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [creating, setCreating] = useState(false);
  const [history, setHistory] = useState({});
  const [viewingDay, setViewingDay] = useState(null);
  const [saving, setSaving] = useState(false);
  // Expanded panel state
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [books, setBooks] = useState({}); // { habitId: { title, author, totalPages, currentPage, cover, dbId } }
  const [bookForm, setBookForm] = useState({ title: "", author: "", totalPages: "", currentPage: "", cover: null });
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [bookManualEntry, setBookManualEntry] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [editTotalPages, setEditTotalPages] = useState(null); // null or string value
  const [bookRating, setBookRating] = useState(0);
  const [goals, setGoals] = useState({}); // { habitId: { name, targetDate, emoji, location, dbId } }
  const [goalForm, setGoalForm] = useState({ name: "", targetDate: "", emoji: "", location: "" });
  const [learnTopics, setLearnTopics] = useState({}); // { habitId: { topic, dbId } }
  const [learnInput, setLearnInput] = useState("");
  const [challengeView, setChallengeView] = useState(() => {
    const now = new Date();
    const d = now.getDate();
    const total = getDaysInMonth(now.getFullYear(), now.getMonth() + 1);
    return d >= total ? "results" : "today";
  }); // "today" | "dashboard" | "results"
  const [shareMode, setShareMode] = useState("card"); // "card" | "overlay"

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const realDayOfMonth = now.getDate();
  const totalDays = getDaysInMonth(currentYear, currentMonth);
  const dayOfMonth = Math.min(totalDays, realDayOfMonth);
  const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getDateStr = (day) => {
    const d = new Date(currentYear, currentMonth - 1, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getDayData = (day) => history[day] || { checked: [], rested: [], missed: [] };

  // Load existing challenge + daily logs + books + goals
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: challenge } = await supabase
        .from("monthly_challenges")
        .select("id, habits, start_day, month, year, group_id")
        .eq("user_id", session.user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      if (challenge) {
        hadChallengeData.current = true;
        setChallengeData({
          id: challenge.id, habits: challenge.habits, startDay: challenge.start_day || 1,
          month: challenge.month, year: challenge.year, groupId: challenge.group_id,
        });

        // Load logs, active books, active goals in parallel
        const [logsRes, booksRes, goalsRes] = await Promise.all([
          supabase.from("daily_logs").select("date, habit_id, status").eq("challenge_id", challenge.id),
          supabase.from("books").select("id, habit_id, title, author, total_pages, current_page, cover_url").eq("user_id", session.user.id).eq("is_active", true),
          supabase.from("workout_goals").select("id, habit_id, name, target_date, emoji, location").eq("user_id", session.user.id).eq("is_active", true),
        ]);

        // Process logs
        const hist = {};
        (logsRes.data || []).forEach(log => {
          const day = new Date(log.date + "T12:00:00").getDate();
          if (!hist[day]) hist[day] = { checked: [], rested: [], missed: [] };
          if (log.status === "complete") hist[day].checked.push(log.habit_id);
          else if (log.status === "rest") hist[day].rested.push(log.habit_id);
          else if (log.status === "missed" || log.status === "skip") hist[day].missed.push(log.habit_id);
        });
        setHistory(hist);

        // Process books — map by habit_id
        const booksMap = {};
        const learnMap = {};
        (booksRes.data || []).forEach(b => {
          if (b.habit_id === 7) {
            learnMap[b.habit_id] = { topic: b.title, dbId: b.id };
          } else {
            booksMap[b.habit_id] = {
              title: b.title, author: b.author, totalPages: b.total_pages,
              currentPage: b.current_page, cover: b.cover_url, dbId: b.id,
            };
          }
        });
        setBooks(booksMap);
        setLearnTopics(learnMap);

        // Process goals — map by habit_id
        const goalsMap = {};
        (goalsRes.data || []).forEach(g => {
          goalsMap[g.habit_id] = {
            name: g.name, targetDate: g.target_date, emoji: g.emoji || "🎯",
            location: g.location, dbId: g.id,
          };
        });
        setGoals(goalsMap);

        setViewingDay(dayOfMonth);
      }
      setLoading(false);
    })();
  }, [session, currentMonth, currentYear, retryKey]);

  // ── Habit toggle: blank → complete → rest → missed → blank ──
  const toggleHabitStatus = async (hId) => {
    if (!challengeData || !session) return;
    const dayData = getDayData(viewingDay);
    const isDone = dayData.checked.includes(hId);
    const isRested = dayData.rested.includes(hId);
    const isMissed = dayData.missed.includes(hId);

    let newStatus;
    if (!isDone && !isRested && !isMissed) newStatus = "complete";
    else if (isDone) newStatus = "rest";
    else if (isRested) newStatus = "missed";
    else newStatus = null;

    setHistory(prev => {
      const day = { ...getDayData(viewingDay) };
      day.checked = day.checked.filter(id => id !== hId);
      day.rested = day.rested.filter(id => id !== hId);
      day.missed = day.missed.filter(id => id !== hId);
      if (newStatus === "complete") day.checked = [...day.checked, hId];
      else if (newStatus === "rest") day.rested = [...day.rested, hId];
      else if (newStatus === "missed") day.missed = [...day.missed, hId];
      return { ...prev, [viewingDay]: day };
    });

    // If unchecking, collapse panel
    if (newStatus !== "complete" && expandedHabit === hId) setExpandedHabit(null);

    setSaving(true);
    const dateStr = getDateStr(viewingDay);
    try {
      if (newStatus) {
        await supabase.from("daily_logs").upsert(
          { challenge_id: challengeData.id, user_id: session.user.id, date: dateStr, habit_id: hId, status: newStatus },
          { onConflict: "challenge_id,date,habit_id" }
        );
      } else {
        await supabase.from("daily_logs").delete()
          .eq("challenge_id", challengeData.id).eq("date", dateStr).eq("habit_id", hId);
      }
    } catch (err) { console.error("Save error:", err); onToast("Couldn't save"); }
    setSaving(false);
  };

  // ── Card click: toggle expand (only if done) ──
  const handleCardClick = (hId) => {
    const dayData = getDayData(viewingDay);
    const isDone = dayData.checked.includes(hId);
    if (isDone) {
      if (expandedHabit === hId) setExpandedHabit(null);
      else {
        setExpandedHabit(hId);
        // Pre-fill page input
        if (books[hId]) setPageInput(String(books[hId].currentPage || ""));
        setBookForm({ title: "", author: "", totalPages: "", currentPage: "", cover: null });
        setBookSearchQuery("");
        setBookSearchResults([]);
        setBookManualEntry(false);
        setEditTotalPages(null);
        setGoalForm({ name: "", targetDate: "", emoji: "", location: "" });
        setLearnInput(learnTopics[hId]?.topic || "");
        setBookRating(0);
      }
    } else {
      toggleHabitStatus(hId);
    }
  };

  // ── Check circle click: always cycles status ──
  const handleCheckClick = (e, hId) => {
    e.stopPropagation();
    toggleHabitStatus(hId);
  };

  // ── Book functions ──
  const fetchBookCover = async (title, author) => {
    try {
      const q = `${title} ${author || ""}`;
      const data = await searchGoogleBooksRaw(q, 1);
      if (!data || data.error) return null;
      return data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
    } catch { return null; }
  };

  const setupBook = async (hId) => {
    const { title, author, totalPages, currentPage, cover } = bookForm;
    if (!title || !totalPages) return;
    const parsedTotal = parseInt(totalPages);
    const parsedCurrent = parseInt(currentPage) || 0;

    setBooks(prev => ({ ...prev, [hId]: { title, author, totalPages: parsedTotal, currentPage: parsedCurrent, cover: cover || null } }));

    const { data: inserted } = await supabase.from("books")
      .insert({ user_id: session.user.id, habit_id: hId, title, author, total_pages: parsedTotal, current_page: parsedCurrent, cover_url: cover || null })
      .select().single();

    if (inserted) {
      setBooks(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], dbId: inserted.id } } : prev);
      // If no cover from search, try to fetch one
      if (!cover) {
        const fetchedCover = await fetchBookCover(title, author);
        if (fetchedCover) {
          setBooks(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], cover: fetchedCover } } : prev);
          await sb(supabase.from("books").update({ cover_url: fetchedCover }).eq("id", inserted.id), onToast, "Couldn't update");
        }
      }
    }
    setBookManualEntry(false);
    onToast("Book added! 📖");
  };

  const updatePage = async (hId) => {
    const page = parseInt(pageInput);
    if (!page || !books[hId]) return;
    const book = books[hId];
    const prevPage = book.currentPage || 0;
    const total = book.totalPages || 1;
    setBooks(prev => ({ ...prev, [hId]: { ...prev[hId], currentPage: page } }));
    if (book.dbId) {
      await sb(supabase.from("books").update({ current_page: page }).eq("id", book.dbId), onToast, "Couldn't update");
      // Write reading_log entry so recap card picks up pages read
      if (page > prevPage) {
        await supabase.from("reading_log").insert({
          book_id: book.dbId, user_id: session.user.id,
          page_from: prevPage, page_to: page,
        });
      }
    }
    // Post reading progress milestones
    if (session && total > 0) {
      const prevPct = Math.floor((prevPage / total) * 100);
      const newPct = Math.floor((page / total) * 100);
      for (const m of [50, 75]) {
        if (prevPct < m && newPct >= m && newPct < 100) {
          const milestoneKey = `reading_${book.dbId || book.title}_${m}`;
          try {
            const { data: exists } = await supabase.from("feed_activity")
              .select("id").eq("user_id", session.user.id).eq("title", milestoneKey).maybeSingle();
            if (!exists) {
              await supabase.from("feed_activity").insert({
                user_id: session.user.id, activity_type: "book", action: "progress",
                title: milestoneKey, item_title: book.title, item_author: book.author,
                item_cover: book.cover || null, metadata: { percent: m, current_page: page, total_pages: total },
              });
            }
          } catch (e) { console.error("Reading progress feed error:", e); }
        }
      }
    }
    onToast("Page updated!");
  };

  const updateTotalPages = async (hId) => {
    const total = parseInt(editTotalPages);
    if (!total || total < 1 || !books[hId]) { setEditTotalPages(null); return; }
    setBooks(prev => ({ ...prev, [hId]: { ...prev[hId], totalPages: total } }));
    if (books[hId].dbId) {
      await sb(supabase.from("books").update({ total_pages: total }).eq("id", books[hId].dbId), onToast, "Couldn't update");
    }
    setEditTotalPages(null);
    onToast("Total pages updated!");
  };

  const finishBook = async (hId) => {
    const book = books[hId];
    if (!book) return;
    setBooks(prev => { const next = { ...prev }; delete next[hId]; return next; });
    if (book.dbId) {
      await sb(supabase.from("books").update({
        is_active: false, current_page: book.totalPages,
        finished_at: new Date().toISOString(), rating: bookRating || null,
        }).eq("id", book.dbId), onToast, "Couldn't update");

    }
    setExpandedHabit(null);
    setBookRating(0);
    onToast("Book finished! 🎉");
  };

  // ── Goal functions ──
  const setupGoal = async (hId) => {
    const { name, targetDate, emoji, location } = goalForm;
    if (!name) return;
    const isEvent = hId === 1; // "Train for an Event"

    setGoals(prev => ({ ...prev, [hId]: { name, targetDate: targetDate || null, emoji: emoji || "🎯", location: isEvent ? (location || null) : null } }));

    const { data: inserted } = await supabase.from("workout_goals")
      .insert({ user_id: session.user.id, habit_id: hId, name, target_date: targetDate || null, emoji: emoji || "🎯", location: isEvent ? (location || null) : null })
      .select().single();

    if (inserted) {
      setGoals(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], dbId: inserted.id } } : prev);
    }
    onToast(isEvent ? "Event set! 🏁" : "Goal set! 🎯");
  };

  const crushGoal = async (hId) => {
    const goal = goals[hId];
    if (!goal) return;
    setGoals(prev => { const next = { ...prev }; delete next[hId]; return next; });
    if (goal.dbId) {
      await sb(supabase.from("workout_goals").update({ is_active: false, completed_at: new Date().toISOString() }).eq("id", goal.dbId), onToast, "Couldn't update");
    }
    setExpandedHabit(null);
    onToast("Goal crushed! 🏆");
  };

  // ── Learn functions ──
  const setupLearn = async (hId) => {
    if (!learnInput.trim()) return;
    setLearnTopics(prev => ({ ...prev, [hId]: { topic: learnInput.trim() } }));

    const { data: inserted } = await supabase.from("books")
      .insert({ user_id: session.user.id, habit_id: 7, title: learnInput.trim(), total_pages: 1, current_page: 0 })
      .select().single();

    if (inserted) {
      setLearnTopics(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], dbId: inserted.id } } : prev);
    }
    onToast("Learning tracked! 🎓");
  };

  const finishLearn = async (hId) => {
    const topic = learnTopics[hId];
    if (!topic) return;
    setLearnTopics(prev => { const next = { ...prev }; delete next[hId]; return next; });
    if (topic.dbId) {
      await sb(supabase.from("books").update({ is_active: false, current_page: 1, finished_at: new Date().toISOString() }).eq("id", topic.dbId), onToast, "Couldn't update");
    }
    setLearnInput("");
    onToast("Topic complete! ✓");
  };

  // ── Helpers ──
  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const target = new Date(dateStr + "T00:00:00");
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Book search with debounce
  const bookSearchTimer = useRef(null);
  const hadChallengeData = useRef(false);
  const handleBookSearch = (query) => {
    setBookSearchQuery(query);
    setBookSearchResults([]);
    if (bookSearchTimer.current) clearTimeout(bookSearchTimer.current);
    if (query.length < 2) return;
    bookSearchTimer.current = setTimeout(async () => {
      setBookSearching(true);
      try {
        const results = await searchGoogleBooks(query);
        setBookSearchResults(results);
      } catch { setBookSearchResults([]); }
      setBookSearching(false);
    }, 400);
  };

  const selectBookResult = (result) => {
    setBookForm({
      title: result.title,
      author: result.author,
      totalPages: result.pages ? String(result.pages) : "",
      currentPage: "0",
      cover: result.cover,
    });
    setBookSearchQuery("");
    setBookSearchResults([]);
  };

  const generateShareImage = async (mode, doShare, data) => {
    const { finalOverall, finalTier, finalStats, challengeData, perfectDays, resultDays, resultTarget, currentMonth, currentYear, MONTH_NAMES } = data;
    const isOverlay = mode === "overlay";
    const W = 1080, H = 1350; // 4:5 stories aspect
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    const cream = "#F5F0E8", charcoal = "#2c2420", terracotta = "#C4734F", dim = "#8a7e72", faint = "#b5a99a";
    const green = "#7A9A6A", gold = "#C4A86A", red = "#C47A6A";

    // Background
    if (!isOverlay) {
      ctx.fillStyle = cream;
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, 40);
      ctx.fill();
      // Subtle border
      ctx.strokeStyle = "rgba(44,36,32,0.08)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const textColor = isOverlay ? "#ffffff" : charcoal;
    const subColor = isOverlay ? "rgba(255,255,255,0.7)" : dim;
    const faintColor = isOverlay ? "rgba(255,255,255,0.5)" : faint;
    const setShadow = () => { if (isOverlay) { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; } };
    const clearShadow = () => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };

    // Header
    setShadow();
    ctx.font = "600 28px 'IBM Plex Mono', monospace";
    ctx.fillStyle = faintColor;
    ctx.textAlign = "center";
    ctx.fillText("MANTL · CHALLENGE", W / 2, 80);

    // Tier icon
    ctx.font = "120px serif";
    ctx.fillText(finalTier ? finalTier.icon : "📊", W / 2, 240);

    // Month
    ctx.font = "700 32px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = subColor;
    ctx.fillText(`${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}`, W / 2, 300);

    // Tier name
    ctx.font = "900 72px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = textColor;
    ctx.letterSpacing = "4px";
    ctx.fillText((finalTier ? finalTier.name : "In Progress").toUpperCase(), W / 2, 380);
    ctx.letterSpacing = "0px";

    // Score ring
    const ringX = W / 2, ringY = 540, ringR = 110;
    const trackColor = isOverlay ? "rgba(255,255,255,0.15)" : "rgba(44,36,32,0.08)";
    const arcColor = finalOverall >= 100 ? green : finalOverall >= 85 ? gold : terracotta;

    clearShadow();
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = trackColor;
    ctx.lineWidth = 22;
    ctx.stroke();

    ctx.beginPath();
    const arcEnd = -Math.PI / 2 + (Math.min(finalOverall, 120) / 100) * Math.PI * 2;
    ctx.arc(ringX, ringY, ringR, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";

    setShadow();
    ctx.font = "900 80px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.fillText(`${finalOverall}%`, ringX, ringY + 28);

    // Stats row
    const statsY = 720;
    const statItems = [
      { num: String(resultDays), label: "DAYS" },
      { num: String(perfectDays), label: "PERFECT" },
      { num: String(challengeData.habits.length), label: "HABITS" },
      { num: String(resultTarget), label: "TARGET" },
    ];
    const statGap = W / (statItems.length + 1);
    statItems.forEach((s, i) => {
      const sx = statGap * (i + 1);
      ctx.font = "800 48px 'Barlow Condensed', sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(s.num, sx, statsY);
      ctx.font = "600 18px 'IBM Plex Mono', monospace";
      ctx.fillStyle = faintColor;
      ctx.fillText(s.label, sx, statsY + 30);
    });

    // Habit bars
    const barStartY = 810;
    const barLeft = 100, barRight = W - 100;
    const barW = 180;
    const barH = 14;

    finalStats.forEach((stat, i) => {
      const habit = HABITS.find(h => h.id === stat.hId);
      if (!habit) return;
      const y = barStartY + i * 64;
      const barColor = stat.pct >= 100 ? green : stat.pct >= 85 ? gold : stat.pct >= 50 ? terracotta : red;

      // Icon
      ctx.font = "36px serif";
      ctx.textAlign = "left";
      ctx.fillText(habit.icon, barLeft, y + 10);

      // Name
      ctx.font = "700 28px 'Barlow Condensed', sans-serif";
      ctx.fillStyle = textColor;
      ctx.fillText(habit.name, barLeft + 52, y + 6);

      // Percentage
      ctx.font = "700 28px 'IBM Plex Mono', monospace";
      ctx.fillStyle = barColor;
      ctx.textAlign = "right";
      ctx.fillText(`${stat.pct}%`, barRight, y + 6);

      // Bar track
      clearShadow();
      const trackBarY = y + 20;
      ctx.fillStyle = isOverlay ? "rgba(255,255,255,0.15)" : "rgba(44,36,32,0.06)";
      ctx.beginPath();
      ctx.roundRect(barLeft + 52, trackBarY, barW, barH, barH / 2);
      ctx.fill();

      // Bar fill
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(barLeft + 52, trackBarY, Math.min(barW, barW * stat.pct / 100), barH, barH / 2);
      ctx.fill();

      setShadow();
      ctx.textAlign = "center";
    });

    // Footer
    const footY = H - 80;
    ctx.font = "italic 28px 'Lora', serif";
    ctx.fillStyle = subColor;
    ctx.fillText("Consistency beats perfection", W / 2, footY);
    ctx.font = "600 20px 'IBM Plex Mono', monospace";
    ctx.fillStyle = faintColor;
    ctx.fillText("mymantl.app", W / 2, footY + 40);
    clearShadow();

    // Export
    canvas.toBlob(async (blob) => {
      if (!blob) { onToast("Couldn't generate image"); return; }
      const file = new File([blob], `mantl-challenge-${currentMonth}-${currentYear}.png`, { type: "image/png" });

      if (doShare && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${MONTH_NAMES[currentMonth]} Challenge`,
            text: `${finalOverall}% · ${finalTier ? finalTier.icon + " " + finalTier.name : ""}`,
          });
        } catch { /* user cancelled */ }
      } else {
        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        onToast(doShare ? "Image saved — share from your gallery!" : "Image saved! 📥");
      }
    }, "image/png");
  };

  const toggleSelectHabit = (id) => {
    if (selectedHabits.includes(id)) setSelectedHabits(selectedHabits.filter(h => h !== id));
    else if (selectedHabits.length < 10) setSelectedHabits([...selectedHabits, id]);
  };

  const startChallenge = async () => {
    if (!session || selectedHabits.length < 5) return;

    // Safety: check if a challenge already exists with logs before overwriting
    const { data: existing } = await supabase.from("monthly_challenges")
      .select("id").eq("user_id", session.user.id).eq("month", currentMonth).eq("year", currentYear).maybeSingle();
    if (existing) {
      const { count } = await supabase.from("daily_logs").select("id", { count: "exact", head: true }).eq("challenge_id", existing.id);
      if (count > 0) {
        if (!window.confirm(`You already have ${count} logged entries this month. Starting over will DELETE all of them. Continue?`)) {
          return;
        }
      }
    }

    setCreating(true);
    try {
      await supabase.from("monthly_challenges").delete()
        .eq("user_id", session.user.id).eq("month", currentMonth).eq("year", currentYear);
      const { data: challenge, error } = await supabase.from("monthly_challenges")
        .insert({ user_id: session.user.id, month: currentMonth, year: currentYear, habits: selectedHabits, start_day: dayOfMonth })
        .select().single();
      if (error) { onToast("Couldn't start challenge — try again"); setCreating(false); return; }
      setChallengeData({ id: challenge.id, habits: challenge.habits, startDay: challenge.start_day, month: challenge.month, year: challenge.year, groupId: challenge.group_id });
      setViewingDay(dayOfMonth);
      setHistory({});
      setSelecting(false);
      onToast("Challenge started! 🔥");
    } catch { onToast("Something went wrong"); }
    setCreating(false);
  };

  // ── Loading ──
  if (loading) {
    return <div className="challenge-screen"><div className="challenge-header bb">Challenge</div><div className="challenge-sub">Loading...</div></div>;
  }

  // ── Setup / No Challenge ──
  if (!challengeData && !loading && hadChallengeData.current) {
    // Data was loaded before but now missing — likely a transient error, retry
    return (
      <div className="challenge-screen">
        <div className="challenge-header bb">Challenge</div>
        <div className="challenge-sub" style={{ textAlign: "center", padding: 40 }}>
          Something went wrong loading your challenge.
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={() => { setLoading(true); hadChallengeData.current = false; setChallengeData(null); setRetryKey(k => k + 1); }}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (selecting || (!challengeData && !loading)) {
    const remaining = 5 - selectedHabits.length;
    return (
      <div className="challenge-screen">
        <div className="challenge-header bb">{selecting ? "Pick Your Habits" : "FiveSeven Challenge"}</div>
        {!selecting ? (
          <div className="challenge-setup">
            <div className="challenge-setup-icon">⚡</div>
            <div className="challenge-setup-title">Want a push this month?</div>
            <div className="challenge-setup-desc">
              Pick 5 of 7 habits. Do each one 5 times a week.<br />Consistency beats perfection. Rest days are built in.
            </div>
            <button className="btn-primary" onClick={() => setSelecting(true)}>Start a Challenge</button>
          </div>
        ) : (
          <>
            <div className="challenge-sub">Choose at least 5. Or all 7, overachiever.</div>
            <div className="challenge-counter"><span className="n">{selectedHabits.length}</span> / 5 selected{selectedHabits.length >= 5 && " ✓"}</div>
            <div className="habit-select-grid">
              {HABITS.map(h => {
                const isSel = selectedHabits.includes(h.id);
                return (
                  <div key={h.id} className={`habit-card${isSel ? " selected" : ""}`} onClick={() => toggleSelectHabit(h.id)}>
                    <div className="habit-card-icon">{h.icon}</div>
                    <div className="habit-card-info"><div className="habit-card-name">{h.name}</div><div className="habit-card-sub">{h.sub}</div></div>
                    <div className="habit-card-check">{isSel && <div className="habit-card-check-dot" />}</div>
                  </div>
                );
              })}
            </div>
            <button className="btn-primary" disabled={selectedHabits.length < 5 || creating} onClick={startChallenge}>
              {creating ? "Starting..." : selectedHabits.length < 5 ? `Pick ${remaining} more habit${remaining !== 1 ? "s" : ""}` : `Lock In ${selectedHabits.length} Habits`}
            </button>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-faint)", cursor: "pointer" }}
                onClick={() => { setSelecting(false); setSelectedHabits([]); }}>← Back</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Active Challenge — Computed Stats ──
  const startDay = challengeData.startDay || 1;
  const challengeDay = viewingDay - startDay + 1;
  const challengeDays = totalDays - startDay + 1;
  const isViewingToday = viewingDay === dayOfMonth;
  const dateObj = new Date(currentYear, currentMonth - 1, viewingDay);
  const weekdayLabel = WEEKDAYS[dateObj.getDay()];
  const dayData = getDayData(viewingDay);
  const allDone = challengeData.habits.every(hId =>
    dayData.checked.includes(hId) || dayData.rested.includes(hId) || dayData.missed.includes(hId)
  );

  // Dashboard stats
  const activeDays = dayOfMonth - startDay + 1;
  const targetPerHabit = getTargetDays(activeDays);
  const habitStats = challengeData.habits.map(hId => {
    let completed = 0, rested = 0, missed = 0;
    for (let d = startDay; d <= dayOfMonth; d++) {
      const dd = getDayData(d);
      if (dd.checked.includes(hId)) completed++;
      else if (dd.rested.includes(hId)) rested++;
      else if (dd.missed.includes(hId)) missed++;
    }
    return { hId, completed, rested, missed, total: completed + rested, pct: targetPerHabit > 0 ? Math.round(((completed + rested) / targetPerHabit) * 100) : 0 };
  });
  const overallPct = habitStats.length > 0 ? Math.round(habitStats.reduce((sum, h) => sum + h.pct, 0) / habitStats.length) : 0;
  const currentTier = TIERS.find(t => overallPct >= t.pct) || null;

  return (
    <div className="challenge-screen">
      {/* Tab toggle */}
      <div className="ch-tab-bar">
        <button className={`ch-tab${challengeView === "today" ? " ch-tab-active" : ""}`}
          onClick={() => setChallengeView("today")}>Today</button>
        <button className={`ch-tab${challengeView === "dashboard" ? " ch-tab-active" : ""}`}
          onClick={() => setChallengeView("dashboard")}>Dashboard</button>
        <button className={`ch-tab${challengeView === "results" ? " ch-tab-active" : ""}`}
          onClick={() => setChallengeView("results")}>Results</button>
      </div>

      {challengeView === "results" ? (
        /* ── Results View ── */
        (() => {
          const isMonthOver = dayOfMonth >= totalDays;
          const resultDays = isMonthOver ? totalDays - startDay + 1 : activeDays;
          const resultTarget = getTargetDays(resultDays);

          // Final habit stats (use full month if over, else current progress)
          const finalStats = challengeData.habits.map(hId => {
            let completed = 0, rested = 0, missed = 0, unlogged = 0;
            const endDay = isMonthOver ? totalDays : dayOfMonth;
            for (let d = startDay; d <= endDay; d++) {
              const dd = getDayData(d);
              if (dd.checked.includes(hId)) completed++;
              else if (dd.rested.includes(hId)) rested++;
              else if (dd.missed.includes(hId)) missed++;
              else unlogged++;
            }
            const pct = resultTarget > 0 ? Math.round(((completed + rested) / resultTarget) * 100) : 0;
            return { hId, completed, rested, missed, unlogged, pct };
          });

          const finalOverall = finalStats.length > 0 ? Math.round(finalStats.reduce((s, h) => s + h.pct, 0) / finalStats.length) : 0;
          const finalTier = TIERS.find(t => finalOverall >= t.pct) || null;

          // Best and worst habit
          const sorted = [...finalStats].sort((a, b) => b.pct - a.pct);
          const bestHabit = sorted[0] ? HABITS.find(h => h.id === sorted[0].hId) : null;
          const worstHabit = sorted[sorted.length - 1] ? HABITS.find(h => h.id === sorted[sorted.length - 1].hId) : null;
          const perfectDays = (() => {
            let count = 0;
            const endDay = isMonthOver ? totalDays : dayOfMonth;
            for (let d = startDay; d <= endDay; d++) {
              const dd = getDayData(d);
              const allLogged = challengeData.habits.every(hId => dd.checked.includes(hId) || dd.rested.includes(hId) || dd.missed.includes(hId));
              const allDoneOrRested = challengeData.habits.every(hId => dd.checked.includes(hId) || dd.rested.includes(hId));
              if (allLogged && allDoneOrRested) count++;
            }
            return count;
          })();

          return (
            <>
              {!isMonthOver && (
                <div style={{ textAlign: "center", padding: "8px 12px", background: "rgba(196,168,106,0.08)", borderRadius: 8, marginBottom: 16 }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>Preview — month isn't over yet. {totalDays - dayOfMonth} day{totalDays - dayOfMonth !== 1 ? "s" : ""} remaining.</div>
                </div>
              )}

              {/* ── Share Card ── */}
              <div className="ch-share-card" id="ch-share-card">
                <div className="ch-share-brand mono">MANTL · CHALLENGE</div>

                <div className="ch-results-hero">
                  <div className="ch-results-tier-icon">{finalTier ? finalTier.icon : "📊"}</div>
                  <div className="ch-results-month bb">{MONTH_NAMES[currentMonth]} {currentYear}</div>
                  <div className="ch-results-tier-name bb">
                    {finalTier ? finalTier.name : isMonthOver ? "Incomplete" : "In Progress"}
                  </div>
                </div>

                <div className="ch-results-ring-wrap">
                  <svg viewBox="0 0 120 120" width="110" height="110">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={finalOverall >= 100 ? "#7A9A6A" : finalOverall >= 85 ? "#C4A86A" : "var(--accent-terra)"}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${Math.min(finalOverall, 120) * 3.14} 314`}
                      transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
                  </svg>
                  <div className="ch-results-ring-label">
                    <div className="bb" style={{ fontSize: 32, color: "var(--text-primary)" }}>{finalOverall}%</div>
                  </div>
                </div>

                <div className="ch-results-stats-row" style={{ border: "none", background: "transparent", padding: "0 8px", marginBottom: 12 }}>
                  <div className="ch-results-stat">
                    <div className="ch-results-stat-num bb">{resultDays}</div>
                    <div className="ch-results-stat-label mono">Days</div>
                  </div>
                  <div className="ch-results-stat">
                    <div className="ch-results-stat-num bb">{perfectDays}</div>
                    <div className="ch-results-stat-label mono">Perfect</div>
                  </div>
                  <div className="ch-results-stat">
                    <div className="ch-results-stat-num bb">{challengeData.habits.length}</div>
                    <div className="ch-results-stat-label mono">Habits</div>
                  </div>
                  <div className="ch-results-stat">
                    <div className="ch-results-stat-num bb">{resultTarget}</div>
                    <div className="ch-results-stat-label mono">Target</div>
                  </div>
                </div>

                {/* Compact habit results inside share card */}
                <div className="ch-share-habits">
                  {finalStats.map(stat => {
                    const habit = HABITS.find(h => h.id === stat.hId);
                    if (!habit) return null;
                    const barColor = stat.pct >= 100 ? "#7A9A6A" : stat.pct >= 85 ? "#C4A86A" : stat.pct >= 50 ? "var(--accent-terra)" : "#C47A6A";
                    return (
                      <div key={stat.hId} className="ch-share-habit-row">
                        <span style={{ fontSize: 14 }}>{habit.icon}</span>
                        <span className="bb" style={{ fontSize: 12, flex: 1, color: "var(--text-primary)" }}>{habit.name}</span>
                        <div className="ch-share-habit-bar">
                          <div className="ch-share-habit-bar-fill" style={{ width: `${Math.min(100, stat.pct)}%`, background: barColor }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: barColor, width: 36, textAlign: "right" }}>{stat.pct}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="ch-share-footer">
                  <div className="ch-share-tagline" style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 11, color: "var(--text-muted)" }}>
                    Consistency beats perfection
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.08em" }}>mymantl.app</div>
                </div>
              </div>

              {/* Share section */}
              <div className="ch-share-actions">
                <div className="ch-share-mode-toggle">
                  <button className={`ch-share-mode${shareMode === "card" ? " active" : ""}`}
                    onClick={() => setShareMode("card")}>Card</button>
                  <button className={`ch-share-mode${shareMode === "overlay" ? " active" : ""}`}
                    onClick={() => setShareMode("overlay")}>Overlay</button>
                </div>
                <div className="ch-share-preview">
                  {shareMode === "overlay" && (
                    <div className="ch-share-overlay-hint mono">Transparent PNG · layer on your own photo</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ flex: 1 }}
                    onClick={() => generateShareImage(shareMode, false, { finalOverall, finalTier, finalStats, challengeData, perfectDays, resultDays, resultTarget, currentMonth, currentYear, MONTH_NAMES })}>
                    📥 Save Image
                  </button>
                  <button className="btn-primary" style={{ flex: 1, background: "var(--accent-green)", color: "#0a0a0a" }}
                    onClick={() => generateShareImage(shareMode, true, { finalOverall, finalTier, finalStats, challengeData, perfectDays, resultDays, resultTarget, currentMonth, currentYear, MONTH_NAMES })}>
                    📤 Share
                  </button>
                </div>
              </div>

              {/* ── Detailed Breakdown (below share card) ── */}

              {bestHabit && worstHabit && bestHabit.id !== worstHabit.id && (
                <div className="ch-results-highlights">
                  <div className="ch-results-highlight">
                    <span style={{ fontSize: 18 }}>{bestHabit.icon}</span>
                    <div>
                      <div className="bb" style={{ fontSize: 13, color: "#7A9A6A" }}>Strongest</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{bestHabit.name} · {sorted[0].pct}%</div>
                    </div>
                  </div>
                  <div className="ch-results-highlight">
                    <span style={{ fontSize: 18 }}>{worstHabit.icon}</span>
                    <div>
                      <div className="bb" style={{ fontSize: 13, color: "var(--accent-terra)" }}>Needs work</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{worstHabit.name} · {sorted[sorted.length - 1].pct}%</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="ch-dash-section-label mono" style={{ marginTop: 16 }}>FULL BREAKDOWN</div>
              <div className="ch-dash-habit-list">
                {finalStats.map(stat => {
                  const habit = HABITS.find(h => h.id === stat.hId);
                  if (!habit) return null;
                  const barColor = stat.pct >= 100 ? "#7A9A6A" : stat.pct >= 85 ? "#C4A86A" : stat.pct >= 50 ? "var(--accent-terra)" : "#C47A6A";
                  return (
                    <div key={stat.hId} className="ch-dash-habit-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{habit.icon}</span>
                        <span className="bb" style={{ fontSize: 14, flex: 1, color: "var(--text-primary)" }}>{habit.name}</span>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{stat.pct}%</span>
                      </div>
                      <div className="ch-dash-habit-bar">
                        <div className="ch-dash-habit-bar-fill" style={{ width: `${Math.min(120, stat.pct)}%`, background: barColor }} />
                        <div className="ch-dash-habit-bar-target" />
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 3 }}>
                        {stat.completed} done · {stat.rested} rest · {stat.missed} missed{stat.unlogged > 0 ? ` · ${stat.unlogged} unlogged` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ch-dash-section-label mono" style={{ marginTop: 16 }}>TIER ACHIEVED</div>
              <div className="ch-dash-tiers">
                {TIERS.slice().reverse().map(tier => (
                  <div key={tier.name} className={`ch-dash-tier-row${finalOverall >= tier.pct ? " ch-tier-met" : ""}`}>
                    <span style={{ fontSize: 14 }}>{tier.icon}</span>
                    <span className="mono" style={{ fontSize: 11, flex: 1 }}>{tier.name}</span>
                    <span className="mono" style={{ fontSize: 11 }}>{tier.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()
      ) : challengeView === "dashboard" ? (
        <>
          <div className="ch-dash-header">
            <div className="ch-dash-month bb">{MONTH_NAMES[currentMonth]} {currentYear}</div>
            <div className="ch-dash-days mono">Day {activeDays} · Target: {targetPerHabit} per habit</div>
          </div>

          <div className="ch-dash-score-card">
            <div className="ch-dash-score-ring">
              <svg viewBox="0 0 100 100" width="100" height="100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--cream-dark)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={overallPct >= 100 ? "#7A9A6A" : overallPct >= 85 ? "#C4A86A" : "var(--accent-terra)"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${Math.min(overallPct, 120) * 2.64} 264`}
                  transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 0.5s ease" }} />
              </svg>
              <div className="ch-dash-score-pct">
                <div className="bb" style={{ fontSize: 28, color: "var(--text-primary)" }}>{overallPct}%</div>
              </div>
            </div>
            <div className="ch-dash-score-info">
              {currentTier ? (
                <>
                  <div className="bb" style={{ fontSize: 18, color: "var(--text-primary)" }}>{currentTier.icon} {currentTier.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>Current tier</div>
                </>
              ) : (
                <>
                  <div className="bb" style={{ fontSize: 16, color: "var(--text-muted)" }}>Keep going!</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>Hit 5/7 days for Complete</div>
                </>
              )}
            </div>
          </div>

          <div className="ch-dash-tiers">
            {TIERS.slice().reverse().map(tier => (
              <div key={tier.name} className={`ch-dash-tier-row${overallPct >= tier.pct ? " ch-tier-met" : ""}`}>
                <span style={{ fontSize: 14 }}>{tier.icon}</span>
                <span className="mono" style={{ fontSize: 11, flex: 1 }}>{tier.name}</span>
                <span className="mono" style={{ fontSize: 11 }}>{tier.pct}%</span>
              </div>
            ))}
          </div>

          <div className="ch-dash-section-label mono">HABIT BREAKDOWN</div>
          <div className="ch-dash-habit-list">
            {habitStats.map(stat => {
              const habit = HABITS.find(h => h.id === stat.hId);
              if (!habit) return null;
              const barColor = stat.pct >= 100 ? "#7A9A6A" : stat.pct >= 85 ? "#C4A86A" : stat.pct >= 50 ? "var(--accent-terra)" : "#C47A6A";
              return (
                <div key={stat.hId} className="ch-dash-habit-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{habit.icon}</span>
                    <span className="bb" style={{ fontSize: 14, flex: 1, color: "var(--text-primary)" }}>{habit.name}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{stat.pct}%</span>
                  </div>
                  <div className="ch-dash-habit-bar">
                    <div className="ch-dash-habit-bar-fill" style={{ width: `${Math.min(120, stat.pct)}%`, background: barColor }} />
                    <div className="ch-dash-habit-bar-target" />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 3 }}>
                    {stat.completed} done · {stat.rested} rest · {stat.missed} missed · target {targetPerHabit}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Day Header */}
      <div className="challenge-day-header">
        <button className="challenge-day-nav" onClick={() => { setViewingDay(v => Math.max(startDay, v - 1)); setExpandedHabit(null); }}
          disabled={viewingDay <= startDay} style={{ opacity: viewingDay <= startDay ? 0.2 : 1 }}>‹</button>
        <div className="challenge-day-center">
          <div className="challenge-day-weekday mono">{weekdayLabel}</div>
          <div className="challenge-day-date bb">{MONTH_NAMES[currentMonth].slice(0, 3)} {viewingDay}</div>
          <div className="challenge-day-of mono">Day {challengeDay} of {challengeDays}</div>
        </div>
        <button className="challenge-day-nav" onClick={() => { setViewingDay(v => Math.min(dayOfMonth, v + 1)); setExpandedHabit(null); }}
          disabled={viewingDay >= dayOfMonth} style={{ opacity: viewingDay >= dayOfMonth ? 0.2 : 1 }}>›</button>
      </div>

      {!isViewingToday && (
        <div className="challenge-past-banner" onClick={() => { setViewingDay(dayOfMonth); setExpandedHabit(null); }}>
          <span className="mono">Viewing past day</span>
          <span className="mono" style={{ color: "var(--accent-green)", cursor: "pointer" }}>→ Today</span>
        </div>
      )}

      {/* Progress */}
      <div className="challenge-progress-row">
        <div className="challenge-progress-bar" style={{ flex: 1 }}>
          <div className="challenge-progress-fill" style={{ width: `${Math.min(100, (challengeDay / challengeDays) * 100)}%` }} />
        </div>
        <div className="challenge-done-count mono">
          {dayData.checked.length}<span style={{ color: "var(--text-faint)" }}>/{challengeData.habits.length}</span>
        </div>
      </div>

      {/* Habit Cards */}
      <div className="challenge-habit-list">
        {challengeData.habits.map(hId => {
          const habit = HABITS.find(h => h.id === hId);
          if (!habit) return null;
          const isDone = dayData.checked.includes(hId);
          const isRested = dayData.rested.includes(hId);
          const isMissed = dayData.missed.includes(hId);
          const stateClass = isDone ? " ch-done" : isRested ? " ch-rested" : isMissed ? " ch-missed" : "";
          const isExpanded = expandedHabit === hId && isDone;

          // Determine subtitle based on integrations
          const isReading = hId === 4;
          const isEvent = hId === 1;
          const isWorkout = hId === 2;
          const isLearn = hId === 7;
          const book = books[hId];
          const goal = goals[hId] || goals[hId === 1 ? 1 : hId === 2 ? 2 : null];
          const learn = learnTopics[hId];

          let subtitle = habit.sub;
          if (isReading && book && !isExpanded) {
            subtitle = `${book.title} · p${book.currentPage}/${book.totalPages}`;
          } else if ((isEvent || isWorkout) && goal && !isExpanded) {
            const daysLeft = getDaysUntil(goal.targetDate);
            subtitle = goal.name + (goal.location ? ` · ${goal.location}` : "") + (daysLeft != null && daysLeft > 0 ? ` · ${daysLeft}d` : "");
          } else if (isLearn && learn && !isExpanded) {
            subtitle = learn.topic;
          }

          return (
            <div key={hId} className={`ch-card-wrap${isExpanded ? " ch-expanded" : ""}`}>
              <div className={`challenge-daily-card${stateClass}`} onClick={() => handleCardClick(hId)}>
                <div className="challenge-daily-icon">{habit.icon}</div>
                <div className="challenge-daily-info">
                  <div className="challenge-daily-name">{habit.name}</div>
                  <div className="challenge-daily-sub">{subtitle}</div>
                  {isReading && book && !isExpanded && (
                    <div className="ch-book-mini-bar">
                      <div className="ch-book-mini-fill" style={{ width: `${Math.round((book.currentPage / book.totalPages) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className="challenge-daily-status" onClick={(e) => handleCheckClick(e, hId)}>
                  {isDone && <div className="ch-check-dot" />}
                  {isRested && <div className="ch-rest-mark">–</div>}
                  {isMissed && <div className="ch-miss-mark">✕</div>}
                </div>
                {isRested && <div className="ch-overlay-label mono">REST DAY</div>}
                {isMissed && <div className="ch-overlay-label ch-missed-label mono">MISSED</div>}
              </div>

              {/* ── Expanded panels ── */}
              {isExpanded && (
                <div className="ch-expand-panel" onClick={(e) => e.stopPropagation()}>

                  {/* Reading: book setup or page tracking */}
                  {isReading && !book && (
                    <div className="ch-panel-inner">
                      {!bookForm.title && !bookManualEntry ? (
                        /* Search mode */
                        <>
                          <div className="ch-panel-label mono">What are you reading?</div>
                          <input className="ch-input mono" placeholder="Search for a book..." value={bookSearchQuery}
                            onChange={e => handleBookSearch(e.target.value)} autoFocus />
                          {bookSearching && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>Searching...</div>}
                          {bookSearchResults.length > 0 && (
                            <div className="ch-book-results">
                              {bookSearchResults.map((r, i) => (
                                <div key={i} className="ch-book-result" onClick={() => selectBookResult(r)}>
                                  {r.cover ? <img src={r.cover} alt="" className="ch-book-result-cover" /> : <div className="ch-book-result-cover ch-book-no-cover">📖</div>}
                                  <div className="ch-book-result-info">
                                    <div className="bb" style={{ fontSize: 13, color: "var(--text-primary)" }}>{r.title}</div>
                                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{r.author}{r.pages ? ` · ${r.pages}p` : ""}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", cursor: "pointer", marginTop: 4 }}
                            onClick={() => setBookManualEntry(true)}>Can't find it? Enter manually →</div>
                        </>
                      ) : bookForm.title && !bookManualEntry ? (
                        /* Selected from search — confirm */
                        <>
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 6 }}>
                            {bookForm.cover && <img src={bookForm.cover} alt="" style={{ width: 40, borderRadius: 4 }} />}
                            <div style={{ flex: 1 }}>
                              <div className="bb" style={{ fontSize: 14, color: "var(--text-primary)" }}>{bookForm.title}</div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{bookForm.author}{bookForm.totalPages ? ` · ${bookForm.totalPages} pages` : ""}</div>
                            </div>
                            <span className="mono" style={{ fontSize: 10, color: "var(--accent-green)", cursor: "pointer", flexShrink: 0 }}
                              onClick={() => { setBookForm({ title: "", author: "", totalPages: "", currentPage: "", cover: null }); setBookSearchQuery(""); }}>Change</span>
                          </div>
                          {!bookForm.totalPages && (
                            <input className="ch-input mono" placeholder="Total pages" type="number" value={bookForm.totalPages}
                              onChange={e => setBookForm(f => ({ ...f, totalPages: e.target.value }))} />
                          )}
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>Current page:</span>
                            <input className="ch-input mono" placeholder="0" type="number" value={bookForm.currentPage}
                              onChange={e => setBookForm(f => ({ ...f, currentPage: e.target.value }))} style={{ flex: 1 }} />
                          </div>
                          <button className="btn-primary" style={{ marginTop: 4 }} disabled={!bookForm.title || !bookForm.totalPages}
                            onClick={() => setupBook(hId)}>Start Tracking</button>
                        </>
                      ) : (
                        /* Manual entry */
                        <>
                          <div className="ch-panel-label mono">Enter book details</div>
                          <input className="ch-input mono" placeholder="Book title" value={bookForm.title}
                            onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} autoFocus />
                          <input className="ch-input mono" placeholder="Author" value={bookForm.author}
                            onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <input className="ch-input mono" placeholder="Total pages" type="number" value={bookForm.totalPages}
                              onChange={e => setBookForm(f => ({ ...f, totalPages: e.target.value }))} style={{ flex: 1 }} />
                            <input className="ch-input mono" placeholder="Current page" type="number" value={bookForm.currentPage}
                              onChange={e => setBookForm(f => ({ ...f, currentPage: e.target.value }))} style={{ flex: 1 }} />
                          </div>
                          <button className="btn-primary" style={{ marginTop: 4 }} disabled={!bookForm.title || !bookForm.totalPages}
                            onClick={() => setupBook(hId)}>Start Tracking</button>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", cursor: "pointer" }}
                            onClick={() => { setBookManualEntry(false); setBookForm({ title: "", author: "", totalPages: "", currentPage: "", cover: null }); }}>← Back to search</div>
                        </>
                      )}
                    </div>
                  )}

                  {isReading && book && (
                    <div className="ch-panel-inner">
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                        {book.cover && <img src={book.cover} alt="" style={{ width: 40, borderRadius: 4 }} />}
                        <div>
                          <div className="bb" style={{ fontSize: 14, color: "var(--text-primary)" }}>{book.title}</div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{book.author}</div>
                        </div>
                      </div>
                      <div className="ch-book-progress-bar">
                        <div className="ch-book-progress-fill" style={{ width: `${Math.round((book.currentPage / book.totalPages) * 100)}%` }} />
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                        {book.currentPage} / {editTotalPages !== null ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <input className="ch-input mono" type="number" value={editTotalPages}
                              onChange={e => setEditTotalPages(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") updateTotalPages(hId); }}
                              onBlur={() => updateTotalPages(hId)}
                              style={{ width: 60, padding: "2px 6px", fontSize: 11, display: "inline-block" }} autoFocus />
                          </span>
                        ) : (
                          <span onClick={() => setEditTotalPages(String(book.totalPages))}
                            style={{ cursor: "pointer", borderBottom: "1px dashed var(--text-faint)" }}>{book.totalPages}</span>
                        )} pages · {Math.round((book.currentPage / book.totalPages) * 100)}%
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>Page:</span>
                        <input className="ch-input mono" type="number" value={pageInput}
                          onChange={e => setPageInput(e.target.value)} style={{ flex: 1 }} />
                        <button className="ch-btn-sm" onClick={() => updatePage(hId)}>Update</button>
                      </div>

                      {parseInt(pageInput) >= book.totalPages && (
                        <div style={{ marginTop: 12, padding: 14, background: "rgba(122,154,106,0.08)", border: "1px solid rgba(122,154,106,0.2)", borderRadius: 10 }}>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8, textAlign: "center" }}>Rate this book</div>
                          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} onClick={() => setBookRating(star)}
                                style={{ fontSize: 28, cursor: "pointer", color: star <= bookRating ? "var(--accent-gold)" : "var(--text-faint)", transition: "color 0.15s" }}>★</span>
                            ))}
                          </div>
                          <button className="btn-primary" style={{ width: "100%", background: "#7A9A6A" }} disabled={bookRating === 0}
                            onClick={() => finishBook(hId)}>
                            Finish · {bookRating > 0 ? "★".repeat(bookRating) : "Pick a rating"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event: goal setup or tracking */}
                  {isEvent && !goals[hId] && (
                    <div className="ch-panel-inner">
                      <div className="ch-panel-label mono">What event are you training for?</div>
                      <input className="ch-input mono" placeholder="e.g. Spartan Race, Marathon" value={goalForm.name}
                        onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                      <input className="ch-input mono" placeholder="Location · e.g. Austin, TX" value={goalForm.location}
                        onChange={e => setGoalForm(f => ({ ...f, location: e.target.value }))} />
                      <div className="ch-panel-label mono" style={{ marginTop: 4 }}>Pick an icon</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {["🏃", "🚴", "🏊", "⛰️", "🧗", "🏁", "🏋️", "🥊", "🏆", "🔥", "💎", "🎯"].map(e => (
                          <span key={e} onClick={() => setGoalForm(f => ({ ...f, emoji: e }))}
                            style={{ fontSize: 20, cursor: "pointer", padding: "3px 5px", borderRadius: 6,
                              background: goalForm.emoji === e ? "rgba(74,222,128,0.1)" : "transparent",
                              border: goalForm.emoji === e ? "1px solid var(--accent-green)" : "1px solid transparent" }}>{e}</span>
                        ))}
                      </div>
                      <input className="ch-input mono" type="date" value={goalForm.targetDate}
                        onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" style={{ flex: 1 }} disabled={!goalForm.name} onClick={() => setupGoal(hId)}>Set Event</button>
                        <button className="ch-btn-sm" style={{ flex: 1 }} onClick={() => setExpandedHabit(null)}>Skip</button>
                      </div>
                    </div>
                  )}

                  {isEvent && goals[hId] && (
                    <div className="ch-panel-inner">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{goals[hId].emoji || "🏁"}</span>
                        <div>
                          <div className="bb" style={{ fontSize: 14, color: "var(--text-primary)" }}>{goals[hId].name}</div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                            {goals[hId].location || ""}{goals[hId].targetDate ? ` · ${getDaysUntil(goals[hId].targetDate)}d away` : ""}
                          </div>
                        </div>
                      </div>
                      <button className="btn-primary" style={{ width: "100%", background: "#7A9A6A" }} onClick={() => crushGoal(hId)}>
                        🏆 Crush This Goal
                      </button>
                    </div>
                  )}

                  {/* Workout: goal setup (no location) */}
                  {isWorkout && !goals[hId] && (
                    <div className="ch-panel-inner">
                      <div className="ch-panel-label mono">Set a training goal (optional)</div>
                      <input className="ch-input mono" placeholder="e.g. Bench 100kg, Run a 5K" value={goalForm.name}
                        onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                      <div className="ch-panel-label mono" style={{ marginTop: 4 }}>Pick an icon</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {["🏃", "🏋️", "🚴", "🏊", "⛰️", "🥊", "🧗", "🎯", "🏆", "⚡", "🔥", "💎"].map(e => (
                          <span key={e} onClick={() => setGoalForm(f => ({ ...f, emoji: e }))}
                            style={{ fontSize: 20, cursor: "pointer", padding: "3px 5px", borderRadius: 6,
                              background: goalForm.emoji === e ? "rgba(74,222,128,0.1)" : "transparent",
                              border: goalForm.emoji === e ? "1px solid var(--accent-green)" : "1px solid transparent" }}>{e}</span>
                        ))}
                      </div>
                      <input className="ch-input mono" type="date" placeholder="Target date (optional)" value={goalForm.targetDate}
                        onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" style={{ flex: 1 }} disabled={!goalForm.name} onClick={() => setupGoal(hId)}>Set Goal</button>
                        <button className="ch-btn-sm" style={{ flex: 1 }} onClick={() => setExpandedHabit(null)}>Skip</button>
                      </div>
                    </div>
                  )}

                  {isWorkout && goals[hId] && (
                    <div className="ch-panel-inner">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{goals[hId].emoji || "🎯"}</span>
                        <div>
                          <div className="bb" style={{ fontSize: 14, color: "var(--text-primary)" }}>{goals[hId].name}</div>
                          {goals[hId].targetDate && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{getDaysUntil(goals[hId].targetDate)}d away</div>}
                        </div>
                      </div>
                      <button className="btn-primary" style={{ width: "100%", background: "#7A9A6A" }} onClick={() => crushGoal(hId)}>
                        🏆 Crush This Goal
                      </button>
                    </div>
                  )}

                  {/* Learn: topic setup */}
                  {isLearn && !learn && (
                    <div className="ch-panel-inner">
                      <div className="ch-panel-label mono">What are you learning?</div>
                      <input className="ch-input mono" placeholder="e.g. Spanish, Piano, TypeScript" value={learnInput}
                        onChange={e => setLearnInput(e.target.value)} autoFocus />
                      <button className="btn-primary" style={{ marginTop: 4 }} disabled={!learnInput.trim()} onClick={() => setupLearn(hId)}>
                        Start Learning
                      </button>
                    </div>
                  )}

                  {isLearn && learn && (
                    <div className="ch-panel-inner">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>🎓</span>
                        <div className="bb" style={{ fontSize: 14, color: "var(--text-primary)" }}>{learn.topic}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="ch-btn-sm" style={{ flex: 1, background: "#7A9A6A", color: "white", border: "none" }} onClick={() => finishLearn(hId)}>
                          ✓ Done with this topic
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && isViewingToday && (
        <div className="challenge-all-done"><span>✓ All logged for today</span></div>
      )}

      {saving && (
        <div style={{ textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "var(--text-faint)", marginTop: 8 }}>Saving...</div>
      )}
        </>
      )}
    </div>
  );
}


export default ChallengeScreen;

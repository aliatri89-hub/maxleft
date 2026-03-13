import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import { getDaysInMonth } from "../utils/constants";
import { searchTMDB, searchGoogleBooks, fetchTMDBDetails, sb } from "../utils/api";

function TrackScreen({ session, onToast, onRefreshShelf, onAutoComplete, refreshKey }) {
  const [trackerData, setTrackerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({});
  const [viewingDay, setViewingDay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedHabit, setExpandedHabit] = useState(null);

  // Setup flow
  const [setupPhase, setSetupPhase] = useState(null); // null | "categories" | "customize"
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [slideDir, setSlideDir] = useState(null); // "forward" | "back" | null
  const slideCounter = useRef(0);
  const [buildingHabits, setBuildingHabits] = useState([]); // [{id, name, emoji, category, sub}]
  const [customInput, setCustomInput] = useState("");
  const [creating, setCreating] = useState(false);

  // Sub-tracking (books, goals, learn) — reuse ChallengeScreen patterns
  const [books, setBooks] = useState({});
  const [bookForm, setBookForm] = useState({ title: "", author: "", totalPages: "", currentPage: "", cover: null });
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookSearchResults, setBookSearchResults] = useState([]);
  const [bookSearching, setBookSearching] = useState(false);
  const [bookManualEntry, setBookManualEntry] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [editTotalPages, setEditTotalPages] = useState(null);
  const [bookRating, setBookRating] = useState(0);
  const [goals, setGoals] = useState({});
  const [goalForm, setGoalForm] = useState({ name: "", targetDate: "", emoji: "", location: "" });
  const [existingEvents, setExistingEvents] = useState([]); // active workout_goals not linked to current habits
  const [existingBooks, setExistingBooks] = useState([]); // active books from shelf not linked to current habits
  const [learnTopics, setLearnTopics] = useState({});
  const [learnInput, setLearnInput] = useState("");

  // Watching sub-tracking (TMDB)
  const [watchSearchQuery, setWatchSearchQuery] = useState("");
  const [watchSearchResults, setWatchSearchResults] = useState([]);
  const [watchSearching, setWatchSearching] = useState(false);
  const [watchSelected, setWatchSelected] = useState(null); // { tmdbId, title, year, poster, type }
  const [watchRating, setWatchRating] = useState(0);
  const [watchNotes, setWatchNotes] = useState("");
  const [watchType, setWatchType] = useState("movie"); // "movie" | "tv"
  const [recentFilms, setRecentFilms] = useState([]); // recent movies for quick-select
  const [todayFilm, setTodayFilm] = useState(null); // movie logged today (for auto-complete confirmation)
  const [todayShow, setTodayShow] = useState(null); // show episode logged today

  // Editing habits
  const [isEditing, setIsEditing] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingHabitName, setEditingHabitName] = useState("");
  const editInputRef = useRef(null);

  // Drag-to-reorder
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragRefs = useRef({ startY: 0, startIdx: -1, timer: null });
  const habitListRef = useRef(null);

  // Block scroll during drag with passive:false native listener
  useEffect(() => {
    const el = habitListRef.current;
    if (!el || dragIdx === null) return;
    const handler = (e) => { if (dragIdx !== null) e.preventDefault(); };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, [dragIdx]);

  // Monthly goals
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [goalProgress, setGoalProgress] = useState({});
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalType, setNewGoalType] = useState(null);
  const [newGoalTarget, setNewGoalTarget] = useState("1");
  const [newGoalCustomTitle, setNewGoalCustomTitle] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);
  const [currentMonthCounts, setCurrentMonthCounts] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // View mode
  const [trackView, setTrackView] = useState("today"); // "today" | "streaks"

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

  // ── Load tracker data ──
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: challenge } = await supabase
        .from("monthly_challenges")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();

      if (challenge && challenge.habits && typeof challenge.habits[0] === "object") {
        // New-style tracker with enriched habit objects
        setTrackerData({
          id: challenge.id, habits: challenge.habits,
          startDay: challenge.start_day || 1, month: challenge.month, year: challenge.year,
        });
        setMonthlyGoals(challenge.monthly_goals || []);

        const [logsRes, booksRes, goalsRes] = await Promise.all([
          supabase.from("daily_logs").select("date, habit_id, status").eq("challenge_id", challenge.id),
          supabase.from("books").select("id, habit_id, title, author, total_pages, current_page, cover_url").eq("user_id", session.user.id).eq("is_active", true),
          supabase.from("workout_goals").select("id, habit_id, name, target_date, emoji, location").eq("user_id", session.user.id).eq("is_active", true),
        ]);

        const hist = {};
        (logsRes.data || []).forEach(log => {
          const day = new Date(log.date + "T12:00:00").getDate();
          if (!hist[day]) hist[day] = { checked: [], rested: [], missed: [] };
          if (log.status === "complete") hist[day].checked.push(log.habit_id);
          else if (log.status === "rest") hist[day].rested.push(log.habit_id);
          else if (log.status === "missed" || log.status === "skip") hist[day].missed.push(log.habit_id);
        });
        setHistory(hist);

        const booksMap = {};
        const learnMap = {};
        (booksRes.data || []).forEach(b => {
          if (b.habit_id >= 100) {
            booksMap[b.habit_id] = { title: b.title, author: b.author, totalPages: b.total_pages, currentPage: b.current_page, cover: b.cover_url, dbId: b.id };
          } else {
            booksMap[b.habit_id] = { title: b.title, author: b.author, totalPages: b.total_pages, currentPage: b.current_page, cover: b.cover_url, dbId: b.id };
          }
        });

        const goalsMap = {};
        (goalsRes.data || []).forEach(g => { goalsMap[g.habit_id] = { name: g.name, targetDate: g.target_date, emoji: g.emoji || "🎯", location: g.location, dbId: g.id }; });

        // Fallback: resolve links stored in challenge habits (if DB habit_id update failed due to constraint)
        (challenge.habits || []).forEach(h => {
          if (h.linkedBookDbId && !booksMap[h.id]) {
            const b = (booksRes.data || []).find(bk => bk.id === h.linkedBookDbId);
            if (b) booksMap[h.id] = { title: b.title, author: b.author, totalPages: b.total_pages, currentPage: b.current_page, cover: b.cover_url, dbId: b.id };
          }
          if (h.linkedGoalDbId && !goalsMap[h.id]) {
            const g = (goalsRes.data || []).find(gl => gl.id === h.linkedGoalDbId);
            if (g) goalsMap[h.id] = { name: g.name, targetDate: g.target_date, emoji: g.emoji || "🎯", location: g.location, dbId: g.id };
          }
        });

        setBooks(booksMap);
        setLearnTopics(learnMap);
        setGoals(goalsMap);

        setViewingDay(dayOfMonth);
      }
      setLoading(false);
    })();
  }, [session, currentMonth, currentYear]);

  // Re-fetch logs when auto-complete fires externally
  useEffect(() => {
    if (!trackerData || !session || refreshKey === 0) return;
    (async () => {
      const { data: logs } = await supabase.from("daily_logs")
        .select("date, habit_id, status").eq("challenge_id", trackerData.id);
      const hist = {};
      (logs || []).forEach(log => {
        const day = new Date(log.date + "T12:00:00").getDate();
        if (!hist[day]) hist[day] = { checked: [], rested: [], missed: [] };
        if (log.status === "complete") hist[day].checked.push(log.habit_id);
        else if (log.status === "rest") hist[day].rested.push(log.habit_id);
        else if (log.status === "missed" || log.status === "skip") hist[day].missed.push(log.habit_id);
      });
      setHistory(hist);
    })();
  }, [refreshKey]);

  // ── Monthly goal types ──
  const GOAL_TYPES = [
    { key: "books", label: "Finish books", emoji: "📖", unit: "book" },
    { key: "movies", label: "Watch movies", emoji: "🎬", unit: "movie" },
    { key: "shows", label: "Finish shows", emoji: "📺", unit: "show" },
    { key: "games", label: "Beat games", emoji: "🎮", unit: "game" },
    { key: "countries", label: "Visit countries", emoji: "🌍", unit: "country" },
    { key: "trophies", label: "Complete events", emoji: "🏆", unit: "event" },
    { key: "custom", label: "Custom goal", emoji: "✏️", unit: "goal" },
  ];

  const computeGoalProgress = useCallback(async () => {
    if (!session || monthlyGoals.length === 0) { setGoalProgress({}); return; }
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDay = getDaysInMonth(currentYear, currentMonth);
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}T23:59:59`;

    const typesNeeded = [...new Set(monthlyGoals.map(g => g.type))];
    const counts = {};

    const queries = [];
    if (typesNeeded.includes("books")) {
      queries.push(
        supabase.from("books").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id).eq("is_active", false).neq("habit_id", 7)
          .gte("finished_at", startDate).lte("finished_at", endDate)
          .then(r => { counts.books = r.count || 0; })
      );
    }
    if (typesNeeded.includes("movies")) {
      queries.push(
        supabase.from("movies").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .gte("watched_at", startDate).lte("watched_at", endDate)
          .then(r => { counts.movies = r.count || 0; })
      );
    }
    if (typesNeeded.includes("shows")) {
      queries.push(
        supabase.from("shows").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id).eq("status", "finished")
          .gte("created_at", startDate).lte("created_at", endDate)
          .then(r => { counts.shows = r.count || 0; })
      );
    }
    if (typesNeeded.includes("games")) {
      queries.push(
        supabase.from("games").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id).eq("status", "beat")
          .gte("created_at", startDate).lte("created_at", endDate)
          .then(r => { counts.games = r.count || 0; })
      );
    }
    if (typesNeeded.includes("countries")) {
      queries.push(
        supabase.from("countries").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id).eq("status", "been")
          .gte("created_at", startDate).lte("created_at", endDate)
          .then(r => { counts.countries = r.count || 0; })
      );
    }
    if (typesNeeded.includes("trophies")) {
      queries.push(
        supabase.from("workout_goals").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id).eq("is_active", false)
          .gte("completed_at", startDate).lte("completed_at", endDate)
          .then(r => { counts.trophies = r.count || 0; })
      );
    }
    await Promise.all(queries);

    const progress = {};
    monthlyGoals.forEach(g => {
      if (g.type === "custom") {
        progress[g.id] = { current: g.completed ? 1 : 0, completed: !!g.completed };
      } else {
        const current = counts[g.type] || 0;
        progress[g.id] = { current: Math.min(current, g.target), completed: current >= g.target };
      }
    });
    setGoalProgress(progress);
  }, [session, monthlyGoals, currentMonth, currentYear]);

  useEffect(() => { computeGoalProgress(); }, [computeGoalProgress]);

  const saveMonthlyGoals = async (goals) => {
    if (!trackerData || !session) return;
    setSavingGoals(true);
    const { error } = await supabase.from("monthly_challenges")
      .update({ monthly_goals: goals })
      .eq("id", trackerData.id)
      .eq("user_id", session.user.id);
    if (error) { console.error("Goal save error:", error); onToast("Couldn't save goal"); }
    setSavingGoals(false);
  };

  const fetchCurrentMonthCounts = async () => {
    if (!session) return;
    setLoadingCounts(true);
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const endDay = getDaysInMonth(currentYear, currentMonth);
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}T23:59:59`;

    const counts = {};
    await Promise.all([
      supabase.from("books").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id).eq("is_active", false).neq("habit_id", 7)
        .gte("finished_at", startDate).lte("finished_at", endDate)
        .then(r => { counts.books = r.count || 0; }),
      supabase.from("movies").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .gte("watched_at", startDate).lte("watched_at", endDate)
        .then(r => { counts.movies = r.count || 0; }),
      supabase.from("shows").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id).eq("status", "finished")
        .gte("created_at", startDate).lte("created_at", endDate)
        .then(r => { counts.shows = r.count || 0; }),
      supabase.from("games").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id).eq("status", "beat")
        .gte("created_at", startDate).lte("created_at", endDate)
        .then(r => { counts.games = r.count || 0; }),
      supabase.from("countries").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id).eq("status", "been")
        .gte("created_at", startDate).lte("created_at", endDate)
        .then(r => { counts.countries = r.count || 0; }),
      supabase.from("workout_goals").select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id).eq("is_active", false)
        .gte("completed_at", startDate).lte("completed_at", endDate)
        .then(r => { counts.trophies = r.count || 0; }),
    ]);
    setCurrentMonthCounts(counts);
    setLoadingCounts(false);
  };

  const addMonthlyGoal = async () => {
    if (!newGoalType) return;
    const goalType = GOAL_TYPES.find(t => t.key === newGoalType);
    const target = parseInt(newGoalTarget) || 1;
    const title = newGoalType === "custom"
      ? (newGoalCustomTitle.trim() || "Custom goal")
      : `${goalType.label}`;
    const newGoal = {
      id: Date.now(),
      title,
      emoji: goalType.emoji,
      type: newGoalType,
      target: newGoalType === "custom" ? 1 : target,
      completed: false,
    };
    const updated = [...monthlyGoals, newGoal];
    setMonthlyGoals(updated);
    await saveMonthlyGoals(updated);
    setShowAddGoal(false);
    setNewGoalType(null);
    setNewGoalTarget("1");
    setNewGoalCustomTitle("");
    setCurrentMonthCounts(null);
    onToast("Goal added!");
  };

  const removeMonthlyGoal = async (goalId) => {
    const updated = monthlyGoals.filter(g => g.id !== goalId);
    setMonthlyGoals(updated);
    await saveMonthlyGoals(updated);
  };

  const toggleCustomGoal = async (goalId) => {
    const updated = monthlyGoals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    setMonthlyGoals(updated);
    setGoalProgress(prev => ({
      ...prev,
      [goalId]: { current: !prev[goalId]?.completed ? 1 : 0, completed: !prev[goalId]?.completed },
    }));
    await saveMonthlyGoals(updated);
  };

  // ── Habit toggle ──
  const toggleHabitStatus = async (hId) => {
    if (!trackerData || !session) return;
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

    if (newStatus !== "complete" && expandedHabit === hId) setExpandedHabit(null);

    setSaving(true);
    const dateStr = getDateStr(viewingDay);
    try {
      if (newStatus) {
        await supabase.from("daily_logs").upsert(
          { challenge_id: trackerData.id, user_id: session.user.id, date: dateStr, habit_id: hId, status: newStatus },
          { onConflict: "challenge_id,date,habit_id" }
        );
      } else {
        await supabase.from("daily_logs").delete()
          .eq("challenge_id", trackerData.id).eq("date", dateStr).eq("habit_id", hId);
      }
    } catch (err) { console.error("Save error:", err); onToast("Couldn't save"); }
    setSaving(false);

    // ── Streak milestone detection ──
    if (newStatus === "complete") {
      const MILESTONES = [7, 14, 30, 60, 90];
      const habit = trackerData.habits.find(h => h.id === hId);
      if (!habit) return;

      // Query DB directly for reliable streak count (avoids stale closure from backfill)
      try {
        const { data: allLogs, error: logsErr } = await supabase.from("daily_logs")
          .select("date, habit_id, status").eq("challenge_id", trackerData.id).eq("habit_id", hId);


        // Build day→status map from DB
        const logsByDay = {};
        (allLogs || []).forEach(log => {
          const day = new Date(log.date + "T12:00:00").getDate();
          logsByDay[day] = log.status;
        });
        // Include the just-toggled day
        logsByDay[viewingDay] = "complete";


        let streak = 0;
        for (let d = viewingDay; d >= 1; d--) {
          if (logsByDay[d] === "complete" || logsByDay[d] === "rest") streak++;
          else break;
        }


        if (MILESTONES.includes(streak)) {
          const milestoneKey = `streak_${hId}_${streak}_${currentMonth}_${currentYear}`;
          const { data: existingMilestone } = await supabase
            .from("feed_activity").select("id").eq("user_id", session.user.id).eq("title", milestoneKey).maybeSingle();

          if (!existingMilestone) {
            await supabase.from("feed_activity").insert({
              user_id: session.user.id, activity_type: "streak", action: `${streak}-day streak`,
              title: milestoneKey, item_title: `${habit.emoji} ${habit.name}`,
              metadata: { habit_name: habit.name, habit_emoji: habit.emoji, habit_category: habit.category, streak_count: streak },
            });
            onToast(`🔥 ${streak}-day streak on ${habit.name}!`);
          }
        }
      } catch (e) { console.error("Streak milestone error:", e); }
    }
    if (onRefreshShelf) onRefreshShelf();
  };

  const handleCardClick = (hId) => {
    const dayData = getDayData(viewingDay);
    if (dayData.checked.includes(hId)) {
      if (expandedHabit === hId) setExpandedHabit(null);
      else {
        setExpandedHabit(hId);
        if (books[hId]) setPageInput(String(books[hId].currentPage || ""));
        setBookForm({ title: "", author: "", totalPages: "", currentPage: "", cover: null });
        setBookSearchQuery(""); setBookSearchResults([]); setBookManualEntry(false); setEditTotalPages(null);
        setGoalForm({ name: "", targetDate: "", emoji: "", location: "" });
        setLearnInput(learnTopics[hId]?.topic || "");
        setBookRating(0);
        setWatchSelected(null); setWatchSearchQuery(""); setWatchSearchResults([]); setWatchRating(0); setWatchNotes(""); setWatchType("movie");
        setTodayFilm(null);
        setTodayShow(null);
        // Load today's film/show + recent films for watching habits
        if (trackerData.habits.find(h => h.id === hId)?.category === "watching") {
          const habit = trackerData.habits.find(h => h.id === hId);
          const isShowHabit = /show/i.test(habit?.name || "");
          (async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            // Check for movie logged today
            const { data: todayMovies } = await supabase.from("movies")
              .select("tmdb_id, title, year, poster_url, director, rating, source, watched_at")
              .eq("user_id", session.user.id)
              .gte("watched_at", todayStr + "T00:00:00")
              .lte("watched_at", todayStr + "T23:59:59")
              .order("watched_at", { ascending: false })
              .limit(1);
            if (todayMovies?.length > 0) {
              const m = todayMovies[0];
              setTodayFilm({ title: m.title, year: m.year, poster: m.poster_url, director: m.director, rating: m.rating, source: m.source });
            }
            // Check for show episode logged today
            const { data: todayEps } = await supabase.from("watching_log")
              .select("id, show_id, season, episode_to, created_at")
              .eq("user_id", session.user.id)
              .gte("created_at", todayStr + "T00:00:00")
              .lte("created_at", todayStr + "T23:59:59")
              .order("created_at", { ascending: false })
              .limit(1);
            if (todayEps?.length > 0) {
              const ep = todayEps[0];
              // Get show details
              const { data: show } = await supabase.from("shows")
                .select("title, year, poster_url, current_season, current_episode")
                .eq("id", ep.show_id).maybeSingle();
              if (show) {
                setTodayShow({ title: show.title, year: show.year, poster: show.poster_url, season: ep.season, episode: ep.episode_to });
              }
            }
            // Still load recent films for fallback search
            if (!isShowHabit) {
              const { data: recent } = await supabase.from("movies")
                .select("tmdb_id, title, year, poster_url, director, source, watched_at")
                .eq("user_id", session.user.id)
                .order("watched_at", { ascending: false, nullsFirst: false })
                .limit(6);
              setRecentFilms((recent || []).map(m => ({
                tmdbId: m.tmdb_id, title: m.title, year: m.year,
                poster: m.poster_url, posterSmall: m.poster_url,
                type: "movie", source: m.source, alreadyShelved: true,
              })));
            }
          })();
        }
        // Load existing active events for training habits (avoid duplicates)
        const habit = trackerData.habits.find(h => h.id === hId);
        if (habit?.category === "training" && !goals[hId]) {
          (async () => {
            const trackerHabitIds = trackerData.habits.map(h => h.id);
            const linkedTrackerIds = trackerHabitIds.filter(id => !!goals[id]);
            const { data: events } = await supabase.from("workout_goals")
              .select("id, name, target_date, emoji, location, habit_id")
              .eq("user_id", session.user.id).eq("is_active", true)
              .order("target_date", { ascending: true });
            const available = (events || []).filter(e => !linkedTrackerIds.includes(e.habit_id));
            setExistingEvents(available);
          })();
        }
        // Load existing active books for reading habits (avoid re-entering)
        if (habit?.category === "reading" && !books[hId]) {
          (async () => {
            const trackerHabitIds = trackerData.habits.map(h => h.id);
            const linkedBookIds = trackerHabitIds.filter(id => !!books[id]);
            const { data: shelfBooks } = await supabase.from("books")
              .select("id, habit_id, title, author, total_pages, current_page, cover_url")
              .eq("user_id", session.user.id).eq("is_active", true);
            const available = (shelfBooks || []).filter(b => {
              if (b.habit_id === 7) return false;
              if (b.total_pages === 1 && !b.author) return false;
              if (linkedBookIds.includes(b.habit_id)) return false;
              return true;
            });
            setExistingBooks(available);
          })();
        }
      }
    } else {
      toggleHabitStatus(hId);
    }
  };

  const handleCheckClick = (e, hId) => { e.stopPropagation(); clearTimeout(dragRefs.current.timer); toggleHabitStatus(hId); };

  // ── Inline habit name editing (double-tap for custom habits) ──
  const startEditingHabit = (hId) => {
    const habit = trackerData?.habits.find(h => h.id === hId);
    if (!habit || habit.fiveSeven) return; // Only allow editing non-preset habits
    setEditingHabitId(hId);
    setEditingHabitName(habit.name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const saveHabitName = async () => {
    if (!editingHabitId || !trackerData || !session) { setEditingHabitId(null); return; }
    const trimmed = editingHabitName.trim();
    if (!trimmed) { setEditingHabitId(null); return; }

    const updatedHabits = trackerData.habits.map(h =>
      h.id === editingHabitId ? { ...h, name: trimmed } : h
    );
    setTrackerData(prev => ({ ...prev, habits: updatedHabits }));
    setEditingHabitId(null);

    const { error } = await supabase.from("monthly_challenges")
      .update({ habits: updatedHabits })
      .eq("id", trackerData.id).eq("user_id", session.user.id);
    if (error) { console.error("Rename habit error:", error); onToast("Couldn't rename"); }
  };

  // ── Book functions (same as ChallengeScreen) ──
  const handleBookSearch = (query) => {
    setBookSearchQuery(query);
    if (!query.trim()) { setBookSearchResults([]); return; }
    clearTimeout(handleBookSearch._timer);
    handleBookSearch._timer = setTimeout(async () => {
      setBookSearching(true);
      try {
        const results = await searchGoogleBooks(query);
        setBookSearchResults(results.map(item => ({
          title: item.title, author: item.author,
          pages: item.pages, cover: item.cover,
        })));
      } catch { setBookSearchResults([]); }
      setBookSearching(false);
    }, 400);
  };

  const selectBookResult = (result) => {
    setBookForm({ title: result.title, author: result.author, totalPages: String(result.pages || ""), currentPage: "", cover: result.cover });
    setBookSearchResults([]); setBookSearchQuery("");
  };

  const setupBook = async (hId) => {
    const { title, author, totalPages, currentPage, cover } = bookForm;
    if (!title || !totalPages) return;
    const parsedTotal = parseInt(totalPages);
    const parsedCurrent = parseInt(currentPage) || 0;
    setBooks(prev => ({ ...prev, [hId]: { title, author, totalPages: parsedTotal, currentPage: parsedCurrent, cover: cover || null } }));
    const { data: inserted } = await supabase.from("books").insert({
      user_id: session.user.id, habit_id: hId, title, author, total_pages: parsedTotal, current_page: parsedCurrent, cover_url: cover || null,
    }).select().single();
    if (inserted) setBooks(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], dbId: inserted.id } } : prev);
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

    // Post reading progress milestones (50%, 75%)
    if (session && total > 0) {
      const prevPct = Math.floor((prevPage / total) * 100);
      const newPct = Math.floor((page / total) * 100);
      const milestones = [50, 75];
      for (const m of milestones) {
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

  const finishBook = async (hId) => {
    const book = books[hId];
    if (!book) return;
    setBooks(prev => { const next = { ...prev }; delete next[hId]; return next; });
    if (book.dbId) {
      await sb(supabase.from("books").update({ is_active: false, current_page: book.totalPages, finished_at: new Date().toISOString(), rating: bookRating || null }).eq("id", book.dbId), onToast, "Couldn't update");
      // Post to feed
      try {
        await supabase.from("feed_activity").insert({
          user_id: session.user.id, activity_type: "book", action: "finished",
          title: book.title, item_title: book.title, item_author: book.author, item_cover: book.cover || null, rating: bookRating || null,
        });
      } catch (e) { console.error("Feed activity error:", e); }
    }
    setExpandedHabit(null); setBookRating(0);
    onToast("Book finished! 🎉 Added to your shelf.");
    computeGoalProgress();
  };

  // ── Goal functions ──
  const setupGoal = async (hId) => {
    const { name, targetDate, emoji, location } = goalForm;
    if (!name) return;
    setGoals(prev => ({ ...prev, [hId]: { name, targetDate: targetDate || null, emoji: emoji || "🎯", location: location || null } }));
    const { data: inserted } = await supabase.from("workout_goals").insert({
      user_id: session.user.id, habit_id: hId, name, target_date: targetDate || null, emoji: emoji || "🎯", location: location || null,
    }).select().single();
    if (inserted) setGoals(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], dbId: inserted.id } } : prev);
    onToast("Goal set! 🎯");
  };

  const linkExistingEvent = async (hId, event) => {
    // Update local state immediately
    setGoals(prev => ({ ...prev, [hId]: { name: event.name, targetDate: event.target_date, emoji: event.emoji || "🎯", location: event.location, dbId: event.id } }));
    setExistingEvents([]);
    // Persist: update habit_id on the workout_goals row so it reloads correctly
    const { error } = await supabase.from("workout_goals").update({ habit_id: hId }).eq("id", event.id);
    if (error) {
      // Fallback: store link in challenge data
      if (trackerData?.id) {
        const updatedHabits = (trackerData.habits || []).map(h => h.id === hId ? { ...h, linkedGoalDbId: event.id } : h);
        await supabase.from("monthly_challenges").update({ habits: updatedHabits }).eq("id", trackerData.id);
        setTrackerData(prev => ({ ...prev, habits: updatedHabits }));
      }
    }
    onToast(`Linked to ${event.name} 🎯`);
  };

  const linkExistingBook = async (hId, book) => {
    // Update local state immediately
    setBooks(prev => ({ ...prev, [hId]: { title: book.title, author: book.author, totalPages: book.total_pages, currentPage: book.current_page, cover: book.cover_url, dbId: book.id } }));
    setPageInput(String(book.current_page || ""));
    setExistingBooks([]);
    // Persist: update habit_id on the books row so it reloads correctly
    const { error } = await supabase.from("books").update({ habit_id: hId }).eq("id", book.id);
    if (error) {
      // Fallback: store link in challenge data
      if (trackerData?.id) {
        const updatedHabits = (trackerData.habits || []).map(h => h.id === hId ? { ...h, linkedBookDbId: book.id } : h);
        await supabase.from("monthly_challenges").update({ habits: updatedHabits }).eq("id", trackerData.id);
        setTrackerData(prev => ({ ...prev, habits: updatedHabits }));
      }
    }
    onToast(`Linked to ${book.title} 📖`);
  };

  // ── Learn functions ──
  const setupLearn = async (hId) => {
    if (!learnInput.trim()) return;
    setLearnTopics(prev => ({ ...prev, [hId]: { topic: learnInput.trim() } }));
    const { data: inserted } = await supabase.from("books").insert({
      user_id: session.user.id, habit_id: hId, title: learnInput.trim(), author: "", total_pages: 1, current_page: 0, is_active: true,
    }).select().single();
    if (inserted) setLearnTopics(prev => prev[hId] ? { ...prev, [hId]: { ...prev[hId], dbId: inserted.id } } : prev);
    onToast("Learning topic set! 🎓");
  };

  // ── Watch functions (TMDB) ──
  const handleWatchSearch = (query) => {
    setWatchSearchQuery(query);
    if (!query.trim()) { setWatchSearchResults([]); return; }
    clearTimeout(handleWatchSearch._timer);
    handleWatchSearch._timer = setTimeout(async () => {
      setWatchSearching(true);
      try {
        const results = await searchTMDB(query, watchType);
        setWatchSearchResults(results);
      } catch { setWatchSearchResults([]); }
      setWatchSearching(false);
    }, 400);
  };

  const selectWatchResult = (result) => {
    setWatchSelected(result);
    setWatchSearchResults([]);
    setWatchSearchQuery("");
  };

  const finishWatch = async (hId) => {
    if (!watchSelected || !session) return;

    try {
      // If this was a quick-select from recently logged, movie is already in DB
      if (!watchSelected.alreadyShelved) {
        if (watchSelected.type === "tv") {
          await supabase.from("shows").upsert({
            user_id: session.user.id, tmdb_id: watchSelected.tmdbId,
            title: watchSelected.title, year: watchSelected.year ? parseInt(watchSelected.year) : null,
            poster_url: watchSelected.poster, backdrop_url: watchSelected.backdrop,
            status: "finished", rating: watchRating || null,
            notes: watchNotes.trim() || null, source: "mantl",
          }, { onConflict: "user_id,tmdb_id" });
        } else {
          const details = await fetchTMDBDetails(watchSelected.tmdbId, "movie");
          await supabase.from("movies").upsert({
            user_id: session.user.id, tmdb_id: watchSelected.tmdbId,
            title: watchSelected.title, year: watchSelected.year ? parseInt(watchSelected.year) : null,
            director: details?.director || null, poster_url: watchSelected.poster,
            backdrop_url: watchSelected.backdrop, genre: details?.genre || null,
            runtime: details?.runtime || null, rating: watchRating || null,
            notes: watchNotes.trim() || null, watched_at: new Date().toISOString(), source: "mantl",
          }, { onConflict: "user_id,tmdb_id" });
        }
      } else if (watchRating) {
        // Quick-select but user added a rating — update existing movie
        await supabase.from("movies").update({ rating: watchRating, notes: watchNotes.trim() || null })
          .eq("user_id", session.user.id).eq("tmdb_id", watchSelected.tmdbId);
      }

      // Post to feed — but check for existing entry first (dedup)
      try {
        const { data: existingFeed } = await supabase.from("feed_activity")
          .select("id").eq("user_id", session.user.id).eq("activity_type", watchSelected.type === "tv" ? "show" : "movie")
          .eq("item_title", watchSelected.title).limit(1);

        if (!existingFeed || existingFeed.length === 0) {
          await supabase.from("feed_activity").insert({
            user_id: session.user.id, activity_type: watchSelected.type === "tv" ? "show" : "movie",
            action: "finished", title: watchSelected.title, item_title: watchSelected.title,
            item_cover: watchSelected.poster || null, rating: watchRating || null,
          });
        } else if (watchRating) {
          // Update existing feed entry with new rating
          await supabase.from("feed_activity").update({ rating: watchRating })
            .eq("id", existingFeed[0].id);
        }
      } catch (e) { console.error("Feed activity error:", e); }

      onToast(watchSelected.alreadyShelved ? `${watchSelected.title} logged! 🎬` : `${watchSelected.title} shelved! 🎬`);
      if (onRefreshShelf) onRefreshShelf();
    } catch (err) {
      console.error("Watch save error:", err);
      onToast("Couldn't save — try again");
    }

    // Reset
    setWatchSelected(null); setWatchRating(0); setWatchNotes(""); setWatchSearchQuery("");
    setExpandedHabit(null);
    computeGoalProgress();
  };

  // ── Streak computation ──
  const computeStreaks = () => {
    if (!trackerData) return [];
    return trackerData.habits.map(h => {
      let streak = 0;
      for (let d = dayOfMonth; d >= 1; d--) {
        const dd = getDayData(d);
        if (dd.checked.includes(h.id) || dd.rested.includes(h.id)) streak++;
        else break;
      }
      // Also compute total completed days
      let totalCompleted = 0;
      for (let d = 1; d <= dayOfMonth; d++) {
        const dd = getDayData(d);
        if (dd.checked.includes(h.id)) totalCompleted++;
      }
      return { ...h, streak, totalCompleted };
    });
  };

  // ── Drag-to-reorder handlers ──
  const onDragStart = (idx, e) => {
    const touch = e.touches?.[0] || e;
    dragRefs.current.startY = touch.clientY;
    dragRefs.current.startIdx = idx;
    dragRefs.current.timer = setTimeout(() => {
      setDragIdx(idx);
      setDragOverIdx(idx);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  };

  const onDragMove = (e) => {
    if (dragIdx === null) {
      const touch = e.touches?.[0] || e;
      if (Math.abs(touch.clientY - dragRefs.current.startY) > 10) {
        clearTimeout(dragRefs.current.timer);
      }
      return;
    }
    const touch = e.touches?.[0] || e;
    const listEl = habitListRef.current;
    if (!listEl) return;
    const cards = listEl.querySelectorAll("[data-drag-idx]");
    let closest = dragIdx;
    let minDist = Infinity;
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(touch.clientY - mid);
      if (dist < minDist) { minDist = dist; closest = parseInt(card.dataset.dragIdx); }
    });
    if (closest !== dragOverIdx) setDragOverIdx(closest);
  };

  const onDragEnd = async () => {
    clearTimeout(dragRefs.current.timer);
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const habits = [...trackerData.habits];
    const [moved] = habits.splice(dragIdx, 1);
    habits.splice(dragOverIdx, 0, moved);
    setTrackerData(prev => ({ ...prev, habits }));
    setDragIdx(null);
    setDragOverIdx(null);

    if (session && trackerData) {
      const { error } = await supabase.from("monthly_challenges")
        .update({ habits })
        .eq("id", trackerData.id)
        .eq("user_id", session.user.id);
      if (error) console.error("Reorder save error:", error);
    }
  };

  const onDragCancel = () => {
    clearTimeout(dragRefs.current.timer);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // ── Add habit to building list ──
  const addHabit = (name, emoji, category, sub, fiveSeven) => {
    if (buildingHabits.length >= 10) { onToast("Maximum 10 habits"); return; }
    const nextId = buildingHabits.length > 0 ? Math.max(...buildingHabits.map(h => h.id)) + 1 : 100;
    const habit = { id: nextId, name, emoji, category, sub: sub || "" };
    if (fiveSeven) habit.fiveSeven = true;
    setBuildingHabits(prev => [...prev, habit]);
    slideCounter.current++;
    setSlideDir("back");
    setSelectedCategory(null);
    setCustomInput("");
  };

  const removeHabit = (id) => {
    setBuildingHabits(prev => prev.filter(h => h.id !== id));
  };

  // ── Save tracker ──
  const saveTracker = async () => {
    if (!session || buildingHabits.length < 1) return;
    setCreating(true);
    try {
      // Check for existing tracker
      const { data: existing } = await supabase.from("monthly_challenges")
        .select("id").eq("user_id", session.user.id).eq("month", currentMonth).eq("year", currentYear).maybeSingle();

      if (existing) {
        const { count } = await supabase.from("daily_logs").select("id", { count: "exact", head: true }).eq("challenge_id", existing.id);
        if (count > 0 && !window.confirm(`You have ${count} logged entries this month. Changing habits will keep your existing logs but reset the tracker. Continue?`)) {
          setCreating(false); return;
        }
        // Delete logs first (foreign key), then challenge
        await supabase.from("daily_logs").delete().eq("challenge_id", existing.id);
        const { error: delErr } = await supabase.from("monthly_challenges").delete().eq("id", existing.id);
        if (delErr) console.error("Delete old challenge error:", delErr);
      }

      const { data: challenge, error } = await supabase.from("monthly_challenges")
        .insert({ user_id: session.user.id, month: currentMonth, year: currentYear, habits: buildingHabits, start_day: dayOfMonth })
        .select().single();

      if (error) {
        console.error("Save tracker error:", error.message, error.code, error.details, error.hint);
        onToast("Couldn't save — please try again");
        setCreating(false);
        return;
      }

      setTrackerData({ id: challenge.id, habits: challenge.habits, startDay: challenge.start_day, month: challenge.month, year: challenge.year });
      setViewingDay(dayOfMonth);
      setHistory({});
      setSetupPhase(null);
      setBuildingHabits([]);

      // Post habit adoption to feed
      try {
        const habitNames = challenge.habits.map(h => typeof h === "object" ? h.name : h).join(", ");
        await supabase.from("feed_activity").insert({
          user_id: session.user.id, activity_type: "habits", action: "started tracking",
          title: `${challenge.habits.length} habit${challenge.habits.length !== 1 ? "s" : ""}`, item_title: habitNames,
        });
      } catch (e) { console.error("Feed activity error:", e); }

      onToast("Tracker started! 🔥");

      // Backfill: auto-complete habits for today's existing activity
      if (onAutoComplete) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const habits = challenge.habits || [];
        // Check for movie logged today
        if (habits.some(h => h.category === "watching")) {
          const { data: todayMovie } = await supabase.from("movies")
            .select("id").eq("user_id", session.user.id)
            .gte("watched_at", todayStr + "T00:00:00")
            .lte("watched_at", todayStr + "T23:59:59").limit(1);
          if (todayMovie?.length > 0) onAutoComplete("watching", null, "film");
        }
        // Check for Strava activity today
        if (habits.some(h => h.category === "training")) {
          const { data: todayStrava } = await supabase.from("feed_activity")
            .select("id").eq("user_id", session.user.id).eq("activity_type", "strava")
            .gte("created_at", todayStr + "T00:00:00")
            .lte("created_at", todayStr + "T23:59:59").limit(1);
          if (todayStrava?.length > 0) onAutoComplete("training");
        }
        // Check for reading progress today
        if (habits.some(h => h.category === "reading")) {
          const { data: todayRead } = await supabase.from("reading_log")
            .select("id").eq("user_id", session.user.id)
            .gte("created_at", todayStr + "T00:00:00")
            .lte("created_at", todayStr + "T23:59:59").limit(1);
          if (todayRead?.length > 0) onAutoComplete("reading");
        }
      }
    } catch (err) { console.error("Tracker save exception:", err); onToast("Something went wrong — please try again"); }
    setCreating(false);
  };

  // ── Edit habits (quiet update) ──
  const startEditing = () => {
    setBuildingHabits([...trackerData.habits]);
    setIsEditing(true);
    setSetupPhase("categories");
  };

  const saveEdits = async () => {
    if (!session || !trackerData || buildingHabits.length < 1) return;
    setCreating(true);
    try {
      // 1. Read existing logs so we can preserve progress
      const { data: existingLogs } = await supabase.from("daily_logs")
        .select("date, habit_id, status")
        .eq("challenge_id", trackerData.id);

      // 2. Delete logs first (FK constraint), then the old challenge row
      await supabase.from("daily_logs").delete().eq("challenge_id", trackerData.id);
      await supabase.from("monthly_challenges").delete()
        .eq("id", trackerData.id).eq("user_id", session.user.id);

      // 3. Insert fresh challenge with updated habits (INSERT works with RLS)
      const { data: challenge, error } = await supabase.from("monthly_challenges")
        .insert({ user_id: session.user.id, month: currentMonth, year: currentYear, habits: buildingHabits, start_day: trackerData.startDay })
        .select().single();

      if (error || !challenge) {
        console.error("Edit save error:", error?.message, error?.code, error?.details);
        onToast("Couldn't save — try again");
        setCreating(false);
        return;
      }

      // 4. Re-insert logs that belong to habits still in the new list
      const newHabitIds = buildingHabits.map(h => h.id);
      const logsToReinsert = (existingLogs || [])
        .filter(log => newHabitIds.includes(log.habit_id))
        .map(log => ({ challenge_id: challenge.id, user_id: session.user.id, date: log.date, habit_id: log.habit_id, status: log.status }));

      if (logsToReinsert.length > 0) {
        await supabase.from("daily_logs").insert(logsToReinsert);
      }

      // 5. Rebuild local state from preserved logs
      const hist = {};
      logsToReinsert.forEach(log => {
        const day = new Date(log.date + "T12:00:00").getDate();
        if (!hist[day]) hist[day] = { checked: [], rested: [], missed: [] };
        if (log.status === "complete") hist[day].checked.push(log.habit_id);
        else if (log.status === "rest") hist[day].rested.push(log.habit_id);
        else if (log.status === "missed" || log.status === "skip") hist[day].missed.push(log.habit_id);
      });
      setHistory(hist);

      setTrackerData({ id: challenge.id, habits: challenge.habits, startDay: challenge.start_day, month: challenge.month, year: challenge.year });
      setSetupPhase(null);
      setIsEditing(false);
      setBuildingHabits([]);
      setMonthlyGoals(challenge.monthly_goals || []);
      onToast("Habits updated");

      // Backfill: auto-complete new habits for today's existing activity
      if (onAutoComplete) {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const habits = challenge.habits || [];
        if (habits.some(h => h.category === "watching")) {
          const { data: todayMovie } = await supabase.from("movies")
            .select("id").eq("user_id", session.user.id)
            .gte("watched_at", todayStr + "T00:00:00")
            .lte("watched_at", todayStr + "T23:59:59").limit(1);
          if (todayMovie?.length > 0) onAutoComplete("watching", null, "film");
        }
        if (habits.some(h => h.category === "training")) {
          const { data: todayStrava } = await supabase.from("feed_activity")
            .select("id").eq("user_id", session.user.id).eq("activity_type", "strava")
            .gte("created_at", todayStr + "T00:00:00")
            .lte("created_at", todayStr + "T23:59:59").limit(1);
          if (todayStrava?.length > 0) onAutoComplete("training");
        }
        if (habits.some(h => h.category === "reading")) {
          const { data: todayRead } = await supabase.from("reading_log")
            .select("id").eq("user_id", session.user.id)
            .gte("created_at", todayStr + "T00:00:00")
            .lte("created_at", todayStr + "T23:59:59").limit(1);
          if (todayRead?.length > 0) onAutoComplete("reading");
        }
      }
    } catch (err) { console.error("Edit save exception:", err); onToast("Something went wrong"); }
    setCreating(false);
  };

  // ── Loading ──
  if (loading) {
    return <div className="challenge-screen"><div className="challenge-header bb">Track</div><div className="challenge-sub">Loading...</div></div>;
  }

  // ── Setup Flow ──
  if (!trackerData || setupPhase) {
    return (
      <div className="challenge-screen">
        <div className="challenge-header bb">{isEditing ? "Edit Habits" : "Track"}</div>

        {!setupPhase && !isEditing ? (
          <div className="challenge-setup">
            <div className="challenge-setup-icon">📊</div>
            <div className="challenge-setup-title">Build your habits</div>
            <div className="challenge-setup-desc">
              Pick 1–10 habits to track daily. Choose FiveSeven presets for a 5-day-a-week rhythm with 2 rest days, or create your own.
            </div>
            <button className="btn-primary" onClick={() => setSetupPhase("categories")}>Choose Habits</button>
          </div>
        ) : setupPhase === "categories" && !selectedCategory ? (
          <div className={slideDir === "back" ? "habit-slide-back" : ""} key={`categories-${slideCounter.current}`}>
            <div className="challenge-sub">{buildingHabits.length > 0 ? `${buildingHabits.length} habit${buildingHabits.length !== 1 ? "s" : ""} selected — add more or continue` : "What do you want to work on?"}</div>

            {/* Current selections */}
            {buildingHabits.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {buildingHabits.map(h => (
                  <div key={h.id} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 100,
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                  }}>
                    <span>{h.emoji}</span> {h.name}
                    {h.fiveSeven && <span style={{ fontSize: 9, color: "var(--terracotta)", opacity: 0.7 }}>5/7</span>}
                    <span style={{ cursor: "pointer", opacity: 0.4, marginLeft: 4 }} onClick={() => removeHabit(h.id)}>✕</span>
                  </div>
                ))}
              </div>
            )}

            {/* Category grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {HABIT_CATEGORIES.map(cat => (
                <div key={cat.key} className="habit-card" onClick={() => { slideCounter.current++; setSlideDir("forward"); setSelectedCategory(cat.key); }} style={{ borderLeftWidth: 3, borderLeftColor: cat.color }}>
                  <div className="habit-card-icon">{cat.emoji}</div>
                  <div className="habit-card-info">
                    <div className="habit-card-name">{cat.label}</div>
                    <div className="habit-card-sub">
                      {cat.presets.length > 0
                        ? cat.presets.map(p => p.name).join(" · ")
                        : cat.prompt}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-faint)" }}>›</div>
                </div>
              ))}
            </div>

            {buildingHabits.length >= 1 && (
              <button className="btn-primary" disabled={creating} onClick={isEditing ? saveEdits : saveTracker}>
                {creating ? "Saving..." : isEditing ? `Save ${buildingHabits.length} Habits` : `Start Tracking ${buildingHabits.length} Habits`}
              </button>
            )}
            {isEditing && (
              <div className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", cursor: "pointer", marginTop: 12 }}
                onClick={() => { setSetupPhase(null); setIsEditing(false); setBuildingHabits([]); }}>Cancel</div>
            )}
          </div>
        ) : setupPhase === "categories" && selectedCategory ? (
          <div className="habit-slide-in" key={`customize-${slideCounter.current}`}>
            {(() => {
              const cat = HABIT_CATEGORIES.find(c => c.key === selectedCategory);
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <span style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}
                      onClick={() => { slideCounter.current++; setSlideDir("back"); setSelectedCategory(null); setCustomInput(""); }}>← Back</span>
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>{cat.emoji}</div>
                    <div className="bb" style={{ fontSize: 18 }}>{cat.label}</div>
                  </div>

                  {/* Custom input first */}
                  <div style={{ marginBottom: cat.presets.length > 0 ? 20 : 0 }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", marginBottom: 10, letterSpacing: "0.05em" }}>
                      CREATE YOUR OWN
                    </div>
                  </div>

                  <input className="ch-input mono" placeholder={cat.placeholder}
                    value={customInput} onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && customInput.trim()) { addHabit(customInput.trim(), cat.emoji, cat.key, ""); setCustomInput(""); } }}
                    style={{ fontSize: 14, padding: "12px 14px", textAlign: "center" }} />

                  <button className="btn-primary" style={{ marginTop: 12 }}
                    disabled={!customInput.trim()}
                    onClick={() => { if (customInput.trim()) { addHabit(customInput.trim(), cat.emoji, cat.key, ""); setCustomInput(""); } }}>
                    Add Custom Habit
                  </button>

                  {/* FiveSeven presets after */}
                  {cat.presets && cat.presets.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", marginBottom: 10, letterSpacing: "0.05em" }}>OR PICK A FIVESEVEN PRESET</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cat.presets.map(p => (
                          <div key={p.name} onClick={() => addHabit(p.name, p.emoji, cat.key, p.sub, p.fiveSeven)}
                            style={{
                              padding: "14px 16px", background: "var(--card)", border: "1px solid var(--border)",
                              borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                              transition: "border-color 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--terracotta)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                            <span style={{ fontSize: 20 }}>{p.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div className="bb" style={{ fontSize: 14 }}>{p.name}</div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{p.sub}</div>
                            </div>
                            {p.fiveSeven && (
                              <div className="mono" style={{ fontSize: 9, color: "var(--terracotta)", background: "rgba(196,115,79,0.08)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.04em", flexShrink: 0 }}>5/7</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : null}
      </div>
    );
  }

  // ── Active Tracker ──
  const startDay = trackerData.startDay || 1;
  const isViewingToday = viewingDay === dayOfMonth;
  const dateObj = new Date(currentYear, currentMonth - 1, viewingDay);
  const weekdayLabel = WEEKDAYS[dateObj.getDay()];
  const dayData = getDayData(viewingDay);
  const streakData = computeStreaks();

  return (
    <div className="challenge-screen">
      {/* Tab toggle */}
      <div className="ch-tab-bar">
        <button className={`ch-tab${trackView === "today" ? " ch-tab-active" : ""}`}
          onClick={() => setTrackView("today")}>Today</button>
        <button className={`ch-tab${trackView === "streaks" ? " ch-tab-active" : ""}`}
          onClick={() => setTrackView("streaks")}>Streaks</button>
      </div>

      {trackView === "streaks" ? (
        /* ── Streaks View ── */
        <>
          <div style={{ marginBottom: 16 }}>
            <div className="bb" style={{ fontSize: 18, marginBottom: 2 }}>{MONTH_NAMES[currentMonth]}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>Day {dayOfMonth}</div>
          </div>

          {streakData.map(h => {
            const streakColor = h.streak >= 14 ? "var(--sage)" : h.streak >= 7 ? "var(--terracotta)" : "var(--text-dim)";
            return (
              <div key={h.id} style={{
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
                padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{h.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div className="bb" style={{ fontSize: 14 }}>{h.name}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{h.sub}{h.fiveSeven && !h.sub ? "5x/week · 2 rest days" : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="bb" style={{ fontSize: 22, color: streakColor }}>{h.streak}</div>
                    <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>{h.fiveSeven ? "day streak · 5/7" : "day streak"}</div>
                  </div>
                </div>
                {/* Dot history — last 14 days */}
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {Array.from({ length: Math.min(14, dayOfMonth) }, (_, i) => {
                    const d = dayOfMonth - (Math.min(14, dayOfMonth) - 1 - i);
                    if (d < 1) return <div key={i} style={{ width: 8, height: 8 }} />;
                    const dd = getDayData(d);
                    const done = dd.checked.includes(h.id);
                    const rested = dd.rested.includes(h.id);
                    const missed = dd.missed.includes(h.id);
                    const color = done ? "var(--sage)" : rested ? "#7BAFD4" : missed ? "#C47A6A" : "var(--border)";
                    return <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />;
                  })}
                </div>
                <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "right", marginTop: 3 }}>
                  {h.totalCompleted} of {dayOfMonth} days completed
                </div>
              </div>
            );
          })}
        </>
      ) : (
        /* ── Today View ── */
        <>
          {/* Day Header */}
          <div className="challenge-day-header">
            <button className="challenge-day-nav" onClick={() => { setViewingDay(v => Math.max(1, v - 1)); setExpandedHabit(null); }}
              disabled={viewingDay <= 1} style={{ opacity: viewingDay <= 1 ? 0.2 : 1 }}>‹</button>
            <div className="challenge-day-center">
              <div className="challenge-day-weekday mono">{weekdayLabel}</div>
              <div className="challenge-day-date bb">{MONTH_NAMES[currentMonth].slice(0, 3)} {viewingDay}</div>
            </div>
            <button className="challenge-day-nav" onClick={() => { setViewingDay(v => Math.min(dayOfMonth, v + 1)); setExpandedHabit(null); }}
              disabled={viewingDay >= dayOfMonth} style={{ opacity: viewingDay >= dayOfMonth ? 0.2 : 1 }}>›</button>
          </div>

          {!isViewingToday && (
            <div className="challenge-past-banner" onClick={() => { setViewingDay(dayOfMonth); setExpandedHabit(null); }}>
              <span className="mono">Viewing past day</span>
              <span className="mono" style={{ color: "var(--terracotta)", cursor: "pointer" }}>→ Today</span>
            </div>
          )}

          {/* Progress */}
          <div className="challenge-progress-row">
            <div className="challenge-progress-bar" style={{ flex: 1 }}>
              <div className="challenge-progress-fill" style={{ width: `${trackerData.habits.length > 0 ? Math.min(100, (dayData.checked.length / trackerData.habits.length) * 100) : 0}%` }} />
            </div>
            <div className="challenge-done-count mono">
              {dayData.checked.length}<span style={{ color: "var(--text-faint)" }}>/{trackerData.habits.length}</span>
            </div>
          </div>

          {/* Habit Cards */}
          <div className="challenge-habit-list" ref={habitListRef}
            onTouchMove={onDragMove} onTouchEnd={onDragEnd} onTouchCancel={onDragCancel}
            onMouseMove={dragIdx !== null ? onDragMove : undefined} onMouseUp={dragIdx !== null ? onDragEnd : undefined} onMouseLeave={dragIdx !== null ? onDragCancel : undefined}>
            {trackerData.habits.map((h, idx) => {
              const hId = h.id;
              const isDone = dayData.checked.includes(hId);
              const isRested = dayData.rested.includes(hId);
              const isMissed = dayData.missed.includes(hId);
              const stateClass = isDone ? " ch-done" : isRested ? " ch-rested" : isMissed ? " ch-missed" : "";
              const isExpanded = expandedHabit === hId && isDone;
              const isDragging = dragIdx === idx;
              const isDragOver = dragIdx !== null && dragOverIdx === idx && dragIdx !== idx;

              const isReading = h.category === "reading";
              const isWatching = h.category === "watching";
              const isTraining = h.category === "training";
              const isLearning = h.category === "learning";
              const book = books[hId];
              const goal = goals[hId];
              const learn = learnTopics[hId];

              let subtitle = h.sub || "";
              if (isReading && book && !isExpanded) subtitle = `${book.title} · p${book.currentPage}/${book.totalPages}`;
              else if (isTraining && goal && !isExpanded) subtitle = goal.name + (goal.location ? ` · ${goal.location}` : "");
              else if (isLearning && learn && !isExpanded) subtitle = learn.topic;
              else if (isWatching && isDone && !isExpanded) {
                const isShowHabit = /show/i.test(h.name || "");
                if (isShowHabit && todayShow) subtitle = `${todayShow.title} · S${todayShow.season}E${todayShow.episode}`;
                else if (!isShowHabit && todayFilm) subtitle = `${todayFilm.title}${todayFilm.source === "letterboxd" ? " · via Letterboxd" : ""}`;
                else subtitle = "Tap to log what you watched";
              }

              // Find streak for this habit
              const habitStreak = streakData.find(s => s.id === hId);

              return (
                <div key={hId} data-drag-idx={idx}
                  className={`ch-card-wrap${isExpanded ? " ch-expanded" : ""}${isDragging ? " ch-dragging" : ""}${isDragOver ? " ch-drag-over" : ""}`}
                  onTouchStart={(e) => onDragStart(idx, e)}
                  onMouseDown={(e) => onDragStart(idx, e)}>
                  <div className={`challenge-daily-card${stateClass}`} onClick={() => { if (dragIdx === null) handleCardClick(hId); }}>
                    <div className="challenge-daily-icon">{h.emoji}</div>
                    <div className="challenge-daily-info">
                      {editingHabitId === hId ? (
                        <input ref={editInputRef} className="ch-input mono" value={editingHabitName}
                          onChange={e => setEditingHabitName(e.target.value)}
                          onBlur={saveHabitName}
                          onKeyDown={e => { if (e.key === "Enter") saveHabitName(); if (e.key === "Escape") setEditingHabitId(null); }}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 13, padding: "4px 8px", margin: "-4px 0", background: "var(--bg)", border: "1px solid var(--terracotta)", borderRadius: 6 }} />
                      ) : (
                        <div className="challenge-daily-name">{h.name}
                          {!h.fiveSeven && (
                            <span className="ch-edit-hint" onClick={(e) => { e.stopPropagation(); startEditingHabit(hId); }}>✎</span>
                          )}
                        </div>
                      )}
                      <div className="challenge-daily-sub">
                        {subtitle}
                        {habitStreak && habitStreak.streak > 0 && !isExpanded && (
                          <span style={{ marginLeft: 6, color: habitStreak.streak >= 7 ? "var(--terracotta)" : "var(--text-faint)" }}>
                            🔥 {habitStreak.streak}{h.fiveSeven ? " · 5/7" : ""}
                          </span>
                        )}
                      </div>
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
                          {/* Existing books from shelf */}
                          {existingBooks.length > 0 && !bookForm.title && !bookManualEntry && (
                            <div style={{ marginBottom: 12 }}>
                              <div className="ch-panel-label mono">Continue from your shelf</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {existingBooks.slice(0, 4).map(b => (
                                  <div key={b.id} onClick={() => linkExistingBook(hId, b)}
                                    style={{
                                      padding: "10px 14px", background: "rgba(122,154,106,0.06)", border: "1px solid var(--border)",
                                      borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                                      transition: "border-color 0.15s",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--sage)"}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                                    {b.cover_url ? <img src={b.cover_url} alt="" style={{ width: 32, borderRadius: 3 }} /> : <span style={{ fontSize: 16 }}>📖</span>}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
                                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                                        {b.author}{b.current_page > 0 ? ` · p${b.current_page}/${b.total_pages}` : b.total_pages ? ` · ${b.total_pages}p` : ""}
                                      </div>
                                    </div>
                                    <span className="mono" style={{ fontSize: 10, color: "var(--sage)" }}>Link</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />
                              <div className="ch-panel-label mono">Or search for a new book</div>
                            </div>
                          )}
                          {!bookForm.title && !bookManualEntry ? (
                            <>
                              {existingBooks.length === 0 && <div className="ch-panel-label mono">What are you reading?</div>}
                              <input className="ch-input mono" placeholder="Search for a book..." value={bookSearchQuery}
                                onChange={e => handleBookSearch(e.target.value)} autoFocus={existingBooks.length === 0} />
                              {bookSearching && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>Searching...</div>}
                              {bookSearchResults.length > 0 && (
                                <div className="ch-book-results">
                                  {bookSearchResults.map((r, i) => (
                                    <div key={i} className="ch-book-result" onClick={() => selectBookResult(r)}>
                                      {r.cover ? <img src={r.cover} alt="" className="ch-book-result-cover" /> : <div className="ch-book-result-cover ch-book-no-cover">📖</div>}
                                      <div className="ch-book-result-info">
                                        <div className="bb" style={{ fontSize: 13 }}>{r.title}</div>
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
                            <>
                              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 6 }}>
                                {bookForm.cover && <img src={bookForm.cover} alt="" style={{ width: 40, borderRadius: 4 }} />}
                                <div style={{ flex: 1 }}>
                                  <div className="bb" style={{ fontSize: 14 }}>{bookForm.title}</div>
                                  <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{bookForm.author}{bookForm.totalPages ? ` · ${bookForm.totalPages} pages` : ""}</div>
                                </div>
                                <span className="mono" style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer" }}
                                  onClick={() => { setBookForm({ title: "", author: "", totalPages: "", currentPage: "", cover: null }); setBookSearchQuery(""); }}>Change</span>
                              </div>
                              {!bookForm.totalPages && (
                                <input className="ch-input mono" placeholder="Total pages" type="number" value={bookForm.totalPages}
                                  onChange={e => setBookForm(f => ({ ...f, totalPages: e.target.value }))} />
                              )}
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>Current page:</span>
                                <input className="ch-input mono" placeholder="0" type="number" value={bookForm.currentPage}
                                  onChange={e => setBookForm(f => ({ ...f, currentPage: e.target.value }))} style={{ flex: 1 }} />
                              </div>
                              <button className="btn-primary" style={{ marginTop: 4 }} disabled={!bookForm.title || !bookForm.totalPages}
                                onClick={() => setupBook(hId)}>Start Tracking</button>
                            </>
                          ) : (
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
                              <div className="bb" style={{ fontSize: 14 }}>{book.title}</div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{book.author}</div>
                            </div>
                          </div>
                          <div className="ch-book-progress-bar">
                            <div className="ch-book-progress-fill" style={{ width: `${Math.round((book.currentPage / book.totalPages) * 100)}%` }} />
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
                            {book.currentPage} / {book.totalPages} pages · {Math.round((book.currentPage / book.totalPages) * 100)}%
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>Page:</span>
                            <input className="ch-input mono" type="number" value={pageInput}
                              onChange={e => setPageInput(e.target.value)} style={{ flex: 1 }} />
                            <button className="ch-btn-sm" onClick={() => updatePage(hId)}>Update</button>
                          </div>
                          {book.currentPage >= book.totalPages && (
                            <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(122,154,106,0.08)", borderRadius: 8 }}>
                              <div className="mono" style={{ fontSize: 11, color: "var(--sage)", marginBottom: 6 }}>Finished! Rate it:</div>
                              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                                {[1,2,3,4,5].map(s => (
                                  <span key={s} style={{ fontSize: 22, cursor: "pointer", opacity: bookRating >= s ? 1 : 0.25 }}
                                    onClick={() => setBookRating(s)}>★</span>
                                ))}
                              </div>
                              <button className="btn-primary" onClick={() => finishBook(hId)}>Finish & Shelf It 📚</button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Training: goal setup */}
                      {isTraining && !goal && (
                        <div className="ch-panel-inner">
                          {/* Existing events from training shelf */}
                          {existingEvents.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                              <div className="ch-panel-label mono">Link to existing event</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {existingEvents.map(ev => (
                                  <div key={ev.id} onClick={() => linkExistingEvent(hId, ev)}
                                    style={{
                                      padding: "10px 14px", background: "rgba(196,115,79,0.06)", border: "1px solid var(--border)",
                                      borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                                      transition: "border-color 0.15s",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--terracotta)"}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                                    <span style={{ fontSize: 16 }}>{ev.emoji || "🎯"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div className="bb" style={{ fontSize: 13 }}>{ev.name}</div>
                                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                                        {ev.location}{ev.target_date ? `${ev.location ? " · " : ""}${ev.target_date}` : ""}
                                      </div>
                                    </div>
                                    <span className="mono" style={{ fontSize: 10, color: "var(--terracotta)" }}>Link</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />
                            </div>
                          )}
                          <div className="ch-panel-label mono">{existingEvents.length > 0 ? "Or create new" : "What are you training for?"}</div>
                          <input className="ch-input mono" placeholder="Goal name (e.g., Lisbon Marathon)" value={goalForm.name}
                            onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} autoFocus={existingEvents.length === 0} />
                          <input className="ch-input mono" placeholder="Location (optional)" value={goalForm.location}
                            onChange={e => setGoalForm(f => ({ ...f, location: e.target.value }))} />
                          <input className="ch-input mono" type="date" value={goalForm.targetDate}
                            onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} />
                          <button className="btn-primary" style={{ marginTop: 4 }} disabled={!goalForm.name}
                            onClick={() => setupGoal(hId)}>Set Goal</button>
                        </div>
                      )}

                      {isTraining && goal && (
                        <div className="ch-panel-inner">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 18 }}>{goal.emoji}</span>
                            <div>
                              <div className="bb" style={{ fontSize: 14 }}>{goal.name}</div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                                {goal.location}{goal.targetDate ? ` · ${goal.targetDate}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--sage)" }}>✓ Logged for today</div>
                        </div>
                      )}

                      {/* Learning: topic input */}
                      {isLearning && !learn && (
                        <div className="ch-panel-inner">
                          <div className="ch-panel-label mono">What are you learning?</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input className="ch-input mono" placeholder="e.g., German, Piano, React..." value={learnInput}
                              onChange={e => setLearnInput(e.target.value)} style={{ flex: 1 }} autoFocus />
                            <button className="ch-btn-sm" disabled={!learnInput.trim()} onClick={() => setupLearn(hId)}>Set</button>
                          </div>
                        </div>
                      )}

                      {isLearning && learn && (
                        <div className="ch-panel-inner">
                          <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>Learning: <strong>{learn.topic}</strong></div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--sage)", marginTop: 4 }}>✓ Logged for today</div>
                        </div>
                      )}

                      {/* Watching: auto-completed confirmation OR search */}
                      {isWatching && (() => {
                        const isShowHabit = /show/i.test(h.name || "");
                        const todayItem = isShowHabit ? todayShow : todayFilm;
                        if (todayItem && !watchSelected) return (
                          <div className="ch-panel-inner">
                            <div className="mono" style={{ fontSize: 11, color: "var(--sage)", marginBottom: 10 }}>✓ Logged today</div>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              {todayItem.poster && <img src={todayItem.poster} alt="" style={{ width: 48, height: 72, borderRadius: 6, objectFit: "cover" }} />}
                              <div style={{ flex: 1 }}>
                                <div className="bb" style={{ fontSize: 15 }}>{todayItem.title}</div>
                                <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                                  {isShowHabit
                                    ? `S${todayItem.season}E${todayItem.episode}${todayItem.year ? ` · ${todayItem.year}` : ""}`
                                    : `${todayItem.year || ""}${todayItem.director ? ` · ${todayItem.director}` : ""}${todayItem.source === "letterboxd" ? " · via Letterboxd" : ""}`
                                  }
                                </div>
                                {!isShowHabit && todayItem.rating && (
                                  <div style={{ marginTop: 4 }}>
                                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 14, color: todayItem.rating >= s ? "var(--terracotta)" : "var(--border)" }}>★</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", marginTop: 12, cursor: "pointer" }}
                              onClick={() => { if (isShowHabit) setTodayShow(null); else setTodayFilm(null); }}>Log something else</div>
                          </div>
                        );
                        return null;
                      })()}

                      {isWatching && !(((/show/i.test(h.name || "")) ? todayShow : todayFilm)) && !watchSelected && (
                        <div className="ch-panel-inner">
                          <div className="ch-panel-label mono">What did you watch?</div>

                          {/* Recent films quick-select */}
                          {recentFilms.length > 0 && watchType === "movie" && !watchSearchQuery && (
                            <div style={{ marginBottom: 10 }}>
                              <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", letterSpacing: "0.08em", marginBottom: 6 }}>RECENTLY LOGGED</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {recentFilms.slice(0, 4).map((f, i) => (
                                  <div key={i} onClick={() => setWatchSelected(f)}
                                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}>
                                    {f.poster ? <img src={f.posterSmall || f.poster} alt="" style={{ width: 32, height: 48, borderRadius: 4, objectFit: "cover" }} /> : <div style={{ width: 32, height: 48, borderRadius: 4, background: "var(--cream-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎬</div>}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div className="bb" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{f.year}{f.source === "letterboxd" ? " · via Letterboxd" : ""}</div>
                                    </div>
                                    <span style={{ fontSize: 14, color: "var(--sage)" }}>✓</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", margin: "10px 0 4px", letterSpacing: "0.08em" }}>── OR SEARCH ──</div>
                            </div>
                          )}

                          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                            <button className={`ch-btn-sm${watchType === "movie" ? "" : ""}`}
                              style={{ flex: 1, background: watchType === "movie" ? "var(--terracotta)" : "var(--cream-dark)", color: watchType === "movie" ? "white" : "var(--text-dim)", border: "none", padding: "6px 0", borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: "pointer" }}
                              onClick={() => { setWatchType("movie"); setWatchSearchResults([]); setWatchSearchQuery(""); }}>Film</button>
                            <button className={`ch-btn-sm${watchType === "tv" ? "" : ""}`}
                              style={{ flex: 1, background: watchType === "tv" ? "var(--terracotta)" : "var(--cream-dark)", color: watchType === "tv" ? "white" : "var(--text-dim)", border: "none", padding: "6px 0", borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: "pointer" }}
                              onClick={() => { setWatchType("tv"); setWatchSearchResults([]); setWatchSearchQuery(""); }}>Show</button>
                          </div>
                          <input className="ch-input mono" placeholder={`Search for a ${watchType === "tv" ? "show" : "film"}...`} value={watchSearchQuery}
                            onChange={e => handleWatchSearch(e.target.value)} autoFocus />
                          {watchSearching && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>Searching...</div>}
                          {watchSearchResults.length > 0 && (
                            <div className="ch-book-results">
                              {watchSearchResults.map((r, i) => (
                                <div key={i} className="ch-book-result" onClick={() => selectWatchResult(r)}>
                                  {r.poster ? <img src={r.posterSmall || r.poster} alt="" className="ch-book-result-cover" style={{ width: 40, borderRadius: 4 }} /> : <div className="ch-book-result-cover ch-book-no-cover">🎬</div>}
                                  <div className="ch-book-result-info">
                                    <div className="bb" style={{ fontSize: 13 }}>{r.title}</div>
                                    <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{r.year}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {isWatching && watchSelected && (
                        <div className="ch-panel-inner">
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                            {watchSelected.poster && <img src={watchSelected.posterSmall || watchSelected.poster} alt="" style={{ width: 48, borderRadius: 6 }} />}
                            <div style={{ flex: 1 }}>
                              <div className="bb" style={{ fontSize: 15 }}>{watchSelected.title}</div>
                              <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>{watchSelected.year}{watchSelected.type === "tv" ? " · Show" : ""}</div>
                            </div>
                            <span className="mono" style={{ fontSize: 10, color: "var(--terracotta)", cursor: "pointer" }}
                              onClick={() => { setWatchSelected(null); setWatchRating(0); setWatchNotes(""); }}>Change</span>
                          </div>

                          <div className="mono" style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Rate it:</div>
                          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                            {[1,2,3,4,5].map(s => (
                              <span key={s} style={{ fontSize: 24, cursor: "pointer", opacity: watchRating >= s ? 1 : 0.2 }}
                                onClick={() => setWatchRating(s)}>★</span>
                            ))}
                          </div>

                          <input className="ch-input mono" placeholder="Quick thought... (optional)" value={watchNotes}
                            onChange={e => setWatchNotes(e.target.value)} style={{ marginBottom: 8 }} />

                          <button className="btn-primary" onClick={() => finishWatch(hId)}>
                            Shelf It 🎬
                          </button>
                        </div>
                      )}

                      {/* Simple habit — just a confirmation */}
                      {!isReading && !isWatching && !isTraining && !isLearning && (
                        <div className="ch-panel-inner">
                          <div className="mono" style={{ fontSize: 11, color: "var(--sage)" }}>✓ Done for today</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Monthly Goals ── */}
          {trackerData && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div className="mono" style={{ fontSize: 10, color: "var(--terracotta)", letterSpacing: "0.1em" }}>MONTHLY GOALS</div>
                {!showAddGoal && (
                  <button className="mono" onClick={() => { setShowAddGoal(true); fetchCurrentMonthCounts(); }}
                    style={{ fontSize: 10, color: "var(--terracotta)", background: "none", border: "1px solid var(--border)",
                      padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>
                    + Add Goal
                  </button>
                )}
              </div>

              {monthlyGoals.length === 0 && !showAddGoal && (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>Set a goal for the month</div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                    Finish a book, beat a game, visit a new country...
                  </div>
                  <button className="mono" onClick={() => { setShowAddGoal(true); fetchCurrentMonthCounts(); }}
                    style={{ fontSize: 11, color: "var(--terracotta)", background: "none", border: "1px solid var(--border)",
                      padding: "8px 20px", borderRadius: 8, cursor: "pointer", marginTop: 12 }}>
                    + Add Goal
                  </button>
                </div>
              )}

              {monthlyGoals.map(goal => {
                const prog = goalProgress[goal.id] || { current: 0, completed: false };
                const pct = goal.type === "custom" ? (prog.completed ? 100 : 0) : (goal.target > 0 ? Math.min(100, Math.round((prog.current / goal.target) * 100)) : 0);
                const goalType = GOAL_TYPES.find(t => t.key === goal.type);
                const unit = goalType?.unit || "goal";

                return (
                  <div key={goal.id} style={{
                    background: prog.completed ? "rgba(111,162,135,0.08)" : "var(--card)",
                    border: `1px solid ${prog.completed ? "var(--sage)" : "var(--border)"}`,
                    borderRadius: 12, padding: "14px 16px", marginBottom: 10,
                    transition: "all 0.3s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{goal.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bb" style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {goal.type === "custom" ? goal.title : (goal.target === 1 ? `${goal.title.replace(/s$/, "").replace("Finish ", "Finish a ").replace("Watch ", "Watch a ").replace("Beat ", "Beat a ").replace("Visit ", "Visit a ").replace("Complete ", "Complete an ")}` : `${goal.title}: ${goal.target}`)}
                        </div>
                        {goal.type !== "custom" && (
                          <div className="mono" style={{ fontSize: 10, color: prog.completed ? "var(--sage)" : "var(--text-faint)", marginTop: 2 }}>
                            {prog.current}/{goal.target} {goal.target === 1 ? unit : (unit === "country" ? "countries" : unit + "s")}
                            {prog.completed && " ✓"}
                          </div>
                        )}
                        {goal.type === "custom" && (
                          <div className="mono" style={{ fontSize: 10, color: prog.completed ? "var(--sage)" : "var(--text-faint)", marginTop: 2 }}>
                            {prog.completed ? "Done ✓" : "Tap circle to complete"}
                          </div>
                        )}
                      </div>

                      {goal.type === "custom" ? (
                        <div onClick={() => toggleCustomGoal(goal.id)} style={{
                          width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
                          background: prog.completed ? "var(--sage)" : "var(--cream-dark)",
                          border: prog.completed ? "none" : "2px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}>
                          {prog.completed && <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>✓</span>}
                        </div>
                      ) : (
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%", position: "relative",
                          background: `conic-gradient(${prog.completed ? "var(--sage)" : "var(--terracotta)"} ${pct * 3.6}deg, var(--cream-dark) 0deg)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: prog.completed ? "rgba(111,162,135,0.08)" : "var(--card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: prog.completed ? "var(--sage)" : "var(--charcoal)" }}>
                              {prog.completed ? "✓" : `${pct}%`}
                            </span>
                          </div>
                        </div>
                      )}

                      <span onClick={() => removeMonthlyGoal(goal.id)}
                        style={{ fontSize: 14, color: "var(--text-faint)", cursor: "pointer", opacity: 0.4, marginLeft: -4 }}>✕</span>
                    </div>

                    {goal.type !== "custom" && (
                      <div style={{ height: 4, background: "var(--cream-dark)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: prog.completed ? "var(--sage)" : "var(--terracotta)", borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Goal Flow */}
              {showAddGoal && (
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
                  padding: 16, marginBottom: 10,
                }}>
                  {!newGoalType ? (
                    <>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 10, letterSpacing: "0.05em" }}>WHAT DO YOU WANT TO ACCOMPLISH?</div>
                      {loadingCounts && <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 8 }}>Loading your stats...</div>}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {GOAL_TYPES.map(t => {
                          const alreadyHas = monthlyGoals.some(g => g.type === t.key && t.key !== "custom");
                          const currentCount = currentMonthCounts?.[t.key] || 0;
                          return (
                            <div key={t.key} onClick={() => {
                              if (alreadyHas) return;
                              setNewGoalType(t.key);
                              if (t.key !== "custom") setNewGoalTarget(String(currentCount + 1));
                            }} style={{
                              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                              background: alreadyHas ? "rgba(0,0,0,0.02)" : "var(--cream)",
                              border: "1px solid var(--border)", borderRadius: 10, cursor: alreadyHas ? "default" : "pointer",
                              opacity: alreadyHas ? 0.4 : 1,
                            }}>
                              <span style={{ fontSize: 20 }}>{t.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <span className="bb" style={{ fontSize: 13 }}>{t.label}</span>
                                {t.key !== "custom" && currentMonthCounts && currentCount > 0 && !alreadyHas && (
                                  <div className="mono" style={{ fontSize: 9, color: "var(--sage)", marginTop: 1 }}>
                                    {currentCount} already this month
                                  </div>
                                )}
                              </div>
                              {alreadyHas && <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)", marginLeft: "auto" }}>added</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--text-faint)", cursor: "pointer", marginTop: 12 }}
                        onClick={() => { setShowAddGoal(false); setCurrentMonthCounts(null); }}>Cancel</div>
                    </>
                  ) : newGoalType === "custom" ? (
                    <>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 10, letterSpacing: "0.05em" }}>CUSTOM GOAL</div>
                      <input className="ch-input mono" placeholder="e.g. Launch my app, Run a marathon..."
                        value={newGoalCustomTitle} onChange={e => setNewGoalCustomTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && newGoalCustomTitle.trim()) addMonthlyGoal(); }}
                        style={{ fontSize: 13, padding: "10px 14px", marginBottom: 10 }} autoFocus />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" style={{ flex: 1 }} disabled={!newGoalCustomTitle.trim() || savingGoals}
                          onClick={addMonthlyGoal}>{savingGoals ? "Saving..." : "Add Goal"}</button>
                        <button className="mono" onClick={() => { setNewGoalType(null); setNewGoalCustomTitle(""); }}
                          style={{ fontSize: 11, color: "var(--text-faint)", background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Back</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 10, letterSpacing: "0.05em" }}>
                        {GOAL_TYPES.find(t => t.key === newGoalType)?.emoji} HOW MANY THIS MONTH?
                      </div>
                      {currentMonthCounts && (currentMonthCounts[newGoalType] || 0) > 0 && (
                        <div style={{ textAlign: "center", marginBottom: 12, padding: "8px 12px", background: "rgba(111,162,135,0.08)", borderRadius: 8 }}>
                          <span className="mono" style={{ fontSize: 10, color: "var(--sage)" }}>
                            You've already done {currentMonthCounts[newGoalType]} this month
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                        <button onClick={() => { const minTarget = (currentMonthCounts?.[newGoalType] || 0) + 1; setNewGoalTarget(String(Math.max(minTarget, (parseInt(newGoalTarget) || 1) - 1))); }}
                          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--cream)", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                        <div style={{ flex: 1, textAlign: "center" }}>
                          <div className="bb" style={{ fontSize: 32 }}>{newGoalTarget}</div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                            {(() => { const u = GOAL_TYPES.find(t => t.key === newGoalType)?.unit || "goal"; return parseInt(newGoalTarget) === 1 ? u : (u === "country" ? "countries" : u + "s"); })()}
                          </div>
                        </div>
                        <button onClick={() => setNewGoalTarget(String((parseInt(newGoalTarget) || 1) + 1))}
                          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--cream)", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" style={{ flex: 1 }} disabled={savingGoals}
                          onClick={addMonthlyGoal}>{savingGoals ? "Saving..." : "Set Goal"}</button>
                        <button className="mono" onClick={() => { setNewGoalType(null); setNewGoalTarget("1"); }}
                          style={{ fontSize: 11, color: "var(--text-faint)", background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Back</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit habits button */}
          <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
            <button className="mono" onClick={startEditing}
              style={{ fontSize: 11, color: "var(--terracotta)", background: "none", border: "1px solid var(--border)",
                padding: "8px 24px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.05em" }}>
              Edit Habits
            </button>
          </div>
        </>
      )}
    </div>
  );
}


export default TrackScreen;

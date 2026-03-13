import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase";
import { SPORT_ICONS } from "../utils/constants";
import { formatPace, formatDuration, formatDistance } from "../utils/strava";
import { fetchWikiImage, sb } from "../utils/api";
import StravaRouteMap from "../components/StravaRouteMap";

function FriendsScreen({ session, profile, onToast, onPendingCountChange, isActive }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]); // accepted friends
  const [pendingIncoming, setPendingIncoming] = useState([]); // requests TO me
  const [pendingSent, setPendingSent] = useState([]); // requests FROM me
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id being acted on
  const [expandedFriend, setExpandedFriend] = useState(null); // friend id with menu open
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [reactions, setReactions] = useState({}); // { feedId: { '🔥': [uid,...], ... } }
  const [comments, setComments] = useState({}); // { feedId: [{ id, user_id, text, name, avatar, created_at }] }
  const [commentDrafts, setCommentDrafts] = useState({}); // { feedId: "text" }
  const [expandedComments, setExpandedComments] = useState({}); // { feedId: true }
  const [commentCounts, setCommentCounts] = useState({}); // { feedId: count }
  const [wishlistIds, setWishlistIds] = useState([]); // titles already in wishlist
  const [sendingComment, setSendingComment] = useState(null);
  const [blockedUsers, setBlockedUsers] = useState([]); // blocked user IDs
  const [reportingItem, setReportingItem] = useState(null); // feed item being reported
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [expandedReactions, setExpandedReactions] = useState(null); // feed id with picker open
  const [friendsTab, setFriendsTab] = useState("feed");
  const feedPanes = ["feed"];
  const feedPaneIndex = feedPanes.indexOf(friendsTab);
  const swipeRef = useRef(null);
  const swipeStart = useRef(null);
  const swipeDelta = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleSwipeStart = (e) => {
    const touch = e.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swipeDelta.current = 0;
  };
  const handleSwipeMove = (e) => {
    if (!swipeStart.current) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    // Only swipe horizontally if more horizontal than vertical
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swipeDelta.current = dx;
      // Resist at edges
      const atLeft = feedPaneIndex === 0 && dx > 0;
      const atRight = feedPaneIndex === feedPanes.length - 1 && dx < 0;
      const resist = atLeft || atRight ? 0.2 : 1;
      setSwipeOffset(dx * resist);
    }
  };
  const handleSwipeEnd = () => {
    if (!swipeStart.current) return;
    const dx = swipeDelta.current;
    const dt = Date.now() - swipeStart.current.time;
    const velocity = Math.abs(dx) / dt;
    const threshold = velocity > 0.3 ? 30 : 80; // faster swipe = lower threshold
    if (dx < -threshold && feedPaneIndex < feedPanes.length - 1) {
      setFriendsTab(feedPanes[feedPaneIndex + 1]);
    } else if (dx > threshold && feedPaneIndex > 0) {
      setFriendsTab(feedPanes[feedPaneIndex - 1]);
    }
    setSwipeOffset(0);
    swipeStart.current = null;
    swipeDelta.current = 0;
  };
  const [youFeedItems, setYouFeedItems] = useState([]);
  const [youFeedLoading, setYouFeedLoading] = useState(false);
  const youFeedLoaded = useRef(false);

  const REACTIONS = ["🔥", "❤️", "👏"];

  const toggleReaction = async (feedId, emoji) => {
    if (!session) return;
    const uid = session.user.id;
    const current = reactions[feedId]?.[emoji] || [];
    const hasReacted = current.includes(uid);

    // Optimistic update
    setReactions(prev => {
      const feedReactions = { ...(prev[feedId] || {}) };
      if (hasReacted) {
        feedReactions[emoji] = current.filter(id => id !== uid);
      } else {
        feedReactions[emoji] = [...current, uid];
      }
      return { ...prev, [feedId]: feedReactions };
    });

    if (hasReacted) {
      await sb(supabase.from("feed_reactions").delete()
        .eq("activity_id", feedId).eq("user_id", uid).eq("reaction_type", emoji), onToast, "Couldn't delete");

    } else {
      await sb(supabase.from("feed_reactions").insert({
        activity_id: feedId, user_id: uid, reaction_type: emoji,
        }), onToast, "Couldn't save");

    }
  };

  const loadComments = async (feedId) => {
    const { data } = await supabase.from("feed_comments")
      .select("*").eq("feed_activity_id", feedId)
      .order("created_at", { ascending: true });
    if (!data) return;
    // Resolve commenter profiles
    const uids = [...new Set(data.map(c => c.user_id))];
    const { data: profs } = await supabase.from("profiles")
      .select("id, name, username, avatar_url, avatar_emoji").in("id", uids);
    const profMap = {};
    (profs || []).forEach(p => { profMap[p.id] = p; });
    const enriched = data.map(c => {
      const p = profMap[c.user_id] || {};
      return { ...c, name: p.name || p.username || "", avatar: p.avatar_url || "", avatarEmoji: p.avatar_emoji || "👤" };
    });
    setComments(prev => ({ ...prev, [feedId]: enriched }));
  };

  const toggleComments = (feedId) => {
    const isOpen = expandedComments[feedId];
    setExpandedComments(prev => ({ ...prev, [feedId]: !isOpen }));
    if (!isOpen && !comments[feedId]) loadComments(feedId);
  };

  const postComment = async (feedId) => {
    const text = (commentDrafts[feedId] || "").trim();
    if (!text || !session || sendingComment) return;
    setSendingComment(feedId);
    const { data, error } = await supabase.from("feed_comments").insert({
      feed_activity_id: feedId, user_id: session.user.id, text,
    }).select().single();
    if (!error && data) {
      const newComment = {
        ...data,
        name: profile.name || profile.username || "",
        avatar: profile.avatarUrl || "",
        avatarEmoji: profile.avatar || "👤",
      };
      setComments(prev => ({ ...prev, [feedId]: [...(prev[feedId] || []), newComment] }));
      setCommentCounts(prev => ({ ...prev, [feedId]: (prev[feedId] || 0) + 1 }));
    }
    setCommentDrafts(prev => ({ ...prev, [feedId]: "" }));
    setSendingComment(null);
  };

  const addToWishlist = async (item) => {
    if (!session) return;
    const type = item.activity_type;
    const label = type === "book" ? "reading list" : type === "game" ? "play list" : "watch list";
    const { error } = await supabase.from("wishlist").insert({
      user_id: session.user.id,
      item_type: type,
      title: item.item_title || item.title,
      cover_url: item.item_cover || null,
      author: item.item_author || null,
      year: item.item_year || null,
    });
    if (!error) {
      setWishlistIds(prev => [...prev, item.item_title || item.title]);
      onToast(`Added to ${label}!`);

      // Notify the original poster (via feed_reactions with special type)
      if (item.id && item.user_id && item.user_id !== session.user.id) {
        try {
          await supabase.from("feed_reactions").upsert({
            activity_id: item.id,
            user_id: session.user.id,
            reaction_type: "wishlisted",
          }, { onConflict: "activity_id,user_id,reaction_type" });
        } catch (e) { console.error("Wishlist notification error:", e); }
      }
    }
  };

  const wishlistLabel = (type) => {
    if (type === "book") return "📚 Want to read";
    if (type === "game") return "🎮 Want to play";
    return "🎬 Want to watch";
  };
  const searchTimer = useRef(null);

  // Load friends and pending requests
  const loadFriends = useCallback(async () => {
    if (!session) return;
    const uid = session.user.id;

    // Load blocks, accepted, incoming, sent all in parallel
    const [{ data: blocks }, { data: accepted }, { data: incoming }, { data: sent }] = await Promise.all([
      supabase.from("blocked_users").select("blocked_id").eq("user_id", uid),
      supabase.from("friends").select("id, requester_id, receiver_id, created_at")
        .eq("status", "accepted").or(`requester_id.eq.${uid},receiver_id.eq.${uid}`).order("created_at", { ascending: false }),
      supabase.from("friends").select("id, requester_id, created_at")
        .eq("receiver_id", uid).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("friends").select("id, receiver_id")
        .eq("requester_id", uid).eq("status", "pending"),
    ]);

    const blockedIds = (blocks || []).map(b => b.blocked_id);
    setBlockedUsers(blockedIds);
    setPendingSent((sent || []).map(s => s.receiver_id));

    // Resolve friend + incoming profiles in parallel
    const friendIds = (accepted || []).map(f => f.requester_id === uid ? f.receiver_id : f.requester_id).filter(id => !blockedIds.includes(id));
    const incomingIds = (incoming || []).map(r => r.requester_id).filter(id => !blockedIds.includes(id));
    const allProfileIds = [...new Set([...friendIds, ...incomingIds])];

    let allProfiles = [];
    if (allProfileIds.length > 0) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, name, username, avatar_url, avatar_emoji")
        .in("id", allProfileIds);
      allProfiles = profs || [];
    }

    const friendProfiles = friendIds.map(fid => {
      const p = allProfiles.find(pp => pp.id === fid) || {};
      return {
        id: fid, name: p.name || "", username: p.username || "",
        avatarUrl: p.avatar_url || "", avatar: p.avatar_emoji || "👤",
        friendshipId: (accepted || []).find(f => f.requester_id === fid || f.receiver_id === fid)?.id,
      };
    });
    setFriends(friendProfiles);

    const incomingProfiles = (incoming || []).filter(r => !blockedIds.includes(r.requester_id)).map(r => {
      const p = allProfiles.find(pp => pp.id === r.requester_id) || {};
      return {
        friendshipId: r.id, id: r.requester_id,
        name: p.name || "", username: p.username || "",
        avatarUrl: p.avatar_url || "", avatar: p.avatar_emoji || "👤",
      };
    });
    setPendingIncoming(incomingProfiles);
    if (onPendingCountChange) onPendingCountChange(incomingProfiles.length);

    // Load activity feed from friends
    if (friendIds.length > 0) {
      const { data: feedData, error: feedErr } = await supabase
        .from("feed_activity")
        .select("id, user_id, activity_type, action, item_title, item_author, item_cover, item_year, title, rating, metadata, created_at")
        .in("user_id", friendIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (feedErr) console.error("Feed query error:", feedErr.message, feedErr.code);

      // Attach profile info to each feed item
      const feedWithProfiles = (feedData || []).map(item => {
        const prof = friendProfiles.find(f => f.id === item.user_id) || {};
        return { ...item, userName: prof.name || prof.username || "", userAvatar: prof.avatarUrl || "", userAvatarEmoji: prof.avatar || "👤", username: prof.username || "" };
      });
      setFeedItems(feedWithProfiles);

      // Load reactions, comment counts, and wishlist in parallel
      const feedIds = (feedData || []).map(f => f.id).filter(id => id != null && id !== "" && id !== undefined);
      if (feedIds.length > 0) {
        try {
          const [reactionsRes, countRes, wlRes] = await Promise.all([
            supabase.from("feed_reactions").select("activity_id, user_id, reaction_type").in("activity_id", feedIds),
            supabase.from("feed_comments").select("feed_activity_id").in("feed_activity_id", feedIds),
            supabase.from("wishlist").select("title").eq("user_id", uid),
          ]);

          if (reactionsRes.error) console.error("[Feed] reactions error:", reactionsRes.error.message, reactionsRes.error.code, reactionsRes.error.hint);
          if (countRes.error) console.error("[Feed] comments error:", countRes.error.message, countRes.error.code);

          const reactionsData = reactionsRes.data;
          const countData = countRes.data;
          const wlData = wlRes.data;

        const reactionsMap = {};
        (reactionsData || []).forEach(r => {
          if (r.reaction_type === "wishlisted") return; // Don't show as emoji reaction
          if (!reactionsMap[r.activity_id]) reactionsMap[r.activity_id] = {};
          if (!reactionsMap[r.activity_id][r.reaction_type]) reactionsMap[r.activity_id][r.reaction_type] = [];
          reactionsMap[r.activity_id][r.reaction_type].push(r.user_id);
        });
        setReactions(reactionsMap);

        const countMap = {};
        (countData || []).forEach(c => {
          countMap[c.feed_activity_id] = (countMap[c.feed_activity_id] || 0) + 1;
        });
        setCommentCounts(countMap);

        setWishlistIds((wlData || []).map(w => w.title));
        } catch (e) { console.error("[Feed] reactions/comments fetch error:", e); }
      } else {
        // Still load wishlist even with no feed items
        const { data: wlData } = await supabase.from("wishlist").select("title").eq("user_id", uid);
        setWishlistIds((wlData || []).map(w => w.title));
      }
    } else {
      setFeedItems([]);
    }

    setFeedLoading(false);
    setLoading(false);
  }, [session]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Refresh feed when tab becomes active (but not on initial mount since above handles that)
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (!hasLoadedOnce.current) { hasLoadedOnce.current = true; return; }
    if (isActive) loadFriends();
  }, [isActive]);

  // Load "You" feed when that tab is selected
  const loadYouFeed = useCallback(async () => {
    if (!session) return;
    setYouFeedLoading(true);
    try {
      const { data: feedData } = await supabase
        .from("feed_activity")
        .select("id, user_id, activity_type, action, item_title, item_author, item_cover, item_year, title, rating, metadata, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const items = (feedData || []).map(item => ({
        ...item, userName: profile.name || profile.username || "You",
        userAvatar: profile.avatarUrl || "", userAvatarEmoji: profile.avatar || "👤",
        username: profile.username || "", isOwn: true,
      }));
      setYouFeedItems(items);

      // Load reactions and comment counts for own feed items
      const feedIds = items.map(f => f.id).filter(id => id != null && id !== "" && id !== undefined);
      if (feedIds.length > 0) {
        try {
          const [reactionsRes, countRes] = await Promise.all([
            supabase.from("feed_reactions").select("activity_id, user_id, reaction_type").in("activity_id", feedIds),
            supabase.from("feed_comments").select("feed_activity_id").in("feed_activity_id", feedIds),
          ]);

          if (reactionsRes.error) console.error("[You feed] reactions error:", reactionsRes.error.message, reactionsRes.error.code, reactionsRes.error.hint);
          if (countRes.error) console.error("[You feed] comments error:", countRes.error.message, countRes.error.code);

          const reactionsData = reactionsRes.data;
          const countData = countRes.data;

          setReactions(prev => {
            const merged = { ...prev };
            (reactionsData || []).forEach(r => {
              if (r.reaction_type === "wishlisted") return;
              if (!merged[r.activity_id]) merged[r.activity_id] = {};
              if (!merged[r.activity_id][r.reaction_type]) merged[r.activity_id][r.reaction_type] = [];
              if (!merged[r.activity_id][r.reaction_type].includes(r.user_id)) merged[r.activity_id][r.reaction_type].push(r.user_id);
            });
            return merged;
          });
          setCommentCounts(prev => {
            const merged = { ...prev };
            (countData || []).forEach(c => { merged[c.feed_activity_id] = (merged[c.feed_activity_id] || 0) + 1; });
            return merged;
          });
        } catch (e) { console.error("[You feed] reactions/comments fetch error:", e); }
      }
    } catch (err) { console.error("You feed error:", err); }
    setYouFeedLoading(false);
    youFeedLoaded.current = true;
  }, [session, profile]);

  useEffect(() => {
    if (friendsTab === "you" && !youFeedLoaded.current) loadYouFeed();
  }, [friendsTab, loadYouFeed]);

  // Auto-generate event countdown feed posts
  useEffect(() => {
    if (!session) return;
    const checkCountdowns = async () => {
      try {
        const { data: events } = await supabase.from("workout_goals").select("id, name, target_date, emoji, location")
          .eq("user_id", session.user.id).eq("is_active", true)
          .not("target_date", "is", null);
        if (!events || events.length === 0) return;

        const now = new Date();
        const today = now.toISOString().split("T")[0];

        for (const event of events) {
          const target = new Date(event.target_date + "T12:00:00");
          const daysOut = Math.round((target - now) / (1000 * 60 * 60 * 24));
          if (daysOut < 0) continue; // past events

          const milestones = [];
          // Tomorrow post
          if (daysOut <= 1 && daysOut >= 0) milestones.push({ key: `countdown_day_${event.id}`, action: "countdown_day", label: "Tomorrow!" });
          // 1 week out
          else if (daysOut <= 7 && daysOut >= 5) milestones.push({ key: `countdown_week_${event.id}`, action: "countdown_week", label: "1 week out" });
          // Monthly (post once per month, only if >2 weeks out)
          else if (daysOut > 14) {
            const monthKey = `countdown_month_${event.id}_${now.getFullYear()}_${now.getMonth()}`;
            milestones.push({ key: monthKey, action: "countdown_month", label: `${Math.round(daysOut / 7)} weeks out` });
          }

          for (const m of milestones) {
            // Check if already posted
            const { data: existing } = await supabase.from("feed_activity")
              .select("id").eq("user_id", session.user.id).eq("title", m.key).maybeSingle();
            if (existing) continue;

            // Fetch location image from Wikipedia
            const locationImage = event.location ? await fetchWikiImage(event.location) : null;

            await supabase.from("feed_activity").insert({
              user_id: session.user.id,
              activity_type: "event",
              action: m.action,
              title: m.key,
              item_title: event.name,
              item_author: event.location || null,
              item_cover: locationImage || null,
              metadata: { emoji: event.emoji || "🎯", daysOut, label: m.label, targetDate: event.target_date },
            });
          }
        }
      } catch (e) { /* silent — countdown posts are nice-to-have */ }
    };
    checkCountdowns();
  }, [session]);

  // Search users
  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url, avatar_emoji")
        .neq("id", session.user.id)
        .ilike("username", `%${q.trim().toLowerCase()}%`)
        .limit(10);
      setSearchResults((data || []).filter(p => !blockedUsers.includes(p.id)).map(p => ({
        id: p.id,
        name: p.name || "",
        username: p.username || "",
        avatarUrl: p.avatar_url || "",
        avatar: p.avatar_emoji || "👤",
      })));
      setSearching(false);
    }, 400);
  };

  // Send friend request
  const sendRequest = async (userId) => {
    if (!session) return;
    setActionLoading(userId);
    const { error } = await supabase.from("friends").insert({
      requester_id: session.user.id,
      receiver_id: userId,
      status: "pending",
    });
    if (!error) {
      setPendingSent(prev => [...prev, userId]);
      onToast("Friend request sent!");
    } else if (error.code === "23505") {
      onToast("Already sent!");
    }
    setActionLoading(null);
  };

  // Accept request
  const acceptRequest = async (friendshipId, fromUser) => {
    setActionLoading(friendshipId);
    await sb(supabase.from("friends").update({ status: "accepted" }).eq("id", friendshipId), onToast, "Couldn't update");
    setPendingIncoming(prev => {
      const updated = prev.filter(p => p.friendshipId !== friendshipId);
      if (onPendingCountChange) onPendingCountChange(updated.length);
      return updated;
    });
    setFriends(prev => [...prev, fromUser]);
    onToast(`You and ${fromUser.name || fromUser.username} are now friends!`);
    setActionLoading(null);
  };

  // Decline request
  const declineRequest = async (friendshipId) => {
    setActionLoading(friendshipId);
    await sb(supabase.from("friends").delete().eq("id", friendshipId), onToast, "Couldn't delete");
    setPendingIncoming(prev => {
      const updated = prev.filter(p => p.friendshipId !== friendshipId);
      if (onPendingCountChange) onPendingCountChange(updated.length);
      return updated;
    });
    setActionLoading(null);
  };

  // Remove friend
  const removeFriend = async (friendId) => {
    if (!session) return;
    const uid = session.user.id;
    await sb(supabase.from("friends").delete()
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${uid})`), onToast, "Couldn't delete");

    setFriends(prev => prev.filter(f => f.id !== friendId));
    onToast("Friend removed");
  };

  // Block user
  const blockUser = async (userId, userName) => {
    if (!session) return;
    const uid = session.user.id;
    await sb(supabase.from("blocked_users").insert({ user_id: uid, blocked_id: userId }), onToast, "Couldn't save");
    // Also remove friendship if exists
    await sb(supabase.from("friends").delete()
      .or(`and(requester_id.eq.${uid},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${uid})`), onToast, "Couldn't delete");

    setBlockedUsers(prev => [...prev, userId]);
    setFriends(prev => prev.filter(f => f.id !== userId));
    setFeedItems(prev => prev.filter(f => f.user_id !== userId));
    setExpandedFriend(null);
    onToast(`${userName || "User"} blocked`);
  };

  // Unblock user
  const unblockUser = async (userId) => {
    if (!session) return;
    await sb(supabase.from("blocked_users").delete().eq("user_id", session.user.id).eq("blocked_id", userId), onToast, "Couldn't delete");
    setBlockedUsers(prev => prev.filter(id => id !== userId));
    onToast("User unblocked");
  };

  // Report content
  const submitReport = async () => {
    if (!session || !reportingItem || !reportReason.trim()) return;
    setSubmittingReport(true);
    await sb(supabase.from("reports").insert({
      reporter_id: session.user.id,
      reported_user_id: reportingItem.user_id,
      reported_content_id: reportingItem.id,
      reason: reportReason.trim(),
      context: `${reportingItem.userName}: ${reportingItem.action} - ${reportingItem.item_title || reportingItem.title}`,
      }), onToast, "Couldn't save");

    setSubmittingReport(false);
    setReportingItem(null);
    setReportReason("");
    onToast("Report submitted — thank you");
  };

  // Get relationship status for a search result
  const getStatus = (userId) => {
    if (friends.some(f => f.id === userId)) return "accepted";
    if (pendingSent.includes(userId)) return "pending";
    if (pendingIncoming.some(p => p.id === userId)) return "incoming";
    return "none";
  };

  const handleCopyLink = () => {
    const url = `https://mymantl.app/${profile.username}`;
    navigator.clipboard?.writeText(url).then(() => onToast("Link copied!")).catch(() => {});
  };

  const handleShareLink = () => {
    const url = `https://mymantl.app/${profile.username}`;
    if (navigator.share) {
      navigator.share({ title: `${profile.name}'s Mantl`, url });
    } else {
      handleCopyLink();
    }
  };

  const AvatarCircle = ({ user, size = 40 }) => (
    <div className="friends-result-avatar" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : (user.avatar || "👤")}
    </div>
  );

  const timeAgo = (dateStr) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const actionEmoji = (type) => {
    switch (type) {
      case "book": return "📖";
      case "movie": return "🎬";
      case "show": return "📺";
      case "game": return "🎮";
      case "event": return "🏆";
      case "habits": return "📊";
      case "strava": return "🏃";
      case "streak": return "🔥";
      default: return "📌";
    }
  };

  const renderStars = (r) => {
    if (!r) return null;
    return "★".repeat(r) + "☆".repeat(5 - r);
  };

  const actionLabel = (item) => {
    const own = item.isOwn;
    if (item.activity_type === "habits") return item.action || "started tracking";
    if (item.activity_type === "strava") {
      const a = (item.action || "").toLowerCase();
      const sportVerbs = {
        "run": "went running", "trail run": "went trail running", "virtual run": "went running",
        "walk": "went walking", "hike": "went hiking",
        "ride": "went cycling", "virtual ride": "went cycling", "mountain bike ride": "went mountain biking", "gravel ride": "went gravel riding", "e bike ride": "went e-biking",
        "swim": "went swimming",
        "snowboard": "went snowboarding", "alpine ski": "went skiing", "nordic ski": "went nordic skiing", "backcountry ski": "went backcountry skiing",
        "workout": "worked out", "weight training": "hit the weights", "crossfit": "did CrossFit", "yoga": "did yoga", "pilates": "did pilates",
        "rock climbing": "went climbing", "ice skate": "went ice skating", "inline skate": "went skating",
        "rowing": "went rowing", "kayaking": "went kayaking", "canoeing": "went canoeing", "surfing": "went surfing",
        "soccer": "played soccer", "tennis": "played tennis", "golf": "played golf", "badminton": "played badminton", "pickleball": "played pickleball",
      };
      return sportVerbs[a] || (a ? `went ${a}ing` : "worked out");
    }
    if (item.activity_type === "streak") return item.action || "hit a streak";
    if (item.activity_type === "book") {
      if (item.action === "finished") return "finished reading";
      if (item.action === "started" || item.action === "reading") return "started reading";
      if (item.action === "progress") return own ? "are reading" : "is reading";
      return "shelved";
    }
    if (item.activity_type === "movie") return "watched";
    if (item.activity_type === "show") return "finished watching";
    if (item.activity_type === "game") return item.action === "finished" ? "completed" : (own ? "are playing" : "is playing");
    if (item.activity_type === "event") { if (item.action === "countdown_day") return "is up tomorrow for"; if (item.action === "countdown_week") return "is 1 week out from"; if (item.action === "countdown_month") return "is training for"; return "completed"; }
    return item.action || "shared";
  };

  const renderFeedCard = (item, i, { showReport = true } = {}) => (
    <div className="feed-card" key={item.id || i}>
      <div className="feed-avatar" onClick={() => item.username && window.open(`https://mymantl.app/${item.username}`, "_blank")} style={{ cursor: "pointer" }}>
        {item.userAvatar ? <img src={item.userAvatar} alt="" /> : (item.userAvatarEmoji || "👤")}
      </div>
      <div className="feed-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="feed-action-text" onClick={() => item.username && window.open(`https://mymantl.app/${item.username}`, "_blank")} style={{ cursor: "pointer", flex: 1 }}>
            <strong>{item.isOwn ? "You" : item.userName}</strong>{" "}
            {actionLabel(item)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)", letterSpacing: "0.03em" }}>{timeAgo(item.created_at)}</span>
            {showReport && !item.isOwn && (
              <span
                style={{ padding: "0 2px", fontSize: 14, color: "var(--text-faint)", cursor: "pointer", letterSpacing: 2 }}
                onClick={(e) => { e.stopPropagation(); setReportingItem(item); setReportReason(""); }}
              >•••</span>
            )}
          </div>
        </div>

        {/* Rich card content */}
        {item.activity_type === "strava" && item.metadata ? (
          (() => {
            const m = item.metadata;
            const icon = m.sport_icon || SPORT_ICONS[m.sport_type] || "💪";
            const isRun = (m.sport_type || "").toLowerCase().includes("run");
            const isRide = (m.sport_type || "").toLowerCase().includes("ride");
            const stats = [
              m.distance > 0 && { value: formatDistance(m.distance), label: "DISTANCE" },
              m.moving_time > 0 && { value: formatDuration(m.moving_time), label: "TIME" },
              (isRun || isRide) && m.average_speed > 0 && { value: isRun ? formatPace(m.average_speed) : `${(m.average_speed * 3.6).toFixed(1)} km/h`, label: isRun ? "PACE" : "SPEED" },
              m.total_elevation_gain > 0 && { value: `${Math.round(m.total_elevation_gain)}m`, label: "ELEV" },
              m.average_heartrate > 0 && { value: Math.round(m.average_heartrate), label: "HR" },
            ].filter(Boolean);
            return (
              <div style={{ background: "var(--bg-card)", borderRadius: 12, overflow: "hidden", marginTop: 5 }}>
                {/* Photo or map hero */}
                {m.photo_url ? (
                  <div style={{ width: "100%", height: 160, overflow: "hidden" }}>
                    <img src={m.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : m.polyline ? (
                  <div style={{ width: "100%", height: 130, overflow: "hidden" }}>
                    <StravaRouteMap polyline={m.polyline} />
                  </div>
                ) : null}
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{icon}</span>
                    <span className="bb" style={{ fontSize: 15, color: "var(--text-primary)", flex: 1 }}>{item.item_title}</span>
                  </div>
                  {stats.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-medium)" }}>
                      {stats.map((s, i) => (
                        <div key={i} style={{ textAlign: i === 0 ? "left" : "center" }}>
                          <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{s.value}</div>
                          <div className="mono" style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", marginTop: 1 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : item.activity_type === "streak" && item.metadata ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginTop: 5, background: "var(--bg-card)", borderRadius: 10 }}>
            <div style={{ fontSize: 28 }}>{item.metadata.habit_emoji || "🔥"}</div>
            <div style={{ flex: 1 }}>
              <div className="bb" style={{ fontSize: 16, color: "var(--text-primary)" }}>{item.metadata.streak_count}-day streak</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--accent-gold)", letterSpacing: "0.05em" }}>{item.metadata.habit_name}</div>
            </div>
            <div style={{ fontSize: 28 }}>🔥</div>
          </div>
        ) : item.activity_type === "habits" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{ fontSize: 24 }}>📊</div>
            <div>
              <div className="feed-item-title">{item.title}</div>
              <div className="feed-item-meta" style={{ fontSize: 11 }}>{item.item_title}</div>
            </div>
          </div>
        ) : item.activity_type === "event" && item.metadata?.label ? (
          /* Event countdown hero card */
          <div style={{ borderRadius: 14, overflow: "hidden", marginTop: 5, position: "relative", minHeight: 100 }}>
            {item.item_cover ? (
              <img src={item.item_cover} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: "100%", height: 100, background: "linear-gradient(135deg, var(--bg-card) 0%, #2a2a3e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                {item.metadata?.emoji || "🎯"}
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%)", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{item.metadata?.emoji || "🎯"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", textTransform: "uppercase", letterSpacing: "0.02em" }}>{item.item_title}</div>
                  {item.item_author && <div style={{ fontFamily: "'Lora', serif", fontSize: 11, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>{item.item_author}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 100, background: "rgba(196,115,79,0.85)", backdropFilter: "blur(4px)" }}>
                  <span className="mono" style={{ fontSize: 10, color: "#fff", fontWeight: 600, letterSpacing: "0.03em" }}>{item.metadata.label}</span>
                </div>
                {item.metadata.targetDate && (
                  <div style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
                    <span className="mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: "0.03em" }}>{new Date(item.metadata.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="feed-item-row">
            {item.item_cover ? (
              <img className="feed-item-cover" src={item.item_cover} alt="" />
            ) : (
              <div className="feed-item-cover" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "var(--bg-elevated)" }}>
                {item.activity_type === "event" && item.metadata?.emoji ? item.metadata.emoji : actionEmoji(item.activity_type)}
              </div>
            )}
            <div className="feed-item-info">
              <div className="feed-item-title">{item.item_title || item.title}</div>
              {item.item_author && <div className="feed-item-meta">{item.item_author}{item.item_year ? ` · ${item.item_year}` : ""}</div>}
              {item.rating > 0 && (
                <div className="feed-item-rating" style={{ color: "var(--accent-gold)" }}>{renderStars(item.rating)}</div>
              )}
              {item.activity_type === "event" && item.metadata?.label && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "3px 10px", borderRadius: 100, background: "rgba(196,115,79,0.1)", border: "1px solid rgba(196,115,79,0.2)" }}>
                  <span style={{ fontSize: 12 }}>{item.metadata.emoji || "🎯"}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--accent-terra)", letterSpacing: "0.03em" }}>{item.metadata.label}</span>
                  {item.metadata.targetDate && <span className="mono" style={{ fontSize: 9, color: "var(--text-faint)" }}>· {new Date(item.metadata.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                </div>
              )}
              {item.metadata?.percent && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ height: 4, background: "var(--border-medium)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${item.metadata.percent}%`, background: "var(--accent-terra)", borderRadius: 2 }} />
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: "var(--text-faint)", marginTop: 2 }}>{item.metadata.percent}% complete</div>
                </div>
              )}
              {item.metadata?.source === "letterboxd" && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--text-faint)", background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 4, marginTop: 4 }}>
                  <span style={{ display: "flex", gap: 2 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E054" }} />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#40BCF4" }} />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FF8000" }} />
                  </span>
                  <span className="mono">via Letterboxd</span>
                </div>
              )}
              {item.metadata?.source === "steam" && (
                <div style={{ marginTop: 4 }}>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {item.metadata.playtime_total > 0 && (
                      <span>🕐 {item.metadata.playtime_total}h total</span>
                    )}
                    {item.metadata.playtime_2weeks > 0 && (
                      <span>📅 {item.metadata.playtime_2weeks}h this week</span>
                    )}
                    {item.metadata.achievements_total > 0 && (
                      <span>🏆 {item.metadata.achievements_earned}/{item.metadata.achievements_total}</span>
                    )}
                  </div>
                  {item.metadata.achievements_total > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ height: 4, background: "var(--border-medium)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((item.metadata.achievements_earned / item.metadata.achievements_total) * 100)}%`, background: "#4a6fa5", borderRadius: 2 }} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, color: "var(--text-faint)", background: "rgba(255,255,255,0.04)", padding: "2px 7px", borderRadius: 4, marginTop: 4 }}>
                    <span className="mono">🎮 via Steam</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reactions left, comment + timestamp right */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 5, gap: 4 }}>
          {REACTIONS.filter(emoji => (reactions[item.id]?.[emoji] || []).length > 0).map(emoji => {
            const count = (reactions[item.id]?.[emoji] || []).length;
            const active = (reactions[item.id]?.[emoji] || []).includes(session?.user?.id);
            return (
              <div key={emoji} className={`feed-reaction-btn${active ? " active" : ""}`}
                onClick={(e) => { e.stopPropagation(); toggleReaction(item.id, emoji); }}>
                {emoji}<span className="feed-reaction-count">{count}</span>
              </div>
            );
          })}
          {expandedReactions === item.id ? (
            REACTIONS.filter(emoji => (reactions[item.id]?.[emoji] || []).length === 0).map(emoji => (
              <div key={emoji} className="feed-reaction-btn"
                onClick={(e) => { e.stopPropagation(); toggleReaction(item.id, emoji); setExpandedReactions(null); }}>
                {emoji}
              </div>
            ))
          ) : (
            <div className="feed-reaction-btn" style={{ fontSize: 12, opacity: 0.5 }}
              onClick={(e) => { e.stopPropagation(); setExpandedReactions(expandedReactions === item.id ? null : item.id); }}>☺+</div>
          )}
          {!item.isOwn && item.activity_type && !["event", "habits", "strava", "country", "streak"].includes(item.activity_type) && !wishlistIds.includes(item.item_title || item.title) && (
            <div className="feed-wishlist-btn" onClick={(e) => { e.stopPropagation(); addToWishlist(item); }}>
              {wishlistLabel(item.activity_type)}
            </div>
          )}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-faint)", cursor: "pointer", letterSpacing: "0.03em" }}
              onClick={(e) => { e.stopPropagation(); toggleComments(item.id); }}>
              {expandedComments[item.id] ? "Hide" : (commentCounts[item.id] > 0 ? `${commentCounts[item.id]} comment${commentCounts[item.id] !== 1 ? "s" : ""}` : "Comment")}
            </span>
          </div>
        </div>

        {expandedComments[item.id] && (
          <div className="feed-comments-section" onClick={(e) => e.stopPropagation()}>
            {(comments[item.id] || []).map((c, ci) => (
              <div className="feed-comment" key={c.id || ci}>
                <div className="feed-comment-avatar">
                  {c.avatar ? <img src={c.avatar} alt="" /> : (c.avatarEmoji || "👤")}
                </div>
                <div className="feed-comment-body">
                  <div className="feed-comment-name">{c.name}</div>
                  <div className="feed-comment-text">{c.text}</div>
                  <div className="feed-comment-time">{timeAgo(c.created_at)}</div>
                </div>
              </div>
            ))}
            <div className="feed-comment-input-row">
              <input className="feed-comment-input" placeholder="Add a comment..."
                value={commentDrafts[item.id] || ""}
                onChange={(e) => setCommentDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") postComment(item.id); }} />
              <button className="feed-comment-send"
                disabled={!(commentDrafts[item.id] || "").trim() || sendingComment === item.id}
                onClick={() => postComment(item.id)}>→</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <div className="friends-screen">

      {/* ── FEED ── */}
      <div style={{ minHeight: "60vh" }}>
        {feedLoading ? (
          <div className="feed-loading">Loading feed...</div>
        ) : feedItems.length === 0 ? (
          <div className="feed-empty">
            <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
            <div className="bb" style={{ fontSize: 15, marginBottom: 6 }}>Your feed is empty</div>
            <div>Add friends in your Profile to see what they're reading, watching, and working on.</div>
          </div>
        ) : (
          feedItems.map((item, i) => renderFeedCard(item, i))
        )}
      </div>

      {/* Report Modal */}
      {reportingItem && (
        <div className="overlay" onClick={() => setReportingItem(null)}>
          <div className="pin-picker" onClick={e => e.stopPropagation()}>
            <div className="pin-picker-header">
              <div className="pin-picker-title">Report Content</div>
              <div className="pin-picker-close" onClick={() => setReportingItem(null)}>✕</div>
            </div>
            <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-faint)" }}>
                Reporting activity by <strong>{reportingItem.userName}</strong>
              </div>
              <div>
                <div className="event-form-label">What's the issue?</div>
                {["Spam", "Inappropriate content", "Harassment", "Other"].map(reason => (
                  <div
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    style={{
                      padding: "10px 14px", marginBottom: 6, borderRadius: 8, cursor: "pointer",
                      border: reportReason === reason ? "2px solid var(--accent-green)" : "1px solid var(--border-medium)",
                      background: reportReason === reason ? "rgba(74,222,128,0.08)" : "var(--bg-input)",
                      fontSize: 14, fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >{reason}</div>
                ))}
              </div>
              <button
                className="btn-shelf-it"
                disabled={!reportReason || submittingReport}
                onClick={submitReport}
              >
                {submittingReport ? "Submitting..." : "Submit Report"}
              </button>
              <div
                style={{ textAlign: "center", fontSize: 12, color: "#C45043", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}
                onClick={() => { blockUser(reportingItem.user_id, reportingItem.userName); setReportingItem(null); }}
              >Block this user</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default FriendsScreen;

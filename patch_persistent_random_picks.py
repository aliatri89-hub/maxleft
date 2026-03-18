"""
Patch: Make "Have You Seen" (random_pick) cards persistent.

Problem:
  - _randomPicksCache is module-level, survives tab switches but NOT page reloads
  - isExplicit refresh re-rolls the cache, changing which movies appear
  - feed_random_unwatched RPC returns different results each call

Fix:
  - Persist picks in localStorage so they survive reloads
  - Never re-roll existing picks on refresh
  - Only generate new picks when cache is truly empty (first visit)
  - The 8-hour drop system handles adding NEW cards to the feed

Apply: python patch_persistent_random_picks.py
"""

import re

FILE = "src/hooks/community/useFeed.js"

with open(FILE, "r") as f:
    content = f.read()

# ═══════════════════════════════════════════
# 1. Replace module-level cache with localStorage-backed persistence
# ═══════════════════════════════════════════

old_cache = """// Module-level cache — survives tab switches (component unmount/remount).
const _randomPicksCache = new Map();"""

new_cache = """// Module-level cache — survives tab switches (component unmount/remount).
// localStorage layer underneath — survives page reloads / app restarts.
// Once a "Have You Seen" pick is chosen, it stays forever (new picks come from 8h drops).
const _randomPicksCache = new Map();

const _PICKS_STORAGE_KEY = (uid) => `mantl_random_picks_${uid}`;

function _getPersistedPicks(userId) {
  try {
    const raw = localStorage.getItem(_PICKS_STORAGE_KEY(userId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _persistPicks(userId, picks) {
  try {
    localStorage.setItem(_PICKS_STORAGE_KEY(userId), JSON.stringify(picks));
  } catch {}
}"""

assert old_cache in content, "Could not find module-level cache declaration"
content = content.replace(old_cache, new_cache)

# ═══════════════════════════════════════════
# 2. Replace the cache population logic
#    OLD: re-rolls on isExplicit (pull-to-refresh)
#    NEW: only seeds if no persisted picks exist at all
# ═══════════════════════════════════════════

old_populate = """      if (isExplicit || !_randomPicksCache.has(userId)) {
        _randomPicksCache.set(userId, rawRandom.filter(r => r.media_type !== "book"));
      }"""

new_populate = """      // Stable picks: load from module cache → localStorage → server (first visit only).
      // Once picks are set, they never re-roll. New "Have You Seen" cards come from 8h drops.
      if (!_randomPicksCache.has(userId)) {
        const persisted = _getPersistedPicks(userId);
        if (persisted && persisted.length > 0) {
          _randomPicksCache.set(userId, persisted);
        } else {
          const fresh = rawRandom.filter(r => r.media_type !== "book");
          _randomPicksCache.set(userId, fresh);
          _persistPicks(userId, fresh);
        }
      }"""

assert old_populate in content, "Could not find cache population logic"
content = content.replace(old_populate, new_populate)

with open(FILE, "w") as f:
    f.write(content)

print("✅ Patched useFeed.js — random picks now persist across reloads")
print()
print("What changed:")
print("  1. Added localStorage persistence layer (_getPersistedPicks / _persistPicks)")
print("  2. Removed isExplicit bypass — pull-to-refresh no longer re-rolls picks")
print("  3. Cache load order: module Map → localStorage → server RPC (first visit only)")
print()
print("Result:")
print("  - 'Have You Seen: Planet of the Apes' stays Planet of the Apes forever")
print("  - New 8h drop generates a new card with a new movie")
print("  - Pull-to-refresh updates logs/episodes/badges but NOT random picks")

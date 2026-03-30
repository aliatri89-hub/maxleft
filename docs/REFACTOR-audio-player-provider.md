# Refactor: AudioPlayerProvider.jsx

**Status:** Parked — do after badge celebration pipeline is stable  
**Current size:** ~2,035 lines (single file)  
**Target:** 5–6 files, each 200–400 lines  
**Risk level:** Medium — all audio flows run through this file, so each extraction needs testing on native + web  

---

## Why

The file has grown into a monolith handling seven distinct concerns: playback engine, bridge event wiring, queue management, recents/bookmark persistence, sleep timer, analytics, and all UI (bubble, full-screen sheet, queue toast). Bugs like the background queue-advance-not-playing issue are harder to trace because state and side effects are deeply interleaved. Splitting along natural seams will make each piece independently testable and easier to reason about.

---

## Current layout (line map)

| Lines       | Section                         | Concern              |
|-------------|--------------------------------|----------------------|
| 1–32        | Imports, constants, theme       | Shared config        |
| 33–158      | Helpers (stripHtml, cleanDescription, fmt, bookmark save/load) | Utilities |
| 160–197     | Recents persistence (load, persist, upsert) | Persistence |
| 199–419     | `PlayerBubble` component (~220 lines, includes swipe-to-dismiss) | UI |
| 420–1328    | `FullScreenPlayer` component (~900 lines, includes scrubber, sleep picker, queue/recents lists, artwork double-tap skip, swipe-to-dismiss) | UI |
| 1329–1390   | `QueueToast` component          | UI                   |
| 1391–1930   | `AudioPlayerProvider` — the provider itself (~540 lines: state, bridge event wiring, bookmark restore, save on visibility change, all playback/queue/sleep actions, media notification, context value) | Engine + orchestration |
| 1931–2035   | Render: portal for bubble, portal for full-screen sheet, queue toast, keyframes CSS | UI (render tree) |

---

## Target file structure

```
src/components/community/shared/audio/
├── AudioPlayerProvider.jsx      # ~200 lines — thin orchestrator, context, render
├── usePlaybackEngine.js         # ~250 lines — bridge events, state, play/pause/skip/seek/retry
├── usePlaybackPersistence.js    # ~150 lines — bookmarks, recents, save-on-visibility
├── useQueueManager.js           # ~120 lines — queue state, add/remove/advance/clear
├── useSleepTimer.js             # ~60 lines  — sleep timer state + actions
├── PlayerBubble.jsx             # ~220 lines — mini player UI (unchanged, just extracted)
├── FullScreenPlayer.jsx         # ~900 lines — full-screen sheet UI (unchanged, just extracted)
├── QueueToast.jsx               # ~60 lines  — toast UI (unchanged, just extracted)
└── audioHelpers.js              # ~160 lines — stripHtml, cleanDescription, fmt, timecode parsing, constants
```

---

## Extraction plan (order matters)

### Step 1: Extract `audioHelpers.js`

Pure functions and constants — zero risk.

Move out:
- All constants (`SPEEDS`, `STORAGE_KEY`, `RECENTS_KEY`, `ACCENT`, theme `t`, etc.)
- `stripHtml`, `cleanDescription`, `parseTimecodeSeconds`, `fmt`
- `PROMO_RE`, `SHOWNOTES_RE`, `TIMECODE_RE`

Test: app loads, episodes display descriptions correctly.

### Step 2: Extract UI components

Move `PlayerBubble`, `FullScreenPlayer`, and `QueueToast` into their own files. They already receive everything via props — no state extraction needed, just file moves + imports.

Test: bubble renders, full-screen opens/closes, swipe-down works, queue toast appears on add.

### Step 3: Extract `usePlaybackPersistence`

Move out:
- `saveBookmark`, `loadBookmark`, `loadRecents`, `persistRecents`, `upsertRecent`
- The `recents` state + `recentsRef` + `updateRecents`
- The bookmark restore `useEffect`
- The visibility-change / beforeunload save `useEffect`

Hook signature:
```js
usePlaybackPersistence(currentEp, bridge, speed)
// Returns: { recents, updateRecents, recentsRef, saveCurrentBookmark }
```

Test: play an episode, background the app, reopen — progress is saved. Check recents list populates.

### Step 4: Extract `useSleepTimer`

Move out:
- `sleepTimer` state, `sleepTimerRef`
- `setSleepTimerAction`, `clearSleepTimer`
- The sleep timer timeout logic

Hook signature:
```js
useSleepTimer(onSleepFire)
// Returns: { sleepTimer, setSleepTimer, clearSleepTimer, sleepTimerRef }
```

`onSleepFire` callback pauses playback. The `onEnded` handler in the engine checks `sleepTimerRef.current?.endOfEpisode` before advancing — that ref can be passed in.

Test: set 15-min sleep timer, set end-of-episode timer. Verify both fire correctly.

### Step 5: Extract `useQueueManager`

Move out:
- `queue` state, `queueRef`
- `addToQueue`, `removeFromQueue`, `clearQueue`, `playNextInQueue`
- `advanceQueue` (the function that pops next and calls play)
- `advanceQueueRef` + its sync effect
- `pendingAutoPlayRef` + the focus-resume auto-play logic
- `showNudge` state + toast trigger

Hook needs a `playEpisode` callback from the engine to actually start the next track.

Hook signature:
```js
useQueueManager(playFn, currentEp, speed, bridge, updateRecents, recentsRef)
// Returns: { queue, addToQueue, removeFromQueue, clearQueue, playNextInQueue, advanceQueueRef, pendingAutoPlayRef, showNudge }
```

Test: add episodes to queue, let one finish — next auto-plays. Test background advance + foreground resume. Test clear queue.

### Step 6: Extract `usePlaybackEngine`

Move out:
- Core state: `currentEp`, `isPlaying`, `progress`, `duration`, `speed`, `buffering`, `error`, `bufferedPct`
- Bridge event wiring `useEffect` (timeupdate, play, pause, ended, error, waiting, canplay, focusregained, bufferprogress)
- `playEpisode`, `togglePlay`, `skip`, `seekTo`, `stop`, `dismiss`, `cycleSpeed`, `retry`
- Stall timeout logic
- `reportDeadAudio`, `trackEvent` calls
- Media notification `useEffect`

Hook signature:
```js
usePlaybackEngine(bridge, session, advanceQueueRef, sleepTimerRef, pendingAutoPlayRef)
// Returns: { currentEp, isPlaying, progress, duration, speed, buffering, error, bufferedPct,
//            playEpisode, togglePlay, skip, seekTo, stop, dismiss, cycleSpeed, retry }
```

Test: full playback flow — play, pause, skip, seek, speed change, error retry, stall recovery.

### Step 7: Slim down `AudioPlayerProvider.jsx`

What remains:
- Import all hooks and UI components
- Call hooks, wire them together
- Build context value
- Render portals (bubble, full-screen sheet, queue toast, keyframe styles)

---

## Key risks and mitigations

**Circular dependencies between hooks.** The engine needs `advanceQueueRef` from the queue manager; the queue manager needs `playEpisode` from the engine. Solution: the provider instantiates both and passes refs/callbacks between them. The hooks don't import each other.

**Stale closures.** Several handlers use refs (`advanceQueueRef`, `sleepTimerRef`, `recentsRef`, `pendingAutoPlayRef`) to avoid stale closure bugs. These refs must stay in the hook that owns them, and be passed to consumers. Don't convert refs to state or callbacks without careful thought.

**Bridge singleton.** `nativeAudioBridge.js` exports a singleton. Multiple hooks subscribing to it is fine (the emitter supports multiple listeners), but cleanup in `useEffect` returns must be precise — each hook unsubscribes only its own handlers.

**Testing on native.** Every step should be tested on the Android build, not just web. The bridge behaves differently (polling vs native events, background restrictions, focus callbacks). The background queue advance bug that prompted this doc only manifested on native.

---

## Not in scope

- Refactoring `nativeAudioBridge.js` (it's 564 lines but cleanly structured — leave it)
- Changing any behavior or UI — this is a pure structural refactor
- Adding tests (would be nice but separate effort)

---

## Definition of done

- No file over 400 lines except `FullScreenPlayer.jsx` (which is mostly render JSX and will shrink when the scrubber/sleep-picker get extracted later)
- All existing audio flows work identically: play from community item, queue advance, background playback, foreground resume, recents, bookmarks, sleep timer, swipe-to-dismiss, double-tap skip
- No regressions on native Android build

# MANTL Testing Checklist
*Pre-launch QA — test on physical Android device unless noted*

---

## 1. Auth & Account

### Sign Up
- [ ] Sign up with a new email — confirm redirect lands on onboarding, not feed
- [ ] Sign up with an already-registered email — confirm graceful error, not silent fail
- [ ] Sign up with a weak password — confirm validation message shows
- [ ] Confirm email link works and redirects correctly into the app
- [ ] After confirming, profile row exists in `profiles` table

### Log In
- [ ] Log in with correct credentials
- [ ] Log in with wrong password — confirm error message, account not locked
- [ ] Log in with unconfirmed email — confirm message is clear
- [ ] Session persists after closing and reopening the app
- [ ] Session persists after device restart

### Log Out
- [ ] Log out from settings — redirects to auth screen
- [ ] RevenueCat anonymous identity is reset on logout (no lingering entitlements)
- [ ] Log back in — session restores cleanly, no stale state

### Password Reset
- [ ] Request password reset — email arrives
- [ ] Reset link works, password updates
- [ ] Old password no longer works after reset

### Unauthenticated State
- [ ] Opening app without account shows NPP pitch screen
- [ ] Opening app without account shows BC pitch screen
- [ ] Games are accessible without account
- [ ] Feed is accessible without account
- [ ] Community tracking, badges, diary blocked — prompts sign up, not crash

---

## 2. Onboarding

- [ ] Onboarding flow completes without errors
- [ ] Letterboxd username entry — valid username proceeds, invalid gives clear error
- [ ] Skipping Letterboxd sync proceeds cleanly
- [ ] Community selection persists after onboarding
- [ ] Badge award check runs after Letterboxd import completes (inline in `importMovies`)
- [ ] First-sync does NOT flood notifications (regression — was fixed, confirm still fixed)
- [ ] After onboarding, feed loads with content, not blank

---

## 3. Feed

### Podcast Playback
- [ ] Tapping an episode starts native audio (not HTML audio)
- [ ] Playback continues when app is backgrounded
- [ ] Lock screen / notification controls appear (play/pause)
- [ ] Notification shows podcast name and episode title
- [ ] Scrubbing the progress bar works (confirm seek uses integer seconds — Java getInt bug)
- [ ] Seek forward/back buttons work if present
- [ ] Resuming after a phone call continues correctly
- [ ] Playback stops cleanly when another audio app takes focus
- [ ] Playing a second episode stops the first
- [ ] Episode progress is not lost if you navigate away and return

### Feed Cards (VHS)
- [ ] VHS tape cards render correctly — cream label, Permanent Marker font, sharpie stars
- [ ] TMDB movie logo appears on label (not broken image)
- [ ] Logo enrichment race condition is NOT present — logo loads without flicker or fallback on every card (regression)
- [ ] Tap-to-flip shows community context on reverse
- [ ] Activity feed cards: 16:9 backdrop, amber overlay, worn vignette, date + podcast pills in bottom strip
- [ ] Browse cards: releases = artwork, streaming = filmstrip
- [ ] Empty feed state shows MANTL logo, not blank screen

### Feed Subscriptions
- [ ] Subscribing to a podcast updates the feed
- [ ] Unsubscribing removes it from the feed
- [ ] New episodes appear after RSS sync

---

## 4. Communities

### General
- [ ] NPP community loads — franchise grid, genre grid, brown host arrows present
- [ ] BC community loads — bank check hero, miniseries shelves load
- [ ] Switching between community tabs (Films / Coming Soon / Recent Episodes) works
- [ ] Community stats hidden (`SHOW_COMMUNITY_STATS=false`) — no stats UI visible
- [ ] Voting hidden (`SHOW_VOTING=false`) — no voting UI visible

### Logging a Film
- [ ] Log a film from NPP community — progress updates in community_user_progress
- [ ] Log a film from BC community — same
- [ ] Log with a star rating — rating persists on film card
- [ ] Log with a date — date persists
- [ ] Update an existing log (change rating) — updates correctly, no duplicate row
- [ ] Delete a log — removes from progress, community percentage drops
- [ ] Logging does NOT show the "Hear what the hosts think" toast (regression — killed, confirm gone)
- [ ] Log modal shows TMDB backdrop, not blank, for all films
- [ ] Log modal for MANTL Originals film — editorial blurb shows (once seeded)

### Community Progress
- [ ] Franchise completion percentage is accurate after logging
- [ ] Overall community percentage updates after logging
- [ ] `trg_auto_community_progress` DB trigger creates `community_user_progress` row on first log (no manual step needed)

### Community Dashboard
- [ ] NPP hero shows Films + Franchises/Directors + Badges sections
- [ ] BC hero shows correct content
- [ ] Host arrows (brown) display correctly on NPP
- [ ] HDTGM — Jade (1995) is correct entry, episode audio is linked (regression)

---

## 5. Badge System

### Badge Awarding
- [ ] Complete a miniseries — badge awards automatically
- [ ] Complete an item set — badge awards automatically
- [ ] Badge award runs inline after `importMovies()` Letterboxd import
- [ ] Badge is written to `user_badges` via edge function (service role), NOT direct client insert
- [ ] Client cannot self-award a badge by calling `supabase.from('user_badges').insert()` directly — should fail with RLS error (security regression check)

### Badge Celebration
- [ ] Badge celebration video plays on award
- [ ] Celebration video z-index is correct — renders above feed, not behind it (regression)
- [ ] Celebration plays once, doesn't replay on app resume
- [ ] Celebration dismisses cleanly

### Badge Detail Screen
- [ ] `BadgeDetailScreen` renders via portal correctly — no clipping or z-index issues (regression)
- [ ] `item_set_completion` badge type renders correctly in `BadgeDetailScreen` (regression — was missing support)
- [ ] Badge image loads (from Supabase storage `badges/` bucket)
- [ ] Badge name, plaque name, description all display

### Badge Overview
- [ ] `BadgeOverviewPage` loads all earned badges
- [ ] Unearned badges show locked state
- [ ] Progress indicator accurate for partially completed sets
- [ ] Games Hub badge card renders correctly (regression)

### Notifications
- [ ] Badge unlock triggers a notification in notification center
- [ ] Badge digest batches correctly — multiple unlocks in one import = one digest notification, not a flood

---

## 6. Games

### General
- [ ] Games tab loads without crashing
- [ ] All 4 games are listed: Triple Feature, Cast Connections, Reel Time, Pick a Flick
- [ ] Daily games reset at midnight (or correct reset time)
- [ ] Completed games show correct result state, not playable state
- [ ] Free users can access all daily games (confirmed free tier)

### Triple Feature
- [ ] Game loads a valid prompt
- [ ] Maximizer mechanic works — selecting films updates score correctly
- [ ] /10 denominator scoring is fixed — score shown as X/10, not raw (regression)
- [ ] Submitting a valid answer records result
- [ ] Sharing result works

### Cast Connections
- [ ] Game loads a valid grid
- [ ] Correct groupings accepted
- [ ] Incorrect groupings penalised correctly
- [ ] Win and lose states both display correctly

### Reel Time
- [ ] Game loads correctly
- [ ] Timer functions
- [ ] Score records correctly

### Pick a Flick
- [ ] Game loads a valid matchup
- [ ] Selection registers
- [ ] Result screen shows correct outcome
- [ ] Movie Night variant — Player B must sign up (no anonymous play — regression, anonymous auth removed)

---

## 7. Letterboxd Sync

- [ ] First sync: imports films, creates `user_media_logs` rows, runs badge check
- [ ] First sync: does NOT flood notification center (regression — was fixed)
- [ ] Subsequent sync: only imports new/changed films (ETag/conditional request working)
- [ ] Sync runs on app open (single_user mode via `sync-letterboxd-batch`)
- [ ] Cron sync also runs independently of app-open sync
- [ ] Films with only a date (no time) get upgraded to full ISO timestamp in `mediaWrite.js`
- [ ] Rating of 0.5 is accepted — not rejected by constraint (regression — constraint was fixed)
- [ ] Letterboxd username change in settings triggers re-sync correctly
- [ ] Invalid Letterboxd username gives clear error, doesn't crash
- [ ] `verify-letterboxd` edge function correctly validates username before saving

---

## 8. Notifications

### Notification Center
- [ ] Bell icon shows unread count badge
- [ ] Tapping bell opens notification center
- [ ] Notifications list renders correctly
- [ ] Marking as read updates unread count
- [ ] Marking all as read clears count
- [ ] Realtime channel fires — new notification appears without refresh (Supabase Realtime on `user_notifications`)

### Push Notifications
- [ ] Push permission prompt appears at appropriate time (not on first open)
- [ ] Accepting push permission registers device token
- [ ] APNs token stored (iOS — pending MacBook)
- [ ] FCM token stored (Android)
- [ ] New film coverage notification arrives when a tracked film is covered by a subscribed podcast
- [ ] Tapping push notification deep-links to correct screen

### Notification Types
- [ ] Badge unlock notification renders correctly
- [ ] Badge digest notification (multiple unlocks) renders correctly
- [ ] New film coverage notification renders correctly
- [ ] No stale or duplicate notifications after Letterboxd sync

---

## 9. Billing (RevenueCat)

*Test on Android with a Play Store sandbox account. Google Play service account must be verified (up to 24h after RC setup).*

- [ ] App opens, RC SDK initialises silently — no error in logs
- [ ] `useSubscription` hook returns `isPro: false` for free user
- [ ] Paywall screen renders correctly
- [ ] Tapping subscribe opens Google Play purchase sheet
- [ ] Completing a sandbox purchase grants `mantl_pro` entitlement
- [ ] `useSubscription` updates to `isPro: true` after purchase — no app restart needed
- [ ] Premium-gated features unlock immediately after purchase
- [ ] Cancelling the purchase sheet returns to app without error
- [ ] Restoring purchases works for an existing subscriber
- [ ] RC webhook (`handle-rc-webhook`) receives events — verify in RC dashboard event log
- [ ] `subscriptions` table in Supabase updates after purchase event
- [ ] Cancellation: entitlement expires at end of billing period, not immediately
- [ ] `RC_WEBHOOK_AUTH_KEY` is set in Supabase Vault — webhook rejects calls without it

### Free Tier Gating
- [ ] Daily games accessible without subscription
- [ ] Feed listening accessible without subscription
- [ ] Community browsing accessible without subscription
- [ ] Basic film tracking accessible without subscription
- [ ] Full badge system requires subscription — paywall shown, not crash
- [ ] Celebration videos require subscription — paywall shown, not crash
- [ ] Game stats/archive requires subscription — paywall shown, not crash
- [ ] Diary requires subscription — paywall shown, not crash

---

## 10. MANTL Originals

- [ ] Originals tab loads — 5 shelves visible
- [ ] All 53 films are seeded and visible
- [ ] Shelf titles correct: 2002, Road Movies, The Capital Paradox, SIFF Favorites, The 17th Street Basement Tapes
- [ ] Placeholder posts visible on all shelves
- [ ] Tapping a film opens log modal with TMDB backdrop
- [ ] Editorial blurb appears in log modal (once seeded — verify after seeding)
- [ ] Logging an Originals film works correctly
- [ ] `FadeImg` component — images fade in cleanly, no flash of broken image (regression)

---

## 11. Search

- [ ] Searching a film title returns results
- [ ] Searching a partial title returns results
- [ ] TMDB results include poster images
- [ ] Tapping a result opens the correct film detail / log modal
- [ ] Searching a film already in your log shows logged state
- [ ] Empty search state is clean, no crash
- [ ] Search within a community filters correctly to that community's films

---

## 12. Settings & Profile

- [ ] Profile screen loads — username, avatar, stats
- [ ] Edit username — updates in `profiles` table
- [ ] Edit Letterboxd username — triggers re-verify and re-sync
- [ ] Subscription status shown correctly (free vs pro)
- [ ] Manage subscription opens RevenueCat Customer Center
- [ ] Delete account flow (if implemented) — cleans up all user data

---

## 13. Admin Tools

*Test as user `ali` (19410e64-d610-4fab-9c26-d24fafc94696) only.*

- [ ] Admin shell loads all sections without error
- [ ] Community Manager — films list loads, editorial blurb field editable and saves
- [ ] Community Manager — can add/edit/remove community items
- [ ] Badge manager — can view existing badges
- [ ] No admin UI is visible or accessible to non-admin accounts

---

## 14. Native Android Specifics

- [ ] APK installs cleanly from Play Store internal track
- [ ] App icon and splash screen render correctly
- [ ] Back button behaviour is correct throughout — no accidental exits
- [ ] Deep links open the correct screen (e.g. from push notification)
- [ ] App recovers correctly after being killed by the OS (low memory)
- [ ] Audio playback foreground service shows in notification tray
- [ ] Audio continues through headphone disconnect/reconnect
- [ ] No Rolldown/Vite build errors — RevenueCat Capacitor packages are externalised in `vite.config.js` (regression)
- [ ] Node 22.x build — Vercel project set to Node 22.x, confirm build succeeds (regression)

---

## 15. Performance & Regression

- [ ] Cold start time is acceptable (< 3s to interactive)
- [ ] Feed scroll is smooth — no jank on VHS card render
- [ ] Community loading skeleton shows while data fetches, not blank screen
- [ ] `.in()` queries on UUID columns — batched at 50, no `ERR_FAILED` on large sets (regression — was 200, caused URL length errors)
- [ ] `useGlobalBadges` re-fetches on tab activation — badges reflect latest state after switching tabs (regression — fetchedRef lock was removed)
- [ ] No memory leaks from audio player — navigate away and back multiple times, playback state is clean
- [ ] Supabase Realtime channel for `user_notifications` connects on login and disconnects on logout — no dangling subscriptions

---

## 16. Edge Cases & Known Historical Bugs

These were all fixed — confirm they stay fixed.

- [ ] **Logo enrichment race condition** — TMDB logos on VHS cards load without flickering to a fallback and back
- [ ] **BadgeDetailScreen portal** — opens correctly from any context, not just the feed
- [ ] **BadgeCelebration z-index** — video renders above all other UI layers
- [ ] **item_set_completion in BadgeDetailScreen** — renders badge items list, not blank
- [ ] **Hear what the hosts think toast** — does not appear after logging a podcast film
- [ ] **First Letterboxd sync flood** — 1 digest notification max, not one per badge/film
- [ ] **Seek integer bug** — scrubbing audio player does not throw a Java exception
- [ ] **0.5 star rating constraint** — can log a 0.5 rating without DB error
- [ ] **community_user_progress DB trigger** — auto-creates progress row on first log, no missing progress
- [ ] **UUID .in() batch size** — no ERR_FAILED on users with large film libraries
- [ ] **HDTGM Jade 1995** — correct film entry, correct episode audio linked
- [ ] **Triple Feature /10 scoring** — score displayed correctly, not as raw float
- [ ] **Movie Night anonymous auth** — Player B cannot play without signing up

---

*When all boxes are checked on a physical Android device against the production Supabase project: ship it.*

---

## 17. iOS (TestFlight — test before App Store submission)

### Build & Install
- [ ] `npx cap sync ios` completes without errors
- [ ] Xcode build succeeds with no warnings treated as errors
- [ ] App installs on physical iPhone via TestFlight
- [ ] App icon, launch screen render correctly on iPhone
- [ ] No landscape mode issues (if portrait-locked)

### Auth
- [ ] Sign up, log in, log out all work on iPhone
- [ ] Session persists after app backgrounding and return
- [ ] Deep links from email confirmation open the app correctly

### Audio
- [ ] Native audio plays on iPhone (AVAudioPlayer path, not ExoPlayer)
- [ ] Audio continues when app is backgrounded
- [ ] Lock screen controls appear (play/pause)
- [ ] Control Centre audio widget appears
- [ ] Audio ducks correctly when Siri activates
- [ ] Audio resumes after phone call ends
- [ ] Headphone disconnect pauses playback (iOS convention)

### Push Notifications
- [ ] Push permission prompt appears correctly
- [ ] APNs token is registered (check Supabase Auth dashboard)
- [ ] Test push arrives on iPhone
- [ ] Tapping push notification deep-links correctly

### Billing (iOS / StoreKit)
- [ ] RevenueCat iOS SDK initialises — `appl_` key configured
- [ ] Paywall renders correctly on iPhone
- [ ] Tapping subscribe opens Apple payment sheet
- [ ] Sandbox purchase completes, `mantl_pro` entitlement granted
- [ ] `useSubscription` updates to `isPro: true` after purchase
- [ ] Cancelling Apple payment sheet returns to app cleanly
- [ ] Restore purchases works for existing iOS subscriber
- [ ] RC webhook receives iOS purchase events (check RC dashboard)
- [ ] `subscriptions` table updates after iOS purchase

### Navigation & Gestures
- [ ] iOS swipe-back gesture works throughout the app
- [ ] No conflicts between swipe-back and in-app swipe gestures (tab swipe, card flip)
- [ ] Safe area insets respected — no content clipped by notch or Dynamic Island
- [ ] Bottom nav clears the home indicator bar
- [ ] Keyboard does not cover input fields (scroll adjusts)

### Performance
- [ ] Cold start time acceptable on iPhone
- [ ] Feed scroll smooth on iPhone (no jank)
- [ ] Memory usage stable during extended session — no crashes from memory pressure

### App Store Readiness
- [ ] No use of private/restricted Apple APIs
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) in place if required
- [ ] All required screenshot sizes captured (6.7" mandatory)
- [ ] App description, keywords, support URL, privacy policy URL all filled in App Store Connect
- [ ] Age rating questionnaire completed
- [ ] Content rights declaration completed

*Ship to TestFlight first. Do a full run of sections 1–16 on iPhone before submitting to App Store review.*

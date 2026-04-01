# MANTL Pro — Feature Gating Handoff

## Overview

The billing system is fully wired. This doc covers how to gate features behind the `mantl_pro` subscription using the `useSubscription` hook that's already initialized in `App.jsx`.

---

## What's Already Done

| Layer | Status |
|---|---|
| Google Play Console | ✅ Merchant account, `mantl_monthly_pro` ($4.99/mo) + `mantl_yearly_pro` ($39.99/yr), 7-day free trials on both |
| RevenueCat | ✅ `mantl_pro` entitlement, products attached, default offering with both packages, webhook configured |
| Supabase | ✅ `subscriptions` table with RLS, `handle-rc-webhook` edge function deployed, `RC_WEBHOOK_AUTH_KEY` secret set |
| Codebase | ✅ `revenueCat.js` SDK bridge, `useSubscription` hook, wired into `App.jsx`, Android manifest `launchMode` fixed |
| npm packages | ✅ `@revenuecat/purchases-capacitor` + `@revenuecat/purchases-capacitor-ui` installed |

**Remaining:** `npx cap sync` on local machine, then gate features.

---

## The Hook

`useSubscription` is already called in `AppMain()`:

```jsx
const subscription = useSubscription(session);
```

It returns:

| Property | Type | Description |
|---|---|---|
| `isPro` | `boolean` | `true` if user has active `mantl_pro` entitlement |
| `loading` | `boolean` | `true` while checking status (brief, on app launch) |
| `presentPaywall()` | `async fn → string` | Shows RevenueCat's native paywall, returns result |
| `presentCustomerCenter()` | `async fn` | Native UI for managing/cancelling subscription |
| `restorePurchases()` | `async fn → boolean` | Restores previous purchases, returns isPro |
| `isNative` | `boolean` | `true` on Android/iOS, `false` on web |

**On web:** `isPro` is always `false`, paywall/customer center are no-ops. This is intentional — billing only works on native. Web users see the free tier.

---

## How to Gate Features

### Pattern 1: Block and show paywall

When a free user taps a paid feature, show the paywall immediately:

```jsx
const handleBadgeTap = () => {
  if (!subscription.isPro) {
    subscription.presentPaywall();
    return;
  }
  // ... paid feature logic
};
```

### Pattern 2: Conditional rendering

Show different UI for free vs paid users:

```jsx
{subscription.isPro ? (
  <BadgeGrid badges={badges} />
) : (
  <UpgradeCard onTap={() => subscription.presentPaywall()} />
)}
```

### Pattern 3: Soft gate with preview

Let free users see content but block interaction:

```jsx
<BadgeCard
  badge={badge}
  locked={!subscription.isPro}
  onTap={() => {
    if (!subscription.isPro) {
      subscription.presentPaywall();
      return;
    }
    openBadgeDetail(badge);
  }}
/>
```

### Pattern 4: Loading state

Handle the brief loading period on app start:

```jsx
if (subscription.loading) return null; // or a skeleton
```

---

## Passing subscription Down

The `subscription` object lives in `AppMain`. Pass it to child components as needed:

```jsx
<CommunityDashboard
  subscription={subscription}
  // ... other props
/>
```

Or destructure just what's needed:

```jsx
<BadgeOverviewPage
  isPro={subscription.isPro}
  onUpgrade={() => subscription.presentPaywall()}
/>
```

---

## Feature Gating Map

| Feature | Free | Pro | Where to Gate |
|---|---|---|---|
| Daily games (play) | ✅ | ✅ | No gate needed |
| Feed listening | ✅ | ✅ | No gate needed |
| Community browsing | ✅ | ✅ | No gate needed |
| Basic tracking (log/rate) | ✅ | ✅ | No gate needed |
| All communities | ❌ | ✅ | Community subscription / dashboard entry |
| Full badge systems | ❌ | ✅ | BadgeOverviewPage, BadgeDetailScreen |
| Celebration videos | ❌ | ✅ | BadgeCelebration trigger |
| Game stats & archive | ❌ | ✅ | Games Hub stats section |
| Diary | ❌ | ✅ | DiaryModal open handler |

### Gating Strategy Notes

- **Communities:** Free users can browse the NPP and BC dashboards but can't subscribe to communities or track progress. Gate at the "Join Community" / subscribe action.
- **Badges:** Free users can see badge names and descriptions (teaser) but can't view detail or earn them. Gate at BadgeDetailScreen open and at the badge awarding logic.
- **Celebration videos:** Gate at the trigger point — if `!isPro`, skip the video and just show a simple "badge earned" toast.
- **Game stats/archive:** Free users play daily games but can't see historical stats or past game archives. Gate at the stats tab / archive screen.
- **Diary:** Gate when opening DiaryModal. Free users log films but can't access the diary view.

---

## Manage Subscription UI

Add a "Manage Subscription" option somewhere in settings/profile:

```jsx
{subscription.isPro && subscription.isNative && (
  <button onClick={() => subscription.presentCustomerCenter()}>
    Manage Subscription
  </button>
)}
```

RevenueCat's Customer Center handles cancellation, plan changes, and restore — you don't need to build any of that UI.

---

## Restore Purchases

Add a "Restore Purchases" option for users who reinstall or switch devices:

```jsx
const handleRestore = async () => {
  const restored = await subscription.restorePurchases();
  if (restored) {
    showToast("Subscription restored!");
  } else {
    showToast("No active subscription found.");
  }
};
```

---

## Testing

### RevenueCat Test Store (available now)
The Test Store products (Monthly/Yearly) let you simulate the full purchase flow without waiting for Google Play credentials to propagate. In RevenueCat dashboard → Customers, you can manually grant entitlements to test users.

### Google Play Sandbox (once credentials propagate)
1. Add test accounts in Google Play Console → Settings → License testing
2. Use those Google accounts on test devices
3. Sandbox purchases are free and auto-renew on accelerated schedules (monthly = 5 min)

### Web
`isPro` is always `false` on web. All paywall calls are no-ops. This is correct — test gating by checking that free-tier features work and paid features show upgrade prompts.

---

## iOS Setup (when MacBook arrives)

1. Apple Developer account ($99/year)
2. App Store Connect: create same two subscription products
3. RevenueCat: add Apple app config with App Store credentials
4. In `revenueCat.js`, add platform detection:
   ```js
   const apiKey = Capacitor.getPlatform() === "ios"
     ? RC_API_KEY_APPLE
     : RC_API_KEY_GOOGLE;
   ```
5. Xcode: enable In-App Purchase capability, set Swift Language Version ≥ 5.0
6. Everything else (hook, webhook, table, gating) works identically

---

## Key Files

| File | Purpose |
|---|---|
| `src/utils/revenueCat.js` | SDK bridge — init, purchase, entitlement checks |
| `src/hooks/useSubscription.js` | React hook — wraps RC bridge for components |
| `src/App.jsx` | Hook initialized here, `subscription` object available |
| `supabase/functions/handle-rc-webhook/index.ts` | Webhook → subscriptions table |
| `supabase/migrations/20260401_create_subscriptions.sql` | DB schema |
| `android/app/src/main/AndroidManifest.xml` | `launchMode` fixed to `singleTop` |
| `docs/HANDOFF-billing-setup.md` | Full billing setup reference |

---

## RevenueCat API Keys

| Key | Value | Notes |
|---|---|---|
| Google Play (test) | `test_ttZsXEQKINarORbnqQPrgKhhwZo` | Currently in `revenueCat.js` |
| Google Play (production) | TBD | Swap when going live |
| Apple (iOS) | TBD | Add when MacBook arrives |

**Before production launch:** Replace the test API key with the production key from RevenueCat dashboard → Apps & providers → API keys.

---

## Webhook Secret

| Where | Key | Value |
|---|---|---|
| RevenueCat | Authorization header | `Bearer rc_wh_mantl_2026_xK9mP3vQ` |
| Supabase | Edge Function Secret `RC_WEBHOOK_AUTH_KEY` | `rc_wh_mantl_2026_xK9mP3vQ` |

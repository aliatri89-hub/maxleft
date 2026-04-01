# MANTL Billing Setup — Handoff

## What's Built

### 1. RevenueCat SDK Bridge (`src/utils/revenueCat.js`)
- Lazy-loads `@revenuecat/purchases-capacitor` + `purchases-capacitor-ui` on native only
- Web always returns free-tier (safe for browser dev)
- Functions: `initRevenueCat`, `identifyUser`, `checkSubscription`, `presentPaywall`, `presentCustomerCenter`, `restorePurchases`, `onCustomerInfoUpdate`
- Entitlement ID: `mantl_pro` — both monthly and yearly products map to this single entitlement

### 2. `useSubscription` Hook (`src/hooks/useSubscription.js`)
- Takes `session` from Supabase auth
- Returns `{ isPro, loading, presentPaywall, presentCustomerCenter, restorePurchases, isNative }`
- Auto-initializes RC on mount, identifies user, listens for status changes
- Handles logout cleanup

### 3. Webhook Edge Function (`supabase/functions/handle-rc-webhook/index.ts`)
- Receives RevenueCat webhook POST events
- Maps event types to status: `active`, `cancelled`, `expired`, `billing_issue`
- Upserts into `subscriptions` table
- Auth via `RC_WEBHOOK_AUTH_KEY` secret (Bearer token)

### 4. Subscriptions Table (`supabase/migrations/20260401_create_subscriptions.sql`)
- `user_id` (PK, FK to auth.users), `status`, `product_id`, `store`, `environment`, `expires_at`, `rc_event`
- RLS: users read own row, webhook writes via service_role

### 5. Android Manifest Fix
- Changed `launchMode` from `singleTask` to `singleTop`
- Required by RevenueCat: `singleTask` can cancel purchases when user backgrounds app for payment verification
- `singleTop` still works for OAuth deep links

---

## What You Need to Do

### Step 1: Install npm packages
```bash
npm install @revenuecat/purchases-capacitor @revenuecat/purchases-capacitor-ui
npx cap sync
```

### Step 2: Run the migration
In Supabase SQL Editor, run `supabase/migrations/20260401_create_subscriptions.sql`

### Step 3: Deploy the webhook edge function
```bash
supabase functions deploy handle-rc-webhook --no-verify-jwt
```
Set the secret:
```bash
supabase secrets set RC_WEBHOOK_AUTH_KEY=<your-shared-secret>
```

### Step 4: Configure RevenueCat Dashboard

**Products (in Google Play Console → Monetization → Subscriptions):**
| Product ID | Price | Billing Period |
|---|---|---|
| `mantl_monthly_pro` | $4.99/month | Monthly |
| `mantl_yearly_pro` | $39.99/year | Yearly |

**RevenueCat Dashboard:**
1. **Entitlements** → Create `mantl_pro`
2. **Products** → Add both product IDs, attach to `mantl_pro` entitlement
3. **Offerings** → Create "default" offering with both packages
4. **Paywalls** → Design paywall in their visual editor, attach to default offering
5. **Webhooks** → Set URL to `https://api.mymantl.app/functions/v1/handle-rc-webhook`, set auth key to match your `RC_WEBHOOK_AUTH_KEY` secret

### Step 5: Wire into App.jsx
Add `useSubscription` to the main app and pass it down:
```jsx
import { useSubscription } from "./hooks/useSubscription";

// Inside App component, after session is available:
const subscription = useSubscription(session);
// Pass subscription.isPro wherever you need to gate features
```

### Step 6: Gate features
Anywhere you need to check:
```jsx
// Direct check
if (!subscription.isPro) {
  subscription.presentPaywall();
  return;
}

// Or inline
{subscription.isPro ? <ProFeature /> : <UpgradePrompt onTap={subscription.presentPaywall} />}
```

---

## Feature Gating Map

| Feature | Free | Pro |
|---|---|---|
| Daily games (play) | ✅ | ✅ |
| Feed listening | ✅ | ✅ |
| Community browsing | ✅ | ✅ |
| Basic tracking | ✅ | ✅ |
| All communities | ❌ | ✅ |
| Full badge systems | ❌ | ✅ |
| Celebration videos | ❌ | ✅ |
| Game stats/archive | ❌ | ✅ |
| Diary | ❌ | ✅ |

---

## iOS Setup (when MacBook arrives)
1. Apple Developer account ($99/year)
2. Create same two subscription products in App Store Connect
3. Add Apple API key to RevenueCat dashboard
4. Add `RC_API_KEY_APPLE` to `revenueCat.js` and detect platform:
   ```js
   const apiKey = Capacitor.getPlatform() === "ios" ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
   ```
5. Enable In-App Purchase capability in Xcode
6. Set Swift Language Version to 5.0+ in Xcode build settings

---

## Testing
- RevenueCat's Test Store works out of the box with the SDK — you can test purchases without connecting to Google Play initially
- Use RevenueCat dashboard → Customers to inspect subscription state
- Sandbox purchases on Android: use Google Play test track with license test accounts
- Webhook testing: check Supabase edge function logs + `subscriptions` table

-- ─── Subscriptions table ─────────────────────────────────────
-- Tracks subscription status per user, updated by RevenueCat webhooks.
-- One row per user (upserted on user_id).
--
-- The app reads this table via useSubscription hook.
-- The webhook edge function (handle-rc-webhook) writes to it.

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'none'
              CHECK (status IN ('none', 'active', 'cancelled', 'expired', 'billing_issue', 'unknown')),
  product_id  TEXT,          -- e.g. 'mantl_monthly_pro', 'mantl_yearly_pro'
  store       TEXT,          -- 'PLAY_STORE' or 'APP_STORE'
  environment TEXT,          -- 'SANDBOX' or 'PRODUCTION'
  expires_at  TIMESTAMPTZ,   -- when current period ends
  rc_event    TEXT,          -- last RevenueCat event type
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick status lookups (e.g. "is this user active?")
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS: users can read their own subscription, service role can write
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Webhook uses service_role key, which bypasses RLS.
-- No INSERT/UPDATE policy needed for regular users.

COMMENT ON TABLE subscriptions IS 'Subscription status per user, managed by RevenueCat webhooks';

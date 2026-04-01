// supabase/functions/handle-rc-webhook/index.ts
//
// Receives RevenueCat webhook events and upserts subscription
// status into the `subscriptions` table.
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   RC_WEBHOOK_AUTH_KEY  — shared secret set in RevenueCat webhook config
//
// RevenueCat webhook URL:
//   https://api.mymantl.app/functions/v1/handle-rc-webhook
//
// Webhook events handled:
//   INITIAL_PURCHASE, RENEWAL, CANCELLATION, UNCANCELLATION,
//   EXPIRATION, BILLING_ISSUE_DETECTED, SUBSCRIBER_ALIAS,
//   PRODUCT_CHANGE, TRANSFER
//
// The app_user_id from RevenueCat = Supabase user UUID
// (set during SDK init via appUserID param).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth check ───────────────────────────────────────────
    // RevenueCat sends an Authorization header with the shared
    // secret you configure in their webhook settings.
    const authHeader = req.headers.get('authorization') || '';
    const webhookKey = Deno.env.get('RC_WEBHOOK_AUTH_KEY');
    if (webhookKey && authHeader !== `Bearer ${webhookKey}`) {
      console.error('[RC Webhook] Unauthorized');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const event = body?.event;

    if (!event) {
      return new Response('No event in body', { status: 400, headers: corsHeaders });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id;

    console.log(`[RC Webhook] ${eventType} for user ${appUserId}`);

    // Skip anonymous / $RCAnonymousID users — we can't map them
    if (!appUserId || appUserId.startsWith('$RCAnonymous')) {
      console.log('[RC Webhook] Skipping anonymous user');
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Map RC event to subscription status ──────────────────
    let status = 'unknown';
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        status = 'active';
        break;
      case 'CANCELLATION':
        // User cancelled but may still have access until period ends
        status = 'cancelled';
        break;
      case 'EXPIRATION':
        status = 'expired';
        break;
      case 'BILLING_ISSUE_DETECTED':
        status = 'billing_issue';
        break;
      case 'PRODUCT_CHANGE':
        status = 'active'; // Changed plan, still active
        break;
      case 'TRANSFER':
        status = 'active'; // Transferred to this user
        break;
      case 'SUBSCRIBER_ALIAS':
        // Alias event — no status change needed
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      default:
        console.log(`[RC Webhook] Unhandled event type: ${eventType}`);
        return new Response(JSON.stringify({ ok: true, unhandled: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // ── Extract subscription details ─────────────────────────
    const productId = event.product_id || null;
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;
    const store = event.store || null; // APP_STORE, PLAY_STORE
    const environment = event.environment || 'PRODUCTION'; // SANDBOX or PRODUCTION

    // ── Upsert into subscriptions table ──────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: appUserId,
          status,
          product_id: productId,
          store,
          environment,
          expires_at: expiresAt,
          rc_event: eventType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[RC Webhook] Upsert error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[RC Webhook] Upserted ${status} for ${appUserId}`);
    return new Response(JSON.stringify({ ok: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[RC Webhook] Unhandled error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

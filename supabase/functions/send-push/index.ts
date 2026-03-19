// supabase/functions/send-push/index.ts
//
// Sends push notifications via Firebase Cloud Messaging (FCM v1 HTTP API).
// Invoke from other edge functions, database webhooks, or cron jobs.
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
//
// POST /functions/v1/send-push
// Body: {
//   "user_ids": ["uuid1", "uuid2"],
//   "title": "New Episode!",
//   "body": "Blank Check just covered Heat",
//   "data": { "route": "/community/blankcheck" }
// }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── FCM v1 auth: sign a JWT with the service account key ──
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')!;
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);

  // Build unsigned JWT
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const payload = encode({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });

  // Import private key for signing
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(`${header}.${payload}`)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${payload}.${sig}`;

  // Exchange JWT for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_ids, title, body, data } = await req.json();

    if (!user_ids?.length || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'user_ids, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch device tokens (service_role bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokens, error: dbError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .in('user_id', user_ids);

    if (dbError) throw dbError;

    if (!tokens?.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No device tokens found for target users' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get FCM access token
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;
    const accessToken = await getAccessToken();
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // Send to each device
    const results = await Promise.allSettled(
      tokens.map(async ({ token, platform }: { token: string; platform: string }) => {
        const message: Record<string, unknown> = {
          message: {
            token,
            notification: { title, body },
            data: data || {},
            // Platform-specific config
            ...(platform === 'android' && {
              android: {
                priority: 'high',
                notification: { channel_id: 'mantl_default' },
              },
            }),
            ...(platform === 'ios' && {
              apns: {
                payload: { aps: { sound: 'default', badge: 1 } },
              },
            }),
          },
        };

        const res = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        if (!res.ok) {
          const errText = await res.text();
          // Clean up stale tokens
          if (errText.includes('UNREGISTERED') || errText.includes('INVALID_ARGUMENT')) {
            await supabase.from('device_tokens').delete().eq('token', token);
            console.log('Removed stale token:', token.substring(0, 20) + '...');
          }
          throw new Error(`FCM error (${platform}): ${errText}`);
        }

        return res.json();
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ sent, failed, total: tokens.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-push error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

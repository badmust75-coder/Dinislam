import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildPushHTTPRequest } from "https://esm.sh/@pushforge/builder@1.1.2?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createVapidPrivateJwkString(vapidPublicKey: string, vapidPrivateKey: string): string {
  const pub = urlBase64ToUint8Array(vapidPublicKey);
  if (pub.length !== 65 || pub[0] !== 4) {
    throw new Error("Invalid VAPID public key format");
  }
  const x = bytesToBase64Url(pub.slice(1, 33));
  const y = bytesToBase64Url(pub.slice(33, 65));
  const d = bytesToBase64Url(urlBase64ToUint8Array(vapidPrivateKey));
  return JSON.stringify({ alg: "ES256", kty: "EC", crv: "P-256", x, y, d });
}

async function sendPushToEndpoint(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: any,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const privateJWK = createVapidPrivateJwkString(vapidPublicKey, vapidPrivateKey);
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK,
      subscription: {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      message: {
        payload,
        options: { ttl: 86400, urgency: "normal", topic: payload.tag },
        adminContact: "mailto:admin@dini-bismillah.app",
      },
    });
    const response = await fetch(endpoint, { method: "POST", headers, body });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { success: false, statusCode: response.status, error: errorText };
    }
    return { success: true, statusCode: response.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown";
    return { success: false, error: message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, userIds, sendToAll, excludeUserId, title, body: notifBody, tag, data, type } = body;

    // Health check
    if (type === 'health-check' || type === 'health_check') {
      return new Response(
        JSON.stringify({ success: true, sent: 0, health: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query based on target
    let query = supabase.from('push_subscriptions').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    } else if (type === 'admin') {
      // Send to admin users only
      const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const adminIds = (adminRoles || []).map((r: any) => r.user_id);
      if (adminIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, total: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      query = query.in('user_id', adminIds);
    }
    // else: sendToAll or broadcast - no filter

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data: subscriptions, error } = await query;

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedTag = (tag || 'dini-bismillah')
      .replace(/[^a-zA-Z0-9-]/g, '').substring(0, 32) || 'dini-bismillah';

    const payload = {
      title,
      body: notifBody || '',
      tag: sanitizedTag,
      data: data ?? {},
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    const results = await Promise.all(
      subscriptions.map(sub =>
        sendPushToEndpoint(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload, vapidPublicKey, vapidPrivateKey
        )
      )
    );

    // Clean expired subscriptions (410)
    const expiredEndpoints = subscriptions
      .filter((_, i) => results[i].statusCode === 410)
      .map(sub => sub.endpoint);
    if (expiredEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    const successCount = results.filter(r => r.success).length;

    // Log to notification_history
    if (successCount > 0) {
      await supabase.from('notification_history').insert({
        title,
        body: notifBody || '',
        type: type || 'push',
        total_recipients: successCount,
        successful_sends: successCount,
        failed_sends: 0,
        expired_cleaned: expiredEndpoints.length,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        cleaned: expiredEndpoints.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

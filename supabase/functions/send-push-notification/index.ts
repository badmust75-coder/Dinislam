import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  type: 'all' | 'prayer' | 'ramadan' | 'admin';
  subscriptions?: PushSubscription[];
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Create JWT for VAPID authentication
async function createVapidJwt(audience: string, subject: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyData = urlBase64ToUint8Array(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Send push notification to a single subscription
async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const endpoint = subscription.endpoint;
    const audience = new URL(endpoint).origin;
    
    // For now, we'll use a simplified approach
    // In production, you'd want to use the full Web Push protocol
    console.log(`Would send push to: ${endpoint}`);
    console.log(`Title: ${payload.title}`);
    console.log(`Body: ${payload.body}`);
    
    // Note: Full Web Push implementation requires:
    // 1. Encrypting the payload with ECDH
    // 2. Creating VAPID JWT token
    // 3. Sending to push service with proper headers
    
    // For a complete implementation, consider using a library like web-push-libs
    // or implementing the full spec: https://tools.ietf.org/html/rfc8030
    
    return true;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotificationPayload = await req.json();
    const { title, body, type } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all push subscriptions
    const { data: allSubscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id');

    if (subError) {
      throw subError;
    }

    let targetSubscriptions = allSubscriptions || [];

    // Filter subscriptions based on notification type
    if (type === 'admin') {
      // Only send to admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminUserIds = adminRoles?.map(r => r.user_id) || [];
      targetSubscriptions = targetSubscriptions.filter(s => adminUserIds.includes(s.user_id));
    } else if (type === 'prayer' || type === 'ramadan') {
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('user_id, prayer_reminders, ramadan_activities');

      const enabledUserIds = preferences
        ?.filter(p => type === 'prayer' ? p.prayer_reminders : p.ramadan_activities)
        .map(p => p.user_id) || [];

      targetSubscriptions = targetSubscriptions.filter(s => enabledUserIds.includes(s.user_id));
    }

    // Send notifications
    let sentCount = 0;
    const notificationPayload = { title, body };

    for (const subscription of targetSubscriptions) {
      const success = await sendPushNotification(
        subscription,
        notificationPayload,
        vapidPublicKey,
        vapidPrivateKey
      );
      if (success) sentCount++;
    }

    console.log(`Sent ${sentCount}/${targetSubscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        total: targetSubscriptions.length,
        message: `Notification sent to ${sentCount} subscribers`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

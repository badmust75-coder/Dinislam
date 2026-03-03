import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getUTCHours().toString().padStart(2, '0');
    const currentMinute = now.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Fetch active scheduled notifications for today
    const { data: notifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today);

    if (error) throw error;

    let totalSent = 0;

    for (const notif of (notifications || [])) {
      const sendTime = notif.send_time?.substring(0, 5);
      if (!sendTime) continue;

      // Strict time check (±5 min)
      const [sendHour, sendMinute] = sendTime.split(':').map(Number);
      const [currHour, currMinute] = currentTime.split(':').map(Number);
      const sendTotal = sendHour * 60 + sendMinute;
      const currTotal = currHour * 60 + currMinute;
      if (Math.abs(sendTotal - currTotal) > 5) continue;

      // Call the send-push-notification edge function (now VAPID-based)
      const pushBody: any = {
        title: `📅 ${notif.module}`,
        body: notif.message,
        tag: `scheduled-${notif.id}`,
        type: 'scheduled',
      };

      // Determine recipients
      if (notif.recipients !== 'all' && Array.isArray(notif.recipients)) {
        if (notif.recipients.length === 0) continue;
        pushBody.userIds = notif.recipients;
      } else {
        pushBody.sendToAll = true;
      }

      // Call the VAPID-based send function internally
      const { data: pushResult, error: pushError } = await supabase.functions.invoke(
        'send-push-notification',
        { body: pushBody }
      );

      const sent = pushResult?.sent || 0;
      totalSent += sent;

      console.log(`Scheduled notification ${notif.id}: sent to ${sent} recipients`);
    }

    return new Response(JSON.stringify({
      success: true,
      processed: (notifications || []).length,
      totalSent,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

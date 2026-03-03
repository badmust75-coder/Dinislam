import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget push notification via the send-push-notification Edge Function (VAPID).
 * Errors are silently logged.
 */
export function sendPushNotification(params: {
  title: string;
  body: string;
  type?: string;
  userId?: string;
  userIds?: string[];
  sendToAll?: boolean;
  excludeUserId?: string;
  tag?: string;
}) {
  // Map legacy 'broadcast' type to sendToAll
  const body: any = { ...params };
  if (params.type === 'broadcast' && !params.sendToAll) {
    body.sendToAll = true;
  }

  supabase.functions
    .invoke('send-push-notification', { body })
    .then(({ error }) => {
      if (error) console.error('[Push] Error:', error.message);
    })
    .catch((e) => console.error('[Push] Error:', e));
}

import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget push notification via the send-push-notification Edge Function.
 * Errors are silently logged.
 */
export function sendPushNotification(params: {
  title: string;
  body: string;
  type: 'user' | 'admin' | 'broadcast';
  userId?: string;
}) {
  supabase.functions
    .invoke('send-push-notification', { body: params })
    .then(({ error }) => {
      if (error) console.error('[Push] Error:', error.message);
    })
    .catch((e) => console.error('[Push] Error:', e));
}

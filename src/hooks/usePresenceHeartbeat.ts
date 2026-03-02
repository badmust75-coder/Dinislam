import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Sends a heartbeat every 60s to update last_seen in profiles.
 * Also handles visibility change and beforeunload to mark offline.
 */
const usePresenceHeartbeat = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      await (supabase as any)
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id);
    };

    // Initial heartbeat
    updatePresence();

    // Log connexion (once per session)
    (supabase as any)
      .from('connexion_logs')
      .insert({ user_id: user.id })
      .then(() => {});

    // Heartbeat every 60 seconds
    const interval = setInterval(updatePresence, 60_000);

    // Handle tab visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Handle page unload — use sendBeacon for reliability
    const handleUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${user.id}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${(supabase as any).auth?.['currentSession']?.access_token || ''}`,
        'Prefer': 'return=minimal',
      };

      // Try sendBeacon with fetch keepalive as fallback
      try {
        const body = JSON.stringify({ last_seen: new Date().toISOString() });
        const blob = new Blob([body], { type: 'application/json' });

        // sendBeacon doesn't support custom headers, use fetch keepalive
        fetch(url, {
          method: 'PATCH',
          headers,
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Silent fail on unload
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);
};

export default usePresenceHeartbeat;

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useWebPush } from '@/hooks/useWebPush';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

const PushAutoSubscribe = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, isLoading } = useWebPush();
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const autoTriedRef = useRef(false);
  const checkDoneRef = useRef(false);

  // Detect iOS
  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  // Check BOTH browser state AND DB state
  useEffect(() => {
    if (!user || !isSupported || isLoading || checkDoneRef.current) return;
    checkDoneRef.current = true;

    const checkBrowserAndDB = async () => {
      try {
        // 1. Check browser-side: permission + active pushManager subscription
        const permissionGranted = 'Notification' in window && Notification.permission === 'granted';
        let hasBrowserSub = false;

        if (permissionGranted) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const sub = await registration.pushManager?.getSubscription();
            hasBrowserSub = !!sub;
          }
        }

        // 2. Check DB-side
        const { data: dbRow } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[PushAuto] permission:', Notification.permission, 'browserSub:', hasBrowserSub, 'dbRow:', !!dbRow);

        // 3. If browser has no active sub but DB has stale row → clean it
        if (!hasBrowserSub && dbRow) {
          console.log('[PushAuto] Cleaning stale DB subscription after reinstall');
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }

        // 4. Need subscription if permission not granted OR no browser sub
        if (!permissionGranted || !hasBrowserSub) {
          setNeedsSubscription(true);
        }
      } catch (err) {
        console.error('[PushAuto] Check error:', err);
        setNeedsSubscription(true);
      }
    };

    checkBrowserAndDB();
  }, [user, isSupported, isLoading]);

  // Auto-subscribe on non-iOS if permission already granted (no gesture needed)
  useEffect(() => {
    if (!needsSubscription || isIOS || autoTriedRef.current || isSubscribed) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      autoTriedRef.current = true;
      subscribe().then((ok) => {
        if (ok) {
          setNeedsSubscription(false);
          console.log('[PushAuto] Auto-subscribed successfully');
        }
      });
    }
  }, [needsSubscription, isIOS, isSubscribed, subscribe]);

  // Hide if already subscribed or not needed
  if (!needsSubscription || isSubscribed || !isSupported) return null;

  const handleTap = async () => {
    setSubscribing(true);
    const ok = await subscribe();
    if (ok) {
      setNeedsSubscription(false);
      toast.success('✅ Notifications activées !');
    }
    setSubscribing(false);
  };

  return (
    <div className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 animate-fade-in shadow-lg">
      <Bell className="h-6 w-6 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          🔔 Activer les notifications
        </p>
        <p className="text-xs opacity-90">
          {isIOS
            ? 'Touche le bouton pour autoriser les notifications'
            : 'Recevez les rappels et nouvelles activités'}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={handleTap} disabled={subscribing}>
        {subscribing ? '...' : 'Activer'}
      </Button>
    </div>
  );
};

export default PushAutoSubscribe;

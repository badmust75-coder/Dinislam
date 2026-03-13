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
  const [forceBanner, setForceBanner] = useState(false);
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
        const permissionGranted = 'Notification' in window && Notification.permission === 'granted';
        let hasBrowserSub = false;

        if (permissionGranted) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const sub = await registration.pushManager?.getSubscription();
            hasBrowserSub = !!sub;
          }
        }

        const { data: dbRow } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[PushAuto] permission:', Notification.permission, 'browserSub:', hasBrowserSub, 'dbRow:', !!dbRow);

        if (!hasBrowserSub && dbRow) {
          console.log('[PushAuto] Cleaning stale DB subscription after reinstall');
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }

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

  // Poll notification_invitations for admin-triggered banner
  useEffect(() => {
    if (!user) return;

    const checkInvitation = async () => {
      try {
        const { data } = await (supabase as any)
          .from('notification_invitations')
          .select('show_banner')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.show_banner) {
          setForceBanner(true);
          await (supabase as any)
            .from('notification_invitations')
            .update({ show_banner: false })
            .eq('user_id', user.id);
        }
      } catch (err) {
        // ignore
      }
    };

    checkInvitation();
    const interval = setInterval(checkInvitation, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Auto-subscribe on non-iOS if permission already granted
  useEffect(() => {
    if (!needsSubscription || isIOS || autoTriedRef.current || isSubscribed) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      autoTriedRef.current = true;
      subscribe().then((ok) => {
        if (ok) {
          setNeedsSubscription(false);
          setForceBanner(false);
          console.log('[PushAuto] Auto-subscribed successfully');
        }
      });
    }
  }, [needsSubscription, isIOS, isSubscribed, subscribe]);

  // Hide if already subscribed AND no forced banner, or not supported
  if (!isSupported) return null;
  if (isSubscribed && !forceBanner) return null;
  if (!needsSubscription && !forceBanner) return null;

  const handleTap = async () => {
    setSubscribing(true);
    const ok = await subscribe();
    if (ok) {
      setNeedsSubscription(false);
      setForceBanner(false);
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

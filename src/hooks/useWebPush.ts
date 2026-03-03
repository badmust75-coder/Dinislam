import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushSubscriptionState {
  isSubscribed: boolean;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWebPush() {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSubscribed: false,
    isSupported: false,
    isLoading: true,
    error: null
  });

  const checkSupport = useCallback(() => {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window;
  }, []);

  const getVapidKey = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      if (error) throw error;
      return data?.publicKey || null;
    } catch (err) {
      console.error('[WebPush] Failed to get VAPID key:', err);
      return null;
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const checkSubscription = useCallback(async () => {
    if (!checkSupport()) {
      setState(s => ({ ...s, isSupported: false, isLoading: false }));
      return;
    }
    setState(s => ({ ...s, isSupported: true }));
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      if (subscription && user) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id)
          .maybeSingle();
        setState(s => ({ ...s, isSubscribed: !!data, isLoading: false }));
      } else {
        setState(s => ({ ...s, isSubscribed: false, isLoading: false }));
      }
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: 'Erreur' }));
    }
  }, [user, checkSupport]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(s => ({ ...s, isLoading: false, error: 'Permission refusée' }));
        return false;
      }
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        setState(s => ({ ...s, isLoading: false, error: 'Clé VAPID non disponible' }));
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const keyArray = urlBase64ToUint8Array(vapidKey);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray.buffer as ArrayBuffer
      });
      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription keys');
      }
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }, { onConflict: 'user_id,endpoint' });
      if (error) throw error;
      setState(s => ({ ...s, isSubscribed: true, isLoading: false }));
      return true;
    } catch (err) {
      setState(s => ({
        ...s, isLoading: false,
        error: err instanceof Error ? err.message : 'Erreur'
      }));
      return false;
    }
  }, [user, getVapidKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setState(s => ({ ...s, isLoading: true }));
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id);
      }
      setState(s => ({ ...s, isSubscribed: false, isLoading: false }));
      return true;
    } catch (err) {
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }
  }, [user]);

  useEffect(() => { checkSubscription(); }, [checkSubscription]);

  return { ...state, subscribe, unsubscribe, checkSubscription };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushSubscriptionState {
  isSubscribed: boolean;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
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
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    console.log('[WebPush] Support:', supported);
    return supported;
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!checkSupport()) {
      setState(s => ({ ...s, isSupported: false, isLoading: false }));
      return;
    }
    setState(s => ({ ...s, isSupported: true }));
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setState(s => ({ ...s, isSubscribed: false, isLoading: false }));
        return;
      }
      const subscription = await registration.pushManager?.getSubscription();
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
      console.error('[WebPush] checkSubscription error:', err);
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [user, checkSupport]);

  // subscribe() is designed to be called directly from a user tap/click handler.
  // On iOS Safari PWA, Notification.requestPermission() MUST be in the user gesture callstack.
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.error('[WebPush] No user');
      return false;
    }
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      // ── Step 0: iOS standalone check ──
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      console.log('[WebPush] Step 0 — iOS:', isIOS, 'standalone:', isStandalone);
      if (isIOS && !isStandalone) {
        throw new Error('❌ Sur iOS, ajoute l\'app à l\'écran d\'accueil d\'abord (Partager → Sur l\'écran d\'accueil)');
      }

      // ── Step 1: Request permission IMMEDIATELY (must be in user gesture) ──
      if (!('Notification' in window)) {
        throw new Error('❌ API Notification non disponible dans ce navigateur');
      }
      console.log('[WebPush] Step 1 — Permission actuelle:', Notification.permission);
      const permission = await Notification.requestPermission();
      console.log('[WebPush] Step 1 — Permission après demande:', permission);
      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? '❌ Permission refusée par iOS — va dans Réglages > Safari > Notifications pour autoriser'
            : '❌ Permission non accordée par le navigateur'
        );
      }

      // ── Step 2: Ensure service worker is registered ──
      console.log('[WebPush] Step 2 — Vérification Service Worker...');
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.log('[WebPush] Step 2 — Enregistrement SW /sw.js...');
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      // Wait until SW is active
      const reg = await navigator.serviceWorker.ready;
      console.log('[WebPush] Step 2 — SW actif, scope:', reg.scope);

      // ── Step 3: Get VAPID public key ──
      console.log('[WebPush] Step 3 — Récupération clé VAPID...');
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      if (vapidError) throw new Error(`❌ Erreur get-vapid-key: ${vapidError.message}`);
      const vapidKey = vapidData?.publicKey;
      if (!vapidKey) throw new Error('❌ Clé VAPID non reçue du serveur');
      console.log('[WebPush] Step 3 — VAPID OK:', vapidKey.substring(0, 10) + '...');

      // ── Step 4: Unsubscribe existing then subscribe to push ──
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        console.log('[WebPush] Step 4 — Suppression ancien abonnement...');
        await existingSub.unsubscribe();
      }
      console.log('[WebPush] Step 4 — pushManager.subscribe()...');
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      console.log('[WebPush] Step 4 — Abonnement créé:', subscription.endpoint.substring(0, 60) + '...');

      // ── Step 5: Extract keys ──
      const subJson = subscription.toJSON();
      const keys = subJson.keys;
      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('❌ Clés p256dh/auth manquantes dans l\'abonnement');
      }
      console.log('[WebPush] Step 5 — Clés OK: p256dh=' + !!keys.p256dh + ' auth=' + !!keys.auth);

      // ── Step 6: Upsert to DB ──
      console.log('[WebPush] Step 6 — Sauvegarde en base...');
      const { error: upsertError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth
        }, { onConflict: 'user_id,endpoint' });

      if (upsertError) {
        throw new Error(`❌ Erreur sauvegarde DB: ${upsertError.message}`);
      }

      // ── Step 7: Verify row exists in DB ──
      console.log('[WebPush] Step 7 — Vérification en base...');
      const { data: verifyRow, error: verifyError } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint)
        .maybeSingle();

      if (verifyError) {
        throw new Error(`❌ Erreur vérification DB: ${verifyError.message}`);
      }
      if (!verifyRow) {
        throw new Error('❌ Ligne non trouvée en base après upsert — RLS bloque peut-être l\'insertion');
      }

      console.log('[WebPush] ✅ Tout OK — id:', verifyRow.id);
      setState(s => ({ ...s, isSubscribed: true, isLoading: false, error: null }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[WebPush] ❌ Échec:', message);
      setState(s => ({ ...s, isLoading: false, error: message }));
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setState(s => ({ ...s, isLoading: true }));
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager?.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)
            .eq('user_id', user.id);
          console.log('[WebPush] Unsubscribed');
        }
      }
      setState(s => ({ ...s, isSubscribed: false, isLoading: false }));
      return true;
    } catch (err) {
      console.error('[WebPush] Unsubscribe error:', err);
      setState(s => ({ ...s, isLoading: false }));
      return false;
    }
  }, [user]);

  useEffect(() => { checkSubscription(); }, [checkSubscription]);

  return { ...state, subscribe, unsubscribe, checkSubscription };
}

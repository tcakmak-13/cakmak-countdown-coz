import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePushNotifications(userId?: string) {
  const swReg = useRef<ServiceWorkerRegistration | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        swReg.current = reg;
        if (Notification.permission === 'granted' && userId) {
          subscribeToPush(userId, reg).catch(() => {});
        }
      })
      .catch(err => console.warn('SW registration failed:', err));
  }, [userId]);

  // Request permission + subscribe
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted' && userId && swReg.current) {
      await subscribeToPush(userId, swReg.current).catch(() => {});
    }
    return result;
  }, [userId]);

  // Auto-request permission when userId becomes available and permission is 'default'
  useEffect(() => {
    if (!userId) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;

    const timer = setTimeout(() => {
      requestPermission();
    }, 2000);
    return () => clearTimeout(timer);
  }, [userId, requestPermission]);

  // Show notification via service worker (works when tab is backgrounded)
  const showNotification = useCallback((data: {
    id?: string;
    title: string;
    message: string;
    link?: string | null;
  }) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    if (swReg.current?.active) {
      swReg.current.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        ...data,
      });
    } else {
      try {
        new Notification(data.title, {
          body: data.message,
          icon: '/favicon.ico',
          tag: data.id || 'fallback-' + Date.now(),
        });
      } catch (_) {}
    }
  }, []);

  return { permission, requestPermission, showNotification };
}

// Subscribe to server push (requires VAPID keys)
async function subscribeToPush(userId: string, reg: ServiceWorkerRegistration) {
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error || !data?.publicKey) return;

    // Unsubscribe existing if VAPID key changed, then re-subscribe
    const existing = await reg.pushManager.getSubscription();
    let subscription = existing;
    if (existing) {
      // Always unsubscribe and re-subscribe to ensure correct VAPID key
      try {
        await existing.unsubscribe();
      } catch (_) {}
      subscription = null;
    }
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return;

    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth_key: subJson.keys.auth,
    }, { onConflict: 'user_id,endpoint' });
  } catch (e) {
    console.debug('Push subscription skipped:', e);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

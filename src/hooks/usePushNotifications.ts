import { useEffect, useRef } from 'react';
import { seedClient } from '@/integrations/supabase/seedClient';

const VAPID_PUBLIC_KEY = 'BHVaVerG_C9eC7FhXvREtK1gBOeLnf2w28v3bzZ2uRVcr-mtCmohPGGPCqOp2zIMn95Xvzt0eTGiPJLnzfvUufY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | null) {
  const registered = useRef(false);

  useEffect(() => {
    if (!userId || registered.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const register = async () => {
      try {
        const currentPermission = Notification.permission;
        if (currentPermission === 'denied') return;

        const registration = await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await saveSubscription(existing, userId);
          registered.current = true;
          return;
        }

        if (currentPermission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await saveSubscription(subscription, userId);
        registered.current = true;
      } catch (err) {
        console.error('[Push] Registration failed:', err);
      }
    };

    const timer = setTimeout(register, 3000);
    return () => clearTimeout(timer);
  }, [userId]);
}

async function saveSubscription(subscription: PushSubscription, userId: string) {
  try {
    const { data: { session } } = await seedClient.auth.getSession();
    if (!session?.access_token) return;

    const subJson = subscription.toJSON();

    await fetch(
      'https://bjfvmgymyfwgbzntcigj.supabase.co/functions/v1/save-push-subscription',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscription: subJson }),
      }
    );
  } catch (err) {
    console.error('[Push] Save subscription failed:', err);
  }
}

import { useEffect } from "react";
import { seedClient } from "@/integrations/supabase/seedClient";
import { useAuth } from "@/hooks/useAuth";

// VAPID public key — generate your own at https://vapidkeys.com
// This is a placeholder — replace with your actual VAPID public key
const VAPID_PUBLIC_KEY = "BMtI--XneNQ-QxgQHd3-8eDsj8WW1LK8jTSsFmaN-Odo3CsfK9Ch28U3c5kEfZLWgvwAjWcv8y0EkADOk750uag";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.ready;
        
        // Check existing subscription
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Already subscribed — save/update in DB
          await saveSubscription(user!.id, existing);
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Subscribe to push
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await saveSubscription(user!.id, subscription);
      } catch (err) {
        console.error("Push subscription error:", err);
      }
    }

    // Delay slightly to not block app startup
    const timer = setTimeout(subscribe, 3000);
    return () => clearTimeout(timer);
  }, [user?.id]);
}

async function saveSubscription(userId: string, subscription: PushSubscription) {
  try {
    const sub = subscription.toJSON();
    await seedClient.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,endpoint" });
  } catch (err) {
    console.error("Failed to save push subscription:", err);
  }
}

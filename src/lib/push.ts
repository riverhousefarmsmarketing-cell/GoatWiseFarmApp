'use client';

import { getSupabaseClient } from '@/lib/supabase';

/**
 * Phone / browser push notifications (migration 029).
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY must be set for this to be offered.
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

/** iPhone/iPad only allow push once GoatWise is added to the home screen. */
export function needsHomeScreenInstall(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  return ios && !standalone;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Ask permission, subscribe this device and remember it for the signed-in person. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('This browser can’t receive notifications.');
  if (!pushConfigured()) throw new Error('Phone notifications aren’t set up on the server yet.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were blocked. Allow them in your browser or phone settings, then try again.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const supabase = getSupabaseClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 300) },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await (getSupabaseClient() as any).from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/**
 * Ask the server to push any new notifications now (e.g. right after a
 * concern is reported), instead of waiting for the next scheduled run.
 * Fire and forget: failures don't matter, the schedule catches up.
 */
export function pokeDispatch(): void {
  if (typeof window === 'undefined') return;
  (getSupabaseClient() as any).auth.getSession().then(({ data }: any) => {
    const token = data?.session?.access_token;
    if (!token) return;
    fetch('/api/notifications/dispatch', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true }).catch(() => undefined);
  }).catch(() => undefined);
}

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

/**
 * Sends notifications that haven't been pushed to phones/browsers yet
 * (migration 029). Called:
 *   * by the app right after someone does something that notifies others
 *     (signed-in request), so urgent alerts arrive straight away;
 *   * on a schedule (Authorization: Bearer CRON_SECRET), which also runs
 *     generate_due_notifications() for late doses, late chores and overdue
 *     assignments.
 *
 * Needs these server-only environment variables:
 *   SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY (same as
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY), VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   (mailto: address), CRON_SECRET.
 * Without them it does nothing and says so; in-app notifications still work.
 */
export const dynamic = 'force-dynamic';

const MAX_PER_RUN = 200;

export async function POST(req: NextRequest) {
  return handle(req);
}

// Vercel Cron calls with GET.
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@goatsteward.com';
  const cronSecret = process.env.CRON_SECRET;

  if (!url || !anonKey || !serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ ok: false, reason: 'Push notifications are not configured on this server.' }, { status: 503 });
  }

  // Who's asking: the scheduler (secret) or a signed-in person.
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const isCron = !!cronSecret && token === cronSecret;
  if (!isCron) {
    if (!token) return NextResponse.json({ ok: false, reason: 'Not signed in' }, { status: 401 });
    const asUser = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await asUser.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ ok: false, reason: 'Not signed in' }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let generated = 0;
  if (isCron) {
    const { data } = await admin.rpc('generate_due_notifications');
    generated = typeof data === 'number' ? data : 0;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pending, error: pendErr } = await admin
    .from('notifications')
    .select('id, user_id, title, body, link, urgent')
    .is('pushed_at', null)
    .gte('created_at', since)
    .order('created_at')
    .limit(MAX_PER_RUN);
  if (pendErr) return NextResponse.json({ ok: false, reason: pendErr.message }, { status: 500 });
  if (!pending?.length) return NextResponse.json({ ok: true, generated, sent: 0 });

  const userIds = Array.from(new Set(pending.map((n) => n.user_id)));
  const { data: subs } = await admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds);
  const byUser = new Map<string, NonNullable<typeof subs>>();
  (subs ?? []).forEach((s) => byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]));

  let sent = 0;
  const dead: string[] = [];
  for (const n of pending) {
    const devices = byUser.get(n.user_id) ?? [];
    const payload = JSON.stringify({ title: n.title, body: n.body ?? '', link: n.link ?? '/dashboard', urgent: n.urgent, id: n.id });
    await Promise.all(devices.map(async (d) => {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 60 * 60 * 12, urgency: n.urgent ? 'high' : 'normal' });
        sent++;
      } catch (e: any) {
        // 404/410: the device unsubscribed or the browser dropped it.
        if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(d.id);
      }
    }));
  }

  await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).in('id', pending.map((n) => n.id));
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
  const usedIds = (subs ?? []).filter((s) => !dead.includes(s.id)).map((s) => s.id);
  if (usedIds.length) await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', usedIds);

  return NextResponse.json({ ok: true, generated, sent, removedDevices: dead.length });
}

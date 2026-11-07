'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell, BellOff, BellRing, CheckCheck, Smartphone } from 'lucide-react';
import { useFarm } from '@/hooks/useFarm';
import {
  NOTIFICATION_KINDS, useMarkNotificationsRead, useNotificationSettings, useNotifications, useSaveNotificationSettings,
} from '@/hooks/useNotifications';
import { currentSubscription, disablePush, enablePush, needsHomeScreenInstall, pushConfigured, pushSupported } from '@/lib/push';
import { notify } from '@/components/ui/toast';
import { Button, Card, EmptyState, LoadingSpinner } from '@/components/ui';

export default function NotificationsPage() {
  const { isManager } = useFarm();
  const { data: items = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { data: muted = [] } = useNotificationSettings();
  const saveSettings = useSaveNotificationSettings();

  const [deviceOn, setDeviceOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentSubscription().then((s) => setDeviceOn(!!s)).catch(() => setDeviceOn(false));
  }, []);

  const unread = items.filter((n) => !n.read_at);
  const kinds = NOTIFICATION_KINDS.filter((k) => isManager || !k.managersOnly);

  const toggleDevice = async () => {
    setBusy(true);
    try {
      if (deviceOn) {
        await disablePush();
        setDeviceOn(false);
        notify('Notifications turned off on this device.');
      } else {
        await enablePush();
        setDeviceOn(true);
        notify('Notifications are on for this device.');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Alerts about the farm that need you.</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={() => markRead.mutate('all')}>Mark all read</Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Smartphone className="h-6 w-6 text-[#105040] flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Get these on this phone or computer</p>
            <p className="text-sm text-gray-600">
              {!pushSupported()
                ? 'This browser can’t receive notifications.'
                : !pushConfigured()
                  ? 'Phone notifications aren’t switched on for GoatWise yet. You’ll still see everything here.'
                  : needsHomeScreenInstall()
                    ? 'On iPhone: tap Share → “Add to Home Screen”, open GoatWise from there, then come back here.'
                    : deviceOn ? 'On for this device.' : 'Off for this device.'}
            </p>
          </div>
          {pushSupported() && pushConfigured() && !needsHomeScreenInstall() && deviceOn !== null && (
            <Button loading={busy} variant={deviceOn ? 'outline' : 'primary'} leftIcon={deviceOn ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />} onClick={toggleDevice}>
              {deviceOn ? 'Turn off' : 'Turn on'}
            </Button>
          )}
        </div>
      </Card>

      <Card padding="none">
        {isLoading ? (
          <div className="p-8 flex justify-center"><LoadingSpinner /></div>
        ) : items.length === 0 ? (
          <div className="p-6"><EmptyState icon={<Bell className="h-10 w-10" />} title="No notifications" description="You’re all caught up." /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((n) => (
              <li key={n.id} className={n.read_at ? '' : 'bg-[#B8DCC8]/15'}>
                <Link href={n.link ?? '/dashboard'} onClick={() => !n.read_at && markRead.mutate([n.id])} className="block px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read_at ? 'bg-transparent' : n.urgent ? 'bg-[#9B1C1C]' : 'bg-[#105040]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.urgent && !n.read_at ? 'font-semibold text-[#9B1C1C]' : n.read_at ? 'text-gray-700' : 'font-medium text-gray-900'}`}>{n.title}</p>
                      {n.body && <p className="text-sm text-gray-600 line-clamp-2">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-1">What to notify me about</h2>
        <p className="text-sm text-gray-500 mb-3">Urgent alerts always come through.</p>
        <div className="space-y-2">
          {kinds.map((k) => (
            <label key={k.kind} className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" className="rounded" checked={!muted.includes(k.kind)}
                onChange={(e) => saveSettings.mutate(e.target.checked ? muted.filter((m) => m !== k.kind) : [...muted, k.kind], { onError: (err: any) => alert(err.message) })} />
              {k.label}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

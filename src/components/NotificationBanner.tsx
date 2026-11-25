'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/**
 * Shows the signed-in user's unread in-app notifications as dismissible cards.
 * RLS scopes the query to the user's own rows; dismissing marks the row read.
 * Notifications are created by the owner from the backend (no user insert path).
 */
export function NotificationBanner() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .is('read_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] }),
  });

  if (!user || !notifications?.length) return null;

  return (
    <div className="mb-6 space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50 p-4"
        >
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{n.title}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{n.body}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss.mutate(n.id)}
            disabled={dismiss.isPending}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-primary-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

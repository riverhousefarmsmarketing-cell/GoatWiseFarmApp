'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Megaphone, ClipboardList, Pin, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFarm, useFarmMembers, memberName } from '@/hooks/useFarm';
import { isOverdue, useAssignments, useFarmPosts, useSetAssignmentStatus } from '@/hooks/useFarmWork';
import { getSupabaseClient } from '@/lib/supabase';
import { Card } from '@/components/ui';

/** Top of the Today page: farm updates, my assignments, and (for owners and
 *  managers) a nudge when deletion requests are waiting. */
export function FarmTodayPanel() {
  const { user } = useAuth();
  const { farm, isManager } = useFarm();
  const { data: members } = useFarmMembers();
  const { data: posts = [] } = useFarmPosts(20);
  const { data: assignments = [] } = useAssignments();
  const setStatus = useSetAssignmentStatus();

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ['deletion_requests', 'pending_count', farm?.farm_id],
    queryFn: async () => {
      const { count } = await (getSupabaseClient() as any)
        .from('deletion_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!farm && isManager,
  });

  const unread = posts.filter((p) => !p.farm_post_reads.some((r) => r.user_id === user?.id));
  // Pinned first, then anything unread, then the newest; at most three.
  const featured = [...posts.filter((p) => p.pinned), ...unread.filter((p) => !p.pinned), ...posts]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 3);

  const mine = assignments
    .filter((a) => a.assignment_assignees.some((x) => x.user_id === user?.id))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const overdueCount = mine.filter(isOverdue).length;

  return (
    <div className="space-y-4">
      {isManager && pendingApprovals > 0 && (
        <Link
          href="/dashboard/approvals"
          className="flex items-center gap-3 p-3 rounded-lg bg-[#F4E4EE] text-[#5E1840] hover:bg-[#F4E4EE]/80"
        >
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {pendingApprovals} delete request{pendingApprovals === 1 ? '' : 's'} waiting for your approval
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-[#105040]" /> Farm updates
              {unread.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#105040] text-white">{unread.length} new</span>
              )}
            </h2>
            <Link href="/dashboard/updates" className="text-sm text-[#105040] hover:underline">
              {isManager ? 'Post / see all' : 'See all'}
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="text-sm text-gray-500">{isManager ? 'No updates yet. Post one for the team.' : 'No updates yet.'}</p>
          ) : (
            <ul className="space-y-3">
              {featured.map((p) => (
                <li key={p.id} className="text-sm">
                  <p className="text-gray-900">
                    {p.pinned && <Pin className="inline h-3.5 w-3.5 mr-1 text-[#105040]" aria-label="Pinned" />}
                    {p.title && <span className="font-medium">{p.title}: </span>}
                    <span className="break-words">{p.body.length > 160 ? p.body.slice(0, 157) + '…' : p.body}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {memberName(members, p.author_id)} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#105040]" /> My assignments
              {overdueCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#9B1C1C] text-white">{overdueCount} overdue</span>
              )}
            </h2>
            <Link href="/dashboard/assignments" className="text-sm text-[#105040] hover:underline">
              See all
            </Link>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing assigned to you right now.</p>
          ) : (
            <ul className="space-y-2">
              {mine.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const note = window.prompt(`Mark "${a.title}" done. Add a note? (optional)`, '');
                      if (note !== null) setStatus.mutate({ id: a.id, status: 'done', note }, { onError: (e: any) => alert(e.message) });
                    }}
                    className="text-gray-400 hover:text-[#105040]"
                    aria-label={`Mark ${a.title} done`}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{a.title}</p>
                    <p className={`text-xs ${isOverdue(a) ? 'text-[#9B1C1C] font-medium' : 'text-gray-500'}`}>
                      {a.due_date ? `${isOverdue(a) ? 'Overdue · was due' : 'Due'} ${format(parseISO(a.due_date), 'EEE, MMM d')}` : 'No due date'}
                      {a.status === 'in_progress' ? ' · in progress' : ''}
                    </p>
                  </div>
                </li>
              ))}
              {mine.length > 5 && <li className="text-xs text-gray-500">and {mine.length - 5} more…</li>}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

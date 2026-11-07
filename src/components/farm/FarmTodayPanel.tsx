'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Megaphone, ClipboardList, Pin, CheckCircle2, ShieldCheck, ListChecks, Sparkles, PackageMinus } from 'lucide-react';
import { useChoresForDay } from '@/hooks/useTodaysChores';
import { useRestockRequests } from '@/hooks/useRestock';
import { HealthTodayPanel } from '@/components/farm/HealthTodayPanel';
import { latestRefills, useMineralRefills, useMinerals } from '@/hooks/useCare';
import { usePaddocks } from '@/hooks/useGrazing';
import { daysBetween, formatSlot, isLate, localISODate } from '@/lib/chores';
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

  const today = localISODate();
  const { chores, hasPlans } = useChoresForDay(today);
  const choresDone = chores.filter((c) => c.completion).length;
  const lateChores = chores.filter((c) => isLate(c, today));
  const nextChore = chores.find((c) => !c.completion);

  // Pastures with a mineral past its "check every N days".
  const { data: minerals = [] } = useMinerals();
  const { data: refills = [] } = useMineralRefills();
  const { data: paddocks = [] } = usePaddocks();
  const latest = latestRefills(refills);
  let mineralsDue = 0;
  for (const p of paddocks) {
    for (const m of minerals) {
      if (!m.check_every_days) continue;
      const last = latest.get(`${p.id}|${m.id}`);
      // Only nag about minerals that have been used in that pasture before.
      if (last && daysBetween(last.refilled_on, today) > m.check_every_days) mineralsDue++;
    }
  }

  const { data: restock = [] } = useRestockRequests();
  const needsRestock = restock.filter((r) => r.status === 'open' || r.status === 'ordered');
  const outCount = needsRestock.filter((r) => r.level === 'out').length;

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
      <HealthTodayPanel />
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

      {(hasPlans || mineralsDue > 0 || needsRestock.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {hasPlans && (
            <Link href="/dashboard/chores" className="block">
              <Card className="h-full hover:border-[#105040]">
                <div className="flex items-center gap-3">
                  <ListChecks className="h-6 w-6 text-[#105040] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      Today&apos;s chores: {choresDone} of {chores.length} done
                      {lateChores.length > 0 && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-[#9B1C1C] text-white">{lateChores.length} late</span>}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {nextChore ? `Next: ${formatSlot(nextChore.slot)} — ${nextChore.plan.title}` : chores.length ? 'All done for today' : 'Nothing scheduled today'}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
          {needsRestock.length > 0 && (
            <Link href="/dashboard/restock" className="block">
              <Card className="h-full hover:border-[#105040]">
                <div className="flex items-center gap-3">
                  <PackageMinus className={`h-6 w-6 flex-shrink-0 ${outCount ? 'text-[#9B1C1C]' : 'text-[#8A5A1E]'}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {needsRestock.length} item{needsRestock.length === 1 ? '' : 's'} to restock
                      {outCount > 0 && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-[#9B1C1C] text-white">{outCount} out</span>}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{needsRestock.slice(0, 3).map((r) => r.item_name).join(', ')}</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
          {mineralsDue > 0 && (
            <Link href="/dashboard/minerals" className="block">
              <Card className="h-full hover:border-[#105040]">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-[#8A5A1E] flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{mineralsDue} mineral refill{mineralsDue === 1 ? '' : 's'} overdue</p>
                    <p className="text-sm text-gray-500">See which pastures need minerals</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>
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

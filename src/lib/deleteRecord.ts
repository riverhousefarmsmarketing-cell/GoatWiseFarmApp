import { getSupabaseClient } from '@/lib/supabase';
import { getFarmSessionRole, isFarmManagerRole } from '@/lib/farmSession';
import { notify } from '@/components/ui/toast';

export type DeleteOutcome = 'deleted' | 'requested' | 'already_requested' | 'cancelled';

/**
 * Delete one farm record, or ask for approval to delete it.
 *
 * Owners and managers: the record is deleted straight away.
 * Workers: nothing is deleted. A deletion request goes to the owner and
 * managers, who approve or reject it on the Approvals page.
 *
 * The decision is made in the database (delete_or_request, migration 020),
 * so it holds no matter which screen calls this. Returns the same
 * `{ error }` shape as a Supabase call so callers can swap it in directly;
 * check `outcome` before doing anything that should only follow a real
 * delete (like removing a photo file from storage).
 */
export async function deleteOrRequest(
  table: string,
  id: string,
  label?: string
): Promise<{ error: Error | null; outcome?: DeleteOutcome }> {
  let reason: string | null = null;

  if (!isFarmManagerRole(getFarmSessionRole())) {
    const answer = window.prompt(
      `Deleting needs approval from the farm owner or a manager.\n\n` +
        `Why should ${label ? `"${label}"` : 'this record'} be deleted? (optional)`,
      ''
    );
    if (answer === null) return { error: null, outcome: 'cancelled' };
    reason = answer;
  }

  const supabase = getSupabaseClient() as any;
  const { data, error } = await supabase.rpc('delete_or_request', {
    p_table: table,
    p_id: id,
    p_label: label ?? null,
    p_reason: reason,
  });
  if (error) return { error: new Error(error.message) };

  if (data === 'requested') {
    notify('Sent for approval. It will be deleted once the owner or a manager approves it.');
    return { error: null, outcome: 'requested' };
  }
  if (data === 'already_requested') {
    notify('A deletion request for this is already waiting for approval.');
    return { error: null, outcome: 'already_requested' };
  }
  return { error: null, outcome: 'deleted' };
}

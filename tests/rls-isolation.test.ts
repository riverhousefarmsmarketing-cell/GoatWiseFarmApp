/**
 * test-rls-1 — cross-farm data isolation.
 *
 * Proves that one signed-in farm cannot read, modify, delete, or plant rows in
 * another farm's data. This is the assumption every RLS policy in the schema
 * rests on, and until now nothing verified it.
 *
 * Provisions its own throwaway users via the admin API and deletes them
 * afterwards, so there is nothing to set up by hand. Requires:
 *
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   <- CI secret, never committed
 *
 * Skips (rather than fails) when the service role key is absent, so the suite
 * stays green on machines that aren't configured to reach a live project.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const configured = Boolean(url && anonKey && serviceKey);
const describeIfConfigured = configured ? describe : describe.skip;

if (!configured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[rls-isolation] skipped — set NEXT_PUBLIC_SUPABASE_URL, ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to run.'
  );
}

/** A password that satisfies the project's minimum length. */
const PASSWORD = 'rls-test-pw-2b9f41!';

type Farm = {
  userId: string;
  email: string;
  client: SupabaseClient;
};

describeIfConfigured('RLS: cross-farm isolation', () => {
  let admin: SupabaseClient;
  let farmA: Farm;
  let farmB: Farm;
  let animalId: string;

  const createFarm = async (label: string): Promise<Farm> => {
    // Unique per run so parallel or repeated runs never collide.
    const email = `rls-test-${label}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@example.invalid`;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;

    const client = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    if (signInError) throw signInError;

    return { userId: data.user!.id, email, client };
  };

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    farmA = await createFarm('a');
    farmB = await createFarm('b');

    const { data, error } = await (farmA.client.from('animals') as any)
      .insert({
        user_id: farmA.userId,
        name: 'Isolation Probe',
        sex: 'female',
        category: 'doe',
        species: 'goat',
      })
      .select()
      .single();

    if (error) throw error;
    animalId = data.id;
  });

  afterAll(async () => {
    // Deleting the auth users cascades to their farm data.
    if (farmA?.userId) await admin.auth.admin.deleteUser(farmA.userId);
    if (farmB?.userId) await admin.auth.admin.deleteUser(farmB.userId);
  });

  it('farm A can read back its own animal', async () => {
    const { data, error } = await farmA.client
      .from('animals')
      .select('id, name')
      .eq('id', animalId);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].name).toBe('Isolation Probe');
  });

  it('farm B cannot see farm A\'s animal in a list query', async () => {
    const { data, error } = await farmB.client.from('animals').select('id');

    expect(error).toBeNull();
    expect(data!.map((row: { id: string }) => row.id)).not.toContain(animalId);
  });

  it('farm B cannot read farm A\'s animal by id', async () => {
    const { data, error } = await farmB.client
      .from('animals')
      .select('id')
      .eq('id', animalId);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('farm B cannot update farm A\'s animal', async () => {
    const { data } = await (farmB.client.from('animals') as any)
      .update({ name: 'Hijacked' })
      .eq('id', animalId)
      .select();

    // RLS filters the row out rather than erroring — nothing comes back.
    expect(data ?? []).toHaveLength(0);

    const { data: check } = await farmA.client
      .from('animals')
      .select('name')
      .eq('id', animalId)
      .single();
    expect(check!.name).toBe('Isolation Probe');
  });

  it('farm B cannot delete farm A\'s animal', async () => {
    const { data } = await (farmB.client.from('animals') as any)
      .delete()
      .eq('id', animalId)
      .select();

    expect(data ?? []).toHaveLength(0);

    const { data: check } = await farmA.client
      .from('animals')
      .select('id')
      .eq('id', animalId);
    expect(check).toHaveLength(1);
  });

  it('farm B cannot create a row owned by farm A', async () => {
    const { error } = await (farmB.client.from('animals') as any).insert({
      user_id: farmA.userId,
      name: 'Planted',
      sex: 'female',
      category: 'doe',
      species: 'goat',
    });

    // The WITH CHECK clause must reject this outright.
    expect(error).not.toBeNull();
  });

  it('farm B sees an empty herd list of its own', async () => {
    const { data, error } = await farmB.client.from('herds').select('id');

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

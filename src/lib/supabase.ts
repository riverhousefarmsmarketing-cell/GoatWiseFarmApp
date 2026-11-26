import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Annotating the clients as the plain `SupabaseClient<Database>` is what makes
// insert/update payloads type-check. The *inferred* return of createClient /
// createBrowserClient carries extra schema generics that collapse mutation
// payloads to `never` (the reason the old `mutationFrom` cast to `any`); the
// explicit annotation selects the overload that reads the generated Insert/
// Update types instead.

// Browser client for client components.
//
// The `as unknown as SupabaseClient<Database>` bridges a version skew: this app
// pins @supabase/ssr 0.1.0, which bundles an older SupabaseClient type (fewer
// schema generics) than the installed @supabase/supabase-js 2.90.1. The runtime
// object is a genuine supabase-js client (ssr just wraps createClient), so the
// cast only reconciles the two type declarations — not a behavior change. Once
// @supabase/ssr is upgraded to match, this cast can be dropped.
export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Empty object on purpose: @supabase/ssr falls back to document.cookie
      // storage when no get/set/remove are supplied, which is what the
      // middleware reads. Passing this only so `auth` below can be merged in
      // (user options win via mergeDeepRight).
      cookies: {},
      auth: {
        // @supabase/ssr defaults to PKCE, which ties an emailed link to the
        // browser that requested it -- the code verifier lives in that
        // browser's storage. Real users request a password reset on a laptop
        // and open the email on a phone, or their mail app opens the link in
        // an in-app browser with its own storage. Either way the verifier is
        // missing and the exchange dies with `bad_code_verifier`, which is
        // exactly what a beta user hit.
        //
        // Implicit puts the token in the URL fragment instead, so the link
        // works from any device or browser. This also applies to signup
        // confirmation links. No OAuth provider is configured, and nothing in
        // the app calls exchangeCodeForSession, so nothing else depends on
        // PKCE. /reset-password handles both shapes regardless.
        flowType: 'implicit',
      },
    }
  ) as unknown as SupabaseClient<Database>;
}

// Server client for server components and API routes
export function createServerSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

// Singleton browser client
let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient should only be called on the client');
  }
  
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  
  return browserClient;
}

// Mutations now go straight through the typed client, e.g.
// `getSupabaseClient().from('animals').insert(...)`. The former `mutationFrom`
// `any` escape hatch is gone: with `database.ts` generated from the live
// schema, insert/update payloads are type-checked against the real columns.

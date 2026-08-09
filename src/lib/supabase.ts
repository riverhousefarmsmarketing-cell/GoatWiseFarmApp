import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Browser client for client components
export function createBrowserSupabaseClient() {
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
  );
}

// Server client for server components and API routes
export function createServerSupabaseClient() {
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
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient should only be called on the client');
  }
  
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient();
  }
  
  return browserClient;
}

/**
 * Helper for mutation operations (insert/update/delete).
 * 
 * Supabase's typed client infers `never` for mutation payloads when using
 * a hand-written Database interface (rather than CLI-generated types).
 * This casts .from() to `any` only for mutations, preserving type safety
 * on read operations. Replace this with proper CLI-generated types when
 * available: npx supabase gen types typescript --project-id <id>
 */
export function mutationFrom(table: string): any {
  return getSupabaseClient().from(table) as any;
}

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Browser client for client components
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mutationFrom(table: string): any {
  return getSupabaseClient().from(table) as any;
}

'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, farmName?: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  // Tracks the currently-cached user so we can drop React Query data whenever the
  // signed-in identity changes. The QueryClient is an app-level singleton and
  // query keys are not namespaced by user, so without this a second account
  // signing in on the same browser would see the previous user's cached data
  // (fresh within the 60s staleTime) before any refetch.
  const cachedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    const applySession = (session: Session | null) => {
      const nextUserId = session?.user?.id ?? null;
      // Clear cached data when the identity actually changes (sign-out, or a
      // different account) -- not on token refresh for the same user.
      if (cachedUserIdRef.current !== null && cachedUserIdRef.current !== nextUserId) {
        queryClient.clear();
      }
      cachedUserIdRef.current = nextUserId;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, farmName?: string) => {
    const supabase = getSupabaseClient();
    // The profile row is created by the handle_new_user() trigger, which reads
    // farm_name straight out of this metadata (see migration 011). Inserting it
    // from here as well collided with the trigger's row and silently failed.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          farm_name: farmName,
        },
      },
    });

    // When the project has email confirmation enabled, signUp succeeds but
    // returns no session -- the user must click the emailed link first. Signal
    // that so the page can show "check your email" instead of pushing to the
    // dashboard (which would bounce straight back to /login).
    return { error, needsEmailConfirmation: !error && !data.session };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    // Drop every cached query so the next user on this browser can't see the
    // previous user's data. The auth-state handler also clears on identity
    // change; doing it here too avoids any window before that fires.
    queryClient.clear();
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

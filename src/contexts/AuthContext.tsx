import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, clearUserCache, trackAuthCall } from '@/lib/supabase';
import { clearSupabaseResponseCache } from '@/services/localStorageService/clearLocalData';
import { User, Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: (options?: { keepLocalCopy?: boolean }) => Promise<{ error: AuthError | null }>;
  /**
   * Whether the sign-out in progress should leave a copy of the account's data
   * on this device. True for session expiry and other sign-outs the user did
   * not start, so data is never silently lost.
   */
  shouldKeepLocalCopy: () => boolean;
  /**
   * Registers work that must run while the session is still valid, right
   * before a user-initiated sign-out (e.g. copying cloud data to this device —
   * once Supabase ends the session, authenticated reads fail). Pass null to
   * unregister.
   */
  setBeforeSignOut: (handler: BeforeSignOutHandler | null) => void;
  /**
   * Registers work to undo the before-sign-out step when Supabase fails to
   * sign out and the user stays signed in (e.g. resuming paused backups).
   * Pass null to unregister.
   */
  setOnSignOutFailed: (handler: (() => void) | null) => void;
  isAuthenticated: boolean;
}

export type BeforeSignOutHandler = (options: { keepLocalCopy: boolean }) => Promise<void>;

// Longest a sign-out waits for pre-sign-out work (copying data to this device)
// before ending the session anyway. The data is still in the account, so a slow
// or stalled network must not keep the user signed in.
export const BEFORE_SIGN_OUT_TIMEOUT_MS = 5000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const keepLocalCopyRef = useRef(true);
  const beforeSignOutRef = useRef<BeforeSignOutHandler | null>(null);
  const onSignOutFailedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      trackAuthCall('getSession', 'AuthContext.getInitialSession');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      trackAuthCall('onAuthStateChange', `AuthContext.${event}`);

      // Clear user cache when auth state changes
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        clearUserCache();
      }
      if (event === 'SIGNED_OUT') {
        void clearSupabaseResponseCache();
      }
      if (event === 'SIGNED_IN') {
        keepLocalCopyRef.current = true;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    trackAuthCall('signInWithPassword', 'AuthContext.signIn');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async (options?: { keepLocalCopy?: boolean }) => {
    trackAuthCall('signOut', 'AuthContext.signOut');
    // Keep the user's choice even if sign-out fails: a later sign-out (retry
    // or session expiry) must still honor "Remove from this device".
    keepLocalCopyRef.current = options?.keepLocalCopy ?? true;
    if (beforeSignOutRef.current) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), BEFORE_SIGN_OUT_TIMEOUT_MS);
      });
      try {
        const outcome = await Promise.race([
          beforeSignOutRef.current({ keepLocalCopy: keepLocalCopyRef.current }),
          timeout
        ]);
        if (outcome === 'timeout') {
          console.warn(`⚠️ Pre-sign-out work took longer than ${BEFORE_SIGN_OUT_TIMEOUT_MS}ms; signing out anyway.`);
        }
      } catch (error) {
        // The data is still in the account, so signing out stays safe.
        console.error('❌ Pre-sign-out work failed:', error);
      } finally {
        clearTimeout(timeoutId);
      }
    }
    const { error } = await supabase.auth.signOut();
    if (error) onSignOutFailedRef.current?.();
    return { error };
  };

  const shouldKeepLocalCopy = useCallback(() => keepLocalCopyRef.current, []);
  const setBeforeSignOut = useCallback((handler: BeforeSignOutHandler | null) => {
    beforeSignOutRef.current = handler;
  }, []);
  const setOnSignOutFailed = useCallback((handler: (() => void) | null) => {
    onSignOutFailedRef.current = handler;
  }, []);

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    shouldKeepLocalCopy,
    setBeforeSignOut,
    setOnSignOutFailed,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

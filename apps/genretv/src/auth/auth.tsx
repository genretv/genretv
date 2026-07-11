import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";
import { requestPersistentStorage } from "../sync/persistent-storage";

interface AuthState {
  session: Session | null;
  loading: boolean;
  roles: readonly string[];
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session == null) return;
    void requestPersistentStorage();
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      roles: (session?.user.app_metadata?.["roles"] as string[] | undefined) ?? [],
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl("/reset-password"),
        });
        if (error) throw error;
      },
      updatePassword: async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function authRedirectUrl(path: string): string {
  if (import.meta.env["VITE_GENRETV_HASH_ROUTING"] === "1") {
    return `${window.location.origin}${window.location.pathname}#${path}`;
  }
  return `${window.location.origin}${path}`;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context == null) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return context;
}

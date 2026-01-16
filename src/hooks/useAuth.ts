import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole, setCachedUserRole, clearCachedUserRole, getCachedUserRole } from "@/lib/auth";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
    isAuthenticated: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
      let t: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<T>((resolve) => {
            t = setTimeout(() => resolve(fallback), ms);
          }),
        ]);
      } finally {
        if (t) clearTimeout(t);
      }
    };

    const resolveRole = async (): Promise<string> => {
      const cached = getCachedUserRole();
      const role = await withTimeout(getUserRole(), 6000, (cached ?? "COPAB") as any);
      const finalRole = (role as any) ?? cached ?? "COPAB";
      setCachedUserRole(finalRole);
      return finalRole;
    };

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      if (!isMounted) return;

      if (session?.user) {
        const role = await resolveRole();
        if (!isMounted) return;

        setAuthState({
          user: session.user,
          session,
          role,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        clearCachedUserRole();
        setAuthState({
          user: null,
          session: null,
          role: null,
          loading: false,
          isAuthenticated: false,
        });

        // Redirect to login if signed out
        if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      }
    });

    // THEN check for existing session
    const initializeAuth = async () => {
      type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;

      const result = await withTimeout<GetSessionResult>(
        supabase.auth.getSession(),
        6000,
        { data: { session: null }, error: null } as GetSessionResult,
      );

      const session = result.data?.session ?? null;

      if (session?.user) {
        const role = await resolveRole();
        if (!isMounted) return;

        setAuthState({
          user: session.user,
          session,
          role,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        if (!isMounted) return;
        setAuthState((prev) => ({
          ...prev,
          loading: false,
        }));
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    clearCachedUserRole();
    await supabase.auth.signOut();
  };

  return {
    ...authState,
    signOut,
    getCurrentRole: getCachedUserRole,
  };
};

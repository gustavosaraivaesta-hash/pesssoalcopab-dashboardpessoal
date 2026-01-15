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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      
      if (session?.user) {
        // Fetch role when user logs in
        const role = await getUserRole();
        setCachedUserRole(role);
        
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
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    });

    // THEN check for existing session
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const role = await getUserRole();
        setCachedUserRole(role);
        
        setAuthState({
          user: session.user,
          session,
          role,
          loading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
        }));
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
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

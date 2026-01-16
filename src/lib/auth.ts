import { supabase } from "@/integrations/supabase/client";

// User access control configuration based on roles
export interface UserAccess {
  allowedOMs: string[] | "all";
}

export const USER_ACCESS_CONFIG: Record<string, UserAccess> = {
  CSUPAB: {
    allowedOMs: ["CSUPAB", "DEPCMRJ", "DEPFMRJ", "DEPMSMRJ", "DEPSIMRJ", "DEPSMRJ"],
  },
  COPAB: {
    allowedOMs: "all",
  },
};

// Get user role from database
export const getUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: roleData, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !roleData) {
      console.log("Auth - No role found for user:", user.id);
      return "COPAB"; // Default role
    }

    return roleData.role;
  } catch (error) {
    console.error("Error getting user role:", error);
    return "COPAB";
  }
};

// Sync function for components that need immediate role access
// Uses cached role from localStorage after first fetch
export const getCachedUserRole = (): string | null => {
  return localStorage.getItem("userRole");
};

export const setCachedUserRole = (role: string | null): void => {
  if (role) {
    localStorage.setItem("userRole", role);
  } else {
    localStorage.removeItem("userRole");
  }
};

export const clearCachedUserRole = (): void => {
  localStorage.removeItem("userRole");
};

export const getAllowedOMs = (): string[] | "all" => {
  const currentRole = getCachedUserRole();
  console.log("Auth - currentRole from cache:", currentRole);
  
  if (!currentRole) {
    console.log("Auth - No currentRole, returning empty array (require auth)");
    return [];
  }
  
  const userConfig = USER_ACCESS_CONFIG[currentRole];
  console.log("Auth - userConfig:", userConfig);
  
  const result = userConfig?.allowedOMs || [];
  console.log("Auth - getAllowedOMs result:", result);
  return result;
};

export const getAvailableOMsForUser = (allOMs: string[]): string[] => {
  const allowedOMs = getAllowedOMs();
  if (allowedOMs === "all") return allOMs;
  if (allowedOMs.length === 0) return [];

  const allowedUpper = new Set(allowedOMs.map((o) => o.toUpperCase()));
  return allOMs.filter((om) => allowedUpper.has(om.toUpperCase()));
};

export const filterDataByAllowedOMs = <T extends { om: string }>(
  data: T[],
  allowedOMs: string[] | "all",
): T[] => {
  if (allowedOMs === "all") return data;
  if (allowedOMs.length === 0) return [];

  const allowedUpper = new Set(allowedOMs.map((o) => o.toUpperCase()));
  return data.filter((item) => allowedUpper.has(String(item.om || "").toUpperCase()));
};

export const filterDataForCurrentUser = <T extends { om: string }>(data: T[]): T[] => {
  const allowedOMs = getAllowedOMs();
  return filterDataByAllowedOMs(data, allowedOMs);
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Logout function
export const logout = async (): Promise<void> => {
  clearCachedUserRole();
  await supabase.auth.signOut();
};

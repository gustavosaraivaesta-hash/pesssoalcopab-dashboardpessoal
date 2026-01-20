import { supabase } from "@/integrations/supabase/client";

// User access control configuration based on roles
export interface UserAccess {
  allowedOMs: string[] | "all";
}

// All available OMs in the system
export const ALL_OMS = [
  "COPAB",
  "CSUPAB",
  "BAMRJ",
  "CMM",
  "DEPCMRJ",
  "CDAM",
  "DEPSMRJ",
  "DEPSIMRJ",
  "DEPMSMRJ",
  "DEPFMRJ",
  "CDU-BAMRJ",
  "CDU-1DN",
];

// CSUPAB has access to specific OMs under its command (sem DEPCMRJ)
const CSUPAB_OMS = ["CSUPAB", "DEPFMRJ", "DEPMSMRJ", "DEPSIMRJ", "DEPSMRJ"];

export const USER_ACCESS_CONFIG: Record<string, UserAccess> = {
  // COPAB sees everything
  COPAB: {
    allowedOMs: "all",
  },
  // CSUPAB sees its subordinate OMs
  CSUPAB: {
    allowedOMs: CSUPAB_OMS,
  },
  // Each individual OM only sees its own data
  BAMRJ: { allowedOMs: ["BAMRJ"] },
  CMM: { allowedOMs: ["CMM"] },
  DEPCMRJ: { allowedOMs: ["DEPCMRJ"] },
  CDAM: { allowedOMs: ["CDAM"] },
  DEPSMRJ: { allowedOMs: ["DEPSMRJ"] },
  DEPSIMRJ: { allowedOMs: ["DEPSIMRJ"] },
  DEPMSMRJ: { allowedOMs: ["DEPMSMRJ"] },
  // DEPFMRJ também vê CDU-BAMRJ e CDU-1DN
  DEPFMRJ: { allowedOMs: ["DEPFMRJ", "CDU-BAMRJ", "CDU-1DN"] },
  "CDU-BAMRJ": { allowedOMs: ["CDU-BAMRJ"] },
  "CDU-1DN": { allowedOMs: ["CDU-1DN"] },
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

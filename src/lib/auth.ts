// User access control configuration
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

export const getAllowedOMs = (): string[] | "all" => {
  const currentUser = localStorage.getItem("currentUser");
  console.log("Auth - currentUser from localStorage:", currentUser);
  
  if (!currentUser) {
    console.log("Auth - No currentUser, returning 'all'");
    return "all";
  }
  
  const userConfig = USER_ACCESS_CONFIG[currentUser];
  console.log("Auth - userConfig:", userConfig);
  
  const result = userConfig?.allowedOMs || "all";
  console.log("Auth - getAllowedOMs result:", result);
  return result;
};

export const getAvailableOMsForUser = (allOMs: string[]): string[] => {
  const allowedOMs = getAllowedOMs();
  if (allowedOMs === "all") return allOMs;

  const allowedUpper = new Set(allowedOMs.map((o) => o.toUpperCase()));
  return allOMs.filter((om) => allowedUpper.has(om.toUpperCase()));
};

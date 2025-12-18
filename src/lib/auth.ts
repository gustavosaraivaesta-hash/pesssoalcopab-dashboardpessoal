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
  if (!currentUser) return "all";
  
  const userConfig = USER_ACCESS_CONFIG[currentUser];
  return userConfig?.allowedOMs || "all";
};

export const getAvailableOMsForUser = (allOMs: string[]): string[] => {
  const allowedOMs = getAllowedOMs();
  if (allowedOMs === "all") return allOMs;
  return allOMs.filter(om => allowedOMs.includes(om));
};

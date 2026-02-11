Mimport { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Specialty equivalence mapping for NEO comparison.
 * TIC (TMFT) = PD (EFE)
 * SAU (TMFT) = EF or PC (EFE)
 * Returns true if specialties are considered equivalent.
 */
const SPECIALTY_EQUIVALENCE: Record<string, string[]> = {
  TIC: ["PD"],
  QUI: ["QI"],
  SAU: ["EF", "PC", "HD", "ND"],
  ADM: ["AD"],
};

// Reverse mapping: EFE code -> TMFT codes it's equivalent to
const REVERSE_EQUIVALENCE: Record<string, string[]> = {
  PD: ["TIC"],
  QI: ["QUI"],
  EF: ["SAU"],
  PC: ["SAU"],
  HD: ["SAU"],
  ND: ["SAU"],
  AD: ["ADM"],
};

export function areSpecialtiesEquivalent(tmft: string, efe: string): boolean {
  if (tmft === efe) return true;
  const equivalents = SPECIALTY_EQUIVALENCE[tmft];
  if (equivalents && equivalents.includes(efe)) return true;
  return false;
}

/**
 * Expands a list of selected specialty codes to include their equivalents.
 * E.g., if "TIC" is selected, returns ["TIC", "PD"] so EFE filter also matches PD.
 * If "PD" is selected, returns ["PD", "TIC"] so TMFT filter also matches TIC.
 */
export function expandSpecialtyEquivalents(selected: string[]): string[] {
  const expanded = new Set(selected);
  for (const code of selected) {
    const fwd = SPECIALTY_EQUIVALENCE[code];
    if (fwd) fwd.forEach((eq) => expanded.add(eq));
    const rev = REVERSE_EQUIVALENCE[code];
    if (rev) rev.forEach((eq) => expanded.add(eq));
  }
  return Array.from(expanded);
}

/**
 * Checks if a person is "FORA DA NEO" based on specialty comparison.
 * Returns true if FORA DA NEO (specialties don't match and aren't equivalent).
 */
export function isForaDaNeo(quadroTmft: string, quadroEfe: string): boolean {
  const tmft = (quadroTmft || "").trim().toUpperCase();
  const efe = (quadroEfe || "").trim().toUpperCase();
  if (!tmft || !efe || tmft === "-" || efe === "-") return false;
  return !areSpecialtiesEquivalent(tmft, efe);
}

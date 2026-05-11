import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize graduation rank variants:
 * "1°SG"/"1ºSG" -> "1SG", same for 2 and 3. Preserves suffixes.
 */
export function normalizeGraduacao(val: string | undefined | null): string {
  if (!val) return "";
  return String(val)
    .replace(/^1[º°]SG\b/i, "1SG")
    .replace(/^2[º°]SG\b/i, "2SG")
    .replace(/^3[º°]SG\b/i, "3SG");
}

/**
 * Apply normalizeGraduacao to all known graduation fields on a record (non-mutating).
 */
export function normalizeGraduacaoFields<T extends Record<string, any>>(items: T[]): T[] {
  if (!Array.isArray(items)) return items;
  const fields = ["postoTmft", "postoEfe", "graduacao", "posto"];
  return items.map((it) => {
    if (!it) return it;
    let changed = false;
    const out: any = { ...it };
    for (const f of fields) {
      if (typeof out[f] === "string") {
        const n = normalizeGraduacao(out[f]);
        if (n !== out[f]) {
          out[f] = n;
          changed = true;
        }
      }
    }
    return changed ? out : it;
  });
}

const EXCLUDED_QUADROS_LIST = ["QPA", "CPA", "QAP", "CAP", "CATP", "PRM", "CPRM", "QFN", "CFN", "PL"];

/**
 * Formats a military name with the correct posto-opcao-quadro pattern.
 * - CARREIRA: POSTO-QUADRO NOME (no suffix)
 * - TTC: POSTO-RM-1-QUADRO NOME
 * - RM-2: POSTO-RM-2-QUADRO NOME
 */
/**
 * Strip a leading military-rank prefix from a name, e.g.:
 *   "1° SG-CL CARLOS..." -> "CARLOS..."
 *   "1SG-CL CARLOS..."   -> "CARLOS..."
 *   "2º SG CARLOS..."    -> "CARLOS..."
 *   "CB CARLOS..."       -> "CARLOS..."
 * Used to avoid duplicated rank when reformatting the name.
 */
export function stripRankPrefixFromName(nome: string): string {
  if (!nome) return "";
  let n = String(nome).trim().toUpperCase();
  // Remove patterns like "1°SG", "1° SG", "1º SG", "1SG" optionally followed by option (RM1/RM2/RM-1/RM-2) and/or specialty suffix
  n = n.replace(/^[1-3]\s*[º°]?\s*SG(?:\s*[-\s]\s*RM-?\d)?(?:\s*[-\s]\s*[A-Z]{1,4})?\s+/i, "");
  // Remove other common ranks (CB, MN, SO, etc.) optionally with option and specialty suffix
  n = n.replace(/^(C\s*ALTE|V\s*ALTE|CMG|CF|CC|CT|1T|2T|GM|SO|CB|MN)(?:\s*[-\s]\s*RM-?\d)?(?:\s*[-\s]\s*[A-Z]{1,4})?\s+/i, "");
  return n.trim();
}

export function formatMilitarNameWithOpcao(
  posto: string,
  quadro: string,
  nome: string,
  opcao: string,
  opts?: { excludeMNQuadro?: boolean }
): string {
  const p = (posto || "").trim().toUpperCase();
  const q = (quadro || "").trim().toUpperCase();
  const n = stripRankPrefixFromName(nome) || "-";
  const o = (opcao || "").trim().toUpperCase();
  
  const isValidQuadro = q && q !== "-" && !EXCLUDED_QUADROS_LIST.includes(q) && !(opts?.excludeMNQuadro && p === "MN");
  
  if (!p) return n;
  
  // Determine insert between posto and quadro
  let insert = "";
  if (o === "TTC") {
    insert = "RM1";
  } else if (o && o !== "-" && o !== "CARREIRA") {
    // RM-2 -> RM2, or any other non-standard option
    insert = o.replace(/^RM-(\d)$/, "RM$1");
  }
  // CARREIRA or empty = no insert
  
  if (insert) {
    return `${p}-${insert}${isValidQuadro ? `-${q}` : ""} ${n}`;
  }
  return `${p}${isValidQuadro ? `-${q}` : ""} ${n}`;
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
 * Also checks opcao: if one is TTC and the other is not, it's divergent (TTC x Carreira).
 */
export function isForaDaNeo(quadroTmft: string, quadroEfe: string, opcaoTmft?: string, opcaoEfe?: string): boolean {
  // Check opcao TTC divergence FIRST (before any guard clause)
  const oTmft = (opcaoTmft || "").trim().toUpperCase();
  const oEfe = (opcaoEfe || "").trim().toUpperCase();
  const tmftIsTTC = oTmft === "TTC" || oTmft === "RM1" || oTmft === "RM-1";
  const efeIsTTC = oEfe === "TTC" || oEfe === "RM1" || oEfe === "RM-1";
  // If one is TTC and the other is not (including when opcao is empty = carreira), it's divergent
  if (tmftIsTTC !== efeIsTTC) return true;
  // Quando AMBOS são TTC, não há divergência de especialidade (independente do quadro)
  if (tmftIsTTC && efeIsTTC) return false;

  const tmft = (quadroTmft || "").trim().toUpperCase();
  const efe = (quadroEfe || "").trim().toUpperCase();
  if (!tmft || !efe || tmft === "-" || efe === "-") return false;
  return !areSpecialtiesEquivalent(tmft, efe);
}

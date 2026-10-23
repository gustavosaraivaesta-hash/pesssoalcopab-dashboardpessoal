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
    .trim()
    .replace(/^1\s*[º°]?\s*SG\b/i, "1SG")
    .replace(/^2\s*[º°]?\s*SG\b/i, "2SG")
    .replace(/^3\s*[º°]?\s*SG\b/i, "3SG")
    // SO-RM1 / 2SG-RM1 / 1SG RM-1 -> SO / 2SG / 1SG
    .replace(/\s*[-\s]\s*RM\s*-?\s*1\b/i, "")
    .trim();
}


const RANK_PATTERN = String.raw`(?:C\s*ALTE|V\s*ALTE|CONTRA-ALMIRANTE|CMG|CF|CC|CT|1TEN|2TEN|1T|2T|GM|SO|[1-3]\s*[º°]?\s*SG|CB|MN)`;
const RANK_ONLY_RE = new RegExp(`^${RANK_PATTERN}$`, "i");
const RANK_QUADRO_NAME_RE = new RegExp(String.raw`^(${RANK_PATTERN})\s*[-\s]\s*([A-Z]{1,4})(?:\s+(.+))?$`, "i");
const QUADRO_RANK_QUADRO_NAME_RE = new RegExp(String.raw`^[A-Z]{1,4}\s*[-\s]\s*(${RANK_PATTERN})\s*[-\s]\s*([A-Z]{1,4})(?:\s+(.+))?$`, "i");

const normalizeRankValue = (value: string): string => normalizeGraduacao(value).replace(/\s+/g, " ").trim().toUpperCase();

const isRankValue = (value: string): boolean => RANK_ONLY_RE.test(String(value || "").trim());

const formatRankForDisplay = (value: string): string => {
  const normalized = normalizeRankValue(value);
  return normalized.replace(/^([1-3])SG$/, "$1° SG");
};

const parseRankQuadroName = (value: string): { rank: string; quadro: string; nome?: string } | null => {
  const match = String(value || "").trim().toUpperCase().match(RANK_QUADRO_NAME_RE);
  if (!match) return null;
  return { rank: normalizeRankValue(match[1]), quadro: match[2].toUpperCase(), nome: match[3]?.trim() };
};

const parseQuadroRankQuadroName = (value: string): { rank: string; quadro: string; nome?: string } | null => {
  const match = String(value || "").trim().toUpperCase().match(QUADRO_RANK_QUADRO_NAME_RE);
  if (!match) return null;
  return { rank: normalizeRankValue(match[1]), quadro: match[2].toUpperCase(), nome: match[3]?.trim() };
};

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

    const fixPostoQuadroPair = (postoField: string, quadroField: string) => {
      if (typeof out[postoField] !== "string" || typeof out[quadroField] !== "string") return;
      const posto = out[postoField].trim().toUpperCase();
      const quadro = out[quadroField].trim().toUpperCase();
      if (!posto && !quadro) return;

      const parsedFromPosto = parseQuadroRankQuadroName(posto) || parseRankQuadroName(posto);
      const parsedFromQuadro = parseRankQuadroName(quadro);

      if (parsedFromPosto && !isRankValue(posto)) {
        out[postoField] = parsedFromPosto.rank;
        out[quadroField] = parsedFromPosto.quadro;
        if (parsedFromPosto.nome && (!out.nome || String(out.nome).trim().toUpperCase() === posto)) out.nome = parsedFromPosto.nome;
        changed = true;
        return;
      }

      if (parsedFromQuadro && (!isRankValue(posto) || posto === parsedFromQuadro.quadro)) {
        out[postoField] = parsedFromQuadro.rank;
        out[quadroField] = parsedFromQuadro.quadro;
        if (parsedFromQuadro.nome && (!out.nome || String(out.nome).trim().toUpperCase() === quadro)) out.nome = parsedFromQuadro.nome;
        changed = true;
        return;
      }

      if (!isRankValue(posto) && isRankValue(quadro)) {
        out[postoField] = normalizeRankValue(quadro);
        out[quadroField] = posto;
        changed = true;
      }
    };

    fixPostoQuadroPair("postoTmft", "quadroTmft");
    fixPostoQuadroPair("postoEfe", "quadroEfe");
    fixPostoQuadroPair("posto", "quadro");

    return changed ? out : it;
  });
}

const EXCLUDED_QUADROS_LIST = ["QPA", "CPA", "QAP", "CAP", "CATP", "PRM", "CPRM", "QFN", "CFN"];

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
  let p = (posto || "").trim().toUpperCase();
  let q = (quadro || "").trim().toUpperCase();
  let rawNome = (nome || "").trim();
  const o = (opcao || "").trim().toUpperCase();

  // Defensive: posto field sometimes contains the full "QUADRO-RANK-QUADRO NAME"
  // string (data shift in source). Detect and extract real posto.
  const contaminatedPostoMatch = parseQuadroRankQuadroName(p) || parseRankQuadroName(p);
  if (contaminatedPostoMatch && !isRankValue(p)) {
    p = contaminatedPostoMatch.rank;
    q = contaminatedPostoMatch.quadro;
    if (contaminatedPostoMatch.nome) rawNome = contaminatedPostoMatch.nome;
  }

  // Defensive: quadro field sometimes contains the full "RANK-QUADRO NAME" string.
  const contaminatedQuadroMatch = parseRankQuadroName(q);
  if (contaminatedQuadroMatch) {
    if (!isRankValue(p) || p === contaminatedQuadroMatch.quadro) p = contaminatedQuadroMatch.rank;
    q = contaminatedQuadroMatch.quadro;
    if (contaminatedQuadroMatch.nome) rawNome = contaminatedQuadroMatch.nome;
  }

  if (!isRankValue(p) && isRankValue(q)) {
    const originalPosto = p;
    p = normalizeRankValue(q);
    q = originalPosto;
  }

  // Dedupe name if it contains itself twice (e.g. "NOME COMPLETO NOME COMPLETO")
  const cleanedNome = rawNome.replace(/\s+/g, " ").trim();
  if (cleanedNome.length > 0) {
    const words = cleanedNome.split(" ");
    if (words.length % 2 === 0) {
      const half = words.length / 2;
      const a = words.slice(0, half).join(" ");
      const b = words.slice(half).join(" ");
      if (a.toUpperCase() === b.toUpperCase()) rawNome = a;
    }
  }

  const n = stripRankPrefixFromName(rawNome) || "-";

  const isValidQuadro = q && q !== "-" && !EXCLUDED_QUADROS_LIST.includes(q) && !(opts?.excludeMNQuadro && p === "MN");

  if (!p) return n;
  const displayPosto = formatRankForDisplay(p);

  // Determine insert between posto and quadro
  let insert = "";
  if (o === "TTC" || o === "RM1" || o === "RM-1") {
    insert = "RM1";
  } else if (o === "RM2" || o === "RM-2") {
    insert = "RM2";
  } else if (o && o !== "-" && o !== "CARREIRA") {
    insert = o;
  }
  // CARREIRA or empty = no insert

  if (insert) {
    return `${displayPosto}-${insert}${isValidQuadro ? `-${q}` : ""} ${n}`;
  }
  return `${displayPosto}${isValidQuadro ? `-${q}` : ""} ${n}`;
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
  IF: ["IF-FN", "IFFN"],
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
  "IF-FN": ["IF"],
  IFFN: ["IF"],
};

export function areSpecialtiesEquivalent(tmft: string, efe: string): boolean {
  const a = (tmft || "").trim().toUpperCase();
  const b = (efe || "").trim().toUpperCase();
  if (a === b) return true;
  if (SPECIALTY_EQUIVALENCE[a]?.includes(b)) return true;
  if (SPECIALTY_EQUIVALENCE[b]?.includes(a)) return true;
  // Symmetric comparison via canonical codes (e.g. TIC <-> PD, ADM <-> AD)
  return canonicalizeSpecialty(a) === canonicalizeSpecialty(b);
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
 * Maps equivalent specialty codes to a single canonical code.
 * Used to group counts for charts/metrics (e.g., PD and TIC together).
 * Canonical: TIC, QUI, SAU, ADM, IF.
 */
const SPECIALTY_CANONICAL: Record<string, string> = {
  PD: "TIC",
  QI: "QUI",
  EF: "SAU",
  PC: "SAU",
  HD: "SAU",
  ND: "SAU",
  AD: "ADM",
  "IF-FN": "IF",
  IFFN: "IF",
};

export function canonicalizeSpecialty(code: string | undefined | null): string {
  const c = (code || "").trim().toUpperCase();
  if (!c || c === "-") return "SEM ESPECIALIDADE";
  return SPECIALTY_CANONICAL[c] || c;
}


/**
 * Checks if a person is "FORA DA NEO" based on specialty comparison.
 * Returns true if FORA DA NEO (specialties don't match and aren't equivalent).
 * Different normalized vínculos are divergent, including CARREIRA vs RM2.
 */
export function isForaDaNeo(quadroTmft: string, quadroEfe: string, opcaoTmft?: string, opcaoEfe?: string): boolean {
  const normalizeVinculo = (value?: string): string => {
    const option = (value || "").trim().toUpperCase();
    if (!option || option === "-") return "CARREIRA";
    if (option === "RM1" || option === "RM-1") return "TTC";
    if (option === "RM-2") return "RM2";
    return option;
  };
  const oTmft = normalizeVinculo(opcaoTmft);
  const oEfe = normalizeVinculo(opcaoEfe);
  if (oTmft !== oEfe) return true;
  // Vínculos TTC correspondentes dispensam a comparação de especialidades.
  if (oTmft === "TTC") return false;

  const tmft = (quadroTmft || "").trim().toUpperCase();
  const efe = (quadroEfe || "").trim().toUpperCase();
  if (!tmft || !efe || tmft === "-" || efe === "-") return false;
  return !areSpecialtiesEquivalent(tmft, efe);
}

/**
 * Format the AT. TOTAL (attendance total) percentage.
 * When TMFT is zero and there are effective personnel, show as excess
 * (e.g. "EXCEDENTE (1+)"), otherwise return the percentage.
 */
export function formatAtTotal(tmft: number, total: number): string {
  if (tmft > 0) return `${((total / tmft) * 100).toFixed(1)}%`;
  if (total > 0) return `EXCEDENTE (${total}+)`;
  return "0.0%";
}

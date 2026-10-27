import { canonicalizeSpecialty, normalizeGraduacao, normalizeVinculo } from "./utils";

export type AnalysisCategory = "OFICIAIS" | "PRAÇAS";
export interface AnalysisRecord {
  id: string; om: string; tipoSetor: string; ocupado: boolean; nome: string;
  postoTmft: string; postoEfe: string; quadroTmft: string; quadroEfe: string;
  opcaoTmft?: string; opcaoEfe?: string; corpoTmft?: string; corpoEfe?: string;
  isExtraLotacao?: boolean;
}
export interface AnalysisBalance {
  id: string; profile: string; category: AnalysisCategory; om: string;
  specialty: string; rank: string; vinculo: string; corpo: string;
  planned: number; actual: number;
}
export interface AnalysisMove {
  sourceId: string; targetId: string; quantity: number;
}
export interface AnalysisSuggestion extends AnalysisMove {
  source: AnalysisBalance; target: AnalysisBalance;
}

const clean = (value?: string) => (value || "").trim().toUpperCase();
const rankValue = (value: string) => normalizeGraduacao(value).toUpperCase().replace(/^([12])TEN$/, "$1T").replace(/\s+/g, "");

/** Inventory and requirements are independent; no source records are changed. */
export function buildAnalysisBalances(sources: { category: AnalysisCategory; records: AnalysisRecord[] }[]): AnalysisBalance[] {
  const groups = new Map<string, AnalysisBalance>();
  for (const { category, records } of sources) {
    for (const record of records) {
      const om = clean(record.om);
      if (!om) continue;
      const add = (side: "Tmft" | "Efe") => {
        const specialty = canonicalizeSpecialty(record[`quadro${side}`]);
        if (specialty === "SEM ESPECIALIDADE") return;
        const rank = rankValue(record[`posto${side}`]);
        const vinculo = normalizeVinculo(record[`opcao${side}`]);
        const corpo = category === "OFICIAIS" ? clean(record[`corpo${side}`]) : "";
        // Graduação (posto) não separa perfis: a correspondência usa apenas especialidade, vínculo e corpo.
        const profile = JSON.stringify([category, specialty, vinculo, corpo]);
        const id = JSON.stringify([om, profile]);
        const group = groups.get(id) || { id, profile, category, om, specialty, rank: "", vinculo, corpo, planned: 0, actual: 0 };
        if (rank && !group.rank.includes(rank)) group.rank = group.rank ? `${group.rank} / ${rank}` : rank;
        if (side === "Tmft") group.planned += 1;
        else group.actual += 1;
        groups.set(id, group);
      };
      const semNeo = record.isExtraLotacao || ["EXTRA LOTAÇÃO", "SEM NEO"].includes(clean(record.tipoSetor));
      if (!semNeo) add("Tmft");
      if (record.ocupado && clean(record.nome) && clean(record.nome) !== "-") add("Efe");
    }
  }
  const ranks = ["CALTE", "VALTE", "CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "SD"];
  const order = (rank: string) => { const index = ranks.indexOf(rank); return index < 0 ? ranks.length : index; };
  return [...groups.values()].sort((a, b) => (a.category === b.category ? 0 : a.category === "OFICIAIS" ? -1 : 1) || order(a.rank) - order(b.rank) || a.specialty.localeCompare(b.specialty, "pt-BR") || a.om.localeCompare(b.om, "pt-BR"));
}

/** Each step consumes remaining surplus, without creating a shortage in the origin. */
export function applyAnalysisMoves(balances: AnalysisBalance[], moves: AnalysisMove[]): AnalysisBalance[] {
  const result = balances.map(balance => ({ ...balance }));
  for (const move of moves) {
    const source = result.find(item => item.id === move.sourceId);
    const target = result.find(item => item.id === move.targetId);
    if (!source || !target || source.om === target.om || source.profile !== target.profile || !Number.isInteger(move.quantity) || move.quantity <= 0) continue;
    if (move.quantity > Math.max(0, source.actual - source.planned) || move.quantity > Math.max(0, target.planned - target.actual)) continue;
    source.actual -= move.quantity;
    target.actual += move.quantity;
  }
  return result;
}

export function suggestAnalysisMoves(balances: AnalysisBalance[]): AnalysisSuggestion[] {
  const remaining = balances.map(balance => ({ ...balance }));
  const suggestions: AnalysisSuggestion[] = [];
  const targets = remaining.filter(item => item.planned > item.actual).sort((a, b) => (b.planned - b.actual) - (a.planned - a.actual) || a.om.localeCompare(b.om));
  for (const target of targets) {
    const sources = remaining.filter(item => item.profile === target.profile && item.om !== target.om && item.actual > item.planned).sort((a, b) => (b.actual - b.planned) - (a.actual - a.planned) || a.om.localeCompare(b.om));
    for (const source of sources) {
      const quantity = Math.min(source.actual - source.planned, target.planned - target.actual);
      if (quantity <= 0) continue;
      suggestions.push({ sourceId: source.id, targetId: target.id, quantity, source: { ...source }, target: { ...target } });
      source.actual -= quantity;
      target.actual += quantity;
    }
  }
  return suggestions;
}
import { differenceInYears, differenceInMonths, differenceInDays, parse, isValid, addYears, addMonths, isBefore, format } from "date-fns";

// Parse date from various formats
export const parseDataFlexivel = (dataStr: string): Date | null => {
  if (!dataStr) return null;

  const googleDateMatch = dataStr.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (googleDateMatch) {
    return new Date(parseInt(googleDateMatch[1]), parseInt(googleDateMatch[2]), parseInt(googleDateMatch[3]));
  }

  let parsed = parse(dataStr, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) return parsed;

  parsed = parse(dataStr, "MM/dd/yyyy", new Date());
  if (isValid(parsed)) return parsed;

  return null;
};

// Calculates current age from birth date string
export const calcularIdadeAtual = (idadeOuData: string): string => {
  if (!idadeOuData) return "-";

  let birthDate: Date | null = null;

  const googleDateMatch = idadeOuData.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (googleDateMatch) {
    birthDate = new Date(parseInt(googleDateMatch[1]), parseInt(googleDateMatch[2]), parseInt(googleDateMatch[3]));
  }

  if (!birthDate || !isValid(birthDate)) {
    birthDate = parse(idadeOuData, "dd/MM/yyyy", new Date());
  }
  if (!isValid(birthDate)) {
    birthDate = parse(idadeOuData, "MM/dd/yyyy", new Date());
  }

  if (birthDate && isValid(birthDate)) {
    const today = new Date();
    const anos = differenceInYears(today, birthDate);
    const afterYears = addYears(birthDate, anos);
    const meses = differenceInMonths(today, afterYears);
    const afterMonths = addMonths(afterYears, meses);
    const dias = differenceInDays(today, afterMonths);
    return `${anos}a ${meses}m ${dias}d`;
  }

  const numericAge = parseInt(idadeOuData);
  if (!isNaN(numericAge) && idadeOuData.length <= 3) {
    return `${numericAge} anos`;
  }

  return idadeOuData;
};

// Get status for tempoFaltante badge
export const getTempoFaltanteStatus = (tempoFaltante: string | undefined, excedeu: boolean | undefined): 'normal' | 'warning' | 'danger' | 'exceeded' => {
  if (!tempoFaltante || tempoFaltante === '-') return 'normal';
  if (excedeu) return 'exceeded';
  const anosMatch = tempoFaltante.match(/(\d+)a/);
  const mesesMatch = tempoFaltante.match(/(\d+)m/);
  const anos = anosMatch ? parseInt(anosMatch[1]) : 0;
  const meses = mesesMatch ? parseInt(mesesMatch[1]) : 0;
  const totalMeses = anos * 12 + meses;
  if (totalMeses < 6) return 'danger';
  if (totalMeses < 24) return 'warning';
  return 'normal';
};

// Calculate remaining time until termino date
export const calcularTempoRestante = (terminoStr: string): { texto: string; status: 'normal' | 'warning' | 'danger' | 'expired' } => {
  if (!terminoStr) return { texto: "-", status: 'normal' };

  const termino = parseDataFlexivel(terminoStr);
  if (!termino) return { texto: "-", status: 'normal' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calcDias360 = (from: Date, to: Date) => {
    const d1 = Math.min(from.getDate(), 30);
    const d2 = Math.min(to.getDate(), 30);
    const m1 = from.getMonth() + 1;
    const m2 = to.getMonth() + 1;
    const y1 = from.getFullYear();
    const y2 = to.getFullYear();
    return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  };

  const formatPartes = (totalDias360: number) => {
    const totalMeses = Math.floor(totalDias360 / 30);
    const dias = totalDias360 % 30;
    const anos = Math.floor(totalMeses / 12);
    const meses = totalMeses % 12;
    const partes: string[] = [];
    if (anos > 0) partes.push(`${anos}a`);
    if (meses > 0) partes.push(`${meses}m`);
    if (dias > 0 || partes.length === 0) partes.push(`${dias}d`);
    return { partes, totalMeses };
  };

  if (isBefore(termino, today)) {
    const totalDias360 = calcDias360(termino, today);
    const { partes } = formatPartes(totalDias360);
    return { texto: `Vencido há ${partes.join(' ')}`, status: 'expired' };
  }

  const totalDias360 = calcDias360(today, termino);
  const { partes, totalMeses } = formatPartes(totalDias360);

  let status: 'normal' | 'warning' | 'danger' | 'expired' = 'normal';
  if (totalMeses < 1) status = 'danger';
  else if (totalMeses < 3) status = 'warning';

  return { texto: partes.join(' '), status };
};

// Graduações de oficiais
const graduacoesOficiais = [
  "AE", "VA", "CA", "CMG", "CF", "CC", "CT", "1T", "2T", "GM", "ASP",
  "1T-RM2", "2T-RM2", "CT-RM2", "CC-RM2", "CF-RM2", "CMG-RM2"
];

export const isOficial = (graduacao: string): boolean => {
  if (!graduacao) return false;
  const grad = graduacao.toUpperCase().trim();
  return graduacoesOficiais.some(posto =>
    grad === posto || grad.startsWith(posto + "-") || grad.startsWith(posto + " ")
  );
};

// Graduation sort order
const gradOrder = ["CMG", "CF", "CC", "CT", "1T", "1TEN", "2T", "2TEN", "SO", "1SG", "2SG", "3SG", "CB", "MN"];

export const getGradIndex = (grad: string) => {
  const idx = gradOrder.indexOf(grad?.trim().toUpperCase() || '');
  return idx === -1 ? 999 : idx;
};

// Format military name
export const formatMilitarName = (graduacao: string, espQuadro: string, nomeCompleto: string): string => {
  const grad = (graduacao || '').trim().toUpperCase();
  const esp = (espQuadro || '').trim().toUpperCase();
  const nome = nomeCompleto || '';
  const invalidEsp = ["", "-", "QPA", "CPA", "QAP", "CAP", "PRM", "CPRM", "QFN", "CFN", "PL"];
  const isValidEsp = !invalidEsp.includes(esp);
  if (!grad) return nome;
  return `${grad}${isValidEsp ? `-${esp}` : ""} ${nome}`;
};

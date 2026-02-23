/**
 * Detecção de gênero por primeiro nome brasileiro.
 * Baseado em terminações e listas de nomes comuns.
 */

// Nomes femininos comuns que poderiam ser confundidos pela terminação
const FEMALE_NAMES = new Set([
  'ANA', 'MARIA', 'JULIA', 'JULIANA', 'MARIANA', 'ADRIANA', 'BRUNA', 'CAMILA',
  'CARLA', 'CAROLINA', 'CLAUDIA', 'CRISTINA', 'DANIELA', 'DEBORA', 'DENISE',
  'DIANA', 'ELAINE', 'ELISABETE', 'ELIZABETH', 'ERICA', 'FERNANDA', 'FLAVIA',
  'FRANCISCA', 'GABRIELA', 'HELENA', 'ISABELA', 'ISABELLA', 'JAQUELINE',
  'JESSICA', 'JOANA', 'JOARA', 'JOSEFA', 'JOYCE', 'KAREN', 'KARLA', 'KATIA',
  'KEILA', 'KELLY', 'LARISSA', 'LAURA', 'LEIA', 'LETICIA', 'LIANA', 'LIDIA',
  'LILIANE', 'LUANA', 'LUCIA', 'LUCIANA', 'LUIZA', 'MADALENA', 'MARCELA',
  'MARCIA', 'MARGARETE', 'MARGARIDA', 'MARINA', 'MARTA', 'MICHELE', 'MIRIAM',
  'MONICA', 'NATALIA', 'NATHALIA', 'PATRICIA', 'PAULA', 'PRISCILA', 'PRISCILLA',
  'RAFAELA', 'RAQUEL', 'RAVANNE', 'REBECA', 'RENATA', 'RITA', 'ROBERTA',
  'ROSA', 'ROSANA', 'ROSANGELA', 'SABRINA', 'SAMANTA', 'SAMANTHA', 'SANDRA',
  'SARA', 'SARAH', 'SILVIA', 'SIMONE', 'SONIA', 'SUELI', 'SUZANA', 'TATIANA',
  'TEREZA', 'THAMIRES', 'THAIS', 'VANESSA', 'VERA', 'VERONICA', 'VIRGINIA',
  'VIVIANE', 'VIVIAN', 'YASMIN', 'ALINE', 'AMANDA', 'ANDREA', 'ANDREIA',
  'ANGELICA', 'APARECIDA', 'BEATRIZ', 'BIANCA', 'CELIA', 'CINTIA', 'DAIANE',
  'EDILENE', 'EDNA', 'ELIANA', 'EMANUELLE', 'EMILY', 'EUGENIA', 'FABIANA',
  'FATIMA', 'GEOVANA', 'GISELE', 'GISLAINE', 'GLORIA', 'GRACE', 'GRAZIELA',
  'HELOISA', 'INGRID', 'IRENE', 'IRIS', 'IVONE', 'IZABEL', 'JANAINA',
  'JANE', 'JENIFFER', 'JENNIFER', 'JOSIANE', 'JUCELIA', 'KARINA', 'LAIS',
  'LEILA', 'LILIAN', 'LORENA', 'LOURDES', 'LUCIENE', 'LUCIARA', 'MARA',
  'MARLENE', 'MAURA', 'MAYARA', 'MILENA', 'MIRELLA', 'NADIA', 'NEIDE',
  'NILDA', 'NOEMI', 'PALOMA', 'PAMELA', 'POLIANA', 'QUEILA', 'REGIANE',
  'REGINA', 'ROSELI', 'ROSILENE', 'RUTH', 'SELMA', 'SHEILA', 'SOLANGE',
  'SUELENA', 'TANIA', 'TATIANE', 'VALERIA', 'VANIA', 'VITORIA', 'ZELIA',
]);

// Nomes masculinos que poderiam ser confundidos pela terminação (ex: terminam em 'a')
const MALE_NAMES = new Set([
  'LUCA', 'JOSUE', 'RENE', 'SIMONE', // Simone masc. é raro mas existe
  'JOSE', 'JESSÉ', 'MOISE', 'NOEL', 'ISMAEL', 'RAFAEL', 'MANOEL', 'SAMUEL',
  'GABRIEL', 'ISRAEL', 'DANIEL', 'JOEL', 'ABIEL', 'EZEQUIEL', 'NATANAEL',
  'MISAEL', 'ELIEL', 'ARIEL',
]);

/**
 * Detecta gênero a partir do nome completo.
 * Retorna 'M' (masculino), 'F' (feminino) ou null (indeterminado/vago).
 */
export function detectGender(fullName: string): 'M' | 'F' | null {
  const name = String(fullName ?? '').trim().toUpperCase();
  if (!name || name === 'VAGO' || name === '-' || name === 'VAGA') return null;

  // Extrair primeiro nome (pode ter prefixos de posto como "2SG", "CB" etc.)
  const parts = name.split(/[\s,]+/).filter(Boolean);
  
  // Encontrar o primeiro "nome real" (não abreviação militar, não número)
  let firstName = '';
  for (const part of parts) {
    // Pular postos/graduações e números
    if (/^\d/.test(part)) continue;
    if (['SO', 'SG', '1SG', '2SG', '3SG', 'CB', 'MN', 'SD', 'CT', 'CF', 'CC', 'CMG', '1T', '2T', 'GM', 'C', 'ALTE'].includes(part)) continue;
    if (part.length <= 1) continue;
    firstName = part;
    break;
  }

  if (!firstName) return null;

  // Verificar nas listas explícitas primeiro
  if (FEMALE_NAMES.has(firstName)) return 'F';
  if (MALE_NAMES.has(firstName)) return 'M';

  // Heurística por terminação do primeiro nome
  const lastTwo = firstName.slice(-2);
  const lastThree = firstName.slice(-3);
  const lastChar = firstName.slice(-1);

  // Terminações tipicamente femininas
  if (['IA', 'NA', 'LA', 'DA', 'RA', 'SA', 'TA', 'CA', 'NE', 'SE', 'CE', 'LE', 'DE'].includes(lastTwo)) return 'F';
  if (['INE', 'ANE', 'ENE', 'ONE', 'UNE', 'ICE', 'ISE', 'OSE', 'USE'].includes(lastThree)) return 'F';
  if (['ELA', 'ILA', 'ULA', 'OLA', 'ALA'].includes(lastThree)) return 'F';
  if (lastChar === 'A' && firstName.length > 2) return 'F';

  // Terminações tipicamente masculinas
  if (['ON', 'OS', 'US', 'ER', 'OR', 'AR', 'IR', 'UR', 'AL', 'EL', 'IL', 'OL', 'UL'].includes(lastTwo)) return 'M';
  if (['SON', 'TON', 'DON', 'LDO', 'RDO', 'NDO', 'NGO', 'NHO', 'LHO', 'RIO'].includes(lastThree)) return 'M';
  if (['O', 'I', 'R', 'N', 'S', 'L', 'Z', 'D', 'K', 'M'].includes(lastChar)) return 'M';

  // Fallback: masculino (maioria no contexto militar)
  return 'M';
}

// Edge function for syncing approved personnel changes to Google Sheets
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spreadsheet configuration
// IMPORTANT: must match the same spreadsheet used by `fetch-pracas-data`
const SPREADSHEET_ID = '13YC7pfsERAJxdwzWPN12tTdNOVhlT_bbZXZigDZvalA';

// Google Apps Script Web App URL for writing to sheets
// This script will handle the actual write operations
const APPS_SCRIPT_URL = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');

// Sheet names + GIDs for each OM (tabs in the spreadsheet)
// Keep this aligned with `fetch-pracas-data`.
const SHEET_CONFIGS: Record<string, { sheetName: string; gid: string }> = {
  BAMRJ: { sheetName: 'BAMRJ', gid: '280177623' },
  'CDU-1DN': { sheetName: 'CDU-1DN', gid: '957180492' },
  'CDU-BAMRJ': { sheetName: 'CDU-BAMRJ', gid: '1658824367' },
  CDAM: { sheetName: 'CDAM', gid: '1650749150' },
  CMM: { sheetName: 'CMM', gid: '1495647476' },
  COPAB: { sheetName: 'COPAB', gid: '527671707' },
  CSUPAB: { sheetName: 'CSUPAB', gid: '469479928' },
  DEPCMRJ: { sheetName: 'DEPCMRJ', gid: '567760228' },
  DEPFMRJ: { sheetName: 'DEPFMRJ', gid: '1373834755' },
  DEPMSMRJ: { sheetName: 'DEPMSMRJ', gid: '0' },
  DEPSIMRJ: { sheetName: 'DEPSIMRJ', gid: '295069813' },
  DEPSMRJ: { sheetName: 'DEPSMRJ', gid: '1610199360' },
};

// Column mapping for the spreadsheet (A=1, B=2, etc)
// Based on the actual spreadsheet structure:
// A: NEO | B: TIPO SETOR | C: SETOR | D: CARGO/INCUMBÊNCIA | 
// E: GRADUAÇÃO TMFT | F: QUADRO TMFT | G: ESPECIALIDADE TMFT | H: OPÇÃO TMFT |
// I: GRADUAÇÃO EFE | J: QUADRO EFE | K: ESPECIALIDADE EFE | L: OPÇÃO EFE | M: NOME
const COLUMN_MAPPING: Record<string, number> = {
  'neo': 1,              // A - NEO
  'tipoSetor': 2,        // B - TIPO SETOR
  'setor': 3,            // C - SETOR
  'cargo': 4,            // D - CARGO/INCUMBÊNCIA
  'postoTmft': 5,        // E - GRADUAÇÃO TMFT
  'quadroTmft': 6,       // F - QUADRO TMFT
  'especialidadeTmft': 7, // G - ESPECIALIDADE TMFT
  'opcaoTmft': 8,        // H - OPÇÃO TMFT
  'postoEfe': 9,         // I - GRADUAÇÃO EFE
  'quadroEfe': 10,       // J - QUADRO EFE
  'especialidadeEfe': 11, // K - ESPECIALIDADE EFE
  'opcaoEfe': 12,        // L - OPÇÃO EFE
  'nome': 13,            // M - NOME
};

interface PersonnelData {
  neo?: string;
  tipoSetor?: string;
  setor?: string;
  cargo?: string;
  postoTmft?: string;
  quadroTmft?: string;
  especialidadeTmft?: string;
  opcaoTmft?: string;
  postoEfe?: string;
  quadroEfe?: string;
  especialidadeEfe?: string;
  opcaoEfe?: string;
  nome?: string;
  [key: string]: string | undefined;
}

// Helper function to authenticate request
async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Get user role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return {
    user,
    role: roleData?.role || null,
    isCopab: roleData?.role === 'COPAB',
    supabase
  };
}

function normalizeNeo(v: unknown): string {
  return String(v ?? '').trim();
}

// Normaliza NEO para comparar mesmo quando a planilha remove zeros à esquerda.
// Ex.: "01.5.0.14" -> "1.5.0.14"
function canonicalizeNeo(v: unknown): string {
  const raw = normalizeNeo(v);
  if (!raw) return '';

  // Mantém apenas dígitos e pontos
  const cleaned = raw.replace(/[^0-9.]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  if (!cleaned) return '';

  const parts = cleaned
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // remove zeros à esquerda sem perder "0"
      const n = Number.parseInt(p, 10);
      return Number.isFinite(n) ? String(n) : p;
    });

  return parts.join('.');
}

function isLikelyNeo(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  // e.g. 01.5.0.14 or 12.0.0.3
  return /^\d+(?:\.\d+)*$/.test(s);
}

function normalizeOm(v: unknown): string {
  return String(v ?? '').trim().toUpperCase();
}

function pickRequestOm(request: any): string {
  const candidates = [
    request?.target_om,
    request?.personnel_data?.om,
    request?.original_data?.om,
    request?.requesting_om,
  ];

  for (const c of candidates) {
    const om = normalizeOm(c);
    if (!om) continue;
    return om;
  }

  return '';
}

async function fetchSheetAsCsvRows(gid: string): Promise<string[][]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
  const response = await fetch(csvUrl);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`Failed to fetch CSV gid=${gid}: ${response.status} ${body.slice(0, 300)}`);
    throw new Error(`Falha ao ler planilha (gid=${gid}): ${response.status}`);
  }

  const csvText = await response.text();

  // Minimal CSV parser (same style as fetch-pracas-data)
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      if (char === '\r') i++; // skip \n
    } else {
      currentCell += char;
    }
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

// Find the row number for a given NEO in the sheet (1-indexed)
async function findRowByNeo(
  gid: string,
  neo: string
): Promise<{ rowNumber: number; rowValues: string[] } | null> {
  const rows = await fetchSheetAsCsvRows(gid);
  const targetRaw = normalizeNeo(neo);
  const targetCanon = canonicalizeNeo(neo);
  if (!targetRaw && !targetCanon) return null;

  for (let i = 0; i < rows.length; i++) {
    const cellA = normalizeNeo(rows[i]?.[0]);
    if (!cellA) continue;

    const cellCanon = canonicalizeNeo(cellA);
    const match =
      (targetRaw && cellA === targetRaw) ||
      (targetCanon && cellCanon && cellCanon === targetCanon);

    if (match) {
      return { rowNumber: i + 1, rowValues: rows[i] ?? [] }; // 1-indexed for Sheets
    }
  }

  return null;
}

function padRow(row: string[], targetLen: number): string[] {
  const out = Array.from({ length: targetLen }, (_, i) => row[i] ?? '');
  return out;
}

// Na ALTERAÇÃO, atualiza somente EFETIVO (e campos operacionais) sem sobrescrever TMFT.
// Colunas EFETIVO: I (postoEfe), J (quadroEfe), K (especialidadeEfe), L (opcaoEfe), M (nome)
function mergeEfetivoUpdate(
  currentRowValues: string[],
  next: PersonnelData
): string[] {
  const merged = padRow(currentRowValues, 13);

  // Campos permitidos na alteração (não mexer em TMFT: colunas E-H)
  const allowedKeys: Array<keyof PersonnelData> = [
    'postoEfe',
    'quadroEfe',
    'especialidadeEfe',
    'opcaoEfe',
    'nome',
  ];

  for (const key of allowedKeys) {
    const idx = COLUMN_MAPPING[String(key)] ? COLUMN_MAPPING[String(key)] - 1 : -1;
    if (idx < 0) continue;
    const v = (next[key] ?? '').toString();
    // Se vier vazio, preserva o valor atual (evita "apagar" sem intenção)
    if (v.trim().length > 0) merged[idx] = v;
  }

  return merged;
}

// Find the first empty row after the TABELA MESTRA section
async function findFirstEmptyRow(gid: string): Promise<number> {
  const rows = await fetchSheetAsCsvRows(gid);

  let inTabelaMestra = false;
  let lastDataRow = 1;

  for (let i = 0; i < rows.length; i++) {
    const cellValue = String(rows[i]?.[0] ?? '').toUpperCase().trim();

    if (cellValue.includes('TABELA MESTRA') || cellValue.includes('SITUAÇÃO DA FORÇA')) {
      inTabelaMestra = true;
      continue;
    }

    if (inTabelaMestra) {
      if (
        cellValue.includes('PREVISÃO') ||
        cellValue.includes('DESEMBARQUE') ||
        cellValue.includes('EMBARQUE') ||
        cellValue.includes('TRRM') ||
        cellValue.includes('RESUMO')
      ) {
        break;
      }

      if (isLikelyNeo(cellValue)) {
        lastDataRow = i + 1;
      }
    }
  }

  return lastDataRow + 1;
}

// Convert personnel data to row values
function personnelToRowValues(data: PersonnelData): string[] {
  const row: string[] = [];
  const orderedKeys = Object.keys(COLUMN_MAPPING).sort((a, b) => COLUMN_MAPPING[a] - COLUMN_MAPPING[b]);
  
  for (const key of orderedKeys) {
    row.push(data[key] || '');
  }
  
  return row;
}

// Sync changes to Google Sheets via Apps Script
async function syncToSheet(
  action: 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO',
  om: string,
  personnelData: PersonnelData,
  originalData?: PersonnelData
): Promise<{ success: boolean; message: string }> {
  const cfg = SHEET_CONFIGS[om];
  if (!cfg) {
    return { success: false, message: `OM ${om} não encontrada na configuração` };
  }
  const { sheetName, gid } = cfg;

  console.log('='.repeat(60));
  console.log(`SINCRONIZAÇÃO GOOGLE SHEETS - ${action}`);
  console.log('='.repeat(60));
  console.log(`OM: ${om}`);
  console.log(`Planilha: ${sheetName}`);

  // If Apps Script URL is configured, use it for writing
  if (APPS_SCRIPT_URL) {
    try {
      let rowNumber: number | null = null;
      let valuesToWrite: string[] | null = null;
      
      // For ALTERACAO and EXCLUSAO, find the row by NEO
      if (action !== 'INCLUSAO') {
        const candidateNeos = [
          normalizeNeo(personnelData.neo),
          normalizeNeo(originalData?.neo),
        ].filter(Boolean);

        let found: { rowNumber: number; rowValues: string[] } | null = null;

        for (const candidate of candidateNeos) {
          found = await findRowByNeo(gid, candidate);
          if (found?.rowNumber) {
            rowNumber = found.rowNumber;
            console.log(`Encontrado NEO ${candidate} na linha: ${rowNumber}`);
            break;
          }
        }

        if (!rowNumber) {
          return {
            success: false,
            message: `NEO ${candidateNeos[0] || '(vazio)'} não encontrado na planilha ${sheetName}`,
          };
        }

        // Para ALTERAÇÃO: preservar TMFT e atualizar só EFETIVO/operacional
        if (action === 'ALTERACAO' && found) {
          valuesToWrite = mergeEfetivoUpdate(found.rowValues, personnelData);
        }
      }
      
      // For INCLUSAO, find the first empty row
      if (action === 'INCLUSAO') {
        rowNumber = await findFirstEmptyRow(gid);
        console.log(`Nova linha: ${rowNumber}`);
      }

      if (action !== 'EXCLUSAO' && !valuesToWrite) {
        valuesToWrite = personnelToRowValues(personnelData);
      }

      // Prepare the payload for Apps Script
      const payload = {
        action: action,
        spreadsheetId: SPREADSHEET_ID,
        sheetName: sheetName,
        rowNumber: rowNumber,
        values: action !== 'EXCLUSAO' ? valuesToWrite : null,
        neo: personnelData.neo
      };

      console.log('Enviando para Apps Script:', JSON.stringify(payload, null, 2));

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro Apps Script:', errorText);
        return { success: false, message: `Erro ao atualizar planilha: ${errorText}` };
      }

      const result = await response.json();
      console.log('Resultado Apps Script:', result);

      if (result.success) {
        return { 
          success: true, 
          message: `Planilha ${sheetName} atualizada com sucesso - ${action}` 
        };
      } else {
        return { success: false, message: result.message || 'Erro desconhecido' };
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      return { success: false, message: `Erro de sincronização: ${error}` };
    }
  }

  // Fallback: Log changes for manual processing if Apps Script not configured
  console.log('Apps Script URL não configurada - registrando para processamento manual');
  
  if (action === 'INCLUSAO') {
    console.log('NOVO REGISTRO:');
    Object.entries(personnelData).forEach(([key, value]) => {
      if (value) console.log(`  ${key}: ${value}`);
    });
  } else if (action === 'ALTERACAO') {
    console.log(`NEO: ${personnelData.neo}`);
    console.log('ALTERAÇÕES:');
    Object.entries(personnelData).forEach(([key, value]) => {
      if (value && originalData && originalData[key] !== value) {
        console.log(`  ${key}: ${originalData[key]} → ${value}`);
      }
    });
  } else if (action === 'EXCLUSAO') {
    console.log('REGISTRO A REMOVER:');
    console.log(`  NEO: ${personnelData.neo}`);
    console.log(`  Nome: ${personnelData.nome}`);
  }
  
  console.log('='.repeat(60));

  // Archive the change for tracking
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  
  const { error: logError } = await adminClient
    .from('personnel_history')
    .insert({
      action_type: action,
      personnel_data: personnelData,
      om: om,
      archived_by: 'SYSTEM-SYNC'
    });
  
  if (logError) {
    console.error('Error logging change:', logError);
  }
  
  return { 
    success: true, 
    message: APPS_SCRIPT_URL 
      ? `Planilha ${sheetName} atualizada automaticamente`
      : `Alteração ${action} registrada. Configure GOOGLE_APPS_SCRIPT_URL para sincronização automática.`
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateUser(req);
    if (!auth || !auth.isCopab) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Only COPAB can sync sheets' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, request_id } = await req.json();

    if (action !== 'sync') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: sync' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!request_id) {
      return new Response(
        JSON.stringify({ error: 'request_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the approved request
    const { data: request, error: fetchError } = await adminClient
      .from('personnel_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.status !== 'APROVADO') {
      return new Response(
        JSON.stringify({ error: 'Request must be approved before syncing' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sync to the sheet
    // Prefer:
    // 1) request.target_om (when provided)
    // 2) request.personnel_data.om / request.original_data.om (when COPAB cria solicitação para outra OM)
    // 3) request.requesting_om (fallback)
    const syncOm = pickRequestOm(request);
    console.log(`OM escolhida para sincronização: ${syncOm || '(vazio)'}`);

    const result = await syncToSheet(
      request.request_type as 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO',
      syncOm,
      request.personnel_data as PersonnelData,
      request.original_data as PersonnelData | undefined
    );

    console.log(`Sync completed for request ${request_id}: ${result.message}`);

    return new Response(
      JSON.stringify({ 
        success: result.success, 
        message: result.message,
        request_type: request.request_type,
        om: syncOm
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: result.success ? 200 : 500 }
    );

  } catch (error) {
    console.error('Error syncing sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
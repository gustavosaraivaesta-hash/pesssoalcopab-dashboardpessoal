// Edge function for syncing approved personnel changes to Google Sheets
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Spreadsheet configuration ──────────────────────────────────────────
// Praças spreadsheet (same as fetch-pracas-data)
const PRACAS_SPREADSHEET_ID = '13YC7pfsERAJxdwzWPN12tTdNOVhlT_bbZXZigDZvalA';
// Oficiais spreadsheet (same as fetch-om-data)
const OFICIAIS_SPREADSHEET_ID = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';

// Google Apps Script Web App URL for writing to sheets
const RAW_APPS_SCRIPT_URL = Deno.env.get('GOOGLE_APPS_SCRIPT_URL') ?? '';

function normalizeAppsScriptUrl(raw: string): string {
  let url = String(raw ?? '').trim();
  url = url.replace(/\/dev(\?|#|$)/, '/exec$1');
  return url;
}

function isAppsScriptWebAppUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/(exec|dev)(?:[?#].*)?$/.test(url);
}

function looksLikeHtml(s: string): boolean {
  const t = (s ?? '').trim().toLowerCase();
  return t.startsWith('<!doctype html') || t.startsWith('<html') || t.includes('<head') || t.includes('<body');
}

// ── Sheet configs per OM ───────────────────────────────────────────────
// Praças GIDs (tabs in the praças spreadsheet)
const PRACAS_SHEET_CONFIGS: Record<string, { sheetName: string; gid: string }> = {
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

// Oficiais GIDs (tabs in the oficiais spreadsheet)
const OFICIAIS_SHEET_CONFIGS: Record<string, { sheetName: string; gid: string }> = {
  BAMRJ: { sheetName: 'BAMRJ', gid: '1175318745' },
  'CDU-1DN': { sheetName: 'CDU-1DN', gid: '1868624840' },
  'CDU-BAMRJ': { sheetName: 'CDU-BAMRJ', gid: '1926090655' },
  CDAM: { sheetName: 'CDAM', gid: '1894966712' },
  CMM: { sheetName: 'CMM', gid: '1324793191' },
  COPAB: { sheetName: 'COpAb', gid: '581706093' },
  CSUPAB: { sheetName: 'CSUPAB', gid: '1363629973' },
  DEPCMRJ: { sheetName: 'DEPCMRJ', gid: '2111647795' },
  DEPFMRJ: { sheetName: 'DEPFMRJ', gid: '84203546' },
  DEPMSMRJ: { sheetName: 'DEPMSMRJ', gid: '122801537' },
  DEPSIMRJ: { sheetName: 'DEPSIMRJ', gid: '2140319620' },
  DEPSMRJ: { sheetName: 'DepSMRJ', gid: '1727648610' },
};

// ── Column mapping ─────────────────────────────────────────────────────
// Praças: A:NEO | B:TIPO SETOR | C:SETOR | D:CARGO | E:GRADUAÇÃO TMFT | F:QUADRO TMFT | G:ESPECIALIDADE TMFT | H:OPÇÃO TMFT | I:GRADUAÇÃO EFE | J:QUADRO EFE | K:ESPECIALIDADE EFE | L:OPÇÃO EFE | M:NOME
const PRACAS_COLUMN_MAPPING: Record<string, number> = {
  'neo': 1,
  'tipoSetor': 2,
  'setor': 3,
  'cargo': 4,
  'postoTmft': 5,
  'quadroTmft': 6,
  'especialidadeTmft': 7,
  'opcaoTmft': 8,
  'postoEfe': 9,
  'quadroEfe': 10,
  'especialidadeEfe': 11,
  'opcaoEfe': 12,
  'nome': 13,
};

// Oficiais: A:NEO | B:TIPO SETOR | C:SETOR | D:CARGO | E:POSTO TMFT | F:CORPO TMFT | G:QUADRO TMFT | H:OPÇÃO TMFT | I:POSTO EFE | J:CORPO EFE | K:QUADRO EFE | L:OPÇÃO EFE | M:NOME
const OFICIAIS_COLUMN_MAPPING: Record<string, number> = {
  'neo': 1,
  'tipoSetor': 2,
  'setor': 3,
  'cargo': 4,
  'postoTmft': 5,
  'corpoTmft': 6,
  'quadroTmft': 7,
  'opcaoTmft': 8,
  'postoEfe': 9,
  'corpoEfe': 10,
  'quadroEfe': 11,
  'opcaoEfe': 12,
  'nome': 13,
};

// ── Officer detection ──────────────────────────────────────────────────
const OFFICER_POSTOS = new Set([
  'C ALTE', 'CONTRA-ALMIRANTE', 'CT', 'CF', 'CC', 'CMG', '1TEN', '2TEN', '1T', '2T',
]);

function isOfficer(personnelData: PersonnelData, originalData?: PersonnelData): boolean {
  const candidates = [
    personnelData?.postoTmft,
    personnelData?.postoEfe,
    originalData?.postoTmft,
    originalData?.postoEfe,
  ];
  for (const c of candidates) {
    const v = String(c ?? '').trim().toUpperCase();
    if (v && OFFICER_POSTOS.has(v)) return true;
  }
  return false;
}

interface PersonnelData {
  neo?: string;
  tipoSetor?: string;
  setor?: string;
  cargo?: string;
  postoTmft?: string;
  corpoTmft?: string;
  quadroTmft?: string;
  especialidadeTmft?: string;
  opcaoTmft?: string;
  postoEfe?: string;
  corpoEfe?: string;
  quadroEfe?: string;
  especialidadeEfe?: string;
  opcaoEfe?: string;
  nome?: string;
  [key: string]: string | undefined;
}

// ── Helper functions ───────────────────────────────────────────────────
async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

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

function canonicalizeNeo(v: unknown): string {
  const raw = normalizeNeo(v);
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9.]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
  if (!cleaned) return '';
  const parts = cleaned.split('.').map(p => p.trim()).filter(Boolean).map(p => {
    const n = Number.parseInt(p, 10);
    return Number.isFinite(n) ? String(n) : p;
  });
  return parts.join('.');
}

function isLikelyNeo(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
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
    if (om) return om;
  }
  return '';
}

async function fetchSheetAsCsvRows(spreadsheetId: string, gid: string): Promise<string[][]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(csvUrl);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`Failed to fetch CSV gid=${gid}: ${response.status} ${body.slice(0, 300)}`);
    throw new Error(`Falha ao ler planilha (gid=${gid}): ${response.status}`);
  }

  const csvText = await response.text();
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') { currentCell += '"'; i++; }
      else insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim()); currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
      currentRow.push(currentCell.trim()); rows.push(currentRow); currentRow = []; currentCell = '';
      if (char === '\r') i++;
    } else {
      currentCell += char;
    }
  }
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim()); rows.push(currentRow);
  }
  return rows;
}

async function findRowByNeo(
  spreadsheetId: string,
  gid: string,
  neo: string
): Promise<{ rowNumber: number; rowValues: string[] } | null> {
  const rows = await fetchSheetAsCsvRows(spreadsheetId, gid);
  const targetRaw = normalizeNeo(neo);
  const targetCanon = canonicalizeNeo(neo);
  if (!targetRaw && !targetCanon) return null;

  for (let i = 0; i < rows.length; i++) {
    const cellA = normalizeNeo(rows[i]?.[0]);
    if (!cellA) continue;
    const cellCanon = canonicalizeNeo(cellA);
    const match = (targetRaw && cellA === targetRaw) || (targetCanon && cellCanon && cellCanon === targetCanon);
    if (match) return { rowNumber: i + 1, rowValues: rows[i] ?? [] };
  }
  return null;
}

function padRow(row: string[], targetLen: number): string[] {
  return Array.from({ length: targetLen }, (_, i) => row[i] ?? '');
}

// Na ALTERAÇÃO, atualiza somente EFETIVO sem sobrescrever TMFT.
function mergeEfetivoUpdate(
  currentRowValues: string[],
  next: PersonnelData,
  columnMapping: Record<string, number>,
  isOficiais: boolean
): string[] {
  const merged = padRow(currentRowValues, 13);

  // Campos permitidos na alteração de efetivo
  const allowedKeys: string[] = isOficiais
    ? ['postoEfe', 'corpoEfe', 'quadroEfe', 'opcaoEfe', 'nome']
    : ['postoEfe', 'quadroEfe', 'especialidadeEfe', 'opcaoEfe', 'nome'];

  for (const key of allowedKeys) {
    const idx = columnMapping[key] ? columnMapping[key] - 1 : -1;
    if (idx < 0) continue;
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      merged[idx] = (next[key] ?? '').toString();
    }
  }
  return merged;
}

async function findFirstEmptyRow(spreadsheetId: string, gid: string): Promise<number> {
  const rows = await fetchSheetAsCsvRows(spreadsheetId, gid);
  let inTabelaMestra = false;
  let lastDataRow = 1;

  for (let i = 0; i < rows.length; i++) {
    const cellValue = String(rows[i]?.[0] ?? '').toUpperCase().trim();
    if (cellValue.includes('TABELA MESTRA') || cellValue.includes('SITUAÇÃO DA FORÇA')) {
      inTabelaMestra = true; continue;
    }
    if (inTabelaMestra) {
      if (cellValue.includes('PREVISÃO') || cellValue.includes('DESEMBARQUE') || cellValue.includes('EMBARQUE') || cellValue.includes('TRRM') || cellValue.includes('RESUMO')) break;
      if (isLikelyNeo(cellValue)) lastDataRow = i + 1;
    }
  }
  return lastDataRow + 1;
}

function personnelToRowValues(data: PersonnelData, columnMapping: Record<string, number>): string[] {
  const row: string[] = [];
  const orderedKeys = Object.keys(columnMapping).sort((a, b) => columnMapping[a] - columnMapping[b]);
  for (const key of orderedKeys) {
    row.push(data[key] || '');
  }
  return row;
}

// ── Main sync function ─────────────────────────────────────────────────
async function syncToSheet(
  action: 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO',
  om: string,
  personnelData: PersonnelData,
  originalData?: PersonnelData
): Promise<{ success: boolean; message: string }> {
  // Detect if officer or enlisted
  const oficiais = isOfficer(personnelData, originalData);
  const sheetConfigs = oficiais ? OFICIAIS_SHEET_CONFIGS : PRACAS_SHEET_CONFIGS;
  const spreadsheetId = oficiais ? OFICIAIS_SPREADSHEET_ID : PRACAS_SPREADSHEET_ID;
  const columnMapping = oficiais ? OFICIAIS_COLUMN_MAPPING : PRACAS_COLUMN_MAPPING;
  const tipo = oficiais ? 'OFICIAIS' : 'PRAÇAS';

  // Try to find OM config (case-insensitive)
  let cfg = sheetConfigs[om];
  if (!cfg) {
    // Try case-insensitive match
    const omUpper = om.toUpperCase();
    for (const [key, val] of Object.entries(sheetConfigs)) {
      if (key.toUpperCase() === omUpper) { cfg = val; break; }
    }
  }

  if (!cfg) {
    return { success: false, message: `OM ${om} não encontrada na configuração de ${tipo}` };
  }
  const { sheetName, gid } = cfg;

  console.log('='.repeat(60));
  console.log(`SINCRONIZAÇÃO GOOGLE SHEETS - ${action} (${tipo})`);
  console.log('='.repeat(60));
  console.log(`OM: ${om} | Planilha: ${sheetName} | Spreadsheet: ${tipo}`);

  const appsScriptUrl = normalizeAppsScriptUrl(RAW_APPS_SCRIPT_URL);
  if (appsScriptUrl) {
    if (!isAppsScriptWebAppUrl(appsScriptUrl)) {
      return {
        success: false,
        message: 'URL do Apps Script inválida. Reconfigure GOOGLE_APPS_SCRIPT_URL com a URL do Aplicativo Web (terminando em /exec).',
      };
    }

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
          found = await findRowByNeo(spreadsheetId, gid, candidate);
          if (found?.rowNumber) {
            rowNumber = found.rowNumber;
            console.log(`Encontrado NEO ${candidate} na linha: ${rowNumber}`);
            break;
          }
        }

        if (!rowNumber) {
          return {
            success: false,
            message: `NEO ${candidateNeos[0] || '(vazio)'} não encontrado na planilha ${sheetName} (${tipo})`,
          };
        }

        if (action === 'ALTERACAO' && found) {
          valuesToWrite = mergeEfetivoUpdate(found.rowValues, personnelData, columnMapping, oficiais);
        }
      }

      // For INCLUSAO, find the first empty row
      if (action === 'INCLUSAO') {
        rowNumber = await findFirstEmptyRow(spreadsheetId, gid);
        console.log(`Nova linha: ${rowNumber}`);
      }

      if (action !== 'EXCLUSAO' && !valuesToWrite) {
        valuesToWrite = personnelToRowValues(personnelData, columnMapping);
      }

      const payload = {
        action,
        spreadsheetId,
        sheetName,
        rowNumber,
        values: action !== 'EXCLUSAO' ? valuesToWrite : null,
        neo: personnelData.neo,
      };

      console.log('Enviando para Apps Script:', JSON.stringify(payload, null, 2));

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      const bodyText = await response.text().catch(() => '');

      if (!response.ok) {
        console.error('Erro Apps Script:', { status: response.status, contentType, bodyPreview: bodyText.slice(0, 300) });
        if (looksLikeHtml(bodyText)) {
          return {
            success: false,
            message: 'Falha ao chamar o Apps Script (URL incorreta ou não publicada). Atualize o GOOGLE_APPS_SCRIPT_URL.',
          };
        }
        return { success: false, message: `Erro ao atualizar planilha (Apps Script HTTP ${response.status}).` };
      }

      let result: any = null;
      try { result = JSON.parse(bodyText); }
      catch (_e) {
        console.error('Resposta Apps Script não-JSON:', { contentType, bodyPreview: bodyText.slice(0, 300) });
        return { success: false, message: 'Apps Script respondeu em formato inesperado.' };
      }

      console.log('Resultado Apps Script:', result);

      if (result.success) {
        return { success: true, message: `Planilha ${sheetName} (${tipo}) atualizada com sucesso - ${action}` };
      } else {
        return { success: false, message: result.message || 'Erro desconhecido' };
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      return { success: false, message: `Erro de sincronização: ${error}` };
    }
  }

  // Fallback: Log changes for manual processing
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
    message: appsScriptUrl
      ? `Planilha ${sheetName} (${tipo}) atualizada automaticamente`
      : `Alteração ${action} registrada. Configure GOOGLE_APPS_SCRIPT_URL para sincronização automática.`
  };
}

// ── HTTP handler ───────────────────────────────────────────────────────
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

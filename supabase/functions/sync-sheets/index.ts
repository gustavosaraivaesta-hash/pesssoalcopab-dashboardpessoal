// Edge function for syncing approved personnel changes to Google Sheets
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spreadsheet configuration
const SPREADSHEET_ID = '1PmxfNsLB8RQY4lWBqjxQ7EEIYJy8aMnNWLi1K-3G3lU';

// Google Apps Script Web App URL for writing to sheets
// This script will handle the actual write operations
const APPS_SCRIPT_URL = Deno.env.get('GOOGLE_APPS_SCRIPT_URL');

// Sheet names for each OM (tab names in the spreadsheet)
const SHEET_NAMES: Record<string, string> = {
  'BAMRJ': 'BAMRJ',
  'CDU-1DN': 'CDU-1DN',
  'CDU-BAMRJ': 'CDU-BAMRJ',
  'CDAM': 'CDAM',
  'CMM': 'CMM',
  'COPAB': 'COpAb',
  'CSUPAB': 'CSuPAb',
  'DEPCMRJ': 'DEPCMRJ',
  'DEPFMRJ': 'DepFMRJ',
  'DEPMSMRJ': 'DepMSMRJ',
  'DEPSIMRJ': 'DepSIMRJ',
  'DEPSMRJ': 'DepSMRJ',
};

// Column mapping for the spreadsheet (A=1, B=2, etc)
const COLUMN_MAPPING: Record<string, number> = {
  'neo': 1,           // A - NEO
  'nome': 2,          // B - NOME
  'postoTmft': 3,     // C - POSTO TMFT
  'quadroTmft': 4,    // D - QUADRO TMFT
  'especialidadeTmft': 5, // E - ESP TMFT
  'opcaoTmft': 6,     // F - OPÇÃO TMFT
  'cargo': 7,         // G - CARGO
  'setor': 8,         // H - SETOR
  'tipoSetor': 9,     // I - TIPO SETOR
  'postoEfe': 10,     // J - POSTO EFE
  'quadroEfe': 11,    // K - QUADRO EFE
  'especialidadeEfe': 12, // L - ESP EFE
  'opcaoEfe': 13,     // M - OPÇÃO EFE
};

interface PersonnelData {
  neo?: string;
  nome?: string;
  postoTmft?: string;
  quadroTmft?: string;
  especialidadeTmft?: string;
  opcaoTmft?: string;
  cargo?: string;
  setor?: string;
  tipoSetor?: string;
  postoEfe?: string;
  quadroEfe?: string;
  especialidadeEfe?: string;
  opcaoEfe?: string;
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

// Find the row number for a given NEO in the sheet using API Key (read-only)
async function findRowByNeo(apiKey: string, sheetName: string, neo: string): Promise<number | null> {
  try {
    const range = `${sheetName}!A:A`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to read sheet: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const values = data.values || [];
    
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString().trim() === neo.toString().trim()) {
        return i + 1; // Sheets are 1-indexed
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding row:', error);
    return null;
  }
}

// Find the first empty row after TABELA MESTRA section
async function findFirstEmptyRow(apiKey: string, sheetName: string): Promise<number> {
  try {
    const range = `${sheetName}!A:A`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to read sheet: ${response.status}`);
      return 2;
    }
    
    const data = await response.json();
    const values = data.values || [];
    
    let inTabelaMestra = false;
    let lastDataRow = 1;
    
    for (let i = 0; i < values.length; i++) {
      const cellValue = (values[i][0] || '').toString().toUpperCase();
      
      if (cellValue.includes('TABELA MESTRA') || cellValue.includes('SITUAÇÃO DA FORÇA')) {
        inTabelaMestra = true;
        continue;
      }
      
      if (inTabelaMestra) {
        if (cellValue.includes('PREVISÃO') || cellValue.includes('DESEMBARQUE') || 
            cellValue.includes('TRRM') || cellValue.includes('RESUMO')) {
          break;
        }
        
        if (/^\d/.test(cellValue)) {
          lastDataRow = i + 1;
        }
      }
    }
    
    return lastDataRow + 1;
  } catch (error) {
    console.error('Error finding empty row:', error);
    return 2;
  }
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
  const sheetName = SHEET_NAMES[om];
  const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
  
  if (!sheetName) {
    return { success: false, message: `OM ${om} não encontrada na configuração` };
  }

  if (!apiKey) {
    return { success: false, message: 'API Key do Google Sheets não configurada' };
  }

  console.log('='.repeat(60));
  console.log(`SINCRONIZAÇÃO GOOGLE SHEETS - ${action}`);
  console.log('='.repeat(60));
  console.log(`OM: ${om}`);
  console.log(`Planilha: ${sheetName}`);

  // If Apps Script URL is configured, use it for writing
  if (APPS_SCRIPT_URL) {
    try {
      let rowNumber: number | null = null;
      
      // For ALTERACAO and EXCLUSAO, find the row by NEO
      if (action !== 'INCLUSAO' && personnelData.neo) {
        rowNumber = await findRowByNeo(apiKey, sheetName, personnelData.neo);
        if (!rowNumber) {
          return { success: false, message: `NEO ${personnelData.neo} não encontrado na planilha ${sheetName}` };
        }
        console.log(`Encontrado na linha: ${rowNumber}`);
      }
      
      // For INCLUSAO, find the first empty row
      if (action === 'INCLUSAO') {
        rowNumber = await findFirstEmptyRow(apiKey, sheetName);
        console.log(`Nova linha: ${rowNumber}`);
      }

      // Prepare the payload for Apps Script
      const payload = {
        action: action,
        spreadsheetId: SPREADSHEET_ID,
        sheetName: sheetName,
        rowNumber: rowNumber,
        values: action !== 'EXCLUSAO' ? personnelToRowValues(personnelData) : null,
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
    const result = await syncToSheet(
      request.request_type as 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO',
      request.requesting_om,
      request.personnel_data as PersonnelData,
      request.original_data as PersonnelData | undefined
    );

    console.log(`Sync completed for request ${request_id}: ${result.message}`);

    return new Response(
      JSON.stringify({ 
        success: result.success, 
        message: result.message,
        request_type: request.request_type,
        om: request.requesting_om
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
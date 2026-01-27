// Edge function for syncing approved personnel changes to Google Sheets
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Spreadsheet configuration
const SPREADSHEET_ID = '1PmxfNsLB8RQY4lWBqjxQ7EEIYJy8aMnNWLi1K-3G3lU';

// Sheet GIDs for each OM (maps to tabs in the spreadsheet)
const SHEET_GIDS: Record<string, string> = {
  'BAMRJ': '280177623',
  'CDU-1DN': '957180492',
  'CDU-BAMRJ': '1658824367',
  'CDAM': '1650749150',
  'CMM': '1495647476',
  'COPAB': '527671707',
  'CSUPAB': '469479928',
  'DEPCMRJ': '567760228',
  'DEPFMRJ': '1373834755',
  'DEPMSMRJ': '0',
  'DEPSIMRJ': '295069813',
  'DEPSMRJ': '1610199360',
};

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

// Find the row number for a given NEO in the sheet
async function findRowByNeo(apiKey: string, sheetName: string, neo: string): Promise<number | null> {
  try {
    // Read column A (NEO column) to find the row
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

// Find the first empty row in the sheet (for inclusions)
async function findFirstEmptyRow(apiKey: string, sheetName: string): Promise<number> {
  try {
    const range = `${sheetName}!A:A`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to read sheet: ${response.status}`);
      return 2; // Default to row 2 (after header)
    }
    
    const data = await response.json();
    const values = data.values || [];
    
    // Find TABELA MESTRA section and the first empty row after it
    let inTabelaMestra = false;
    let lastDataRow = 1;
    
    for (let i = 0; i < values.length; i++) {
      const cellValue = (values[i][0] || '').toString().toUpperCase();
      
      if (cellValue.includes('TABELA MESTRA') || cellValue.includes('SITUAÇÃO DA FORÇA')) {
        inTabelaMestra = true;
        continue;
      }
      
      if (inTabelaMestra) {
        // Check if we hit another section
        if (cellValue.includes('PREVISÃO') || cellValue.includes('DESEMBARQUE') || 
            cellValue.includes('TRRM') || cellValue.includes('RESUMO')) {
          break;
        }
        
        // If it has a NEO (starts with digit), update last data row
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

// Note: The Google Sheets API with just an API key only supports READ operations.
// For WRITE operations, OAuth2 or Service Account credentials are required.
// This function logs the intended changes for manual processing.
async function logSheetChange(
  action: 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO',
  om: string,
  personnelData: PersonnelData,
  originalData?: PersonnelData
): Promise<{ success: boolean; message: string }> {
  const sheetName = SHEET_NAMES[om];
  
  if (!sheetName) {
    return { success: false, message: `OM ${om} não encontrada na configuração` };
  }

  console.log('='.repeat(60));
  console.log(`SINCRONIZAÇÃO GOOGLE SHEETS - ${action}`);
  console.log('='.repeat(60));
  console.log(`OM: ${om}`);
  console.log(`Planilha: ${sheetName}`);
  console.log(`GID: ${SHEET_GIDS[om]}`);
  
  if (action === 'INCLUSAO') {
    console.log('NOVO REGISTRO:');
    console.log(`  NEO: ${personnelData.neo || 'A DEFINIR'}`);
    console.log(`  Nome: ${personnelData.nome}`);
    console.log(`  Posto TMFT: ${personnelData.postoTmft}`);
    console.log(`  Quadro TMFT: ${personnelData.quadroTmft}`);
    console.log(`  Especialidade TMFT: ${personnelData.especialidadeTmft}`);
    console.log(`  Opção TMFT: ${personnelData.opcaoTmft}`);
    console.log(`  Cargo: ${personnelData.cargo}`);
    console.log(`  Setor: ${personnelData.setor}`);
  } else if (action === 'ALTERACAO') {
    console.log(`NEO: ${personnelData.neo}`);
    console.log('DADOS ORIGINAIS:');
    if (originalData) {
      Object.entries(originalData).forEach(([key, value]) => {
        if (value) console.log(`  ${key}: ${value}`);
      });
    }
    console.log('NOVOS DADOS:');
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
  
  // Store the change request in the database for tracking
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Log to personnel_history for audit trail
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
    message: `Alteração ${action} para ${om} registrada. A planilha será atualizada manualmente pelo administrador.`
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Log the sheet change
    const result = await logSheetChange(
      request.request_type as 'INCLUSAO' | 'ALTERACAO' | 'EXCLUSAO',
      request.requesting_om,
      request.personnel_data as PersonnelData,
      request.original_data as PersonnelData | undefined
    );

    console.log(`Sync completed for request ${request_id}: ${result.message}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: result.message,
        request_type: request.request_type,
        om: request.requesting_om
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to authenticate request and get user role
async function authenticateRequest(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('Auth error:', error);
    return null;
  }

  const userId = data.claims.sub as string;

  // Get user role from database
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (roleError || !roleData) {
    console.log('No role found for user:', userId);
    return { userId, role: 'COPAB' }; // Default role
  }

  return { userId, role: roleData.role };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${auth.userId}, role: ${auth.role}`);
    console.log('Fetching TTC data from Google Sheets...');
    
    // Spreadsheet ID for TTC data
    const spreadsheetId = '19EgecXxuBQ89DsrqPDOsuIgnQMvXrH8GIPA5lshdxj0';
    const timestamp = new Date().getTime();
    
    // Define sheets to fetch
    const sheets = [
      { gid: '0', om: 'COPAB' },
      { gid: '547569905', om: 'BAMRJ' },
      { gid: '154665766', om: 'BAMRJ-MD' },
      { gid: '1749082479', om: 'CMM' },
      { gid: '919754932', om: 'DepCMRJ' },
      { gid: '685247309', om: 'CDAM' },
      { gid: '574141254', om: 'DepSMRJ' },
      { gid: '1707329984', om: 'CSupAB' },
      { gid: '1658474975', om: 'DepSIMRJ' },
      { gid: '1363048908', om: 'DepMSMRJ' },
      { gid: '1332613865', om: 'DepFMRJ' },
      { gid: '1877515617', om: 'CDU-BAMRJ' },
      { gid: '810810540', om: 'CDU-1DN' }
    ];

    // OMs allowed for CSUPAB role
    const csupabAllowedOMs = new Set(['CSUPAB', 'DEPCMRJ', 'DEPFMRJ', 'DEPMSMRJ', 'DEPSIMRJ', 'DEPSMRJ']);
    
    // Filter sheets based on user role
    const allowedSheets = auth.role === 'CSUPAB' 
      ? sheets.filter(s => csupabAllowedOMs.has(s.om.toUpperCase()))
      : sheets;
    
    const transformedData: any[] = [];
    
    // Fetch data from all sheets
    for (const sheet of allowedSheets) {
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=${sheet.gid}&tqx=out:json&timestamp=${timestamp}`;
      
      console.log(`Calling Google Sheets API for ${sheet.om} data...`);
      const response = await fetch(sheetUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.error(`Google Sheets API returned ${response.status} for ${sheet.om}`);
        continue;
      }
      
      const text = await response.text();
      const jsonString = text.substring(47).slice(0, -2);
      const sheetsData = JSON.parse(jsonString);
      
      const rows = sheetsData.table.rows || [];
      
      console.log(`Processing ${rows.length} ${sheet.om} rows`);
      
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].c || [];
        
        const numero = cells[0]?.v ?? '';
        const graduacao = String(cells[1]?.v || '').trim();
        const espQuadro = String(cells[2]?.v || '').trim();
        const nomeCompleto = String(cells[3]?.v || '').trim();
        const idade = String(cells[4]?.f || cells[4]?.v || '').trim();
        const omFromCell = String(cells[5]?.v || '').trim();
        const area = String(cells[6]?.v || '').trim();
        const neo = String(cells[7]?.v || '').trim();
        const tarefaDesignada = String(cells[8]?.v || '').trim();
        const portariaAtual = String(cells[9]?.v || '').trim();
        const periodoInicio = String(cells[10]?.f || cells[10]?.v || '').trim();
        const termino = String(cells[11]?.f || cells[11]?.v || '').trim();
        const qtdRenovacoes = Number(cells[12]?.v || 0);
        
        // Skip summary rows
        const isHeaderOrSummary = 
          graduacao.toUpperCase() === 'VAGAS' || 
          graduacao.toUpperCase() === 'CONTRATADOS' ||
          graduacao.toUpperCase() === 'GRADUAÇÃO' ||
          graduacao.toUpperCase().includes('GRADUAÇÃO') ||
          espQuadro.toUpperCase().includes('ESP/QUADRO') ||
          nomeCompleto.toUpperCase().includes('NOME COMPLETO');
        
        if (isHeaderOrSummary) {
          continue;
        }
        
        // Skip completely empty rows
        if (!numero && !graduacao && !nomeCompleto && !tarefaDesignada) {
          continue;
        }
        
        const isVaga = !nomeCompleto || 
          nomeCompleto.toUpperCase() === 'VAGO' || 
          nomeCompleto.toUpperCase() === 'VAZIA' || 
          nomeCompleto.toUpperCase() === 'VAZIO' ||
          nomeCompleto.toUpperCase() === 'VAGA' ||
          nomeCompleto.toUpperCase().includes('VAGA ABERTA');
        
        transformedData.push({
          id: `TTC-${omFromCell || sheet.om}-${i + 1}`,
          numero: numero,
          graduacao: graduacao,
          espQuadro: espQuadro,
          nomeCompleto: isVaga ? 'VAGA ABERTA' : nomeCompleto,
          idade: idade,
          area: area,
          neo: neo,
          tarefaDesignada: tarefaDesignada,
          periodoInicio: periodoInicio,
          termino: termino,
          qtdRenovacoes: qtdRenovacoes,
          portariaAtual: portariaAtual,
          isVaga: isVaga,
          ocupado: !isVaga,
          om: omFromCell || sheet.om,
        });
      }
    }
    
    // Calculate summary
    const totalVagas = transformedData.length;
    const totalContratados = transformedData.filter(d => !d.isVaga).length;
    const totalVagasAbertas = transformedData.filter(d => d.isVaga).length;
    
    console.log(`Transformed ${transformedData.length} TTC records for role ${auth.role}`);
    
    return new Response(
      JSON.stringify({ 
        data: transformedData,
        summary: {
          total: totalVagas,
          contratados: totalContratados,
          vagasAbertas: totalVagasAbertas
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching TTC data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

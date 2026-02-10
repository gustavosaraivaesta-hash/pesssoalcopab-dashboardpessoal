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

    // Graduações de Oficiais (case-insensitive)
    const graduacoesOficiais = new Set([
      'CMG', 'CF', 'CC', 'CT', '1T', '2T', 'GM',
      'CAPITÃO DE MAR E GUERRA', 'CAPITÃO DE FRAGATA', 'CAPITÃO DE CORVETA',
      'CAPITÃO-TENENTE', 'PRIMEIRO-TENENTE', 'SEGUNDO-TENENTE', 'GUARDA-MARINHA',
      'CMG-RM1', 'CF-RM1', 'CC-RM1', 'CT-RM1', '1T-RM1', '2T-RM1',
      'CMG-RM2', 'CF-RM2', 'CC-RM2', 'CT-RM2', '1T-RM2', '2T-RM2',
      'CMG(RM1)', 'CF(RM1)', 'CC(RM1)', 'CT(RM1)', '1T(RM1)', '2T(RM1)',
      'CMG(RM2)', 'CF(RM2)', 'CC(RM2)', 'CT(RM2)', '1T(RM2)', '2T(RM2)'
    ]);
    
    // Graduações de Praças (case-insensitive)
    const graduacoesPracas = new Set([
      'SO', 'SG', '1SG', '2SG', '3SG', 'CB', 'MN', 'SD',
      'SUBOFICIAL', 'PRIMEIRO-SARGENTO', 'SEGUNDO-SARGENTO', 'TERCEIRO-SARGENTO',
      'CABO', 'MARINHEIRO', 'SOLDADO',
      'SO-RM1', 'SG-RM1', '1SG-RM1', '2SG-RM1', '3SG-RM1', 'CB-RM1', 'MN-RM1',
      'SO-RM2', 'SG-RM2', '1SG-RM2', '2SG-RM2', '3SG-RM2', 'CB-RM2', 'MN-RM2',
      'SO(RM1)', 'SG(RM1)', '1SG(RM1)', '2SG(RM1)', '3SG(RM1)', 'CB(RM1)', 'MN(RM1)',
      'SO(RM2)', 'SG(RM2)', '1SG(RM2)', '2SG(RM2)', '3SG(RM2)', 'CB(RM2)', 'MN(RM2)'
    ]);
    
    // Function to determine tipo (Praça ou Oficial)
    function getTipoPessoal(graduacao: string, neo?: string, espQuadro?: string): 'OFICIAL' | 'PRAÇA' | 'INDEFINIDO' {
      const gradUpper = graduacao.toUpperCase().trim();
      
      // Check if it's an oficial
      for (const grad of graduacoesOficiais) {
        if (gradUpper === grad.toUpperCase() || gradUpper.startsWith(grad.toUpperCase())) {
          return 'OFICIAL';
        }
      }
      
      // Check if it's a praça
      for (const grad of graduacoesPracas) {
        if (gradUpper === grad.toUpperCase() || gradUpper.startsWith(grad.toUpperCase())) {
          return 'PRAÇA';
        }
      }
      
      // Additional heuristic: check for common patterns in graduação
      if (/^(CMG|CF|CC|CT|1T|2T|GM)/i.test(gradUpper)) {
        return 'OFICIAL';
      }
      if (/^(SO|1SG|2SG|3SG|CB|MN|SD)/i.test(gradUpper)) {
        return 'PRAÇA';
      }
      
      // Try to infer from espQuadro (e.g., "CAM", "CAM / AA" = Corpo de Aspirantes da Marinha = Oficial)
      if (espQuadro) {
        const espUpper = espQuadro.toUpperCase().trim();
        if (/\b(CAM|IM|FN|QC|CA|EN|MD|CD)\b/.test(espUpper) || 
            espUpper.startsWith('CAM') || espUpper.startsWith('IM') || espUpper.startsWith('QC')) {
          return 'OFICIAL';
        }
      }
      
      // Try to infer from NEO
      if (neo) {
        const neoUpper = neo.toUpperCase();
        if (/\d*(CAM|CMG|CF|CC|CT|1TEN|2TEN|1T|2T)/i.test(neoUpper)) {
          return 'OFICIAL';
        }
        if (/\d*(SO|SG|1SG|2SG|3SG|CB|MN)/i.test(neoUpper)) {
          return 'PRAÇA';
        }
      }
      
      return 'INDEFINIDO';
    }

    // OMs allowed for CSUPAB role (sem DEPCMRJ)
    const csupabAllowedOMs = new Set(['CSUPAB', 'DEPFMRJ', 'DEPMSMRJ', 'DEPSIMRJ', 'DEPSMRJ']);
    
    // Get allowed OMs based on user role
    function getAllowedOMsForRole(role: string): string[] | 'all' {
      // COPAB sees everything
      if (role === 'COPAB') return 'all';
      
      // CSUPAB sees specific OMs under its command
      if (role === 'CSUPAB') return [...csupabAllowedOMs];
      
      // DEPFMRJ também vê CDU-BAMRJ e CDU-1DN
      if (role === 'DEPFMRJ') return ['DEPFMRJ', 'CDU-BAMRJ', 'CDU-1DN'];
      
      // Individual OMs only see their own data
      return [role];
    }
    
    const allowedOMs = getAllowedOMsForRole(auth.role);
    
    // Filter sheets based on user role
    const allowedSheets = allowedOMs === 'all'
      ? sheets
      : sheets.filter(s => {
          const omUpper = s.om.toUpperCase();
          return allowedOMs.some(allowed => allowed.toUpperCase() === omUpper);
        });
    
    console.log(`Role ${auth.role} has access to ${allowedSheets.length} OMs: ${allowedSheets.map(s => s.om).join(', ')}`);
    
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
      
      // Track current section (OFICIAL or PRAÇA) based on section headers
      let currentSection: 'OFICIAL' | 'PRAÇA' | null = null;
      
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].c || [];
        
        // Get all cell values to check for section headers
        const cell0 = String(cells[0]?.v || '').trim().toUpperCase();
        const cell1 = String(cells[1]?.v || '').trim().toUpperCase();
        const cell2 = String(cells[2]?.v || '').trim().toUpperCase();
        const cell3 = String(cells[3]?.v || '').trim().toUpperCase();
        
        // Check if this row is a section header (OFICIAL or PRAÇA)
        const rowText = `${cell0} ${cell1} ${cell2} ${cell3}`;
        
        // Detect OFICIAL section header
        if (cell0 === 'OFICIAL' || cell1 === 'OFICIAL' || 
            (rowText.includes('OFICIAL') && !rowText.includes('SUBOFICIAL') && 
             (rowText.includes('POSTO') || rowText.includes('CORPO') || rowText.includes('QUADRO')))) {
          currentSection = 'OFICIAL';
          console.log(`${sheet.om}: Detected OFICIAL section at row ${i + 1}`);
          continue;
        }
        
        // Detect PRAÇA section header
        if (cell0 === 'PRAÇA' || cell1 === 'PRAÇA' || cell0 === 'PRACA' || cell1 === 'PRACA' ||
            (rowText.includes('PRAÇA') || rowText.includes('PRACA')) && 
             (rowText.includes('GRADUAÇÃO') || rowText.includes('GRADUACAO') || 
              rowText.includes('ESP') || rowText.includes('QUADRO'))) {
          currentSection = 'PRAÇA';
          console.log(`${sheet.om}: Detected PRAÇA section at row ${i + 1}`);
          continue;
        }
        
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
        
        // Skip header rows (column titles)
        const isHeaderRow = 
          graduacao.toUpperCase() === 'VAGAS' || 
          graduacao.toUpperCase() === 'CONTRATADOS' ||
          graduacao.toUpperCase() === 'GRADUAÇÃO' ||
          graduacao.toUpperCase().includes('GRADUAÇÃO') ||
          graduacao.toUpperCase().includes('POSTO') ||
          espQuadro.toUpperCase().includes('ESP/QUADRO') ||
          espQuadro.toUpperCase().includes('CORPO') ||
          nomeCompleto.toUpperCase().includes('NOME COMPLETO') ||
          nomeCompleto.toUpperCase().includes('DATA NASC');
        
        if (isHeaderRow) {
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
        
        // Determine tipo: first try graduação + NEO, then fallback to current section
        let tipo = getTipoPessoal(graduacao, neo, espQuadro);
        if (tipo === 'INDEFINIDO' && currentSection) {
          tipo = currentSection;
          console.log(`${sheet.om} row ${i + 1}: Using section ${currentSection} for empty/unknown graduação "${graduacao}" (NEO: ${neo})`);
        } else if (tipo !== 'INDEFINIDO' && graduacao === '') {
          console.log(`${sheet.om} row ${i + 1}: Inferred tipo ${tipo} from NEO "${neo}"`);
        }
        
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
          tipo: tipo,
        });
      }
    }
    
    // Calculate summary with tipo breakdown
    const totalVagas = transformedData.length;
    const totalContratados = transformedData.filter(d => !d.isVaga).length;
    const totalVagasAbertas = transformedData.filter(d => d.isVaga).length;
    
    // Breakdown by tipo
    const oficiais = transformedData.filter(d => d.tipo === 'OFICIAL');
    const pracas = transformedData.filter(d => d.tipo === 'PRAÇA');
    
    const totalOficiais = oficiais.length;
    const oficiaisContratados = oficiais.filter(d => !d.isVaga).length;
    const oficiaisVagasAbertas = oficiais.filter(d => d.isVaga).length;
    
    const totalPracas = pracas.length;
    const pracasContratados = pracas.filter(d => !d.isVaga).length;
    const pracasVagasAbertas = pracas.filter(d => d.isVaga).length;
    
    console.log(`Transformed ${transformedData.length} TTC records (${totalOficiais} oficiais, ${totalPracas} praças) for role ${auth.role}`);
    
    console.log(`Transformed ${transformedData.length} TTC records for role ${auth.role}`);
    
    return new Response(
      JSON.stringify({ 
        data: transformedData,
        summary: {
          total: totalVagas,
          contratados: totalContratados,
          vagasAbertas: totalVagasAbertas,
          oficiais: {
            total: totalOficiais,
            contratados: oficiaisContratados,
            vagasAbertas: oficiaisVagasAbertas
          },
          pracas: {
            total: totalPracas,
            contratados: pracasContratados,
            vagasAbertas: pracasVagasAbertas
          }
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

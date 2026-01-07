import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching TTC data from Google Sheets...');
    
    // Spreadsheet ID for TTC data
    const spreadsheetId = '19EgecXxuBQ89DsrqPDOsuIgnQMvXrH8GIPA5lshdxj0';
    const timestamp = new Date().getTime();
    
    // Fetch TTC data (gid=0)
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=0&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for TTC data...');
    const response = await fetch(sheetUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Sheets API returned ${response.status}`);
    }
    
    const text = await response.text();
    const jsonString = text.substring(47).slice(0, -2);
    const sheetsData = JSON.parse(jsonString);
    
    console.log('Raw TTC data received');
    
    const transformedData: any[] = [];
    const rows = sheetsData.table.rows || [];
    
    console.log(`Processing ${rows.length} TTC rows`);
    
    // Skip header row (index 0), process data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].c || [];
      
      // Column mapping based on the spreadsheet structure:
      // 0: Number (#)
      // 1: Graduação (SO, etc)
      // 2: ESP/QUADRO (CAP / QAP / PL, etc)
      // 3: Nome Completo
      // 4: Idade
      // 5: Área
      // 6: NEO
      // 7: Tarefa Designada
      // 8: Período Início
      // 9: Término
      // 10: Quantidade Renovações
      
      const numero = cells[0]?.v || '';
      const graduacao = String(cells[1]?.v || '').trim();
      const espQuadro = String(cells[2]?.v || '').trim();
      const nomeCompleto = String(cells[3]?.v || '').trim();
      // Use formatted value (.f) for date to get DD/MM/YYYY instead of Date() object
      const idade = String(cells[4]?.f || cells[4]?.v || '').trim();
      const area = String(cells[5]?.v || '').trim();
      const neo = String(cells[6]?.v || '').trim();
      const tarefaDesignada = String(cells[7]?.v || '').trim();
      const periodoInicio = cells[8]?.f || cells[8]?.v || '';
      const termino = cells[9]?.f || cells[9]?.v || '';
      const qtdRenovacoes = Number(cells[10]?.v || 0);
      
      // Skip summary rows (VAGAS, CONTRATADOS, etc) and empty rows
      if (!graduacao || graduacao.toUpperCase() === 'VAGAS' || graduacao.toUpperCase() === 'CONTRATADOS') {
        // Check if this is the summary row
        if (numero === '' && cells[1]?.v === 'VAGAS') {
          console.log(`Found summary row: VAGAS=${cells[2]?.v}, CONTRATADOS=${cells[3]?.v}`);
        }
        continue;
      }
      
      // Skip if no name (empty position)
      const isVaga = !nomeCompleto || nomeCompleto.toUpperCase() === 'VAGO' || nomeCompleto.toUpperCase() === 'VAZIO';
      
      transformedData.push({
        id: `TTC-${i}`,
        numero: numero,
        graduacao: graduacao,
        espQuadro: espQuadro,
        nomeCompleto: nomeCompleto,
        idade: idade,
        area: area,
        neo: neo,
        tarefaDesignada: tarefaDesignada,
        periodoInicio: periodoInicio,
        termino: termino,
        qtdRenovacoes: qtdRenovacoes,
        isVaga: isVaga,
        ocupado: !isVaga,
        om: 'COPAB',
      });
    }
    
    // Calculate summary
    const totalVagas = transformedData.length;
    const totalContratados = transformedData.filter(d => !d.isVaga).length;
    const totalVagasAbertas = transformedData.filter(d => d.isVaga).length;
    
    console.log(`Transformed ${transformedData.length} TTC records`);
    console.log(`Summary: Total=${totalVagas}, Contratados=${totalContratados}, Vagas Abertas=${totalVagasAbertas}`);
    
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

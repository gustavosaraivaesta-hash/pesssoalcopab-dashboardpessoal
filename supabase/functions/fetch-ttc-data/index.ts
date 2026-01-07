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
    
    // Process all rows; we will skip header/summary rows by content
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].c || [];
      
      // Column mapping based on the spreadsheet structure:
      // 0: Number (#) or CONTR. / RENOVAÇÃO
      // 1: Graduação (SO, etc)
      // 2: ESP/QUADRO (CAP / QAP / PL, etc)
      // 3: Nome Completo
      // 4: Data Nasc. (Idade)
      // 5: Área
      // 6: NEO
      // 7: Tarefa Designada
      // 8: Período Início
      // 9: Término
      // 10: Quantidade Renovações
      
      const numero = cells[0]?.v ?? '';
      const graduacao = String(cells[1]?.v || '').trim();
      const espQuadro = String(cells[2]?.v || '').trim();
      const nomeCompleto = String(cells[3]?.v || '').trim();
      // Use formatted value (.f) for date to get DD/MM/YYYY instead of Date() object
      const idade = String(cells[4]?.f || cells[4]?.v || '').trim();
      const area = String(cells[5]?.v || '').trim();
      const neo = String(cells[6]?.v || '').trim();
      const tarefaDesignada = String(cells[7]?.v || '').trim();
      const periodoInicio = String(cells[8]?.f || cells[8]?.v || '').trim();
      const termino = String(cells[9]?.f || cells[9]?.v || '').trim();
      const qtdRenovacoes = Number(cells[10]?.v || 0);
      
      console.log(`Row ${i}: numero=${numero}, grad=${graduacao}, nome=${nomeCompleto?.substring(0, 20)}`);
      
      // Skip summary rows (VAGAS, CONTRATADOS, etc) - check in multiple columns
      const isHeaderOrSummary = 
        graduacao.toUpperCase() === 'VAGAS' || 
        graduacao.toUpperCase() === 'CONTRATADOS' ||
        graduacao.toUpperCase() === 'GRADUAÇÃO' ||
        graduacao.toUpperCase().includes('GRADUAÇÃO') ||
        espQuadro.toUpperCase().includes('ESP/QUADRO') ||
        nomeCompleto.toUpperCase().includes('NOME COMPLETO');
      
      if (isHeaderOrSummary) {
        console.log(`Skipping row ${i}: header or summary row`);
        continue;
      }
      
      // Skip completely empty rows (no numero, no graduacao, no nome, no tarefa)
      if (!numero && !graduacao && !nomeCompleto && !tarefaDesignada) {
        console.log(`Skipping row ${i}: empty row`);
        continue;
      }
      
      // Determine if this is an open position (VAGA)
      const isVaga = !nomeCompleto || 
        nomeCompleto.toUpperCase() === 'VAGO' || 
        nomeCompleto.toUpperCase() === 'VAZIA' || 
        nomeCompleto.toUpperCase() === 'VAZIO' ||
        nomeCompleto.toUpperCase() === 'VAGA' ||
        nomeCompleto.toUpperCase().includes('VAGA ABERTA');
      
      transformedData.push({
        id: `TTC-${i + 1}`,
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
        isVaga: isVaga,
        ocupado: !isVaga,
        om: 'COPAB',
      });
      
      console.log(`Added row ${i}: isVaga=${isVaga}`);
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

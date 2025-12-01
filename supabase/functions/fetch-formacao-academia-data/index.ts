import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching data from Google Sheets Page 4 (Formação Academia)...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const timestamp = new Date().getTime();
    
    // Fetch Page 4 (Formação Academia) - gid=110561484
    const sheet4Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=110561484&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 4 (Formação Academia)...');
    const response = await fetch(sheet4Url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Sheets API Page 4 returned ${response.status}`);
    }
    
    const text = await response.text();
    const jsonString = text.substring(47).slice(0, -2);
    const sheetsData = JSON.parse(jsonString);
    
    console.log('Processing Formação Academia data from Page 4...');
    
    const formacaoData: any[] = [];
    
    if (sheetsData.table.rows && sheetsData.table.rows.length > 1) {
      // Define OMs and their column positions (TMFT, EFE)
      // Coluna 0: Formação, Coluna 1: Pessoal, Colunas 2-4: CARREIRA/RM2/TTC, depois vêm os dados dos OMs a partir da coluna 5
      const oms = [
        { name: 'COpAb', startCol: 5 },
        { name: 'BAMRJ', startCol: 7 },
        { name: 'CMM', startCol: 9 },
        { name: 'DepCMRJ', startCol: 11 },
        { name: 'CDAM', startCol: 13 },
        { name: 'DepSMRJ', startCol: 15 },
        { name: 'CSupAb', startCol: 17 },
        { name: 'DepSIMRJ', startCol: 19 },
        { name: 'DepMSMRJ', startCol: 21 },
        { name: 'DepFMRJ', startCol: 23 },
        { name: 'CDU-BAMRJ', startCol: 25 },
        { name: 'CDU-1DN', startCol: 27 },
      ];
      
      // CARREIRA, RM2, TTC estão nas colunas C, D, E (índices 2, 3, 4)
      const carreiraCol = 2;
      const rm2Col = 3;
      const ttcCol = 4;
      
      console.log(`Total columns in header row: ${sheetsData.table.cols?.length || 'unknown'}`);
      
      // Log column headers
      if (sheetsData.table.cols) {
        const colLabels = sheetsData.table.cols.map((col: any, idx: number) => `[${idx}]=${col.label || ''}`);
        console.log(`Column headers: ${colLabels.join(', ')}`);
      }
      
      // Log first 10 rows with ALL columns to find CARREIRA, RM2, TTC
      console.log('=== DEBUGGING: Logging first 10 rows with ALL columns ===');
      for (let debugRow = 0; debugRow < Math.min(10, sheetsData.table.rows.length); debugRow++) {
        const debugCells = sheetsData.table.rows[debugRow].c || [];
        const allColumns: string[] = [];
        for (let col = 0; col < Math.min(35, debugCells.length); col++) {
          const val = debugCells[col]?.v ? String(debugCells[col].v).trim() : '';
          if (val) allColumns.push(`[${col}]="${val}"`);
        }
        console.log(`Row ${debugRow}: ${allColumns.join(', ')}`);
      }
      
      let currentFormacao = '';
      
      // Skip header rows, process data rows
      for (let i = 0; i < sheetsData.table.rows.length; i++) {
        const cells = sheetsData.table.rows[i].c || [];
        const colA = cells[0]?.v ? String(cells[0].v).trim() : '';
        const colB = cells[1]?.v ? String(cells[1].v).trim() : '';
        
        // Ler os valores numéricos das 3 colunas de opções (são quantidades, não flags)
        const carreiraQtd = cells[carreiraCol]?.v ? Number(cells[carreiraCol].v) : 0;
        const rm2Qtd = cells[rm2Col]?.v ? Number(cells[rm2Col].v) : 0;
        const ttcQtd = cells[ttcCol]?.v ? Number(cells[ttcCol].v) : 0;
        
        // Criar string de opção baseado nos valores > 0
        const opcoes: string[] = [];
        if (carreiraQtd > 0) opcoes.push('CARREIRA');
        if (rm2Qtd > 0) opcoes.push('RM2');
        if (ttcQtd > 0) opcoes.push('TTC');
        const opcaoValue = opcoes.join(', ');
        
        console.log(`Row ${i}: colA = "${colA}", colB = "${colB}", carreira=${carreiraQtd}, rm2=${rm2Qtd}, ttc=${ttcQtd}`);
        
        // Check if this is a formation header row (colA has formation name)
        // Detect formations dynamically - if colA has content and colB has a rank, it's a formation row
        const normalizedColA = colA.toUpperCase().replace(/\s+/g, ' ').trim();
        const officerRanks = ['CONTRA-ALMIRANTE', 'CMG', 'CF', 'CC', 'CT', '1TEN', '2TEN', 'GM', 'OFICIAIS TTC', 'SERVIDORES CIVIS'];
        
        // If colA has content and colB matches an officer rank, colA is a formation name
        if (normalizedColA && colB && officerRanks.some(rank => colB.toUpperCase().includes(rank))) {
          currentFormacao = normalizedColA;
          console.log(`Found formation: ${currentFormacao}`);
          
          // Process CONTRA-ALMIRANTE on the same row as formation
          if (colB && currentFormacao) {
            const pessoal = colB;
            
            console.log(`Formation "${currentFormacao}" - Pessoal "${pessoal}" - Opção: "${opcaoValue}"`);
            
            oms.forEach(om => {
              const tmft = cells[om.startCol]?.v ? Number(cells[om.startCol].v) : 0;
              const efe = cells[om.startCol + 1]?.v ? Number(cells[om.startCol + 1].v) : 0;
              
              formacaoData.push({
                formacao: currentFormacao,
                pessoal: pessoal,
                om: om.name,
                opcao: opcaoValue,
                carreiraQtd: carreiraQtd,
                rm2Qtd: rm2Qtd,
                ttcQtd: ttcQtd,
                tmft: tmft,
                efe: efe,
              });
            });
          }
          continue;
        }
        
        // Check if this is a data row (colB has pessoal rank)
        if (colB && currentFormacao) {
          const pessoal = colB;
          
          // Create one record for each OM with the current formation
          oms.forEach(om => {
            const tmft = cells[om.startCol]?.v ? Number(cells[om.startCol].v) : 0;
            const efe = cells[om.startCol + 1]?.v ? Number(cells[om.startCol + 1].v) : 0;
            
            formacaoData.push({
              formacao: currentFormacao,
              pessoal: pessoal,
              om: om.name,
              opcao: opcaoValue,
              carreiraQtd: carreiraQtd,
              rm2Qtd: rm2Qtd,
              ttcQtd: ttcQtd,
              tmft: tmft,
              efe: efe,
            });
          });
        }
      }
    }
    
    console.log(`Transformed ${formacaoData.length} records from Page 4`);
    
    // Log opcoes found
    const uniqueOpcoes = [...new Set(formacaoData.map(d => d.opcao).filter(Boolean))];
    console.log(`Unique Opções found: ${uniqueOpcoes.join(', ')}`);
    
    return new Response(
      JSON.stringify({ data: formacaoData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching formacao academia data:', error);
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

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
    console.log('Fetching OM data from Google Sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const gid = '581706093'; // GID for PESSOAL POR OM sheet
    const timestamp = new Date().getTime();
    
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url, {
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
    const rows = sheetsData.table.rows;

    if (!rows || rows.length === 0) {
      throw new Error('No data found in sheet');
    }

    console.log('Processing OM data...');
    
    if (rows.length < 2) {
      throw new Error('Not enough data in sheet');
    }
    
    // First row contains headers with OM names and metric types
    const headerRow = rows[0].c || [];
    
    // Check if we have QUADRO and OPÇÃO columns by checking header names
    const firstHeader = String(headerRow[0]?.v || '').toUpperCase();
    const secondHeader = String(headerRow[1]?.v || '').toUpperCase();
    const hasQuadroOpcao = firstHeader.includes('QUADRO') || secondHeader.includes('OPÇÃO') || secondHeader.includes('OPCAO');
    const dataStartCol = hasQuadroOpcao ? 3 : 1; // If QUADRO and OPÇÃO exist, OMs start at column 3
    
    console.log('First header:', firstHeader, 'Second header:', secondHeader, 'Has QUADRO/OPÇÃO:', hasQuadroOpcao);
    
    // Extract OMs from header (every 3 columns after initial columns)
    const oms: string[] = [];
    for (let i = dataStartCol; i < headerRow.length; i += 3) {
      const cellValue = headerRow[i]?.v || '';
      if (cellValue) {
        const omName = String(cellValue).replace(' TMFT', '').trim();
        if (omName && omName !== 'TOTAL') {
          oms.push(omName);
        }
      }
    }
    
    console.log('Found OMs:', oms);
    
    // Extract unique QUADRO and OPÇÃO values
    const quadros = new Set<string>();
    const opcoes = new Set<string>();

    // Process data rows
    const processedData: any[] = [];
    
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].c || [];
      
      const quadro = hasQuadroOpcao ? (cells[0]?.v || '') : '';
      const opcao = hasQuadroOpcao ? (cells[1]?.v || '') : '';
      const pessoal = hasQuadroOpcao ? (cells[2]?.v || '') : (cells[0]?.v || '');
      
      if (!pessoal) continue;
      
      if (quadro) quadros.add(String(quadro));
      if (opcao) opcoes.add(String(opcao));
      
      // For each OM, extract TMFT, EXI, DIF
      for (let omIndex = 0; omIndex < oms.length; omIndex++) {
        const colStart = dataStartCol + (omIndex * 3);
        const tmft = Number(cells[colStart]?.v || 0);
        const exi = Number(cells[colStart + 1]?.v || 0);
        const dif = Number(cells[colStart + 2]?.v || 0);
        
        processedData.push({
          id: `${oms[omIndex]}-${pessoal}-${rowIndex}`,
          om: oms[omIndex],
          pessoal: pessoal,
          quadro: quadro,
          opcao: opcao,
          tmft: tmft,
          exi: exi,
          dif: dif,
        });
      }
    }

    console.log(`Processed ${processedData.length} records`);

    return new Response(
      JSON.stringify({ 
        data: processedData,
        oms: oms,
        quadros: Array.from(quadros).sort(),
        opcoes: Array.from(opcoes).sort()
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-om-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        data: [],
        oms: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

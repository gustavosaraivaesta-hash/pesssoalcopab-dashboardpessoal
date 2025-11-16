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
    console.log('Fetching ONLY Page 3 data from Google Sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const timestamp = new Date().getTime();
    
    // Fetch ONLY Page 3 (Especialidades detalhadas) - gid=1875983157
    const sheet3Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=1875983157&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 3...');
    const response = await fetch(sheet3Url, {
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
    
    console.log('Processing Page 3 data...');
    
    const rows = sheetsData.table.rows;
    console.log('Total rows:', rows.length);
    
    if (rows.length < 1) {
      console.log('No data in Page 3');
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Mapeamento fixo das colunas para OMs (baseado na estrutura da planilha)
    // Col 0: Especialidade, Col 1: Graduação
    // A partir da Col 2: pares (TMFT, EFE) para cada OM
    const omMap: { [key: number]: string } = {
      2: 'BAMRJ',      // Cols 2-3
      4: 'CMM',        // Cols 4-5
      6: 'DepCMRJ',    // Cols 6-7
      8: 'CDAM',       // Cols 8-9
      10: 'DepSMRJ',   // Cols 10-11
      12: 'CSupAb',    // Cols 12-13
      14: 'DepSIMRJ',  // Cols 14-15
      16: 'DepMSMRJ',  // Cols 16-17
      18: 'DepFMRJ',   // Cols 18-19
      20: 'CDU-BAMRJ', // Cols 20-21
      22: 'CDU-1DN',   // Cols 22-23
      24: 'COMRJ',     // Cols 24-25
      26: 'COpAb',     // Cols 26-27
    };
    
    console.log('Mapeamento fixo de OMs:', omMap);
    
    const transformedData: any[] = [];
    const graduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
    let currentEspecialidade = '';
    
    // Process all data rows (start from row 0)
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const col0 = String(cells[0]?.v || '').trim();
      const col1 = String(cells[1]?.v || '').trim();
      
      // If col0 has text and is not a graduação, it's a new especialidade
      if (col0 && col0.length > 2 && !graduacoes.includes(col0)) {
        currentEspecialidade = col0;
        console.log(`Nova especialidade: ${currentEspecialidade}`);
      }
      
      // If col1 is a valid graduação, process the row
      if (col1 && graduacoes.includes(col1)) {
        // For each OM, create a record
        for (const [colIndex, omName] of Object.entries(omMap)) {
          const col = Number(colIndex);
          const tmft = Number(cells[col]?.v || 0);
          const efe = Number(cells[col + 1]?.v || 0);
          
          // Add all records (even with zero values) for complete OM coverage
          transformedData.push({
            especialidade: currentEspecialidade,
            graduacao: col1,
            om: omName,
            tmft_sum: tmft,
            efe_sum: efe,
          });
        }
      }
    }
    
    console.log(`Total de registros transformados: ${transformedData.length}`);
    
    // Count records per OM
    const omCounts: { [key: string]: number } = {};
    transformedData.forEach(record => {
      omCounts[record.om] = (omCounts[record.om] || 0) + 1;
    });
    
    console.log('Registros por OM:', omCounts);
    console.log('OMs únicas:', Object.keys(omCounts).sort());
    console.log('Primeiros 5 registros:', transformedData.slice(0, 5));
    console.log('Últimos 5 registros:', transformedData.slice(-5));
    
    return new Response(
      JSON.stringify({ data: transformedData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching Page 3 data:', error);
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

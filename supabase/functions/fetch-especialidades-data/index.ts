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
    
    const transformedData: any[] = [];
    
    if (rows.length < 3) {
      console.log('Not enough data in Page 3');
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Extract OM name from first row
    const omName = rows[0]?.c?.[0]?.v || 'COpAb';
    console.log(`OM detectada: ${omName}`);
    
    // Log first 10 rows to debug structure
    console.log('=== Primeiras 10 linhas ===');
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      const cells = rows[i].c || [];
      console.log(`Linha ${i}:`, cells.map((c: any) => c?.v).join(' | '));
    }
    
    let currentEspecialidade = '';
    const graduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
    
    // Start from row 0 - each row can have especialidade OR be continuation
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const col0 = String(cells[0]?.v || '').trim(); // Especialidade or empty
      const col1 = String(cells[1]?.v || '').trim(); // Graduação
      
      // If col0 has text (not empty and not a graduação), it's a new especialidade
      if (col0 && col0.length > 2 && !graduacoes.includes(col0)) {
        currentEspecialidade = col0;
        console.log(`Nova especialidade: ${currentEspecialidade}`);
      }
      
      // If col1 is a valid graduação, process the row
      if (col1 && graduacoes.includes(col1)) {
        // Sum all numeric values from col2 onwards for TMFT
        let tmftSum = 0;
        for (let j = 2; j < cells.length; j++) {
          const val = Number(cells[j]?.v || 0);
          if (!isNaN(val)) {
            tmftSum += val;
          }
        }
        
        console.log(`Processando ${col1} de ${currentEspecialidade}: TMFT soma = ${tmftSum}`);
        
        transformedData.push({
          especialidade: currentEspecialidade,
          graduacao: col1,
          om: omName,
          tmft_sum: tmftSum,
          tmft_ca: 0,
          tmft_rm2: 0,
          efe_sum: tmftSum, // Using same value for now
          efe_ca: 0,
          efe_rm2: 0,
        });
      }
    }
    
    console.log(`Transformed ${transformedData.length} records from Page 3`);
    
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

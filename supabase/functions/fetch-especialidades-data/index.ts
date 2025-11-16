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
    
    let currentEspecialidade = '';
    
    // Skip rows 0-1 (headers), process from row 2
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const col0 = String(cells[0]?.v || '').trim();
      const col1 = cells[1]?.v;
      const col2 = cells[2]?.v;
      
      // Check if this is a graduação line
      const graduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
      
      if (graduacoes.includes(col0)) {
        transformedData.push({
          especialidade: currentEspecialidade,
          graduacao: col0,
          om: omName,
          tmft_sum: Number(col1 || 0),
          tmft_ca: 0,
          tmft_rm2: 0,
          efe_sum: Number(col2 || 0),
          efe_ca: 0,
          efe_rm2: 0,
        });
      } else if (col0 && col0.length > 2) {
        // This is likely an especialidade name
        currentEspecialidade = col0;
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

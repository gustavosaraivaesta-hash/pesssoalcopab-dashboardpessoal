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
    
    if (rows.length < 4) {
      console.log('Not enough data in Page 3');
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Row 0: OM names (starting from col 2, every 2 columns)
    // Row 1: TMFT, EFE, TMFT, EFE, etc.
    // Row 2: ∑, ∑, ∑, ∑, etc.
    // Row 3+: Data rows
    
    const headerRow = rows[0].c || [];
    const omMap: { [key: number]: string } = {};
    
    // Extract OM names from header row starting at column 2
    for (let col = 2; col < headerRow.length; col += 2) {
      const omName = String(headerRow[col]?.v || '').trim();
      if (omName) {
        omMap[col] = omName;
        console.log(`Coluna ${col}: OM = ${omName}`);
      }
    }
    
    console.log('OMs detectadas:', Object.values(omMap).join(', '));
    
    const transformedData: any[] = [];
    const graduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
    let currentEspecialidade = '';
    
    // Process data rows (start from row 3 to skip headers)
    for (let i = 3; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const col0 = String(cells[0]?.v || '').trim();
      const col1 = String(cells[1]?.v || '').trim();
      
      // If col0 has text, it's a new especialidade
      if (col0 && col0.length > 2 && !graduacoes.includes(col0)) {
        currentEspecialidade = col0;
      }
      
      // If col1 is a valid graduação, process the row
      if (col1 && graduacoes.includes(col1)) {
        // For each OM, create a record
        for (const [colIndex, omName] of Object.entries(omMap)) {
          const col = Number(colIndex);
          const tmft = Number(cells[col]?.v || 0);
          const efe = Number(cells[col + 1]?.v || 0);
          
          // Only add if there's data
          if (tmft > 0 || efe > 0) {
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
    }
    
    console.log(`Transformed ${transformedData.length} records from Page 3`);
    console.log('Sample records:', transformedData.slice(0, 5));
    
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

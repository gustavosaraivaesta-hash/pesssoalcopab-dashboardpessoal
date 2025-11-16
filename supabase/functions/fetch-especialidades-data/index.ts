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
    console.log('Total de colunas no header:', headerRow.length);
    
    // Log first 30 columns of header to see structure
    console.log('=== Primeiras 30 colunas do header ===');
    for (let i = 0; i < Math.min(30, headerRow.length); i++) {
      const value = headerRow[i]?.v;
      if (value !== null && value !== undefined) {
        console.log(`Col ${i}: "${value}"`);
      }
    }
    
    const omMap: { [key: number]: string } = {};
    let lastOM = '';
    
    // Extract OM names from header row
    // OMs appear at col 2, 4, 6, 8, etc. (every 2 columns starting from 2)
    for (let col = 2; col < headerRow.length; col++) {
      const cellValue = String(headerRow[col]?.v || '').trim();
      
      // If we find a non-empty value, it's an OM name
      if (cellValue && cellValue.length > 0) {
        // Check if it's not a TMFT/EFE indicator
        if (cellValue !== 'TMFT' && cellValue !== 'EFE' && cellValue !== '∑') {
          lastOM = cellValue;
          omMap[col] = cellValue;
          console.log(`Coluna ${col}: OM = "${cellValue}"`);
        }
      } else if (lastOM && col % 2 === 0) {
        // If cell is empty but we're at an even column and have a lastOM, 
        // it's likely a merged cell continuing the previous OM
        omMap[col] = lastOM;
        console.log(`Coluna ${col}: OM (continuação) = "${lastOM}"`);
      }
    }
    
    console.log('Total de OMs detectadas:', Object.keys(omMap).length);
    console.log('OMs únicas:', Array.from(new Set(Object.values(omMap))));
    
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
        console.log(`Nova especialidade detectada: ${currentEspecialidade}`);
      }
      
      // If col1 is a valid graduação, process the row
      if (col1 && graduacoes.includes(col1)) {
        // For each OM column, create a record
        for (const [colIndex, omName] of Object.entries(omMap)) {
          const col = Number(colIndex);
          const tmft = Number(cells[col]?.v || 0);
          const efe = Number(cells[col + 1]?.v || 0);
          
          // Add record regardless of whether there's data or not
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
    console.log('Primeiros 10 registros:', transformedData.slice(0, 10));
    
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

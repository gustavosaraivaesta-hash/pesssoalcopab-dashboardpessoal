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
    
    if (rows.length < 2) {
      console.log('Not enough data in Page 3');
      return new Response(
        JSON.stringify({ data: [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Skip header row (index 0), process data rows starting from index 1
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].c || [];
      
      // Page 3 structure:
      // Col 0: Especialidade
      // Col 1: Graduação
      // Col 2: TMFT ∑
      // Col 3: TMFT CA
      // Col 4: TMFT RM2
      // Col 5: EFE ∑
      // Col 6: EFE CA
      // Col 7: EFE RM2
      // Col 8: OM
      
      const especialidade = cells[0]?.v || '';
      const graduacao = cells[1]?.v || '';
      const tmft_sum = Number(cells[2]?.v || 0);
      const tmft_ca = Number(cells[3]?.v || 0);
      const tmft_rm2 = Number(cells[4]?.v || 0);
      const efe_sum = Number(cells[5]?.v || 0);
      const efe_ca = Number(cells[6]?.v || 0);
      const efe_rm2 = Number(cells[7]?.v || 0);
      const om = cells[8]?.v || '';
      
      // Only include rows with valid data
      if (!especialidade || !graduacao) continue;
      
      transformedData.push({
        especialidade,
        graduacao,
        om,
        tmft_sum,
        tmft_ca,
        tmft_rm2,
        efe_sum,
        efe_ca,
        efe_rm2,
      });
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

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
    console.log('Fetching data from Google Sheets...');
    
    // Extract spreadsheet ID from the URL
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    
    // Using Google Sheets API v4 - public access with cache busting
    const timestamp = new Date().getTime();
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API...');
    const response = await fetch(sheetsUrl, {
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
    // Google returns JSONP, we need to extract the JSON
    const jsonString = text.substring(47).slice(0, -2);
    const sheetsData = JSON.parse(jsonString);
    
    console.log('Raw sheets data received');
    
    // Transform the data from matrix format to individual records
    const rows = sheetsData.table.rows;
    const transformedData: any[] = [];
    
    if (rows.length < 2) {
      console.log('Not enough data in sheets');
      return new Response(
        JSON.stringify({ data: [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Header row contains OM names
    const headerCells = rows[0].c || [];
    console.log('Processing matrix data with', rows.length - 1, 'rows');
    
    // Use only TOTAL column (columns 43, 44, 45 = TMFT, EXI, DIF)
    const totalColumn = 43;
    
    // Process each row (each row is a graduacao)
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const graduacao = cells[0]?.v || '';
      
      if (!graduacao) continue;
      
      // Get values from TOTAL column only
      const tmft = Number(cells[totalColumn]?.v || 0);
      const exi = Number(cells[totalColumn + 1]?.v || 0);
      const dif = Number(cells[totalColumn + 2]?.v || 0);
      
      if (tmft > 0 || exi > 0) { // Only add if there's data
        transformedData.push({
          id: graduacao,
          nome: graduacao,
          especialidade: graduacao,
          graduacao: graduacao,
          om: 'TOTAL',
          sdp: '',
          tmft: tmft,
          exi: exi,
          dif: dif,
          previsaoEmbarque: '',
          pracasTTC: 0,
          servidoresCivis: 0,
          percentualPracasAtiva: 0,
          percentualForcaTrabalho: 0,
        });
      }
    }
    
    console.log(`Transformed ${transformedData.length} records`);
    
    return new Response(
      JSON.stringify({ data: transformedData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching sheets data:', error);
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

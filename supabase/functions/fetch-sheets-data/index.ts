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
    
    // Transform the data to match our MilitaryData interface
    const rows = sheetsData.table.rows;
    
    // Log header row for debugging
    if (rows.length > 0) {
      const headerCells = rows[0].c || [];
      const headers = headerCells.map((cell: any) => cell?.v || '');
      console.log('Header columns:', JSON.stringify(headers));
    }
    
    const transformedData = rows.slice(1).map((row: any, index: number) => {
      const cells = row.c || [];
      const rowData = {
        id: `${index + 1}`,
        nome: cells[0]?.v || '',
        especialidade: cells[1]?.v || '',
        graduacao: cells[2]?.v || '',
        om: cells[3]?.v || '',
        sdp: cells[4]?.v || '',
        tmft: Number(cells[5]?.v || 0),
        exi: Number(cells[6]?.v || 0),
        dif: Number(cells[7]?.v || 0),
        previsaoEmbarque: cells[8]?.v || '',
        pracasTTC: Number(cells[9]?.v || 0),
        servidoresCivis: Number(cells[10]?.v || 0),
        percentualPracasAtiva: Number(cells[11]?.v || 0),
        percentualForcaTrabalho: Number(cells[12]?.v || 0),
      };
      
      // Log first row for debugging
      if (index === 0) {
        console.log('First row sample:', JSON.stringify(rowData));
      }
      
      return rowData;
    });
    
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

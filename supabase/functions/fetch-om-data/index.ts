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
    
    const SHEET_ID = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const GID = '581706093'; // Page with OM data
    const API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    
    if (!API_KEY) {
      throw new Error('GOOGLE_SHEETS_API_KEY not configured');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/gid=${GID}?key=${API_KEY}`;
    
    console.log('Fetching from URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API error:', errorText);
      throw new Error(`Failed to fetch data: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) {
      throw new Error('No data found in sheet');
    }

    console.log('Processing OM data...');
    
    // First row contains headers with OM names and metric types
    const headerRow = rows[0];
    
    // Extract OMs from header (every 3 columns after PESSOAL)
    const oms: string[] = [];
    for (let i = 1; i < headerRow.length; i += 3) {
      if (headerRow[i]) {
        const omName = headerRow[i].replace(' TMFT', '').trim();
        if (omName && omName !== 'TOTAL') {
          oms.push(omName);
        }
      }
    }
    
    console.log('Found OMs:', oms);

    // Process data rows
    const processedData: any[] = [];
    
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const pessoal = row[0];
      
      if (!pessoal) continue;
      
      // For each OM, extract TMFT, EXI, DIF
      for (let omIndex = 0; omIndex < oms.length; omIndex++) {
        const colStart = 1 + (omIndex * 3);
        const tmft = parseInt(row[colStart]) || 0;
        const exi = parseInt(row[colStart + 1]) || 0;
        const dif = parseInt(row[colStart + 2]) || 0;
        
        processedData.push({
          id: `${oms[omIndex]}-${pessoal}-${rowIndex}`,
          om: oms[omIndex],
          pessoal: pessoal,
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
        oms: oms 
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

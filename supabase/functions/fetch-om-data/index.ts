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
    
    // Extract OMs from header (every 3 columns after PESSOAL)
    const oms: string[] = [];
    for (let i = 1; i < headerRow.length; i += 3) {
      const cellValue = headerRow[i]?.v || '';
      if (cellValue) {
        const omName = String(cellValue).replace(' TMFT', '').trim();
        if (omName && omName !== 'TOTAL') {
          oms.push(omName);
        }
      }
    }
    
    console.log('Found OMs:', oms);

    // Process data rows
    const processedData: any[] = [];
    
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].c || [];
      const pessoal = cells[0]?.v || '';
      
      if (!pessoal) continue;
      
      // For each OM, extract TMFT, EXI, DIF
      for (let omIndex = 0; omIndex < oms.length; omIndex++) {
        const colStart = 1 + (omIndex * 3);
        const tmft = Number(cells[colStart]?.v || 0);
        const exi = Number(cells[colStart + 1]?.v || 0);
        const dif = Number(cells[colStart + 2]?.v || 0);
        
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

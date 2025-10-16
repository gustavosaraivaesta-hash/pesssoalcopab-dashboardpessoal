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
    
    // Fetch Page 1 (main data)
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 1...');
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
    
    // Fetch Page 3 (especialidades) - using correct gid
    const sheet3Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=1875983157&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 3 (especialidades)...');
    const response3 = await fetch(sheet3Url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response3.ok) {
      throw new Error(`Google Sheets API Page 3 returned ${response3.status}`);
    }
    
    const text3 = await response3.text();
    const jsonString3 = text3.substring(47).slice(0, -2);
    const sheet3Data = JSON.parse(jsonString3);
    
    // Build especialidade mapping from Page 3
    const especialidadeMap: { [key: string]: string } = {};
    if (sheet3Data.table.rows && sheet3Data.table.rows.length > 0) {
      console.log('Processing especialidades from Page 3...');
      for (const row of sheet3Data.table.rows) {
        const cells = row.c || [];
        const graduacao = cells[0]?.v || '';
        const especialidade = cells[1]?.v || '';
        if (graduacao && especialidade) {
          especialidadeMap[graduacao] = especialidade;
        }
      }
    }
    console.log('Especialidade mapping created:', Object.keys(especialidadeMap).length, 'entries');
    
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
    
    // Define OMs and their column positions (TMFT, EXI, DIF)
    const oms = [
      { name: 'DAbM', startCol: 1 },
      { name: 'COMRJ', startCol: 4 },
      { name: 'COpAb', startCol: 7 },
      { name: 'BAMRJ', startCol: 10 },
      { name: 'CMM', startCol: 13 },
      { name: 'DepCMRJ', startCol: 16 },
      { name: 'CDAM', startCol: 19 },
      { name: 'DepSMRJ', startCol: 22 },
      { name: 'CSupAb', startCol: 25 },
      { name: 'DepSIMRJ', startCol: 28 },
      { name: 'DepMSMRJ', startCol: 31 },
      { name: 'DepFMRJ', startCol: 34 },
      { name: 'CDU-BAMRJ', startCol: 37 },
      { name: 'CDU-1DN', startCol: 40 },
    ];
    
    // Process each row (each row is a graduacao/pessoal)
    // Skip the summary row "FORÇA DE TRABALHO"
    // Start from index 0 to include SO row
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const graduacao = cells[0]?.v || '';
      
      if (!graduacao || graduacao === 'FORÇA DE TRABALHO') continue;
      
      // Create one record for each OM
      oms.forEach(om => {
        const tmft = Number(cells[om.startCol]?.v || 0);
        const exi = Number(cells[om.startCol + 1]?.v || 0);
        const dif = Number(cells[om.startCol + 2]?.v || 0);
        
        // Get especialidade from mapping, fallback to graduacao if not found
        const especialidade = especialidadeMap[graduacao] || graduacao;
        
        transformedData.push({
          id: `${graduacao}-${om.name}`,
          nome: `${graduacao} - ${om.name}`,
          especialidade: especialidade,
          graduacao: graduacao,
          om: om.name,
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
      });
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

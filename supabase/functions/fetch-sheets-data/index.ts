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
    
    // Fetch Page 2 (main data) - using gid for second sheet
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=289886831&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 2...');
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
    
    // Build especialidade mapping from Page 3 AND extract direct especialidades data
    const especialidadeMap: { [key: string]: string } = {};
    const especialidadesData: any[] = [];
    
    if (sheet3Data.table.rows && sheet3Data.table.rows.length > 1) {
      console.log('Processing especialidades from Page 3...');
      
      // Skip header row (index 0), process data rows
      for (let i = 1; i < sheet3Data.table.rows.length; i++) {
        const cells = sheet3Data.table.rows[i].c || [];
        
        const especialidade = cells[0]?.v || '';
        const graduacao = cells[1]?.v || '';
        const om = cells[8]?.v || '';
        
        if (!especialidade || !graduacao) continue;
        
        // Build mapping for Page 1 data
        if (!especialidadeMap[graduacao]) {
          especialidadeMap[graduacao] = especialidade;
        }
        
        // Extract Page 3 direct data
        const tmft_sum = Number(cells[2]?.v || 0);
        const tmft_ca = Number(cells[3]?.v || 0);
        const tmft_rm2 = Number(cells[4]?.v || 0);
        const efe_sum = Number(cells[5]?.v || 0);
        const efe_ca = Number(cells[6]?.v || 0);
        const efe_rm2 = Number(cells[7]?.v || 0);
        
        especialidadesData.push({
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
    }
    console.log('Especialidade mapping created:', Object.keys(especialidadeMap).length, 'entries');
    console.log('Especialidades data extracted:', especialidadesData.length, 'records');
    
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
    // Page 2 data structure
    const oms = [
      { name: 'COpAb', startCol: 1 },
      { name: 'BAMRJ', startCol: 4 },
      { name: 'CMM', startCol: 7 },
      { name: 'DepCMRJ', startCol: 10 },
      { name: 'CDAM', startCol: 13 },
      { name: 'DepSMRJ', startCol: 16 },
      { name: 'CSupAb', startCol: 19 },
      { name: 'DepSIMRJ', startCol: 22 },
      { name: 'DepMSMRJ', startCol: 25 },
      { name: 'DepFMRJ', startCol: 28 },
      { name: 'CDU-BAMRJ', startCol: 31 },
      { name: 'CDU-1DN', startCol: 34 },
    ];
    
    console.log(`Processing ${oms.length} OMs:`, oms.map(om => om.name).join(', '));
    
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
      JSON.stringify({ 
        data: transformedData,
        especialidades: especialidadesData 
      }),
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

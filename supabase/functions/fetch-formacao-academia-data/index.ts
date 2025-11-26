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
    console.log('Fetching data from Google Sheets Page 4 (Formação Academia)...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const timestamp = new Date().getTime();
    
    // Fetch Page 4 (Formação Academia) - gid=110561484
    const sheet4Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=110561484&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 4 (Formação Academia)...');
    const response = await fetch(sheet4Url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Sheets API Page 4 returned ${response.status}`);
    }
    
    const text = await response.text();
    const jsonString = text.substring(47).slice(0, -2);
    const sheetsData = JSON.parse(jsonString);
    
    console.log('Processing Formação Academia data from Page 4...');
    
    const formacaoData: any[] = [];
    
    if (sheetsData.table.rows && sheetsData.table.rows.length > 1) {
      // Define OMs and their column positions (TMFT, EFE/EXI, DIF)
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
      
      let currentFormacao = '';
      
      // Skip header row (index 0), process data rows
      for (let i = 1; i < sheetsData.table.rows.length; i++) {
        const cells = sheetsData.table.rows[i].c || [];
        const firstCol = cells[0]?.v || '';
        
        console.log(`Row ${i}: firstCol = "${firstCol}"`);
        
        if (!firstCol || firstCol === 'FORÇA DE TRABALHO') continue;
        
        // Check if this is a formation category row (has data only in first column or is a known formation)
        const formacoes = ['ADMINISTRAÇÃO', 'CONTABILIDADE', 'ENGENHARIA', 'ESTATISTICA'];
        if (formacoes.includes(firstCol.trim().toUpperCase())) {
          currentFormacao = firstCol.trim().toUpperCase();
          console.log(`Found formation: ${currentFormacao}`);
          continue;
        }
        
        // This is a pessoal (rank) row
        const pessoal = firstCol;
        
        // Create one record for each OM with the current formation
        oms.forEach(om => {
          const tmft = Number(cells[om.startCol]?.v || 0);
          const efe = Number(cells[om.startCol + 1]?.v || 0);
          
          formacaoData.push({
            formacao: currentFormacao,
            pessoal: pessoal,
            om: om.name,
            tmft: tmft,
            efe: efe,
          });
        });
      }
    }
    
    console.log(`Transformed ${formacaoData.length} records from Page 4`);
    
    return new Response(
      JSON.stringify({ data: formacaoData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching formacao academia data:', error);
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

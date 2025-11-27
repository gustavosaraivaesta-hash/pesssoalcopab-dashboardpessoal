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
      // Define OMs and their column positions (TMFT, EFE)
      const oms = [
        { name: 'COpAb', startCol: 2 },
        { name: 'BAMRJ', startCol: 4 },
        { name: 'CMM', startCol: 6 },
        { name: 'DepCMRJ', startCol: 8 },
        { name: 'CDAM', startCol: 10 },
        { name: 'DepSMRJ', startCol: 12 },
        { name: 'CSupAb', startCol: 14 },
        { name: 'DepSIMRJ', startCol: 16 },
        { name: 'DepMSMRJ', startCol: 18 },
        { name: 'DepFMRJ', startCol: 20 },
        { name: 'CDU-BAMRJ', startCol: 22 },
        { name: 'CDU-1DN', startCol: 24 },
      ];
      
      let currentFormacao = '';
      
      // Skip header rows, process data rows
      for (let i = 0; i < sheetsData.table.rows.length; i++) {
        const cells = sheetsData.table.rows[i].c || [];
        const colA = cells[0]?.v ? String(cells[0].v).trim() : '';
        const colB = cells[1]?.v ? String(cells[1].v).trim() : '';
        
        console.log(`Row ${i}: colA = "${colA}", colB = "${colB}"`);
        
        // Check if this is a formation header row (colA has formation name)
        const formacoes = ['ADMINISTRAÇÃO', 'CONTABILIDADE', 'ENGENHARIA', 'ESTATISTICA'];
        const normalizedColA = colA.toUpperCase().replace(/\s+/g, ' ');
        
        if (formacoes.some(f => normalizedColA.includes(f))) {
          currentFormacao = formacoes.find(f => normalizedColA.includes(f)) || '';
          console.log(`Found formation: ${currentFormacao}`);
          
          // Process CONTRA-ALMIRANTE on the same row as formation
          if (colB && currentFormacao) {
            const pessoal = colB;
            
            oms.forEach(om => {
              const tmft = cells[om.startCol]?.v ? Number(cells[om.startCol].v) : 0;
              const efe = cells[om.startCol + 1]?.v ? Number(cells[om.startCol + 1].v) : 0;
              
              formacaoData.push({
                formacao: currentFormacao,
                pessoal: pessoal,
                om: om.name,
                tmft: tmft,
                efe: efe,
              });
            });
          }
          continue;
        }
        
        // Check if this is a data row (colB has pessoal rank)
        if (colB && currentFormacao) {
          const pessoal = colB;
          
          // Create one record for each OM with the current formation
          oms.forEach(om => {
            const tmft = cells[om.startCol]?.v ? Number(cells[om.startCol].v) : 0;
            const efe = cells[om.startCol + 1]?.v ? Number(cells[om.startCol + 1].v) : 0;
            
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

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
    const gid = '1926090655'; // GID for PESSOAL POR OM sheet
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
    
    // First row contains headers
    const headerRow = rows[0].c || [];
    
    // Log all headers to debug
    console.log('All headers found:', headerRow.map((cell: any, idx: number) => `${idx}: ${cell?.v || 'empty'}`).join(', '));
    
    // Find column indices by header name (flexible matching)
    const findColumnIndex = (searchTerms: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const cellValue = String(headerRow[i]?.v || '').toUpperCase().trim();
        for (const term of searchTerms) {
          if (cellValue.includes(term.toUpperCase())) {
            console.log(`Found column "${term}" at index ${i}: "${cellValue}"`);
            return i;
          }
        }
      }
      return -1;
    };
    
    const tipoSetorCol = findColumnIndex(['TIPO SETOR', 'TIPO']);
    const setorCol = findColumnIndex(['SETOR']);
    const cargoCol = findColumnIndex(['CARGO', 'INCUMBÊNCIA']);
    const postoCol = findColumnIndex(['POSTO']);
    const corpoCol = findColumnIndex(['CORPO']);
    const tmftCol = findColumnIndex(['TMFT']);
    const exiCol = findColumnIndex(['EXI', 'EFE']);
    const difCol = findColumnIndex(['DIF', 'SIT']);
    
    console.log('Column indices:', {
      tipoSetor: tipoSetorCol,
      setor: setorCol,
      cargo: cargoCol,
      posto: postoCol,
      corpo: corpoCol,
      tmft: tmftCol,
      exi: exiCol,
      dif: difCol
    });
    
    // Extract unique setores for filtering
    const setores = new Set<string>();

    // Process data rows
    const processedData: any[] = [];
    
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].c || [];
      
      const tipoSetor = tipoSetorCol >= 0 ? String(cells[tipoSetorCol]?.v || '') : '';
      const setor = setorCol >= 0 ? String(cells[setorCol]?.v || '') : '';
      const cargo = cargoCol >= 0 ? String(cells[cargoCol]?.v || '') : '';
      const posto = postoCol >= 0 ? String(cells[postoCol]?.v || '') : '';
      const corpo = corpoCol >= 0 ? String(cells[corpoCol]?.v || '') : '';
      const tmft = tmftCol >= 0 ? Number(cells[tmftCol]?.v || 0) : 0;
      const exi = exiCol >= 0 ? Number(cells[exiCol]?.v || 0) : 0;
      const dif = difCol >= 0 ? Number(cells[difCol]?.v || 0) : 0;
      
      // Skip rows without essential data
      if (!setor && !cargo) continue;
      
      if (setor) setores.add(setor);
      
      processedData.push({
        id: `${setor}-${cargo}-${rowIndex}`,
        tipoSetor: tipoSetor,
        setor: setor,
        cargo: cargo,
        posto: posto,
        corpo: corpo,
        tmft: tmft,
        exi: exi,
        dif: dif,
      });
    }

    console.log(`Processed ${processedData.length} records`);

    return new Response(
      JSON.stringify({ 
        data: processedData,
        setores: Array.from(setores).sort()
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
        setores: []
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

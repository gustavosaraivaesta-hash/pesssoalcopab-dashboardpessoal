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
    
    // Fetch Page 1 (OFICIAIS data) - using correct gid
    const sheet1Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=1306621538&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 1 (OFICIAIS)...');
    const response1 = await fetch(sheet1Url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response1.ok) {
      throw new Error(`Google Sheets API Page 1 returned ${response1.status}`);
    }
    
    const text1 = await response1.text();
    const jsonString1 = text1.substring(47).slice(0, -2);
    const sheetsDataOficiais = JSON.parse(jsonString1);
    
    // Fetch Page 2 (PRAÇAS data)
    const sheet2Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=289886831&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 2 (PRAÇAS)...');
    const response2 = await fetch(sheet2Url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response2.ok) {
      throw new Error(`Google Sheets API Page 2 returned ${response2.status}`);
    }
    
    const text2 = await response2.text();
    const jsonString2 = text2.substring(47).slice(0, -2);
    const sheetsDataPracas = JSON.parse(jsonString2);
    
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
    
    // Fetch Page 4 (CSUPAB OMs data) - gid=1141691969
    const sheet4Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=1141691969&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 4 (CSUPAB OMs)...');
    const response4 = await fetch(sheet4Url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    let csupabOmsData: any = null;
    if (response4.ok) {
      const text4 = await response4.text();
      const jsonString4 = text4.substring(47).slice(0, -2);
      csupabOmsData = JSON.parse(jsonString4);
      console.log('CSUPAB OMs data loaded successfully');
    } else {
      console.log('Could not load CSUPAB OMs data, continuing without it');
    }
    
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
        
        // Remove sufixos numéricos como " (1)", " (2)", etc.
        const cleanEspecialidade = String(especialidade).replace(/\s*\(\d+\)\s*$/, '').trim();
        
        // Build mapping for Page 1 data
        if (!especialidadeMap[graduacao]) {
          especialidadeMap[graduacao] = cleanEspecialidade;
        }
        
        // Extract Page 3 direct data
        const tmft_sum = Number(cells[2]?.v || 0);
        const tmft_ca = Number(cells[3]?.v || 0);
        const tmft_rm2 = Number(cells[4]?.v || 0);
        const efe_sum = Number(cells[5]?.v || 0);
        const efe_ca = Number(cells[6]?.v || 0);
        const efe_rm2 = Number(cells[7]?.v || 0);
        
        especialidadesData.push({
          especialidade: cleanEspecialidade,
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
    
    const transformedData: any[] = [];
    
    // Define OMs and their column positions (TMFT, EXI, DIF)
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
    
    // Function to process sheet data
    const processSheetData = (sheetsData: any, categoria: "PRAÇAS" | "OFICIAIS") => {
      const rows = sheetsData.table.rows;
      
      if (rows.length < 2) {
        console.log(`Not enough data in ${categoria} sheet`);
        return;
      }
      
      console.log(`Processing ${categoria} data with ${rows.length} rows`);
      
      // Process each row (each row is a graduacao/pessoal)
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].c || [];
        const graduacao = cells[0]?.v || '';
        
        console.log(`${categoria} - Row ${i}: graduacao = "${graduacao}"`);
        
        if (!graduacao || graduacao === 'FORÇA DE TRABALHO') continue;
        
        // Create one record for each OM
        oms.forEach(om => {
          const tmft = Number(cells[om.startCol]?.v || 0);
          const exi = Number(cells[om.startCol + 1]?.v || 0);
          const dif = Number(cells[om.startCol + 2]?.v || 0);
          
          // Get especialidade from mapping, fallback to graduacao if not found
          const especialidade = especialidadeMap[graduacao] || graduacao;
          
          transformedData.push({
            id: `${categoria}-${graduacao}-${om.name}`,
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
            categoria: categoria,
          });
        });
      }
    };
    
    // Process OFICIAIS data (Page 1)
    processSheetData(sheetsDataOficiais, "OFICIAIS");
    
    // Process PRAÇAS data (Page 2)
    processSheetData(sheetsDataPracas, "PRAÇAS");
    
    // Override PRAÇAS values for CSUPAB OMs using Page 4 (gid=1141691969)
    // OMs: CSUPAB, DEPCMRJ, DEPFMRJ, DEPMSMRJ, DEPSIMRJ, DEPSMRJ
    const csupabOms = ["CSupAb", "DepCMRJ", "DepFMRJ", "DepMSMRJ", "DepSIMRJ", "DepSMRJ"];
    const csupabOmsSet = new Set(csupabOms);

    if (csupabOmsData && csupabOmsData.table && csupabOmsData.table.rows) {
      console.log("Overriding PRAÇAS data for CSUPAB OMs from GID 1141691969...");

      const before = transformedData.length;
      const kept = transformedData.filter(
        (r) => !(r.categoria === "PRAÇAS" && csupabOmsSet.has(r.om)),
      );
      transformedData.length = 0;
      transformedData.push(...kept);

      const rows = csupabOmsData.table.rows;
      console.log(`CSUPAB GID rows: ${rows.length}`);

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].c || [];
        const graduacao = cells[0]?.v || "";

        if (!graduacao || graduacao === "FORÇA DE TRABALHO") continue;

        // Same mapping logic as main sheets
        const especialidade = especialidadeMap[graduacao] || graduacao;

        oms.forEach((om) => {
          if (!csupabOmsSet.has(om.name)) return;

          const tmft = Number(cells[om.startCol]?.v || 0);
          const exi = Number(cells[om.startCol + 1]?.v || 0);
          const dif = Number(cells[om.startCol + 2]?.v || 0);

          transformedData.push({
            id: `PRAÇAS-${graduacao}-${om.name}`,
            nome: `${graduacao} - ${om.name}`,
            especialidade,
            graduacao,
            om: om.name,
            sdp: "",
            tmft,
            exi,
            dif,
            previsaoEmbarque: "",
            pracasTTC: 0,
            servidoresCivis: 0,
            percentualPracasAtiva: 0,
            percentualForcaTrabalho: 0,
            categoria: "PRAÇAS",
          });
        });
      }

      console.log(`CSUPAB override done. Before=${before}, After=${transformedData.length}`);
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

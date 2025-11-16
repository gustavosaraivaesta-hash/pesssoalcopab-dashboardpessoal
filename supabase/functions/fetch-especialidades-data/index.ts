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
    console.log('Fetching ONLY Page 3 data from Google Sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const timestamp = new Date().getTime();
    
    // Fetch ONLY Page 3 (Especialidades detalhadas) - gid=1875983157
    const sheet3Url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=1875983157&tqx=out:json&timestamp=${timestamp}`;
    
    console.log('Calling Google Sheets API for Page 3...');
    const response = await fetch(sheet3Url, {
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
    
    console.log('Processing Page 3 data...');
    
    const rows = sheetsData.table.rows;
    console.log('Total rows:', rows.length);
    
    // Log da primeira linha para debug do cabeçalho
    if (rows.length > 0) {
      const firstRow = rows[0].c || [];
      console.log('🔍 DEBUG - Primeira linha (cabeçalho):');
      for (let i = 0; i < Math.min(30, firstRow.length); i++) {
        const cell = firstRow[i];
        if (cell && cell.v) {
          console.log(`  Col ${i}: "${cell.v}"`);
        }
      }
    }
    
    if (rows.length < 1) {
      console.log('No data in Page 3');
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Mapeamento fixo das colunas para OMs (baseado na estrutura EXATA da planilha)
    // Col 0: Especialidade, Col 1: Graduação
    // A partir da Col 2: pares (TMFT, EFE) para cada OM
    const omMap: { [key: number]: string } = {
      2: 'COpAb',      // Cols 2-3
      4: 'BAMRJ',      // Cols 4-5
      6: 'CMM',        // Cols 6-7
      8: 'DepCMRJ',    // Cols 8-9
      10: 'CDAM',      // Cols 10-11
      12: 'DepSMRJ',   // Cols 12-13
      14: 'CSupAb',    // Cols 14-15
      16: 'DepSIMRJ',  // Cols 16-17
      18: 'DepMSMRJ',  // Cols 18-19
      20: 'DepFMRJ',   // Cols 20-21
      22: 'CDU-BAMRJ', // Cols 22-23
      24: 'CDU-1ºDN',  // Cols 24-25
    };
    
    console.log('Mapeamento fixo de OMs:', omMap);
    
    const transformedData: any[] = [];
    const graduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
    let currentEspecialidade = '';
    let totalEfeCount = 0;
    let totalTmftCount = 0;
    
    // Process all data rows (start from row 0)
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].c || [];
      const col0 = String(cells[0]?.v || '').trim();
      const col1 = String(cells[1]?.v || '').trim();
      
      // If col0 has text and is not a graduação, it's a new especialidade
      if (col0 && col0.length > 2 && !graduacoes.includes(col0)) {
        currentEspecialidade = col0;
        console.log(`📋 Nova especialidade: ${currentEspecialidade}`);
      }
      
      // If col1 is a valid graduação, process the row
      if (col1 && graduacoes.includes(col1)) {
        // For each OM, create a record
        for (const [colIndex, omName] of Object.entries(omMap)) {
          const col = Number(colIndex);
          
          // Garantir conversão correta para número
          let tmft = 0;
          let efe = 0;
          
          // Ler TMFT (coluna par)
          const tmftCell = cells[col];
          if (tmftCell && tmftCell.v !== null && tmftCell.v !== undefined) {
            const tmftValue = String(tmftCell.v).trim();
            tmft = tmftValue ? parseFloat(tmftValue) || 0 : 0;
          }
          
          // Ler EFE (coluna ímpar - col+1)
          const efeCell = cells[col + 1];
          if (efeCell && efeCell.v !== null && efeCell.v !== undefined) {
            const efeValue = String(efeCell.v).trim();
            efe = efeValue ? parseFloat(efeValue) || 0 : 0;
          }
          
          // Contar totais para logging
          if (tmft > 0) totalTmftCount++;
          if (efe > 0) {
            totalEfeCount++;
            console.log(`✅ EFE > 0: ${currentEspecialidade} | ${col1} | ${omName} | TMFT=${tmft} | EFE=${efe}`);
          }
          
          // Adicionar apenas registros com valores (não incluir zeros)
          if (tmft > 0 || efe > 0) {
            transformedData.push({
              especialidade: currentEspecialidade,
              graduacao: col1,
              om: omName,
              tmft_sum: tmft,
              efe_sum: efe,
            });
          }
        }
      }
    }
    
    console.log(`📊 Estatísticas de leitura:`);
    console.log(`   - Total de registros: ${transformedData.length}`);
    console.log(`   - Registros com TMFT > 0: ${totalTmftCount}`);
    console.log(`   - Registros com EFE > 0: ${totalEfeCount}`);
    
    
    console.log(`📊 Estatísticas de leitura:`);
    console.log(`   - Total de registros: ${transformedData.length}`);
    console.log(`   - Registros com TMFT > 0: ${totalTmftCount}`);
    console.log(`   - Registros com EFE > 0: ${totalEfeCount}`);
    
    // Count records per OM
    const omCounts: { [key: string]: number } = {};
    const omWithData: { [key: string]: { tmft: number, efe: number } } = {};
    
    transformedData.forEach(record => {
      omCounts[record.om] = (omCounts[record.om] || 0) + 1;
      
      if (!omWithData[record.om]) {
        omWithData[record.om] = { tmft: 0, efe: 0 };
      }
      if (record.tmft_sum > 0) omWithData[record.om].tmft++;
      if (record.efe_sum > 0) omWithData[record.om].efe++;
    });
    
    console.log('📈 Registros por OM:', omCounts);
    console.log('💾 Dados com valores por OM:', omWithData);
    console.log('🏢 OMs únicas:', Object.keys(omCounts).sort());
    
    // Mostrar amostra de dados
    const recordsWithEfe = transformedData.filter(r => r.efe_sum > 0);
    console.log('✅ Registros com EFE > 0 (primeiros 10):', recordsWithEfe.slice(0, 10));
    console.log('📝 Primeiros 5 registros gerais:', transformedData.slice(0, 5));
    console.log('📝 Últimos 5 registros gerais:', transformedData.slice(-5));
    
    return new Response(
      JSON.stringify({ data: transformedData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching Page 3 data:', error);
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

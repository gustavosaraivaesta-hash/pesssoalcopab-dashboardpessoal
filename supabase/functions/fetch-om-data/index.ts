import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PersonnelRecord {
  id: string;
  neo: number;
  tipoSetor: string;
  setor: string;
  cargo: string;
  postoTmft: string;
  corpoTmft: string;
  quadroTmft: string;
  opcaoTmft: string;
  postoEfe: string;
  corpoEfe: string;
  quadroEfe: string;
  opcaoEfe: string;
  nome: string;
  ocupado: boolean;
  om: string;
}

interface DesembarqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  destino: string;
  mesAno: string;
  documento: string;
  om: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching OM detailed data from Google Sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    const gid = '1926090655';
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

    console.log('Total rows:', rows.length);
    
    const personnelData: PersonnelRecord[] = [];
    const desembarqueData: DesembarqueRecord[] = [];
    const setores = new Set<string>();
    const quadros = new Set<string>();
    
    let currentSection = 'TABELA_MESTRA';
    const currentOM = 'CDU-BAMRJ'; // Default OM name
    
    // Data structure from logs:
    // Row 0: [0]=NEO, [1]=SETOR, [2]=CARGO, [3]=CARGO, [4]=POSTO_TMFT, [5]=CORPO_TMFT, [6]=QUADRO_TMFT, [7]=OPCAO_TMFT, [8]=POSTO_EFE, [9]=CORPO_EFE, [10]=QUADRO_EFE, [11]=OPCAO_EFE, [12]=NOME
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].c || [];
      const firstCell = String(cells[0]?.v || '').trim();
      
      // Detect section headers
      if (firstCell === 'DESTAQUES' || firstCell === 'LICENÇAS' || firstCell === 'OFICIAIS ADIDOS') {
        currentSection = 'SKIP';
        continue;
      }
      if (firstCell === 'PREVISÃO DE DESEMBARQUE' || firstCell.includes('DESEMBARQUE')) {
        currentSection = 'DESEMBARQUE';
        continue;
      }
      if (firstCell === 'POSTO' && currentSection !== 'DESEMBARQUE') {
        // This is a header row, skip it
        continue;
      }
      if (firstCell === 'RESUMO DA SITUAÇÃO') {
        currentSection = 'RESUMO';
        continue;
      }
      
      // Skip non-data rows
      if (!firstCell || isNaN(Number(firstCell))) {
        // Check if it's a desembarque data row (starts with posto like CT, CF, etc.)
        if (currentSection === 'DESEMBARQUE' && ['CT', 'CF', 'CC', 'CMG', '1TEN', '2TEN', 'SO', '1SG', '2SG', '3SG', 'CB', 'MN'].includes(firstCell)) {
          const posto = firstCell;
          const corpo = String(cells[1]?.v || '').trim();
          const quadro = String(cells[2]?.v || '').trim();
          const cargo = String(cells[3]?.v || '').trim();
          const nome = String(cells[4]?.v || '').trim();
          const destino = String(cells[9]?.v || '').trim();
          const mesAno = String(cells[10]?.v || '').trim();
          const documento = String(cells[11]?.v || '').trim();
          
          if (nome) {
            desembarqueData.push({
              posto, corpo, quadro, cargo, nome, destino, mesAno, documento, om: currentOM
            });
            console.log(`Desembarque: ${nome} - ${destino} - ${mesAno}`);
          }
        }
        continue;
      }
      
      // Parse TABELA MESTRA rows (personnel data)
      if (currentSection === 'TABELA_MESTRA' || currentSection === 'SKIP') {
        const neo = Number(cells[0]?.v) || 0;
        
        if (neo > 0) {
          currentSection = 'TABELA_MESTRA'; // Reset to tabela mestra if we find data
          
          const setor = String(cells[1]?.v || '').trim();
          const cargoSetor = String(cells[2]?.v || '').trim();
          const cargo = String(cells[3]?.v || '').trim();
          const postoTmft = String(cells[4]?.v || '').trim();
          const corpoTmft = String(cells[5]?.v || '').trim();
          const quadroTmft = String(cells[6]?.v || '').trim();
          const opcaoTmft = String(cells[7]?.v || '').trim();
          const postoEfe = String(cells[8]?.v || '').trim();
          const corpoEfe = String(cells[9]?.v || '').trim();
          const quadroEfe = String(cells[10]?.v || '').trim();
          const opcaoEfe = String(cells[11]?.v || '').trim();
          const nome = String(cells[12]?.v || '').trim();
          
          if (setor) setores.add(setor);
          if (quadroTmft) quadros.add(quadroTmft);
          
          const record: PersonnelRecord = {
            id: `${currentOM}-${neo}`,
            neo,
            tipoSetor: setor,
            setor: setor,
            cargo: cargo || cargoSetor,
            postoTmft,
            corpoTmft,
            quadroTmft,
            opcaoTmft,
            postoEfe,
            corpoEfe,
            quadroEfe,
            opcaoEfe,
            nome,
            ocupado: nome.length > 0,
            om: currentOM,
          };
          
          personnelData.push(record);
          console.log(`Personnel NEO=${neo}: ${nome || 'VAGO'} - ${setor} - ${cargo} - ${postoTmft}`);
        }
      }
    }

    console.log(`Processed ${personnelData.length} personnel records`);
    console.log(`Processed ${desembarqueData.length} desembarque records`);
    console.log(`Setores: ${Array.from(setores).join(', ')}`);

    return new Response(
      JSON.stringify({ 
        data: personnelData,
        desembarque: desembarqueData,
        setores: Array.from(setores).sort(),
        quadros: Array.from(quadros).sort(),
        lastUpdate: new Date().toLocaleTimeString('pt-BR'),
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
        desembarque: [],
        setores: [],
        quadros: [],
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

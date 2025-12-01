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

interface EmbarqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  origem: string;
  mesAno: string;
  documento: string;
  om: string;
}

interface ResumoSituacao {
  tmft: number;
  efe: number;
  destaque: number;
  licenca: number;
  adidosCurso: number;
  sitReal: number;
  percentualAtendimento: number;
  percentualAtendimentoAusencias: number;
  om: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching OM detailed data from Google Sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    
    // CDU-BAMRJ sheet (the one with detailed personnel data)
    // We'll need to find the correct GID for the detailed sheet
    // For now, let's try to parse the data structure you provided
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

    console.log('Processing OM detailed data, total rows:', rows.length);
    
    // Parse the detailed personnel structure
    const personnelData: PersonnelRecord[] = [];
    const desembarqueData: DesembarqueRecord[] = [];
    const embarqueData: EmbarqueRecord[] = [];
    const resumoData: ResumoSituacao[] = [];
    const setores = new Set<string>();
    const quadros = new Set<string>();
    
    let currentOM = '';
    let currentSection = '';
    
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].c || [];
      const firstCell = String(cells[0]?.v || '').trim();
      
      // Detect OM name (like "CDU-BAMRJ")
      if (firstCell && !firstCell.includes('TABELA') && !firstCell.includes('NEO') && 
          !firstCell.includes('SITUAÇÃO') && !firstCell.includes('POSTO') &&
          !firstCell.includes('PREVISÃO') && !firstCell.includes('RESUMO') &&
          !firstCell.includes('DESTAQUES') && !firstCell.includes('LICENÇAS') &&
          !firstCell.includes('OFICIAIS ADIDOS') && !firstCell.includes('TMFT') &&
          cells.length <= 3 && rowIndex < 5) {
        currentOM = firstCell;
        console.log('Found OM:', currentOM);
        continue;
      }
      
      // Detect section headers
      if (firstCell.includes('TABELA MESTRA')) {
        currentSection = 'TABELA_MESTRA';
        continue;
      } else if (firstCell.includes('PREVISÃO DE DESEMBARQUE')) {
        currentSection = 'DESEMBARQUE';
        continue;
      } else if (firstCell.includes('PREVISÃO DE EMBARQUE')) {
        currentSection = 'EMBARQUE';
        continue;
      } else if (firstCell.includes('RESUMO DA SITUAÇÃO')) {
        currentSection = 'RESUMO';
        continue;
      } else if (firstCell === 'NEO' || firstCell === 'POSTO') {
        // Skip header rows
        continue;
      }
      
      // Parse TABELA MESTRA rows (personnel data)
      if (currentSection === 'TABELA_MESTRA') {
        const neo = Number(cells[0]?.v) || 0;
        const tipoSetor = String(cells[1]?.v || '').trim();
        const setor = String(cells[2]?.v || '').trim();
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
        
        if (neo > 0 && setor) {
          setores.add(setor);
          if (quadroTmft) quadros.add(quadroTmft);
          
          personnelData.push({
            id: `${currentOM}-${neo}`,
            neo,
            tipoSetor,
            setor,
            cargo,
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
            om: currentOM || 'CDU-BAMRJ',
          });
          
          console.log(`Personnel: NEO=${neo}, SETOR=${setor}, CARGO=${cargo}, NOME=${nome}, OCUPADO=${nome.length > 0}`);
        }
      }
      
      // Parse PREVISÃO DE DESEMBARQUE
      if (currentSection === 'DESEMBARQUE') {
        const posto = String(cells[0]?.v || '').trim();
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const destino = String(cells[9]?.v || '').trim();
        const mesAno = String(cells[10]?.v || '').trim();
        const documento = String(cells[11]?.v || '').trim();
        
        if (posto && nome) {
          desembarqueData.push({
            posto, corpo, quadro, cargo, nome, destino, mesAno, documento,
            om: currentOM || 'CDU-BAMRJ',
          });
        }
      }
      
      // Parse PREVISÃO DE EMBARQUE
      if (currentSection === 'EMBARQUE') {
        const posto = String(cells[0]?.v || '').trim();
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const origem = String(cells[9]?.v || '').trim();
        const mesAno = String(cells[10]?.v || '').trim();
        const documento = String(cells[11]?.v || '').trim();
        
        if (posto && nome) {
          embarqueData.push({
            posto, corpo, quadro, cargo, nome, origem, mesAno, documento,
            om: currentOM || 'CDU-BAMRJ',
          });
        }
      }
      
      // Parse RESUMO DA SITUAÇÃO
      if (currentSection === 'RESUMO') {
        const tmft = Number(cells[0]?.v) || 0;
        const efe = Number(cells[1]?.v) || 0;
        
        if (tmft > 0 || efe > 0) {
          resumoData.push({
            tmft,
            efe,
            destaque: Number(cells[2]?.v) || 0,
            licenca: Number(cells[3]?.v) || 0,
            adidosCurso: Number(cells[4]?.v) || 0,
            sitReal: Number(cells[7]?.v) || 0,
            percentualAtendimento: 100,
            percentualAtendimentoAusencias: 100,
            om: currentOM || 'CDU-BAMRJ',
          });
          currentSection = ''; // Reset after parsing resumo
        }
      }
    }

    console.log(`Processed ${personnelData.length} personnel records`);
    console.log(`Processed ${desembarqueData.length} desembarque records`);
    console.log(`Processed ${embarqueData.length} embarque records`);

    return new Response(
      JSON.stringify({ 
        data: personnelData,
        desembarque: desembarqueData,
        embarque: embarqueData,
        resumo: resumoData,
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
        embarque: [],
        resumo: [],
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

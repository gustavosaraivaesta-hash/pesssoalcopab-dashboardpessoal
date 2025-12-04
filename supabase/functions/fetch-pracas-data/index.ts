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

interface TrrmRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  epocaPrevista: string;
  om: string;
}

interface LicencaRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  emOutraOm: string;
  deOutraOm: string;
  periodo: string;
  om: string;
}

interface DestaqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  emOutraOm: string;
  deOutraOm: string;
  periodo: string;
  om: string;
}

interface ConcursoRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  anoPrevisto: string;
  om: string;
}

// Sheet configurations - each GID represents an OM for PRAÇAS
const SHEET_CONFIGS = [
  { gid: '0', omName: 'OM1' },
];

async function fetchSheetData(spreadsheetId: string, gid: string, omName: string): Promise<{
  personnel: PersonnelRecord[];
  desembarque: DesembarqueRecord[];
  trrm: TrrmRecord[];
  licencas: LicencaRecord[];
  destaques: DestaqueRecord[];
  concurso: ConcursoRecord[];
  setores: string[];
  quadros: string[];
  opcoes: string[];
  detectedOmName: string;
}> {
  const timestamp = new Date().getTime();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json&timestamp=${timestamp}`;
  
  console.log(`Fetching PRAÇAS ${omName} from GID ${gid}...`);
  
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  if (!response.ok) {
    console.error(`Failed to fetch ${omName}: ${response.status}`);
    return { personnel: [], desembarque: [], trrm: [], licencas: [], destaques: [], concurso: [], setores: [], quadros: [], opcoes: [], detectedOmName: omName };
  }

  const text = await response.text();
  const jsonString = text.substring(47).slice(0, -2);
  const sheetsData = JSON.parse(jsonString);
  const rows = sheetsData.table.rows;

  if (!rows || rows.length === 0) {
    console.log(`No data found for ${omName}`);
    return { personnel: [], desembarque: [], trrm: [], licencas: [], destaques: [], concurso: [], setores: [], quadros: [], opcoes: [], detectedOmName: omName };
  }

  console.log(`${omName}: Total rows = ${rows.length}`);
  
  // Try to detect OM name from first row
  let detectedOmName = omName;
  const firstRowCells = rows[0]?.c || [];
  const firstCellValue = String(firstRowCells[0]?.v || '').trim();
  if (firstCellValue && !firstCellValue.includes('NEO') && !firstCellValue.includes('TABELA')) {
    detectedOmName = firstCellValue;
    console.log(`Detected OM name: ${detectedOmName}`);
  }
  
  const personnelData: PersonnelRecord[] = [];
  const desembarqueData: DesembarqueRecord[] = [];
  const trrmData: TrrmRecord[] = [];
  const licencasData: LicencaRecord[] = [];
  const destaquesData: DestaqueRecord[] = [];
  const concursoData: ConcursoRecord[] = [];
  const setores = new Set<string>();
  const quadros = new Set<string>();
  const opcoes = new Set<string>();
  
  let currentSection = 'TABELA_MESTRA';
  let extraLotacaoCounter = 0;
  
  // Valid military ranks for PRAÇAS
  const validPostos = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN', 'C ALTE', 'CONTRA-ALMIRANTE', 'CT', 'CF', 'CC', 'CMG', '1TEN', '2TEN', '1T', '2T', 'GM'];
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const cells = rows[rowIndex].c || [];
    const firstCell = String(cells[0]?.v || '').trim();
    
    // Detect section headers
    if (firstCell === 'DESTAQUES/LICENÇAS' || firstCell === 'DESTAQUES') {
      currentSection = 'DESTAQUES';
      continue;
    }
    if (firstCell === 'LICENÇAS') {
      currentSection = 'LICENCAS';
      continue;
    }
    if (firstCell === 'OFICIAIS ADIDOS' || firstCell.includes('OFICIAIS ADIDOS') || firstCell.includes('PRAÇAS ADIDOS')) {
      currentSection = 'SKIP';
      continue;
    }
    if (firstCell === 'PREVISÃO DE DESEMBARQUE' || firstCell.includes('DESEMBARQUE')) {
      currentSection = 'DESEMBARQUE';
      continue;
    }
    if (firstCell === 'PREVISÃO DE EMBARQUE' || firstCell.includes('EMBARQUE')) {
      currentSection = 'EMBARQUE';
      continue;
    }
    if (firstCell === 'PREVISÃO DE TRRM' || firstCell.includes('TRRM')) {
      currentSection = 'TRRM';
      continue;
    }
    if (firstCell === 'CONCURSO C-EMOS' || firstCell.includes('C-EMOS')) {
      currentSection = 'CONCURSO';
      continue;
    }
    if (firstCell === 'POSTO' && currentSection !== 'DESEMBARQUE' && currentSection !== 'EMBARQUE' && currentSection !== 'TRRM' && currentSection !== 'CONCURSO') {
      continue;
    }
    if (firstCell === 'RESUMO DA SITUAÇÃO') {
      currentSection = 'RESUMO';
      continue;
    }
    
    // Check if NEO contains a dot (like 01.01, 02.01.2001) or is a valid number
    const neoString = String(cells[0]?.v || '').trim();
    const isValidNeo = neoString && (
      !isNaN(Number(neoString)) || 
      /^\d+(\.\d+)*$/.test(neoString)
    );
    
    // Handle rows with empty/invalid NEO
    if (!firstCell || !isValidNeo) {
      // Check if it's a desembarque/embarque data row
      if ((currentSection === 'DESEMBARQUE' || currentSection === 'EMBARQUE') && 
          validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const destino = String(cells[9]?.v || '').trim();
        const mesAno = String(cells[10]?.v || '').trim();
        const documento = String(cells[11]?.v || '').trim();
        
        if (nome && currentSection === 'DESEMBARQUE') {
          desembarqueData.push({
            posto, corpo, quadro, cargo, nome, destino, mesAno, documento, om: detectedOmName
          });
          console.log(`${detectedOmName} Desembarque: ${nome}`);
        }
      }
      
      // Check if it's a TRRM data row
      if (currentSection === 'TRRM' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const epocaPrevista = String(cells[9]?.v || '').trim();
        
        if (nome) {
          trrmData.push({
            posto, corpo, quadro, cargo, nome, epocaPrevista, om: detectedOmName
          });
          console.log(`${detectedOmName} TRRM: ${nome} - ${epocaPrevista}`);
        }
      }
      
      // Check if it's a CONCURSO data row
      if (currentSection === 'CONCURSO' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const anoPrevisto = String(cells[9]?.v || '').trim();
        
        if (nome) {
          concursoData.push({
            posto, corpo, quadro, cargo, nome, anoPrevisto, om: detectedOmName
          });
          console.log(`${detectedOmName} Concurso: ${nome} - ${anoPrevisto}`);
        }
      }
      
      // Check if it's a DESTAQUES data row
      if (currentSection === 'DESTAQUES' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const emOutraOm = String(cells[9]?.v || '').trim();
        const deOutraOm = String(cells[10]?.v || '').trim();
        const periodo = String(cells[11]?.v || '').trim();
        
        if (nome) {
          destaquesData.push({
            posto, corpo, quadro, cargo, nome, emOutraOm, deOutraOm, periodo, om: detectedOmName
          });
          console.log(`${detectedOmName} Destaque: ${nome}`);
        }
      }
      
      // Check if it's a LICENÇAS data row
      if (currentSection === 'LICENCAS' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const motivo = String(cells[9]?.v || '').trim();
        
        if (nome) {
          licencasData.push({
            posto, corpo, quadro, cargo, nome, emOutraOm: '', deOutraOm: '', periodo: motivo, om: detectedOmName
          });
          console.log(`${detectedOmName} Licença: ${nome} - Motivo: ${motivo}`);
        }
      }
      
      // Check if it's an EXTRA LOTAÇÃO row (has POSTO but no NEO)
      if (currentSection === 'TABELA_MESTRA' && validPostos.includes(firstCell)) {
        const postoEfe = firstCell;
        const corpoEfe = String(cells[1]?.v || '').trim();
        const quadroEfe = String(cells[2]?.v || '').trim();
        const opcaoEfe = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        
        if (nome && nome !== 'NOME') {
          extraLotacaoCounter++;
          const extraRecord: PersonnelRecord = {
            id: `${detectedOmName}-EXTRA-${extraLotacaoCounter}`,
            neo: 0,
            tipoSetor: 'EXTRA LOTAÇÃO',
            setor: 'EXTRA LOTAÇÃO',
            cargo: 'EXTRA LOTAÇÃO',
            postoTmft: '',
            corpoTmft: '',
            quadroTmft: '',
            opcaoTmft: '',
            postoEfe,
            corpoEfe,
            quadroEfe,
            opcaoEfe,
            nome,
            ocupado: true,
            om: detectedOmName,
          };
          personnelData.push(extraRecord);
          if (quadroEfe) quadros.add(quadroEfe);
          if (opcaoEfe) opcoes.add(opcaoEfe);
          console.log(`${detectedOmName} EXTRA LOTAÇÃO: ${nome} - ${postoEfe}`);
        }
      }
      continue;
    }
    
    // Parse TABELA MESTRA rows (personnel data)
    currentSection = 'TABELA_MESTRA';
    
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
    
    // Skip summary rows (contain percentages)
    if (tipoSetor.includes('%') || setor.includes('%') || cargo.includes('%')) {
      continue;
    }
    
    // Skip header rows
    if (tipoSetor === 'TIPO SETOR' || setor === 'SETOR') {
      continue;
    }
    
    if (tipoSetor) setores.add(tipoSetor);
    if (quadroTmft) quadros.add(quadroTmft);
    if (opcaoTmft) opcoes.add(opcaoTmft);
    
    const record: PersonnelRecord = {
      id: `${detectedOmName}-${neoString}`,
      neo: parseFloat(neoString) || 0,
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
      ocupado: nome.length > 0 && nome !== 'VAZIO',
      om: detectedOmName,
    };
    
    personnelData.push(record);
    console.log(`${detectedOmName} Personnel NEO=${neoString}: ${nome || 'VAGO'}`);
  }

  console.log(`${detectedOmName}: Processed ${personnelData.length} personnel, ${desembarqueData.length} desembarque`);
  
  return {
    personnel: personnelData,
    desembarque: desembarqueData,
    trrm: trrmData,
    licencas: licencasData,
    destaques: destaquesData,
    concurso: concursoData,
    setores: Array.from(setores),
    quadros: Array.from(quadros),
    opcoes: Array.from(opcoes),
    detectedOmName,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching PRAÇAS data from spreadsheet...');
    
    // New spreadsheet ID for PRAÇAS
    const spreadsheetId = '13YC7pfsERAJxdwzWPN12tTdNOVhlT_bbZXZigDZvalA';
    
    // First, fetch sheet info to get all tabs
    const timestamp = new Date().getTime();
    const infoUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&timestamp=${timestamp}`;
    
    // Fetch the first sheet (gid=0) to start
    const result = await fetchSheetData(spreadsheetId, '0', 'PRAÇAS');
    
    const allOMs = new Set<string>();
    result.personnel.forEach(p => allOMs.add(p.om));
    
    console.log(`Total: ${result.personnel.length} personnel from ${allOMs.size} OMs`);

    return new Response(
      JSON.stringify({ 
        data: result.personnel,
        desembarque: result.desembarque,
        trrm: result.trrm,
        licencas: result.licencas,
        destaques: result.destaques,
        concurso: result.concurso,
        setores: result.setores,
        quadros: result.quadros,
        opcoes: result.opcoes,
        oms: Array.from(allOMs).sort(),
        lastUpdate: new Date().toLocaleTimeString('pt-BR'),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching PRAÇAS data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

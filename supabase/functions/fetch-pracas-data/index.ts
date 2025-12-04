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

async function fetchSheetData(spreadsheetId: string, gid: string, apiKey: string): Promise<{
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
  // Use export URL to get CSV data (works without requiring sheet name)
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  
  console.log(`Fetching PRAÇAS from GID ${gid}...`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch GID ${gid}: ${response.status} - ${errorText}`);
    return { personnel: [], desembarque: [], trrm: [], licencas: [], destaques: [], concurso: [], setores: [], quadros: [], opcoes: [], detectedOmName: `OM-${gid}` };
  }

  const csvText = await response.text();
  
  // Parse CSV
  const rows: string[][] = [];
  const lines = csvText.split('\n');
  for (const line of lines) {
    const row: string[] = [];
    let inQuotes = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }

  if (rows.length === 0) {
    console.log(`No data found for GID ${gid}`);
    return { personnel: [], desembarque: [], trrm: [], licencas: [], destaques: [], concurso: [], setores: [], quadros: [], opcoes: [], detectedOmName: `OM-${gid}` };
  }

  console.log(`GID ${gid}: Total rows = ${rows.length}`);
  
  // Helper function to get cell value
  const getCell = (row: string[], index: number): string => String(row?.[index] || '').trim();
  
  // Detect OM name from first row
  let detectedOmName = `OM-${gid}`;
  const firstCellValue = getCell(rows[0], 0);
  if (firstCellValue && !firstCellValue.includes('NEO') && !firstCellValue.includes('TABELA') && !firstCellValue.includes('SITUAÇÃO')) {
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
  
  const validPostos = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN', 'C ALTE', 'CONTRA-ALMIRANTE', 'CT', 'CF', 'CC', 'CMG', '1TEN', '2TEN', '1T', '2T', 'GM'];
  
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex] || [];
    const firstCell = getCell(row, 0);
    
    // Detect section headers
    if (firstCell === 'DESTAQUES/LICENÇAS' || firstCell === 'DESTAQUES') {
      currentSection = 'DESTAQUES';
      continue;
    }
    if (firstCell === 'LICENÇAS') {
      currentSection = 'LICENCAS';
      continue;
    }
    if (firstCell.includes('ADIDOS')) {
      currentSection = 'SKIP';
      continue;
    }
    if (firstCell.includes('DESEMBARQUE')) {
      currentSection = 'DESEMBARQUE';
      continue;
    }
    if (firstCell.includes('EMBARQUE')) {
      currentSection = 'EMBARQUE';
      continue;
    }
    if (firstCell.includes('TRRM')) {
      currentSection = 'TRRM';
      continue;
    }
    if (firstCell.includes('C-EMOS') || firstCell.includes('CONCURSO')) {
      currentSection = 'CONCURSO';
      continue;
    }
    if (firstCell === 'POSTO' || firstCell === 'NEO') {
      continue;
    }
    if (firstCell.includes('RESUMO')) {
      currentSection = 'RESUMO';
      continue;
    }
    
    // Check if NEO is valid
    const neoString = firstCell;
    const isValidNeo = neoString && (
      !isNaN(Number(neoString)) || 
      /^\d+(\.\d+)*$/.test(neoString)
    );
    
    // Handle rows based on section
    if (!isValidNeo) {
      // Check if it's a data row in special sections
      if ((currentSection === 'DESEMBARQUE' || currentSection === 'EMBARQUE') && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = getCell(row, 1);
        const quadro = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        const destino = getCell(row, 9);
        const mesAno = getCell(row, 10);
        const documento = getCell(row, 11);
        
        if (nome && currentSection === 'DESEMBARQUE') {
          desembarqueData.push({ posto, corpo, quadro, cargo, nome, destino, mesAno, documento, om: detectedOmName });
          console.log(`${detectedOmName} Desembarque: ${nome}`);
        }
      }
      
      if (currentSection === 'TRRM' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = getCell(row, 1);
        const quadro = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        const epocaPrevista = getCell(row, 9);
        
        if (nome) {
          trrmData.push({ posto, corpo, quadro, cargo, nome, epocaPrevista, om: detectedOmName });
          console.log(`${detectedOmName} TRRM: ${nome}`);
        }
      }
      
      if (currentSection === 'CONCURSO' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = getCell(row, 1);
        const quadro = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        const anoPrevisto = getCell(row, 9);
        
        if (nome) {
          concursoData.push({ posto, corpo, quadro, cargo, nome, anoPrevisto, om: detectedOmName });
          console.log(`${detectedOmName} Concurso: ${nome}`);
        }
      }
      
      if (currentSection === 'DESTAQUES' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = getCell(row, 1);
        const quadro = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        const emOutraOm = getCell(row, 9);
        const deOutraOm = getCell(row, 10);
        const periodo = getCell(row, 11);
        
        if (nome) {
          destaquesData.push({ posto, corpo, quadro, cargo, nome, emOutraOm, deOutraOm, periodo, om: detectedOmName });
          console.log(`${detectedOmName} Destaque: ${nome}`);
        }
      }
      
      if (currentSection === 'LICENCAS' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = getCell(row, 1);
        const quadro = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        const motivo = getCell(row, 9);
        
        if (nome) {
          licencasData.push({ posto, corpo, quadro, cargo, nome, emOutraOm: '', deOutraOm: '', periodo: motivo, om: detectedOmName });
          console.log(`${detectedOmName} Licença: ${nome}`);
        }
      }
      
      // EXTRA LOTAÇÃO - NEO is EMPTY but row has personnel data
      // Check if NEO column is empty and there's a valid POSTO in the EFETIVO section (column 8)
      if (currentSection === 'TABELA_MESTRA' && !neoString) {
        const postoEfe = getCell(row, 8);  // POSTO from EFETIVO columns
        const corpoEfe = getCell(row, 9);
        const quadroEfe = getCell(row, 10);
        const opcaoEfe = getCell(row, 11);
        const nome = getCell(row, 12);
        
        // Only add if there's a valid POSTO or a name
        if ((validPostos.includes(postoEfe) || nome) && nome !== 'NOME') {
          extraLotacaoCounter++;
          personnelData.push({
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
          });
          if (quadroEfe) quadros.add(quadroEfe);
          if (opcaoEfe) opcoes.add(opcaoEfe);
          console.log(`${detectedOmName} EXTRA LOTAÇÃO: ${nome}`);
        }
      }
      continue;
    }
    
    // Parse TABELA MESTRA rows (personnel data with valid NEO)
    currentSection = 'TABELA_MESTRA';
    
    const tipoSetor = getCell(row, 1);
    const setor = getCell(row, 2);
    const cargo = getCell(row, 3);
    const postoTmft = getCell(row, 4);
    const corpoTmft = getCell(row, 5);
    const quadroTmft = getCell(row, 6);
    const opcaoTmft = getCell(row, 7);
    const postoEfe = getCell(row, 8);
    const corpoEfe = getCell(row, 9);
    const quadroEfe = getCell(row, 10);
    const opcaoEfe = getCell(row, 11);
    const nome = getCell(row, 12);
    
    // Skip summary rows
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
    
    personnelData.push({
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
    });
    
    console.log(`${detectedOmName} NEO=${neoString}: ${nome || 'VAGO'}`);
  }

  console.log(`${detectedOmName}: ${personnelData.length} personnel, ${desembarqueData.length} desembarque`);
  
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
    
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_SHEETS_API_KEY not configured');
    }
    
    const spreadsheetId = '13YC7pfsERAJxdwzWPN12tTdNOVhlT_bbZXZigDZvalA';
    
    // Fetch first sheet (gid=0)
    const result = await fetchSheetData(spreadsheetId, '0', apiKey || '');
    
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

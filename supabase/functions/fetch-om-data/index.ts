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
  opcao: string;
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
  opcao: string;
  cargo: string;
  nome: string;
  epocaPrevista: string;
  om: string;
}

interface LicencaRecord {
  posto: string;
  corpo: string;
  quadro: string;
  opcao: string;
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
  opcao: string;
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
  opcao: string;
  cargo: string;
  nome: string;
  anoPrevisto: string;
  om: string;
}

// Sheet configurations - each GID represents an OM (alphabetical order)
const SHEET_CONFIGS = [
  { gid: '1175318745', omName: 'BAMRJ' },
  { gid: '1868624840', omName: 'CDU-1DN' },
  { gid: '1926090655', omName: 'CDU-BAMRJ' },
  { gid: '1894966712', omName: 'CDAM' },
  { gid: '1324793191', omName: 'CMM' },
  { gid: '581706093', omName: 'COpAb' },
  { gid: '1363629973', omName: 'CSUPAB' },
  { gid: '2111647795', omName: 'DEPCMRJ' },
  { gid: '84203546', omName: 'DEPFMRJ' },
  { gid: '122801537', omName: 'DEPMSMRJ' },
  { gid: '2140319620', omName: 'DEPSIMRJ' },
  { gid: '1727648610', omName: 'DepSMRJ' },
];

// Helper function to convert "-" to "VAGO"
const normalizeValue = (val: string): string => {
  const str = val.trim();
  return str === '-' ? 'VAGO' : str;
};

async function fetchSheetData(spreadsheetId: string, gid: string, omName: string): Promise<{
  personnel: PersonnelRecord[];
  desembarque: DesembarqueRecord[];
  embarque: DesembarqueRecord[];
  trrm: TrrmRecord[];
  licencas: LicencaRecord[];
  destaques: DestaqueRecord[];
  concurso: ConcursoRecord[];
  setores: string[];
  quadros: string[];
  opcoes: string[];
}> {
  const timestamp = new Date().getTime();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=${gid}&tqx=out:json&timestamp=${timestamp}`;
  
  console.log(`Fetching ${omName} from GID ${gid}...`);
  
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  if (!response.ok) {
    console.error(`Failed to fetch ${omName}: ${response.status}`);
    return { personnel: [], desembarque: [], embarque: [], trrm: [], licencas: [], destaques: [], concurso: [], setores: [], quadros: [], opcoes: [] };
  }

  const text = await response.text();
  const jsonString = text.substring(47).slice(0, -2);
  const sheetsData = JSON.parse(jsonString);
  const rows = sheetsData.table.rows;

  if (!rows || rows.length === 0) {
    console.log(`No data found for ${omName}`);
    return { personnel: [], desembarque: [], embarque: [], trrm: [], licencas: [], destaques: [], concurso: [], setores: [], quadros: [], opcoes: [] };
  }

  console.log(`${omName}: Total rows = ${rows.length}`);
  
  const personnelData: PersonnelRecord[] = [];
  const desembarqueData: DesembarqueRecord[] = [];
  const embarqueData: DesembarqueRecord[] = [];
  const trrmData: TrrmRecord[] = [];
  const licencasData: LicencaRecord[] = [];
  const destaquesData: DestaqueRecord[] = [];
  const concursoData: ConcursoRecord[] = [];
  const setores = new Set<string>();
  const quadros = new Set<string>();
  const opcoes = new Set<string>();
  
  let currentSection = 'TABELA_MESTRA';
  let extraLotacaoCounter = 0;
  
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
    if (firstCell === 'OFICIAIS ADIDOS' || firstCell.includes('OFICIAIS ADIDOS')) {
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
    if (firstCell === 'POSTO' && currentSection !== 'DESEMBARQUE' && currentSection !== 'EMBARQUE' && currentSection !== 'TRRM' && currentSection !== 'CONCURSO' && currentSection !== 'DESTAQUES_LICENCAS') {
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
    
    const validPostos = ['C ALTE', 'CONTRA-ALMIRANTE', 'CT', 'CF', 'CC', 'CMG', '1TEN', '2TEN', '1T', '2T', 'SO', '1SG', '2SG', '3SG', 'CB', 'MN', 'GM'];
    
    // Handle rows with empty/invalid NEO
    if (!firstCell || !isValidNeo) {
      // Check if it's a desembarque/embarque data row
      // Columns: GRADUAÇÃO | QUADRO | CARGO | NOME | OPÇÃO | DESTINO | MÊS/ANO | DOCUMENTO
      if ((currentSection === 'DESEMBARQUE' || currentSection === 'EMBARQUE') && 
          validPostos.includes(firstCell)) {
        const posto = firstCell;
        const quadro = String(cells[1]?.v || '').trim();
        const cargo = String(cells[2]?.v || '').trim();
        const nome = String(cells[3]?.v || '').trim();
        const opcao = String(cells[4]?.v || '').trim();
        const destino = String(cells[5]?.v || '').trim();
        const mesAno = String(cells[6]?.v || '').trim();
        const documento = String(cells[7]?.v || '').trim();
        const corpo = ''; // Not present in DESEMBARQUE section
        
        if (nome && currentSection === 'DESEMBARQUE') {
          desembarqueData.push({
            posto, corpo, quadro, opcao, cargo, nome, destino, mesAno, documento, om: omName
          });
          console.log(`${omName} Desembarque: ${nome} - Opção: ${opcao}`);
        }
        if (nome && currentSection === 'EMBARQUE') {
          embarqueData.push({
            posto, corpo, quadro, opcao, cargo, nome, destino, mesAno, documento, om: omName
          });
          console.log(`${omName} Embarque: ${nome} - Opção: ${opcao}`);
        }
      }
      
      // Check if it's a TRRM data row
      if (currentSection === 'TRRM' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const opcao = String(cells[5]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const epocaPrevista = String(cells[9]?.v || '').trim();
        
        if (nome) {
          trrmData.push({
            posto, corpo, quadro, opcao, cargo, nome, epocaPrevista, om: omName
          });
          console.log(`${omName} TRRM: ${nome} - ${epocaPrevista} - Opção: ${opcao}`);
        }
      }
      
      // Check if it's a CONCURSO data row
      if (currentSection === 'CONCURSO' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const opcao = String(cells[5]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const anoPrevisto = String(cells[9]?.v || '').trim();
        
        if (nome) {
          concursoData.push({
            posto, corpo, quadro, opcao, cargo, nome, anoPrevisto, om: omName
          });
          console.log(`${omName} Concurso C-EMOS: ${nome} - ${anoPrevisto} - Opção: ${opcao}`);
        }
      }
      
      // Check if it's a DESTAQUES data row
      if (currentSection === 'DESTAQUES' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const opcao = String(cells[5]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const emOutraOm = String(cells[9]?.v || '').trim();
        const deOutraOm = String(cells[10]?.v || '').trim();
        const periodo = String(cells[11]?.v || '').trim();
        
        if (nome) {
          destaquesData.push({
            posto, corpo, quadro, opcao, cargo, nome, emOutraOm, deOutraOm, periodo, om: omName
          });
          console.log(`${omName} Destaque: ${nome} - Opção: ${opcao}`);
        }
      }
      
      // Check if it's a LICENÇAS data row
      if (currentSection === 'LICENCAS' && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const corpo = String(cells[1]?.v || '').trim();
        const quadro = String(cells[2]?.v || '').trim();
        const opcao = String(cells[5]?.v || '').trim();
        const cargo = String(cells[3]?.v || '').trim();
        const nome = String(cells[4]?.v || '').trim();
        const motivo = String(cells[9]?.v || '').trim();
        
        if (nome) {
          licencasData.push({
            posto, corpo, quadro, opcao, cargo, nome, emOutraOm: '', deOutraOm: '', periodo: motivo, om: omName
          });
          console.log(`${omName} Licença: ${nome} - Opção: ${opcao}`);
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
            id: `${omName}-EXTRA-${extraLotacaoCounter}`,
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
            om: omName,
          };
          personnelData.push(extraRecord);
          if (quadroEfe) quadros.add(quadroEfe);
          if (opcaoEfe) opcoes.add(opcaoEfe);
          console.log(`${omName} EXTRA LOTAÇÃO: ${nome} - ${postoEfe} ${corpoEfe} ${quadroEfe}`);
        }
      }
      
      // Check if it's a TABELA_MESTRA row with data but empty NEO (EXTRA LOTAÇÃO)
      if (currentSection === 'TABELA_MESTRA' && !isValidNeo) {
        // Check if there's nome data in column 12 (standard TABELA_MESTRA format)
        const nome = String(cells[12]?.v || '').trim();
        const postoEfe = String(cells[8]?.v || '').trim();
        
        if (nome && nome !== 'NOME' && nome !== 'VAZIO' && postoEfe) {
          extraLotacaoCounter++;
          const tipoSetor = String(cells[1]?.v || '').trim();
          const setor = String(cells[2]?.v || '').trim();
          const cargo = String(cells[3]?.v || '').trim();
          const corpoEfe = String(cells[9]?.v || '').trim();
          const quadroEfe = String(cells[10]?.v || '').trim();
          const opcaoEfe = String(cells[11]?.v || '').trim();
          
          const extraRecord: PersonnelRecord = {
            id: `${omName}-EXTRA-${extraLotacaoCounter}`,
            neo: 0,
            tipoSetor: tipoSetor || 'EXTRA LOTAÇÃO',
            setor: setor || 'EXTRA LOTAÇÃO',
            cargo: cargo || 'EXTRA LOTAÇÃO',
            postoTmft: String(cells[4]?.v || '').trim(),
            corpoTmft: String(cells[5]?.v || '').trim(),
            quadroTmft: String(cells[6]?.v || '').trim(),
            opcaoTmft: String(cells[7]?.v || '').trim(),
            postoEfe,
            corpoEfe,
            quadroEfe,
            opcaoEfe,
            nome,
            ocupado: true,
            om: omName,
          };
          personnelData.push(extraRecord);
          if (quadroEfe) quadros.add(quadroEfe);
          if (opcaoEfe) opcoes.add(opcaoEfe);
          console.log(`${omName} EXTRA LOTAÇÃO (empty NEO): ${nome} - ${postoEfe} ${corpoEfe} ${quadroEfe}`);
        }
      }
      continue;
    }
    
    // Parse TABELA MESTRA rows (personnel data)
    currentSection = 'TABELA_MESTRA';
    
    const tipoSetor = normalizeValue(String(cells[1]?.v || ''));
    const setor = normalizeValue(String(cells[2]?.v || ''));
    const cargo = normalizeValue(String(cells[3]?.v || ''));
    const postoTmft = normalizeValue(String(cells[4]?.v || ''));
    const corpoTmft = normalizeValue(String(cells[5]?.v || ''));
    const quadroTmft = normalizeValue(String(cells[6]?.v || ''));
    const opcaoTmft = normalizeValue(String(cells[7]?.v || ''));
    const postoEfe = normalizeValue(String(cells[8]?.v || ''));
    const corpoEfe = normalizeValue(String(cells[9]?.v || ''));
    const quadroEfe = normalizeValue(String(cells[10]?.v || ''));
    const opcaoEfe = normalizeValue(String(cells[11]?.v || ''));
    const nome = normalizeValue(String(cells[12]?.v || ''));
    
    // Skip summary rows (contain percentages like "100%", "71%", etc.)
    if (tipoSetor.includes('%') || setor.includes('%') || cargo.includes('%')) {
      console.log(`${omName} Skipping summary row NEO=${neoString}: ${tipoSetor}`);
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
      id: `${omName}-${neoString}`,
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
      om: omName,
    };
    
    personnelData.push(record);
    console.log(`${omName} Personnel NEO=${neoString}: ${nome || 'VAGO'} - ${tipoSetor}/${setor} - ${cargo}`);
  }

  console.log(`${omName}: Processed ${personnelData.length} personnel, ${desembarqueData.length} desembarque, ${embarqueData.length} embarque, ${trrmData.length} TRRM, ${licencasData.length} licenças, ${destaquesData.length} destaques, ${concursoData.length} concurso`);
  
  return {
    personnel: personnelData,
    desembarque: desembarqueData,
    embarque: embarqueData,
    trrm: trrmData,
    licencas: licencasData,
    destaques: destaquesData,
    concurso: concursoData,
    setores: Array.from(setores),
    quadros: Array.from(quadros),
    opcoes: Array.from(opcoes),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching OM detailed data from multiple sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    
    // Fetch all sheets in parallel
    const results = await Promise.all(
      SHEET_CONFIGS.map(config => 
        fetchSheetData(spreadsheetId, config.gid, config.omName)
      )
    );
    
    // Combine all results
    const allPersonnel: PersonnelRecord[] = [];
    const allDesembarque: DesembarqueRecord[] = [];
    const allEmbarque: DesembarqueRecord[] = [];
    const allTrrm: TrrmRecord[] = [];
    const allLicencas: LicencaRecord[] = [];
    const allDestaques: DestaqueRecord[] = [];
    const allConcurso: ConcursoRecord[] = [];
    const allSetores = new Set<string>();
    const allQuadros = new Set<string>();
    const allOpcoes = new Set<string>();
    const allOMs = new Set<string>();
    
    for (const result of results) {
      allPersonnel.push(...result.personnel);
      allDesembarque.push(...result.desembarque);
      allEmbarque.push(...result.embarque);
      allTrrm.push(...result.trrm);
      allLicencas.push(...result.licencas);
      allDestaques.push(...result.destaques);
      allConcurso.push(...result.concurso);
      result.setores.forEach(s => allSetores.add(s));
      result.quadros.forEach(q => allQuadros.add(q));
      result.opcoes.forEach(o => allOpcoes.add(o));
    }
    
    // Get unique OMs from data
    allPersonnel.forEach(p => allOMs.add(p.om));
    
    console.log(`Total: ${allPersonnel.length} personnel, ${allDesembarque.length} desembarque, ${allEmbarque.length} embarque, ${allTrrm.length} TRRM, ${allLicencas.length} licenças, ${allDestaques.length} destaques, ${allConcurso.length} concurso from ${allOMs.size} OMs`);

    return new Response(
      JSON.stringify({ 
        data: allPersonnel,
        desembarque: allDesembarque,
        embarque: allEmbarque,
        trrm: allTrrm,
        licencas: allLicencas,
        destaques: allDestaques,
        concurso: allConcurso,
        setores: Array.from(allSetores).sort(),
        quadros: Array.from(allQuadros).sort(),
        opcoes: Array.from(allOpcoes).sort(),
        oms: Array.from(allOMs).sort(),
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
        trrm: [],
        licencas: [],
        destaques: [],
        concurso: [],
        setores: [],
        quadros: [],
        opcoes: [],
        oms: [],
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

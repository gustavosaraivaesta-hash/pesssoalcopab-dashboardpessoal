import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to authenticate request and get user role
async function authenticateRequest(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  
  if (error || !data?.claims) {
    console.error('Auth error:', error);
    return null;
  }

  const userId = data.claims.sub as string;

  // Get user role from database
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (roleError || !roleData) {
    console.log('No role found for user:', userId);
    return { userId, role: 'COPAB' }; // Default role
  }

  return { userId, role: roleData.role };
}

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

// OMs allowed for CSUPAB role
const CSUPAB_ALLOWED_OMS = new Set(['CSUPAB', 'DEPCMRJ', 'DEPFMRJ', 'DEPMSMRJ', 'DEPSIMRJ', 'DEPSMRJ']);

// Get allowed OMs based on user role
function getAllowedOMsForRole(role: string): string[] | 'all' {
  // COPAB sees everything
  if (role === 'COPAB') return 'all';
  
  // CSUPAB sees specific OMs under its command
  if (role === 'CSUPAB') return [...CSUPAB_ALLOWED_OMS];
  
  // DEPFMRJ também vê CDU-BAMRJ e CDU-1DN
  if (role === 'DEPFMRJ') return ['DEPFMRJ', 'CDU-BAMRJ', 'CDU-1DN'];
  
  // Individual OMs only see their own data
  return [role];
}

// Helper function to convert "-" to empty string
const normalizeValue = (val: string): string => {
  const str = val.trim();
  return str === '-' ? '' : str;
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

  let desembarqueHeader: Record<string, number> | null = null;
  let embarqueHeader: Record<string, number> | null = null;

  const normalizeHeaderText = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .trim();

  const buildHeaderIndex = (cells: any[]) => {
    const idx: Record<string, number> = {};
    for (let i = 0; i < cells.length; i++) {
      const raw = String(cells[i]?.v || '');
      const v = normalizeHeaderText(raw);
      if (!v) continue;

      if (v.includes('CORPO')) idx.corpo = i;
      else if (v.includes('QUADRO')) idx.quadro = i;
      else if (v.includes('CARGO')) idx.cargo = i;
      else if (v.includes('NOME')) idx.nome = i;
      else if (v.includes('OPCAO')) idx.opcao = i;
      else if (v.includes('DESTINO')) idx.destino = i;
      else if (v.includes('MES') && v.includes('ANO')) idx.mesAno = i;
      else if (v.includes('DOCUMENTO')) idx.documento = i;
    }
    return idx;
  };

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
      desembarqueHeader = null;
      continue;
    }
    if (firstCell === 'PREVISÃO DE EMBARQUE' || firstCell.includes('EMBARQUE')) {
      currentSection = 'EMBARQUE';
      embarqueHeader = null;
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
    if (
      firstCell === 'POSTO' &&
      currentSection !== 'DESEMBARQUE' &&
      currentSection !== 'EMBARQUE' &&
      currentSection !== 'TRRM' &&
      currentSection !== 'CONCURSO' &&
      currentSection !== 'DESTAQUES_LICENCAS'
    ) {
      continue;
    }
    if (firstCell === 'RESUMO DA SITUAÇÃO') {
      currentSection = 'RESUMO';
      continue;
    }

    // Check if NEO contains a dot (like 01.01, 02.01.2001) or is a valid number
    const neoString = String(cells[0]?.v || '').trim();
    const isValidNeo = neoString && (!isNaN(Number(neoString)) || /^\d+(\.\d+)*$/.test(neoString));

    const validPostos = [
      'C ALTE',
      'CONTRA-ALMIRANTE',
      'CT',
      'CF',
      'CC',
      'CMG',
      '1TEN',
      '2TEN',
      '1T',
      '2T',
      'SO',
      '1SG',
      '2SG',
      '3SG',
      'CB',
      'MN',
      'GM',
    ];

    const cellStr = (i: number) => String(cells[i]?.v || '').trim();

    // Handle rows with empty/invalid NEO
    if (!firstCell || !isValidNeo) {
      // Capture header row inside DESEMBARQUE/EMBARQUE so we can read DESTINO and MÊS/ANO reliably.
      if (currentSection === 'DESEMBARQUE' || currentSection === 'EMBARQUE') {
        const headerToken = normalizeHeaderText(firstCell);
        if (headerToken === 'POSTO' || headerToken === 'GRADUACAO' || headerToken === 'GRADUACAO' || headerToken === 'GRADUAÇÃO') {
          const idx = buildHeaderIndex(cells);
          if (currentSection === 'DESEMBARQUE') desembarqueHeader = idx;
          if (currentSection === 'EMBARQUE') embarqueHeader = idx;
          continue;
        }
      }

      if ((currentSection === 'DESEMBARQUE' || currentSection === 'EMBARQUE') && validPostos.includes(firstCell)) {
        const posto = firstCell;
        const header = currentSection === 'DESEMBARQUE' ? desembarqueHeader : embarqueHeader;

        if (header && Object.keys(header).length > 0) {
          const corpo = header.corpo !== undefined ? cellStr(header.corpo) : '';
          const quadro = header.quadro !== undefined ? cellStr(header.quadro) : '';
          const cargo = header.cargo !== undefined ? cellStr(header.cargo) : '';
          const nome = header.nome !== undefined ? cellStr(header.nome) : '';
          const opcao = header.opcao !== undefined ? cellStr(header.opcao) : '';
          const destino = header.destino !== undefined ? cellStr(header.destino) : '';
          const mesAno = header.mesAno !== undefined ? cellStr(header.mesAno) : '';
          const documento = header.documento !== undefined ? cellStr(header.documento) : '';

          if (nome && currentSection === 'DESEMBARQUE') {
            desembarqueData.push({ posto, corpo, quadro, opcao, cargo, nome, destino, mesAno, documento, om: omName });
          }
          if (nome && currentSection === 'EMBARQUE') {
            embarqueData.push({ posto, corpo, quadro, opcao, cargo, nome, destino, mesAno, documento, om: omName });
          }
        } else {
          const hasCorpoColumn = Boolean(cellStr(8)) || cells.length >= 9;

          const corpo = hasCorpoColumn ? cellStr(1) : '';
          const quadro = hasCorpoColumn ? cellStr(2) : cellStr(1);
          const cargo = hasCorpoColumn ? cellStr(3) : cellStr(2);
          const nome = hasCorpoColumn ? cellStr(4) : cellStr(3);
          const opcao = hasCorpoColumn ? cellStr(5) : cellStr(4);
          const destino = hasCorpoColumn ? cellStr(6) : cellStr(5);
          const mesAno = hasCorpoColumn ? cellStr(7) : cellStr(6);
          const documento = hasCorpoColumn ? cellStr(8) : cellStr(7);

          if (nome && currentSection === 'DESEMBARQUE') {
            desembarqueData.push({ posto, corpo, quadro, opcao, cargo, nome, destino, mesAno, documento, om: omName });
          }
          if (nome && currentSection === 'EMBARQUE') {
            embarqueData.push({ posto, corpo, quadro, opcao, cargo, nome, destino, mesAno, documento, om: omName });
          }
        }
      }

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
        }
      }
      
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
        }
      }
      
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
        }
      }
      
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
        }
      }
      
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
        }
      }
      
      if (currentSection === 'TABELA_MESTRA' && !isValidNeo) {
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
    
    if (tipoSetor.includes('%') || setor.includes('%') || cargo.includes('%')) {
      continue;
    }
    
    if (tipoSetor === 'TIPO SETOR' || setor === 'SETOR') {
      continue;
    }
    
    if (tipoSetor) setores.add(tipoSetor);
    if (quadroTmft) quadros.add(quadroTmft);
    if (opcaoTmft) opcoes.add(opcaoTmft);
    
    const nomeUpper = nome.toUpperCase();

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
      ocupado: nomeUpper.length > 0 && nomeUpper !== 'VAZIO' && nomeUpper !== 'VAGO',
      om: omName,
    };
    
    personnelData.push(record);
  }

  console.log(`${omName}: Processed ${personnelData.length} personnel`);
  
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
    // Authenticate request
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${auth.userId}, role: ${auth.role}`);
    console.log('Fetching OM detailed data from multiple sheets...');
    
    const spreadsheetId = '1-k4hLJdPTvVl7NGl9FEw1WPhaPD5tWtAhc7BGSZ8lvk';
    
    // Filter sheets based on user role
    const allowedOMs = getAllowedOMsForRole(auth.role);
    
    const allowedConfigs = allowedOMs === 'all'
      ? SHEET_CONFIGS
      : SHEET_CONFIGS.filter(config => {
          const omUpper = config.omName.toUpperCase();
          return allowedOMs.some(allowed => allowed.toUpperCase() === omUpper);
        });
    
    console.log(`Role ${auth.role} has access to ${allowedConfigs.length} OMs: ${allowedConfigs.map(c => c.omName).join(', ')}`);
    
    // Fetch all sheets in parallel
    const results = await Promise.all(
      allowedConfigs.map(config => 
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
    
    allPersonnel.forEach(p => allOMs.add(p.om));
    
    console.log(`Total: ${allPersonnel.length} personnel from ${allOMs.size} OMs for role ${auth.role}`);

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

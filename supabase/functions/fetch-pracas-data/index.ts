// Edge function for fetching PRAÇAS data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

// Helper function to authenticate request and get user role
async function authenticateRequest(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    return null;
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  return { userId: data.user.id, role: roleData?.role || 'COPAB' };
}

// OMs allowed for CSUPAB role
const CSUPAB_ALLOWED_OMS = new Set(['CSUPAB', 'DEPCMRJ', 'DEPFMRJ', 'DEPMSMRJ', 'DEPSIMRJ', 'DEPSMRJ']);

interface PersonnelRecord {
  id: string;
  neo: string;
  tipoSetor: string;
  setor: string;
  cargo: string;
  postoTmft: string;
  especialidadeTmft: string;
  opcaoTmft: string;
  nome: string;
  postoEfe: string;
  especialidadeEfe: string;
  opcaoEfe: string;
  om: string;
  isVago: boolean;
  isExtraLotacao: boolean;
}

interface DesembarqueRecord {
  id: string;
  nome: string;
  posto: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  om: string;
  dataDesembarque: string;
  destino: string;
  motivo: string;
}

interface TrrmRecord {
  id: string;
  nome: string;
  posto: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  om: string;
  dataTrrm: string;
}

interface LicencaRecord {
  id: string;
  nome: string;
  posto: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  om: string;
  tipoLicenca: string;
  dataInicio: string;
  dataFim: string;
}

interface DestaqueRecord {
  id: string;
  nome: string;
  posto: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  om: string;
  emOutraOm: string;
  deOutraOm: string;
  periodo: string;
}

interface CursoRecord {
  id: string;
  nome: string;
  posto: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  om: string;
  anoPrevisto: string;
}

// Sheet configurations for all OMs (alphabetical order)
const SHEET_CONFIGS = [
  { gid: '280177623', omName: 'BAMRJ' },
  { gid: '957180492', omName: 'CDU-1DN' },
  { gid: '1658824367', omName: 'CDU-BAMRJ' },
  { gid: '1650749150', omName: 'CDAM' },
  { gid: '1495647476', omName: 'CMM' },
  { gid: '527671707', omName: 'COPAB' },
  { gid: '469479928', omName: 'CSUPAB' },
  { gid: '567760228', omName: 'DEPCMRJ' },
  { gid: '1373834755', omName: 'DEPFMRJ' },
  { gid: '0', omName: 'DEPMSMRJ' },
  { gid: '295069813', omName: 'DEPSIMRJ' },
  { gid: '1610199360', omName: 'DEPSMRJ' },
];

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
  concurso: CursoRecord[];
  setores: string[];
  especialidades: string[];
  opcoes: string[];
}> {
  const personnel: PersonnelRecord[] = [];
  const desembarque: DesembarqueRecord[] = [];
  const embarque: DesembarqueRecord[] = [];
  const trrm: TrrmRecord[] = [];
  const licencas: LicencaRecord[] = [];
  const destaques: DestaqueRecord[] = [];
  const concurso: CursoRecord[] = [];
  const setoresSet = new Set<string>();
  const especialidadesSet = new Set<string>();
  const opcoesSet = new Set<string>();

  try {
    console.log(`Fetching PRAÇAS from GID ${gid} (${omName})...`);
    
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch GID ${gid}: ${response.status}`);
      return { personnel, desembarque, embarque, trrm, licencas, destaques, concurso, setores: [], especialidades: [], opcoes: [] };
    }

    const csvText = await response.text();
    const rows: string[][] = [];
    
    // Parse CSV
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
    
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) {
        rows.push(currentRow);
      }
    }

    console.log(`GID ${gid} (${omName}): Total rows = ${rows.length}`);

    const getCell = (row: string[], index: number): string => {
      const val = row && row[index] ? row[index].trim() : '';
      return normalizeValue(val);
    };

    let currentSection = '';
    let personnelCounter = 0;
    let desembarqueCounter = 0;
    let embarqueCounter = 0;
    let trrmCounter = 0;
    let licencaCounter = 0;
    let destaqueCounter = 0;
    let cursoCounter = 0;
    let extraLotacaoCounter = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = getCell(row, 0).toUpperCase();
      
      // Detect section headers
      if (firstCell.includes('TABELA MESTRA') || firstCell.includes('TABELA_MESTRA') || firstCell.includes('SITUAÇÃO DA FORÇA')) {
        currentSection = 'TABELA_MESTRA';
        console.log(`${omName}: Detected TABELA_MESTRA section`);
        continue;
      } else if (firstCell.includes('PREVISÃO DE DESEMBARQUE') || firstCell === 'DESEMBARQUE') {
        currentSection = 'DESEMBARQUE';
        console.log(`${omName}: Detected DESEMBARQUE section`);
        continue;
      } else if (firstCell.includes('PREVISÃO DE TRRM') || firstCell === 'TRRM') {
        currentSection = 'TRRM';
        continue;
      } else if (firstCell.includes('DESTAQUES/LICENÇAS') || firstCell.includes('DESTAQUES')) {
        currentSection = 'DESTAQUES';
        console.log(`${omName}: Detected DESTAQUES section`);
        continue;
      } else if (firstCell.includes('LICENÇA') || firstCell.includes('LICENÇAS')) {
        currentSection = 'LICENCAS';
        console.log(`${omName}: Detected LICENÇAS section`);
        continue;
      } else if (firstCell.includes('OFICIAIS ADIDOS')) {
        currentSection = 'SKIP';
        continue;
      } else if (firstCell.includes('PREVISÃO DE EMBARQUE')) {
        currentSection = 'EMBARQUE';
        console.log(`${omName}: Detected EMBARQUE section`);
        continue;
      } else if (firstCell.includes('PREVISÃO DE CURSO') || firstCell.includes('CURSO') && !firstCell.includes('INCUMBÊNCIA')) {
        currentSection = 'CURSO';
        console.log(`${omName}: Detected PREVISÃO DE CURSO section`);
        continue;
      } else if (firstCell.includes('RESUMO DA SITUAÇÃO')) {
        currentSection = 'SKIP';
        continue;
      } else if (firstCell.includes('CONCURSO') || firstCell.includes('C-EMOS')) {
        currentSection = 'CURSO';
        console.log(`${omName}: Detected CURSO/CONCURSO section`);
        continue;
      }

      // Skip header rows (but not empty NEO rows in TABELA_MESTRA - those might be EXTRA LOTAÇÃO)
      const skipKeywords = ['NEO', 'NOME', 'N°', 'Nº', 'TIPO SETOR', 'GRADUAÇÃO', 'POSTO', 
        'ESPECIALIDADE', 'DATA', 'MOTIVO', 'DESTINO', 'LOCAL', 'STATUS', 'CONCURSO',
        'PREVISÃO', 'RESUMO', 'OFICIAIS', 'CURSO', 'TIPO', 'PERÍODO', 'OBS', 'OBSERVAÇÃO',
        'SETOR', 'CARGO', 'OPÇÃO', 'QUADRO', 'EFETIVO', 'TMFT', 'EFE', 'DST', 'SIT',
        'PERCENTUAL', 'DOCUMENTO', 'REFERÊNCIA', 'MÊS', 'ANO', 'ORIGEM', 'EPOCA'];
      
      // Only skip empty firstCell if NOT in TABELA_MESTRA (to allow EXTRA LOTAÇÃO detection)
      const shouldSkipEmpty = firstCell === '' && currentSection !== 'TABELA_MESTRA';
      if (shouldSkipEmpty || skipKeywords.some(kw => firstCell === kw || firstCell.includes(kw))) {
        continue;
      }

      // Skip summary rows with percentages
      if (row.some(cell => cell && cell.includes('%'))) {
        continue;
      }

      // Skip if current section is SKIP
      if (currentSection === 'SKIP') {
        continue;
      }

      // Process based on current section
      if (currentSection === 'TABELA_MESTRA') {
        const neo = getCell(row, 0);
        const tipoSetor = getCell(row, 1);
        const setor = getCell(row, 2);
        const cargo = getCell(row, 3);
        const postoTmft = getCell(row, 4);        // GRADUAÇÃO TMFT
        const quadroTmft = getCell(row, 5);       // QUADRO TMFT
        const especialidadeTmft = getCell(row, 6); // ESPECIALIDADE TMFT
        const opcaoTmft = getCell(row, 7);        // OPÇÃO TMFT
        const postoEfe = getCell(row, 8);         // GRADUAÇÃO EFE
        const quadroEfe = getCell(row, 9);        // QUADRO EFE
        const especialidadeEfe = getCell(row, 10); // ESPECIALIDADE EFE
        const opcaoEfe = getCell(row, 11);        // OPÇÃO EFE
        const nome = getCell(row, 12);            // NOME

        // Check for EXTRA LOTAÇÃO: when NEO is empty but has valid personnel data
        if (!neo && (postoEfe || nome)) {
          extraLotacaoCounter++;
          const record: PersonnelRecord = {
            id: `${omName}-EXTRA-${extraLotacaoCounter}`,
            neo: '0',
            tipoSetor: 'EXTRA LOTAÇÃO',
            setor: 'EXTRA LOTAÇÃO',
            cargo: 'EXTRA LOTAÇÃO',
            postoTmft: '',
            especialidadeTmft: '',
            opcaoTmft: '',
            nome: nome || 'EXTRA LOTAÇÃO',
            postoEfe: postoEfe,
            especialidadeEfe: especialidadeEfe,
            opcaoEfe: opcaoEfe,
            om: omName,
            isVago: false,
            isExtraLotacao: true,
          };
          personnel.push(record);
          console.log(`${omName} EXTRA LOTAÇÃO: ${nome || 'SEM NOME'}`);
          
          if (especialidadeEfe) especialidadesSet.add(especialidadeEfe);
          if (opcaoEfe) opcoesSet.add(opcaoEfe);
          continue;
        }

        // Regular personnel record - needs valid NEO (numeric or alphanumeric starting with digit)
        if (neo && /^\d/.test(neo) && (postoTmft || cargo || nome)) {
          personnelCounter++;
          const isVago = !nome || nome.toUpperCase() === 'VAGO' || nome.toUpperCase() === 'VAZIO';
          
          const record: PersonnelRecord = {
            id: `${omName}-${neo}-${personnelCounter}`,
            neo,
            tipoSetor,
            setor,
            cargo,
            postoTmft,
            especialidadeTmft,
            opcaoTmft,
            nome: isVago ? 'VAGO' : nome,
            postoEfe,
            especialidadeEfe,
            opcaoEfe,
            om: omName,
            isVago,
            isExtraLotacao: false,
          };
          
          personnel.push(record);
          console.log(`${omName} NEO=${neo}: ${nome || 'VAGO'} - ESP: ${especialidadeTmft} - OPCAO: ${opcaoTmft}`);
          
          if (setor) setoresSet.add(setor);
          if (especialidadeTmft) especialidadesSet.add(especialidadeTmft);
          if (especialidadeEfe) especialidadesSet.add(especialidadeEfe);
          if (opcaoTmft) opcoesSet.add(opcaoTmft);
          if (opcaoEfe) opcoesSet.add(opcaoEfe);
        }
      } else if (currentSection === 'DESEMBARQUE' || currentSection === 'EMBARQUE') {
        // DESEMBARQUE/EMBARQUE columns: GRADUAÇÃO, QUADRO, ESPECIALIDADE, CARGO/INCUMBÊNCIA, NOME, ..., DESTINO, MÊS/ANO
        const posto = getCell(row, 0);
        const quadro = getCell(row, 1);
        const especialidade = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        
        // Skip if nome looks like a header
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'DESTINO', 'MOTIVO', 'PREVISÃO', 'EMBARQUE', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS', 'QUADRO', 'CARGO'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw) || posto.toUpperCase().includes(hw));
        
        if (nome && nome.length > 2 && !isHeader && posto) {
          const destino = getCell(row, 9) || getCell(row, 5);
          const dataRecord = getCell(row, 10) || getCell(row, 6);
          
          const record: DesembarqueRecord = {
            id: `${omName}-${currentSection === 'EMBARQUE' ? 'EMB' : 'DES'}-${currentSection === 'EMBARQUE' ? ++embarqueCounter : ++desembarqueCounter}`,
            nome,
            posto,
            quadro,
            especialidade,
            opcao: getCell(row, 7) || getCell(row, 5) || '',
            om: omName,
            dataDesembarque: dataRecord,
            destino,
            motivo: cargo,
          };
          
          if (currentSection === 'EMBARQUE') {
            embarque.push(record);
            console.log(`${omName} Embarque: ${nome} - ${posto}`);
          } else {
            desembarque.push(record);
            console.log(`${omName} Desembarque: ${nome} - ${posto}`);
          }
        }
      } else if (currentSection === 'TRRM') {
        const posto = getCell(row, 0);
        const quadro = getCell(row, 1);
        const especialidade = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'PREVISÃO', 'CURSO', 'RESUMO', 'SITUAÇÃO', 'OFICIAIS', 'ADIDOS', 'QUADRO', 'CARGO', 'EPOCA'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw) || posto.toUpperCase().includes(hw));
        
        if (nome && nome.length > 2 && !isHeader && posto) {
          trrmCounter++;
          const dataTrrm = getCell(row, 9) || getCell(row, 5);
          
          const record: TrrmRecord = {
            id: `${omName}-TRRM-${trrmCounter}`,
            nome,
            posto,
            quadro,
            especialidade,
            opcao: getCell(row, 7) || getCell(row, 3) || '',
            om: omName,
            dataTrrm,
          };
          trrm.push(record);
          console.log(`${omName} TRRM: ${nome}`);
        }
      } else if (currentSection === 'LICENCAS') {
        const posto = getCell(row, 0);
        const quadro = getCell(row, 1);
        const especialidade = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'TIPO', 'PERÍODO', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS', 'QUADRO', 'CARGO', 'EM OUTRA', 'DE OUTRA'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw) || posto.toUpperCase().includes(hw));
        
        if (nome && nome.length > 2 && !isHeader && posto) {
          licencaCounter++;
          const record: LicencaRecord = {
            id: `${omName}-LIC-${licencaCounter}`,
            nome,
            posto,
            quadro,
            especialidade,
            opcao: getCell(row, 7) || getCell(row, 3) || '',
            cargo,
            om: omName,
            tipoLicenca: getCell(row, 9) || getCell(row, 5),
            dataInicio: getCell(row, 10) || getCell(row, 6),
            dataFim: getCell(row, 11) || getCell(row, 7),
          };
          licencas.push(record);
          console.log(`${omName} Licença: ${nome}`);
        }
      } else if (currentSection === 'DESTAQUES') {
        // DESTAQUES columns: GRADUAÇÃO, QUADRO, ESPECIALIDADE, CARGO/INCUMBÊNCIA, NOME, ..., EM OUTRA OM, DE OUTRA OM, PERÍODO
        const posto = getCell(row, 0);
        const quadro = getCell(row, 1);
        const especialidade = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'EM OUTRA', 'DE OUTRA', 'PERÍODO', 'QUADRO', 'CARGO'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw) || posto.toUpperCase().includes(hw));
        
        if (nome && nome.length > 2 && !isHeader && posto) {
          destaqueCounter++;
          const emOutraOm = getCell(row, 9) || getCell(row, 5);
          const deOutraOm = getCell(row, 10) || getCell(row, 6);
          const periodo = getCell(row, 11) || getCell(row, 7);
          
          const record: DestaqueRecord = {
            id: `${omName}-DEST-${destaqueCounter}`,
            nome,
            posto,
            quadro,
            especialidade,
            opcao: getCell(row, 7) || getCell(row, 3) || '',
            cargo,
            om: omName,
            emOutraOm,
            deOutraOm,
            periodo,
          };
          destaques.push(record);
          console.log(`${omName} Destaque: ${nome}`);
        }
      } else if (currentSection === 'CURSO') {
        const posto = getCell(row, 0);
        const quadro = getCell(row, 1);
        const especialidade = getCell(row, 2);
        const cargo = getCell(row, 3);
        const nome = getCell(row, 4);
        
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'STATUS', 'CONCURSO', 'C-EMOS', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS', 'QUADRO', 'CARGO', 'ANO'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw) || posto.toUpperCase().includes(hw));
        
        if (nome && nome.length > 2 && !isHeader && posto) {
          cursoCounter++;
          const anoPrevisto = getCell(row, 9) || getCell(row, 5);
          
          const record: CursoRecord = {
            id: `${omName}-CURSO-${cursoCounter}`,
            nome,
            posto,
            quadro,
            especialidade,
            opcao: getCell(row, 7) || getCell(row, 3) || '',
            cargo,
            om: omName,
            anoPrevisto,
          };
          concurso.push(record);
          console.log(`${omName} Previsão de Curso: ${nome} - Ano: ${anoPrevisto}`);
        }
      }
    }

    console.log(`${omName}: ${personnel.length} personnel, ${desembarque.length} desembarque, ${embarque.length} embarque, ${trrm.length} trrm, ${licencas.length} licencas`);

  } catch (error) {
    console.error(`Error fetching GID ${gid} (${omName}):`, error);
  }

  return {
    personnel,
    desembarque,
    embarque,
    trrm,
    licencas,
    destaques,
    concurso,
    setores: Array.from(setoresSet).sort(),
    especialidades: Array.from(especialidadesSet).sort(),
    opcoes: Array.from(opcoesSet).sort(),
  };
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

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
    console.log('Fetching PRAÇAS data from all OMs...');
    
    // Filter sheets based on user role
    const allowedConfigs = auth.role === 'CSUPAB' 
      ? SHEET_CONFIGS.filter(config => CSUPAB_ALLOWED_OMS.has(config.omName.toUpperCase()))
      : SHEET_CONFIGS;
    
    const spreadsheetId = '13YC7pfsERAJxdwzWPN12tTdNOVhlT_bbZXZigDZvalA';
    
    // Fetch all OMs in parallel
    const results = await Promise.all(
      SHEET_CONFIGS.map(config => 
        fetchSheetData(spreadsheetId, config.gid, config.omName)
      )
    );
    
    // Aggregate all results
    const allPersonnel: PersonnelRecord[] = [];
    const allDesembarque: DesembarqueRecord[] = [];
    const allEmbarque: DesembarqueRecord[] = [];
    const allTrrm: TrrmRecord[] = [];
    const allLicencas: LicencaRecord[] = [];
    const allDestaques: DestaqueRecord[] = [];
    const allConcurso: CursoRecord[] = [];
    const allSetores = new Set<string>();
    const allEspecialidades = new Set<string>();
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
      result.especialidades.forEach(q => allEspecialidades.add(q));
      result.opcoes.forEach(o => allOpcoes.add(o));
      result.personnel.forEach(p => allOMs.add(p.om));
    }

    console.log(`Total: ${allPersonnel.length} personnel from ${allOMs.size} OMs`);

    // Transform personnel data to match frontend interface
    const transformedData = allPersonnel.map(p => ({
      id: p.id,
      neo: p.neo,
      tipoSetor: p.tipoSetor,
      setor: p.setor,
      cargo: p.cargo,
      postoTmft: p.postoTmft,
      corpoTmft: '',
      quadroTmft: p.especialidadeTmft, // Map especialidade to quadro for filter
      opcaoTmft: p.opcaoTmft,
      postoEfe: p.postoEfe,
      corpoEfe: '',
      quadroEfe: p.especialidadeEfe,
      opcaoEfe: p.opcaoEfe,
      nome: p.nome,
      ocupado: !p.isVago,
      om: p.om,
      isExtraLotacao: p.isExtraLotacao,
    }));

    // Transform licencas to match frontend interface
    const transformedLicencas = allLicencas.map(l => ({
      posto: l.posto,
      corpo: '',
      quadro: l.quadro,
      especialidade: l.especialidade,
      opcao: l.opcao || '',
      cargo: l.cargo || '',
      nome: l.nome,
      emOutraOm: '',
      deOutraOm: '',
      periodo: l.tipoLicenca || '', // Map tipoLicenca to periodo for frontend
      om: l.om,
    }));

    // Transform desembarque to match frontend interface
    const transformedDesembarque = allDesembarque.map(d => ({
      posto: d.posto,
      corpo: '',
      quadro: d.quadro,
      especialidade: d.especialidade,
      opcao: d.opcao || '',
      cargo: d.motivo || '',
      nome: d.nome,
      destino: d.destino,
      mesAno: d.dataDesembarque,
      documento: '',
      om: d.om,
    }));

    // Transform embarque to match frontend interface
    const transformedEmbarque = allEmbarque.map(d => ({
      posto: d.posto,
      corpo: '',
      quadro: d.quadro,
      especialidade: d.especialidade,
      opcao: d.opcao || '',
      cargo: d.motivo || '',
      nome: d.nome,
      destino: d.destino,
      mesAno: d.dataDesembarque,
      documento: '',
      om: d.om,
    }));

    // Transform trrm to match frontend interface  
    const transformedTrrm = allTrrm.map(t => ({
      posto: t.posto,
      corpo: '',
      quadro: t.quadro,
      especialidade: t.especialidade,
      opcao: t.opcao || '',
      cargo: '',
      nome: t.nome,
      epocaPrevista: t.dataTrrm,
      om: t.om,
    }));

    // Transform destaques to match frontend interface
    const transformedDestaques = allDestaques.map(d => ({
      posto: d.posto,
      corpo: '',
      quadro: d.quadro,
      especialidade: d.especialidade,
      opcao: d.opcao || '',
      cargo: d.cargo || '',
      nome: d.nome,
      emOutraOm: d.emOutraOm || '',
      deOutraOm: d.deOutraOm || '',
      periodo: d.periodo || '',
      om: d.om,
    }));

    // Transform curso to match frontend interface
    const transformedCurso = allConcurso.map(c => ({
      posto: c.posto,
      quadro: c.quadro,
      especialidade: c.especialidade,
      opcao: c.opcao || '',
      cargo: c.cargo,
      nome: c.nome,
      anoPrevisto: c.anoPrevisto,
      om: c.om,
    }));

    const responseData = {
      data: transformedData,
      desembarque: transformedDesembarque,
      embarque: transformedEmbarque,
      trrm: transformedTrrm,
      licencas: transformedLicencas,
      destaques: transformedDestaques,
      concurso: transformedCurso,
      setores: Array.from(allSetores).sort(),
      quadros: Array.from(allEspecialidades).sort(), // Return as quadros for frontend
      opcoes: Array.from(allOpcoes).sort(),
      oms: Array.from(allOMs).sort(),
      lastUpdate: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching PRAÇAS data:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

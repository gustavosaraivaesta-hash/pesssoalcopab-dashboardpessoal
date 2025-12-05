// Edge function for fetching PRAÇAS data

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
  especialidade: string;
  om: string;
  dataDesembarque: string;
  destino: string;
  motivo: string;
}

interface TrrmRecord {
  id: string;
  nome: string;
  posto: string;
  especialidade: string;
  om: string;
  dataTrrm: string;
}

interface LicencaRecord {
  id: string;
  nome: string;
  posto: string;
  especialidade: string;
  om: string;
  tipoLicenca: string;
  dataInicio: string;
  dataFim: string;
}

interface DestaqueRecord {
  id: string;
  nome: string;
  posto: string;
  especialidade: string;
  om: string;
  local: string;
  dataInicio: string;
  dataFim: string;
}

interface ConcursoRecord {
  id: string;
  nome: string;
  posto: string;
  especialidade: string;
  om: string;
  concurso: string;
  status: string;
}

// Sheet configurations for all OMs
const SHEET_CONFIGS = [
  { gid: '0', omName: 'DEPMSMRJ' },
  { gid: '527671707', omName: 'COPAB' },
  { gid: '280177623', omName: 'BAMRJ' },
  { gid: '1658824367', omName: 'CDU-BAMRJ' },
  { gid: '1650749150', omName: 'CDAM' },
  { gid: '957180492', omName: 'CDU-1DN' },
  { gid: '1495647476', omName: 'CMM' },
  { gid: '469479928', omName: 'CSUPAB' },
  { gid: '1610199360', omName: 'DEPSMRJ' },
  { gid: '567760228', omName: 'DEPCMRJ' },
  { gid: '1373834755', omName: 'DEPFMRJ' },
  { gid: '295069813', omName: 'DEPSIMRJ' },
];

async function fetchSheetData(spreadsheetId: string, gid: string, omName: string): Promise<{
  personnel: PersonnelRecord[];
  desembarque: DesembarqueRecord[];
  trrm: TrrmRecord[];
  licencas: LicencaRecord[];
  destaques: DestaqueRecord[];
  concurso: ConcursoRecord[];
  setores: string[];
  especialidades: string[];
  opcoes: string[];
}> {
  const personnel: PersonnelRecord[] = [];
  const desembarque: DesembarqueRecord[] = [];
  const trrm: TrrmRecord[] = [];
  const licencas: LicencaRecord[] = [];
  const destaques: DestaqueRecord[] = [];
  const concurso: ConcursoRecord[] = [];
  const setoresSet = new Set<string>();
  const especialidadesSet = new Set<string>();
  const opcoesSet = new Set<string>();

  try {
    console.log(`Fetching PRAÇAS from GID ${gid} (${omName})...`);
    
    // Use CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch GID ${gid}: ${response.status}`);
      return { personnel, desembarque, trrm, licencas, destaques, concurso, setores: [], especialidades: [], opcoes: [] };
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
      return row && row[index] ? row[index].trim() : '';
    };

    let currentSection = '';
    let personnelCounter = 0;
    let desembarqueCounter = 0;
    let trrmCounter = 0;
    let licencaCounter = 0;
    let destaqueCounter = 0;
    let concursoCounter = 0;
    let extraLotacaoCounter = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = getCell(row, 0).toUpperCase();
      
      // Detect section headers
      if (firstCell.includes('TABELA MESTRA') || firstCell.includes('TABELA_MESTRA')) {
        currentSection = 'TABELA_MESTRA';
        continue;
      } else if (firstCell === 'DESEMBARQUE' || firstCell.includes('PREVISÃO DE DESEMBARQUE')) {
        currentSection = 'DESEMBARQUE';
        continue;
      } else if (firstCell === 'TRRM' || firstCell.includes('PREVISÃO DE TRRM')) {
        currentSection = 'TRRM';
        continue;
      } else if (firstCell === 'LICENÇAS' || firstCell === 'LICENCAS' || firstCell.includes('LICENÇA')) {
        currentSection = 'LICENCAS';
        continue;
      } else if (firstCell === 'DESTAQUES' || firstCell.includes('DESTAQUE')) {
        currentSection = 'DESTAQUES';
        continue;
      } else if (firstCell === 'CONCURSO' || firstCell.includes('C-EMOS') || firstCell.includes('CONCURSO')) {
        currentSection = 'CONCURSO';
        continue;
      }

      // Skip header rows and common header keywords
      const skipKeywords = ['NEO', 'NOME', 'N°', 'Nº', 'TIPO SETOR', 'GRADUAÇÃO', 'POSTO', 
        'ESPECIALIDADE', 'DATA', 'MOTIVO', 'DESTINO', 'LOCAL', 'STATUS', 'CONCURSO',
        'PREVISÃO DE EMBARQUE', 'RESUMO DA SITUAÇÃO', 'OFICIAIS ADIDOS', 'CURSO', 
        'TIPO', 'PERÍODO', 'OBS', 'OBSERVAÇÃO', 'SO', '1SG', '2SG', '3SG', 'CB', 'MN',
        'SETOR', 'CARGO', 'OPÇÃO', 'QUADRO', 'EFETIVO', 'TMFT', 'VAGO'];
      if (firstCell === '' || skipKeywords.some(kw => firstCell === kw || firstCell.includes(kw))) {
        continue;
      }

      // Skip summary rows with percentages
      if (row.some(cell => cell && cell.includes('%'))) {
        continue;
      }

      // Process based on current section
      if (currentSection === 'TABELA_MESTRA') {
        const neo = getCell(row, 0);
        const tipoSetor = getCell(row, 1);
        const setor = getCell(row, 2);
        const cargo = getCell(row, 3);
        const postoTmft = getCell(row, 4);
        const especialidadeTmft = getCell(row, 5);
        const opcaoTmft = getCell(row, 6);
        const nome = getCell(row, 12);
        const postoEfe = getCell(row, 8);
        const especialidadeEfe = getCell(row, 9);
        const opcaoEfe = getCell(row, 10);

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

        // Regular personnel record - needs valid NEO
        if (neo && (postoTmft || cargo || nome)) {
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
          console.log(`${omName} NEO=${neo}: ${nome || 'VAGO'}`);
          
          if (setor) setoresSet.add(setor);
          if (especialidadeTmft) especialidadesSet.add(especialidadeTmft);
          if (especialidadeEfe) especialidadesSet.add(especialidadeEfe);
          if (opcaoTmft) opcoesSet.add(opcaoTmft);
          if (opcaoEfe) opcoesSet.add(opcaoEfe);
        }
      } else if (currentSection === 'DESEMBARQUE') {
        const nome = getCell(row, 0) || getCell(row, 1);
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'DESTINO', 'MOTIVO', 'PREVISÃO', 'EMBARQUE', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw));
        if (nome && nome.length > 2 && !isHeader) {
          desembarqueCounter++;
          const record: DesembarqueRecord = {
            id: `${omName}-DES-${desembarqueCounter}`,
            nome,
            posto: getCell(row, 1) || getCell(row, 2),
            especialidade: getCell(row, 2) || getCell(row, 3),
            om: omName,
            dataDesembarque: getCell(row, 3) || getCell(row, 4),
            destino: getCell(row, 4) || getCell(row, 5),
            motivo: getCell(row, 5) || getCell(row, 6),
          };
          desembarque.push(record);
          console.log(`${omName} Desembarque: ${nome}`);
        }
      } else if (currentSection === 'TRRM') {
        const nome = getCell(row, 0) || getCell(row, 1);
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'PREVISÃO', 'CURSO', 'RESUMO', 'SITUAÇÃO', 'OFICIAIS', 'ADIDOS'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw));
        if (nome && nome.length > 2 && !isHeader) {
          trrmCounter++;
          const record: TrrmRecord = {
            id: `${omName}-TRRM-${trrmCounter}`,
            nome,
            posto: getCell(row, 1) || getCell(row, 2),
            especialidade: getCell(row, 2) || getCell(row, 3),
            om: omName,
            dataTrrm: getCell(row, 3) || getCell(row, 4),
          };
          trrm.push(record);
          console.log(`${omName} TRRM: ${nome}`);
        }
      } else if (currentSection === 'LICENCAS') {
        const nome = getCell(row, 0) || getCell(row, 1);
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'TIPO', 'PERÍODO', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw));
        if (nome && nome.length > 2 && !isHeader) {
          licencaCounter++;
          const record: LicencaRecord = {
            id: `${omName}-LIC-${licencaCounter}`,
            nome,
            posto: getCell(row, 1) || getCell(row, 2),
            especialidade: getCell(row, 2) || getCell(row, 3),
            om: omName,
            tipoLicenca: getCell(row, 3) || getCell(row, 4),
            dataInicio: getCell(row, 4) || getCell(row, 5),
            dataFim: getCell(row, 5) || getCell(row, 6),
          };
          licencas.push(record);
          console.log(`${omName} Licença: ${nome}`);
        }
      } else if (currentSection === 'DESTAQUES') {
        const nome = getCell(row, 0) || getCell(row, 1);
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'LOCAL', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw));
        if (nome && nome.length > 2 && !isHeader) {
          destaqueCounter++;
          const record: DestaqueRecord = {
            id: `${omName}-DEST-${destaqueCounter}`,
            nome,
            posto: getCell(row, 1) || getCell(row, 2),
            especialidade: getCell(row, 2) || getCell(row, 3),
            om: omName,
            local: getCell(row, 3) || getCell(row, 4),
            dataInicio: getCell(row, 4) || getCell(row, 5),
            dataFim: getCell(row, 5) || getCell(row, 6),
          };
          destaques.push(record);
          console.log(`${omName} Destaque: ${nome}`);
        }
      } else if (currentSection === 'CONCURSO') {
        const nome = getCell(row, 0) || getCell(row, 1);
        const headerWords = ['NOME', 'GRADUAÇÃO', 'POSTO', 'ESPECIALIDADE', 'DATA', 'STATUS', 'CONCURSO', 'C-EMOS', 'CURSO', 'RESUMO', 'OFICIAIS', 'ADIDOS'];
        const isHeader = headerWords.some(hw => nome.toUpperCase().includes(hw));
        if (nome && nome.length > 2 && !isHeader) {
          concursoCounter++;
          const record: ConcursoRecord = {
            id: `${omName}-CONC-${concursoCounter}`,
            nome,
            posto: getCell(row, 1) || getCell(row, 2),
            especialidade: getCell(row, 2) || getCell(row, 3),
            om: omName,
            concurso: getCell(row, 3) || getCell(row, 4),
            status: getCell(row, 4) || getCell(row, 5),
          };
          concurso.push(record);
          console.log(`${omName} Concurso: ${nome}`);
        }
      }
    }

    console.log(`${omName}: ${personnel.length} personnel, ${desembarque.length} desembarque, ${trrm.length} trrm, ${licencas.length} licencas`);

  } catch (error) {
    console.error(`Error fetching GID ${gid} (${omName}):`, error);
  }

  return {
    personnel,
    desembarque,
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
    console.log('Fetching PRAÇAS data from all OMs...');
    
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
    const allTrrm: TrrmRecord[] = [];
    const allLicencas: LicencaRecord[] = [];
    const allDestaques: DestaqueRecord[] = [];
    const allConcurso: ConcursoRecord[] = [];
    const allSetores = new Set<string>();
    const allEspecialidades = new Set<string>();
    const allOpcoes = new Set<string>();
    const allOMs = new Set<string>();
    
    for (const result of results) {
      allPersonnel.push(...result.personnel);
      allDesembarque.push(...result.desembarque);
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

    const responseData = {
      personnel: allPersonnel,
      desembarque: allDesembarque,
      trrm: allTrrm,
      licencas: allLicencas,
      destaques: allDestaques,
      concurso: allConcurso,
      setores: Array.from(allSetores).sort(),
      especialidades: Array.from(allEspecialidades).sort(),
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

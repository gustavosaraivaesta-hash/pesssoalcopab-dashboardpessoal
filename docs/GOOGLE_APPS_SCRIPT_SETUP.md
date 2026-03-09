# Configuração do Google Apps Script para Sincronização Automática

## IMPORTANTE: Duas URLs Necessárias

O sistema utiliza **DUAS planilhas diferentes** (Oficiais e Praças), portanto você precisa criar **DOIS Apps Scripts** separados e configurar **DUAS URLs**:

1. **GOOGLE_APPS_SCRIPT_URL** - Para sincronização de PRAÇAS
2. **GOOGLE_APPS_SCRIPT_URL_OFICIAIS** - Para sincronização de OFICIAIS

## Passo 1: Criar o Apps Script (REPETIR PARA CADA PLANILHA)


1. Acesse [Google Apps Script](https://script.google.com)
2. Clique em "Novo Projeto"
3. **IMPORTANTE**: Você precisa criar **DOIS projetos separados** - um para cada planilha:
   - Projeto 1: "Sync Planilha PRAÇAS"
   - Projeto 2: "Sync Planilha OFICIAIS"
4. Cole o código abaixo no editor:

```javascript
function doPost(e) {
  try {
    // Parse incoming request
    const data = JSON.parse(e.postData.contents);
    const { action, spreadsheetId, sheetName, rowNumber, values } = data;
    
    console.log('Received:', { action, spreadsheetId, sheetName, rowNumber });
    
    // Open spreadsheet
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: `Aba "${sheetName}" não encontrada na planilha`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let result = { success: false, message: '' };
    
    switch (action) {
      case 'INCLUSAO':
        if (values && values.length > 0) {
          sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
          result = { 
            success: true, 
            message: `Linha ${rowNumber} inserida com sucesso na aba ${sheetName}` 
          };
        } else {
          result = { success: false, message: 'Valores não fornecidos' };
        }
        break;
        
      case 'ALTERACAO':
        if (values && values.length > 0 && rowNumber) {
          sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
          result = { 
            success: true, 
            message: `Linha ${rowNumber} atualizada com sucesso na aba ${sheetName}` 
          };
        } else {
          result = { success: false, message: 'Valores ou número de linha não fornecidos' };
        }
        break;
        
      case 'EXCLUSAO':
        if (rowNumber) {
          sheet.deleteRow(rowNumber);
          result = { 
            success: true, 
            message: `Linha ${rowNumber} excluída com sucesso na aba ${sheetName}` 
          };
        } else {
          result = { success: false, message: 'Número de linha não fornecido' };
        }
        break;
        
      default:
        result = { success: false, message: `Ação desconhecida: ${action}` };
    }
    
    console.log('Result:', result);
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: `Erro: ${error.toString()}`
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Sync service is running',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função para testar manualmente
function testPost() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        action: 'ALTERACAO',
        spreadsheetId: 'COLE_O_ID_DA_SUA_PLANILHA_AQUI',
        sheetName: 'COPAB',
        rowNumber: 5,
        values: ['teste1', 'teste2', 'teste3']
      })
    }
  };
  
  const result = doPost(testData);
  console.log(result.getContent());
}
```

## Passo 2: Implantar como Aplicativo Web

**CRÍTICO - Siga EXATAMENTE estes passos:**

1. Clique em **Implantar** (Deploy) > **Nova implantação** (New deployment)
2. Clique no ícone de **engrenagem** ⚙️ ao lado de "Selecione o tipo"
3. Selecione **Aplicativo da Web** (Web app)
4. Configure:
   - **Descrição**: Sync Planilha [PRAÇAS ou OFICIAIS]
   - **Executar como**: **Eu** (sua conta)
   - **Quem pode acessar**: **Qualquer pessoa** (Anyone)
5. Clique em **Implantar**
6. **AUTORIZE O ACESSO**: Uma janela vai abrir pedindo permissões
   - Clique em "Revisar permissões"
   - Escolha sua conta do Google
   - Se aparecer "Google não verificou este app", clique em "Avançado" e depois "Ir para [nome do projeto] (não seguro)"
   - Clique em "Permitir"
7. **Copie a URL do Aplicativo Web** que aparece (deve terminar em `/exec`)
8. Guarde esta URL - você vai precisar dela no próximo passo

**Repita todo o processo acima para criar o segundo Apps Script!**

## Passo 3: Configurar os Secrets no Lovable

1. **Para PRAÇAS**: Configure o secret `GOOGLE_APPS_SCRIPT_URL` com a URL do Apps Script da planilha de Praças
2. **Para OFICIAIS**: Configure o secret `GOOGLE_APPS_SCRIPT_URL_OFICIAIS` com a URL do Apps Script da planilha de Oficiais
3. Ambas as URLs devem terminar em `/exec`

## Teste

Após configurar, faça uma solicitação de teste:
1. Faça login como uma OM
2. Crie uma nova solicitação de INCLUSÃO
3. Faça login como COPAB e aprove a solicitação
4. Verifique se os dados foram adicionados à planilha correspondente

## Mapeamento de Colunas

O sistema mapeia os campos da seguinte forma:
- A: NEO
- B: Tipo Setor
- C: Setor
- D: Cargo/Incumbência
- E: Graduação TMFT
- F: Quadro TMFT
- G: Especialidade TMFT
- H: Opção TMFT
- I: Graduação EFE
- J: Quadro EFE
- K: Especialidade EFE
- L: Opção EFE
- M: Nome

## Troubleshooting

### Erro de autorização
- Certifique-se de que o Apps Script tem permissão para acessar a planilha
- Re-implante o script se necessário

### Dados não aparecem na planilha
- Verifique os logs do Apps Script em **Visualizar** > **Execuções**
- Verifique os logs da Edge Function no painel de administração

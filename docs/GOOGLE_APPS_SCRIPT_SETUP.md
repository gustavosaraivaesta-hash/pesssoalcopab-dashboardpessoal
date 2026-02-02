# Configuração do Google Apps Script para Sincronização Automática

## Passo 1: Criar o Apps Script

1. Acesse [Google Apps Script](https://script.google.com)
2. Clique em "Novo Projeto"
3. Renomeie o projeto para "Sync Planilha Pessoal"
4. Cole o código abaixo no editor:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { action, spreadsheetId, sheetName, rowNumber, values, neo } = data;
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: `Aba ${sheetName} não encontrada`
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    let result = { success: false, message: '' };
    
    switch (action) {
      case 'INCLUSAO':
        // Insert new row with values
        if (values && values.length > 0) {
          sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
          result = { success: true, message: `Linha ${rowNumber} inserida com sucesso` };
        }
        break;
        
      case 'ALTERACAO':
        // Update existing row
        if (values && values.length > 0 && rowNumber) {
          sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
          result = { success: true, message: `Linha ${rowNumber} atualizada com sucesso` };
        }
        break;
        
      case 'EXCLUSAO':
        // Delete row (clear contents or delete entire row)
        if (rowNumber) {
          // Option 1: Clear the row contents
          // sheet.getRange(rowNumber, 1, 1, 13).clearContent();
          
          // Option 2: Delete the entire row
          sheet.deleteRow(rowNumber);
          result = { success: true, message: `Linha ${rowNumber} excluída com sucesso` };
        }
        break;
        
      default:
        result = { success: false, message: `Ação desconhecida: ${action}` };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Sync service is running'
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## Passo 2: Implantar como Aplicativo Web

1. Clique em **Implantar** > **Nova implantação**
2. Clique no ícone de engrenagem e selecione **Aplicativo da Web**
3. Configure:
   - **Descrição**: Sync Planilha Pessoal
   - **Executar como**: Eu (seu email)
   - **Quem pode acessar**: Qualquer pessoa
4. Clique em **Implantar**
5. Autorize o acesso à planilha quando solicitado
6. **Copie a URL** do aplicativo web (será algo como `https://script.google.com/macros/s/xxx/exec`)

## Passo 3: Configurar o Secret no Lovable

1. A URL copiada deve ser adicionada ao secret `GOOGLE_APPS_SCRIPT_URL`
2. O sistema já está configurado para usar essa URL automaticamente

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

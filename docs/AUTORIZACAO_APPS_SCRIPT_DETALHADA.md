# Guia Detalhado: Autorização do Google Apps Script

## ⚠️ PROBLEMA ATUAL

O Apps Script está retornando erro HTML em vez de JSON, o que indica **falta de autorização adequada**.

## 🔧 SOLUÇÃO PASSO A PASSO

### PARTE 1: Verificar/Recriar a Implantação

1. **Acesse o Apps Script**
   - Vá em https://script.google.com
   - Abra o projeto do Apps Script (PRAÇAS ou OFICIAIS)

2. **DELETAR Implantação Antiga** (importante!)
   - Clique em **Implantar** (canto superior direito)
   - Clique em **Gerenciar implantações**
   - Clique nos **3 pontos (...)** da implantação existente
   - Escolha **Arquivar** ou **Excluir**
   - Feche a janela

3. **Criar NOVA Implantação**
   - Clique em **Implantar** novamente
   - Escolha **Nova implantação**
   - Clique no ícone de **engrenagem ⚙️** ao lado de "Selecione o tipo"
   - Selecione **Aplicativo da Web**

4. **Configurar CORRETAMENTE** (CRÍTICO!)
   ```
   Descrição: Sync Planilha OFICIAIS (ou PRAÇAS)
   
   Executar como: EU (sua conta) ← DEVE SER "EU"
   
   Quem pode acessar: Qualquer pessoa ← DEVE SER "QUALQUER PESSOA"
   ```

5. **Implantar e AUTORIZAR**
   - Clique em **Implantar**
   - Uma janela vai abrir pedindo **autorização**
   - **IMPORTANTE**: Se não abrir a janela de autorização, o processo falhou!

### PARTE 2: Processo de Autorização

**PASSO 1**: Janela "Autorização necessária"
- Deve aparecer: "Este projeto precisa de permissão para..."
- Clique em **Revisar permissões** ou **Autorizar**

**PASSO 2**: Escolha sua Conta Google
- Selecione a conta que tem acesso à planilha
- **ATENÇÃO**: Use a MESMA conta dona da planilha!

**PASSO 3**: Tela de Segurança (NORMAL!)
Você verá: **"Google não verificou este app"**

**NÃO SE ASSUSTE!** Isso é esperado. Faça o seguinte:

1. Clique em **"Avançado"** (link pequeno embaixo)
2. Vai aparecer mais texto
3. Procure e clique em **"Ir para [nome do projeto] (não seguro)"**
   - O link está no final do texto
   - É seguro porque é o SEU próprio script!

**PASSO 4**: Conceder Permissões
- Você verá uma lista de permissões necessárias:
  ```
  Ver e gerenciar suas planilhas no Google Drive
  Conectar a um serviço externo
  ```
- Clique em **Permitir** ou **Conceder acesso**

**PASSO 5**: Confirmar Sucesso
- Você volta para a tela do Apps Script
- Aparece uma mensagem: "Nova implantação criada"
- Aparece a **URL do Aplicativo Web** (termina em `/exec`)

### PARTE 3: Configurar a URL no Sistema

1. **Copie a URL** que apareceu (deve terminar em `/exec`)
   
2. **Configure o Secret no Lovable:**
   - Para PRAÇAS: Use o secret `GOOGLE_APPS_SCRIPT_URL`
   - Para OFICIAIS: Use o secret `GOOGLE_APPS_SCRIPT_URL_OFICIAIS`

3. **Cole a URL** no campo do secret

### PARTE 4: Testar

**Teste Manual no Apps Script:**

1. No Apps Script, clique em **Executar** > **testPost**
2. Edite a linha 118 do código:
   ```javascript
   spreadsheetId: 'COLE_O_ID_DA_SUA_PLANILHA_AQUI'
   ```
3. Cole o ID da sua planilha (da URL da planilha)
4. Clique em **Executar** (▶️) novamente
5. Deve aparecer nos logs: `{ success: true, message: "Linha 5 atualizada..." }`

**Teste no Sistema:**

1. Faça login como uma OM
2. Crie uma solicitação de ALTERAÇÃO
3. Aprove a solicitação
4. Verifique se os dados foram atualizados na planilha

## 🚨 PROBLEMAS COMUNS

### "Google não verificou este app" não mostra "Avançado"

**Solução**: 
- Use o navegador Chrome ou Edge
- Desative bloqueadores de pop-up
- Limpe o cache e cookies
- Tente em modo anônimo/privado

### Erro "Não é possível acessar a planilha"

**Causa**: Conta errada foi usada na autorização

**Solução**:
1. No Apps Script, vá em **Implantar** > **Gerenciar implantações**
2. Delete a implantação
3. Refaça TODO o processo usando a conta DONA da planilha

### URL não termina em /exec

**Causa**: Copiou URL errada

**Solução**:
- Vá em **Implantar** > **Gerenciar implantações**
- Copie a URL que está em **URL do aplicativo da Web**
- NÃO use a URL da barra de endereços do navegador!

### "Esse script está desativado"

**Causa**: Configuração "Executar como" está errada

**Solução**:
1. Vá em **Implantar** > **Gerenciar implantações**
2. Clique nos 3 pontos (...) > **Editar**
3. Mude **"Executar como"** para **"Eu"**
4. Clique em **Implantar**
5. Autorize novamente quando solicitado

## ✅ CHECKLIST DE VERIFICAÇÃO

Antes de testar, confirme:

- [ ] Implantação configurada como **"Executar como: Eu"**
- [ ] Implantação configurada como **"Quem pode acessar: Qualquer pessoa"**
- [ ] Processo de autorização foi COMPLETADO (clicou em "Permitir")
- [ ] URL copiada termina em `/exec`
- [ ] URL foi colada no secret correto (PRAÇAS ou OFICIAIS)
- [ ] Usou a conta Google que TEM ACESSO à planilha

## 📞 AINDA COM PROBLEMAS?

Se após seguir TODOS os passos o erro persistir:

1. Tire um print da tela de "Gerenciar implantações"
2. Tire um print da mensagem de erro no sistema
3. Compartilhe para análise mais detalhada

## 📝 OBSERVAÇÕES IMPORTANTES

- **SEMPRE** use a mesma conta Google que tem acesso à planilha
- **SEMPRE** autorize quando solicitado (não pode pular esta etapa!)
- **SEMPRE** escolha "Qualquer pessoa" no "Quem pode acessar"
- **SEMPRE** copie a URL da aba "Gerenciar implantações", não da barra do navegador
- Você precisa repetir este processo para AMBAS as planilhas (PRAÇAS e OFICIAIS)

# Corrigir TTC na soma do efetivo

## Alterações
- Incluir militares TTC na contagem de EFETIVO quando filtros de posto, quadro, corpo, especialidade ou graduação estiverem ativos.
- Manter a exclusão de TTC somente quando o usuário selecionar explicitamente outra opção de vínculo.
- Aplicar a mesma regra nos painéis e PDFs de Oficiais e Praças, incluindo os resumos geral, filtrado e por OM.
- Conferir que EFETIVO, VAGOS e AT. TOTAL sejam recalculados com o TTC incluído.

## Validação
- Verificar os cálculos com filtro estrutural ativo e sem filtro de vínculo.
- Confirmar que selecionar CARREIRA ou TTC isoladamente ainda limita corretamente os resultados.
- Validar a geração do projeto sem erros.

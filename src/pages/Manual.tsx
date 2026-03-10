import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// jsPDF loaded dynamically on export only

const MANUAL_VERSION = "1.5";
const MANUAL_DATE = new Date().toLocaleDateString("pt-BR");

const manualSections = [
  {
    id: "visao-geral",
    title: "1. Visão Geral do Sistema",
    content: `O Sistema de Dashboard de Pessoal COPAB é uma aplicação web desenvolvida para o acompanhamento e gestão do efetivo militar da Marinha do Brasil. O sistema permite visualizar, filtrar e exportar dados de pessoal em tempo real, com dashboards interativos e relatórios detalhados.

Principais características:
• Dashboards interativos para Praças, Oficiais, OMs e TTC
• Atualização automática dos dados a cada 5 minutos
• Atualização imediata ao retornar à aba do navegador
• Sincronização com planilhas Google Sheets a cada 30 minutos
• Exportação de relatórios em PDF, Excel (XLSX) e Word (DOCX)
• Sistema de solicitações de alteração de pessoal
• Funcionamento offline com cache local
• Controle de acesso por OM`,
  },
  {
    id: "login",
    title: "2. Acesso ao Sistema",
    content: `Para acessar o sistema:

1. Acesse a URL do sistema no navegador
2. Na tela de login, insira seu usuário (sigla da OM) e senha
3. Clique em "Entrar"

Observações:
• O usuário é a sigla da OM em letras maiúsculas (ex: COPAB, BAMRJ)
• Caso não consiga acessar, entre em contato com o administrador
• O sistema mantém a sessão ativa, não sendo necessário logar novamente ao reabrir o navegador
• Em caso de inatividade prolongada, será necessário realizar login novamente`,
  },
  {
    id: "dashboard-principal",
    title: "3. Dashboard Principal (Oficiais)",
    content: `O dashboard principal exibe os dados consolidados do efetivo de Oficiais. Ao fazer login, você será direcionado automaticamente para esta tela.

Cards de Métricas (topo):
• NEO (Necessidade de Efetivo por OM) – Total de vagas previstas
• EXI (Existente) – Total de militares existentes
• DIF (Diferença) – Diferença entre NEO e EXI (negativo = falta, positivo = excesso)
• AT. TOTAL (Atendimento Total) – Percentual de atendimento geral
• SEM NEO – Militares sem NEO atribuída

Filtros disponíveis:
• OM – Filtra por Organização Militar
• Graduação – Filtra por posto/graduação
• Especialidade – Filtra por especialidade militar

Gráficos:
• Totais por OM – Comparativo NEO vs EXI por OM
• Distribuição por Graduação – Distribuição do efetivo por posto
• Diferença por Graduação – Vagas e excessos por graduação

Tabelas:
• Efetivo Completo – Tabela detalhada com todos os dados
• Efetivo Extra Lotação – Militares em extra lotação`,
  },
  {
    id: "dashboard-pracas",
    title: "4. Dashboard de Praças",
    content: `Acessível pelo menu "Dashboard Praças" no topo da página. Possui a mesma estrutura do dashboard de Oficiais, porém com dados específicos de Praças.

Graduações de Praças:
• SO (Suboficial)
• SG (1º, 2º e 3º Sargentos)
• CB (Cabo)
• MN (Marinheiro)

Funcionalidades idênticas ao dashboard de Oficiais:
• Mesmos cards de métricas
• Mesmos filtros (OM, Graduação, Especialidade)
• Mesmos gráficos e tabelas
• Mesmas opções de exportação`,
  },
  {
    id: "dashboard-om",
    title: "5. Dashboard de OM",
    content: `O Dashboard de OM apresenta dados consolidados por Organização Militar, incluindo setores e cargos.

Informações disponíveis:
• Detalhamento por setor dentro da OM
• Cargos e funções
• Postos previstos (TMFT) vs existentes
• Identificação de vagas e excessos
• Situação individual de cada militar

Filtros específicos:
• OM
• Setor
• Cargo
• Graduação`,
  },
  {
    id: "dashboard-ttc",
    title: "6. Dashboard TTC",
    content: `O Dashboard TTC (Tabela de Tempo de Comissão) apresenta informações sobre o tempo de serviço e movimentações dos militares.

Dados apresentados:
• Tempo de comissão dos militares na OM
• Previsão de término de comissão
• Militares próximos da movimentação
• Histórico de movimentações`,
  },
  {
    id: "exportacoes",
    title: "7. Exportação de Relatórios",
    content: `O sistema oferece exportação em três formatos, todos sincronizados com os filtros ativos:

PDF:
• Relatório visual com tabelas formatadas
• Legendas coloridas: Laranja (Fora da NEO), Azul Claro (Efetivo Extra), Amarelo (SEM NEO), Vermelho (Vagas), Verde Claro (SEM NEO)
• Cabeçalho com brasão da República e informações da OM

Excel (XLSX):
• Abas dedicadas: "Resumo", "Efetivo Completo" e tabelas auxiliares
• Dados filtrados conforme dashboard
• Formatação preservada

Word (DOCX):
• Orientação paisagem
• Mesma lógica visual do PDF
• Destaques coloridos preservados

Como exportar:
1. Aplique os filtros desejados no dashboard
2. Clique no ícone de exportação (📄)
3. Selecione o formato desejado (PDF, Excel ou Word)
4. O arquivo será baixado automaticamente`,
  },
  {
    id: "solicitacoes",
    title: "8. Sistema de Solicitações",
    content: `O sistema permite que OMs solicitem alterações no efetivo. Acesse pelo menu "Solicitações".

Tipos de solicitação:
• INCLUSÃO – Solicitar inclusão de novo militar
• ALTERAÇÃO – Solicitar alteração de dados existentes
• EXCLUSÃO – Solicitar exclusão de militar

Fluxo:
1. A OM cria a solicitação com justificativa
2. O status inicial é "PENDENTE"
3. O administrador analisa (status "EM_ANÁLISE")
4. O administrador aprova ou rejeita a solicitação
5. Se aprovada, os dados são atualizados automaticamente

Status possíveis:
• PENDENTE – Aguardando análise
• EM_ANÁLISE – Em análise pelo administrador
• APROVADO – Solicitação aprovada e executada
• REJEITADO – Solicitação rejeitada (com justificativa)`,
  },
  {
    id: "administracao",
    title: "9. Área Administrativa",
    content: `A área administrativa é restrita e protegida por senha adicional. Para acessar, clique no ícone de configurações (⚙️) e insira a senha de administrador.

Funcionalidades administrativas:
• Gerenciar Usuários – Criar, editar e remover usuários do sistema
• Gerenciar Solicitações – Analisar e aprovar/rejeitar solicitações das OMs
• Histórico – Visualizar histórico de todas as alterações realizadas

Gerenciamento de Usuários:
• Cada usuário está vinculado a uma OM
• É possível atribuir OMs adicionais a um usuário
• Senhas podem ser redefinidas pelo administrador`,
  },
  {
    id: "atualizacao-dados",
    title: "10. Atualização dos Dados",
    content: `Os dados do sistema são mantidos atualizados através de múltiplos mecanismos:

Atualização Automática na Interface:
• Os dashboards atualizam automaticamente a cada 5 minutos
• Ao retornar à aba do navegador, os dados são atualizados imediatamente

Sincronização com Google Sheets:
• A cada 30 minutos, o sistema sincroniza com as planilhas fonte
• Jobs automáticos (pg_cron) disparam as funções de busca de dados

Atualização Manual:
• Clique no botão de atualizar (🔄) no topo do dashboard para forçar uma atualização imediata

Cache Offline:
• Os dados são armazenados localmente para funcionamento offline
• Ao reconectar, o sistema sincroniza automaticamente`,
  },
  {
    id: "funcionalidades-offline",
    title: "11. Funcionamento Offline",
    content: `O sistema possui suporte a funcionamento offline através de cache local:

• Os dados são salvos automaticamente no dispositivo
• Em caso de queda de internet, os últimos dados carregados permanecem disponíveis
• Um indicador visual mostra o status da conexão (Online/Offline)
• Ao restabelecer a conexão, os dados são atualizados automaticamente

Limitações do modo offline:
• Não é possível criar ou gerenciar solicitações
• Os dados podem estar desatualizados
• Exportações utilizam os dados em cache`,
  },
  {
    id: "dicas",
    title: "12. Dicas e Boas Práticas",
    content: `• Utilize os filtros para focar nos dados relevantes antes de exportar
• Verifique o horário da última atualização no topo do dashboard
• Em caso de dados inconsistentes, force uma atualização manual
• Mantenha o navegador atualizado para melhor desempenho
• Para instalar como aplicativo no celular, acesse a página de instalação
• Relate problemas ou sugestões ao administrador do sistema
• As exportações respeitam os filtros aplicados – verifique antes de exportar`,
  },
];

const Manual = () => {
  const navigate = useNavigate();

  const generatePDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addPageIfNeeded = (neededSpace: number) => {
      if (y + neededSpace > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    };

    // Title page
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Manual do Sistema", pageWidth / 2, 80, { align: "center" });
    doc.setFontSize(18);
    doc.text("Dashboard de Pessoal COPAB", pageWidth / 2, 95, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Versão ${MANUAL_VERSION}`, pageWidth / 2, 120, { align: "center" });
    doc.text(`Data: ${MANUAL_DATE}`, pageWidth / 2, 130, { align: "center" });
    doc.text("Marinha do Brasil", pageWidth / 2, 150, { align: "center" });

    // Content pages
    manualSections.forEach((section) => {
      doc.addPage();
      y = 20;

      // Section title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(section.title, maxWidth);
      addPageIfNeeded(titleLines.length * 8 + 10);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 5;

      // Draw line under title
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Section content
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const contentLines = doc.splitTextToSize(section.content, maxWidth);

      contentLines.forEach((line: string) => {
        addPageIfNeeded(7);
        doc.text(line, margin, y);
        y += 6;
      });
    });

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Manual do Dashboard COPAB - v${MANUAL_VERSION} - Página ${i} de ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
      doc.setTextColor(0, 0, 0);
    }

    doc.save(`Manual_Dashboard_COPAB_v${MANUAL_VERSION}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[hsl(var(--primary))] text-primary-foreground p-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <BookOpen className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Manual do Sistema</h1>
              <p className="text-xs opacity-80">
                Versão {MANUAL_VERSION} • Atualizado em {MANUAL_DATE}
              </p>
            </div>
          </div>
          <Button
            onClick={generatePDF}
            variant="secondary"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Dashboard de Pessoal COPAB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Este manual contém todas as informações necessárias para utilização do sistema. 
              Navegue pelas seções abaixo ou baixe o PDF para consulta offline.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {manualSections.map((s) => (
                <Badge key={s.id} variant="outline" className="text-xs">
                  {s.title.split(". ")[1]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Accordion type="multiple" className="space-y-2">
          {manualSections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                {section.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          Manual gerado automaticamente pelo sistema. Em caso de dúvidas, entre em contato com o administrador.
        </p>
      </div>
    </div>
  );
};

export default Manual;

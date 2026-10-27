import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisBalance, AnalysisMove, AnalysisSuggestion } from "./realocationAnalysis";

interface RealocationPdfInput {
  category: string;
  specialty: string;
  om: string;
  vinculo: string;
  updatedAt: number;
  balances: AnalysisBalance[];
  filtered: AnalysisBalance[];
  suggestions: AnalysisSuggestion[];
  moves: AnalysisMove[];
}

/** Read-only snapshot of the current view and the complete simulated sequence. */
export function createRealocationPdf(input: RealocationPdfInput) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  doc.setProperties({ title: "COpAb — Análise de realocação", subject: "Simulação sem alteração dos dados de origem", author: "COpAb" });
  const tokenColor = (token: string): [number, number, number] => {
    const element = document.createElement("span");
    element.style.color = `hsl(var(--${token}))`;
    document.body.appendChild(element);
    const values = getComputedStyle(element).color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    element.remove();
    return values?.length === 3 ? [values[0], values[1], values[2]] : [0, 0, 0];
  };
  const primary = tokenColor("primary");
  const primaryForeground = tokenColor("primary-foreground");
  const original = new Map(input.balances.map(item => [item.id, item]));
  const issued = new Date().toLocaleString("pt-BR");
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = 28;
  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y, margin: { top: 28, bottom: 17, left: 14, right: 14 },
      head: [head], body, theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, overflow: "linebreak" },
      headStyles: { fillColor: primary, textColor: primaryForeground, fontStyle: "bold" },
      rowPageBreak: "avoid",
    });
    const state = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    y = (state.lastAutoTable?.finalY ?? y) + 10;
  };
  const section = (title: string) => {
    if (y > height - 45) { doc.addPage(); y = 28; }
    doc.setTextColor(25, 25, 25);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(title, 14, y); y += 7;
  };
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const filters = doc.splitTextToSize(`Recorte: ${input.category} | Especialidade: ${input.specialty} | OM: ${input.om} | Vínculo: ${input.vinculo}`, width - 28);
  doc.text(filters, 14, y); y += filters.length * 5 + 3;
  doc.text(`Consulta dos dados: ${input.updatedAt ? new Date(input.updatedAt).toLocaleString("pt-BR") : "Não informada"}`, 14, y); y += 9;
  section("Resumo do recorte após simulação");
  table(["Excedentes", "Necessidades", "Realocação ainda possível", "Realocados na simulação (todas as categorias)"], [[
    input.filtered.reduce((sum, item) => sum + Math.max(0, item.actual - item.planned), 0),
    input.filtered.reduce((sum, item) => sum + Math.max(0, item.planned - item.actual), 0),
    input.suggestions.reduce((sum, item) => sum + item.quantity, 0),
    input.moves.reduce((sum, item) => sum + item.quantity, 0),
  ]]);
  const moveHead = ["Etapa", "Categoria", "Especialidade", "Posto/Grad.", "Corpo", "Vínculo", "Origem", "Destino", "Quantidade"];
  section("Sugestões restantes no recorte selecionado");
  table(moveHead, input.suggestions.length ? input.suggestions.map((move, index) => [index + 1, move.source.category, move.source.specialty, move.source.rank, move.source.corpo || "—", move.source.vinculo, move.source.om, move.target.om, move.quantity]) : [["—", "Nenhuma sugestão compatível disponível", "", "", "", "", "", "", 0]]);
  section("Sequência simulada — todas as categorias e filtros");
  table(moveHead, input.moves.length ? input.moves.map((move, index) => {
    const source = original.get(move.sourceId);
    const target = original.get(move.targetId);
    return [index + 1, source?.category || "—", source?.specialty || "—", source?.rank || "—", source?.corpo || "—", source?.vinculo || "—", source?.om || "—", target?.om || "—", move.quantity];
  }) : [["—", "Nenhuma realocação simulada", "", "", "", "", "", "", 0]]);
  section("Balanço por OM e perfil — recorte selecionado");
  table(["OM", "Especialidade", "Posto/Grad.", "Corpo", "Vínculo", "TMFT", "Pessoal real", "Simulado", "Excedente", "Necessidade"], input.filtered.map(item => [item.om, item.specialty, item.rank, item.corpo || "—", item.vinculo, item.planned, original.get(item.id)?.actual ?? 0, item.actual, Math.max(0, item.actual - item.planned), Math.max(0, item.planned - item.actual)]));
  section("Critérios e ressalvas");
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const notes = doc.splitTextToSize("Somente análise: nenhuma realocação altera efetivos, vagas ou planilhas. Compatibilidade por categoria, especialidade equivalente, posto/graduação, vínculo e corpo. Pessoal real inclui SEM NEO e exclui licenças e destaques auxiliares; não equivale à ocupação das vagas da NEO. Disponibilidade individual sujeita à avaliação da OM. Sugestões restantes são calculadas após a sequência simulada.", width - 28);
  doc.text(notes, 14, y);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setTextColor(...primary); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("COpAb | Análise de realocação", 14, 15);
    doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("SOMENTE ANÁLISE — SEM ALTERAÇÃO DOS DADOS", width - 14, 15, { align: "right" });
    doc.text(`Emitido em ${issued}`, 14, height - 8);
    doc.text(`Página ${page} de ${pages}`, width - 14, height - 8, { align: "right" });
  }
  return doc;
}
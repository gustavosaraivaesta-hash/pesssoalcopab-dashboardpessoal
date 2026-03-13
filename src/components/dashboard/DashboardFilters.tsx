import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterOptions, MilitaryData } from "@/types/military";
import { X, FileText, Filter, RefreshCw, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import brasaoRepublica from "@/assets/brasao-republica.png";
import { ExtraLotacaoRow } from "@/components/dashboard/ExtraLotacaoTable";

const ESPECIALIDADES = [
  "NEO 1",
  "NEO 2",
  "NEO 3",
  "NEO 4",
  "NEO 5",
  "NEO 6",
  "NEO 7",
  "NEO 8",
  "NEO 9",
  "NEO 10",
  "NEO 11",
  "NEO 12",
  "NEO 13",
  "NEO 14",
  "NEO 15",
  "NEO 16",
  "NEO 17",
  "NEO 18",
  "NEO 19",
  "NEO 20",
  "MANOBRAS E REPAROS (MR)",
  "MÁQUINAS (MA)",
  "CALDEIRA (CA)",
  "COMUNICAÇÕES NAVAIS (CN)",
  "SINAIS (SI)",
  "ELETRICIDADE (EL)",
  "SISTEMAS DE CONTROLE E ELETRICIDADE (CE)",
  "ARMAMENTO (AM)",
  "MOTORES (MO)",
  "ARRUMADOR (AR)",
  "COZINHEIRO (CO)",
  "COMUNICAÇÕES INTERIORES (CI)",
  "CARPINTARIA (CP)",
  "ARTÍFICE DE METALURGIA (MT)",
  "ELETRÔNICA (ET)",
  "ARTÍFICE DE MECÂNICA (MC)",
  "AVIAÇÃO (AV)",
  "DIREÇÃO DE TIRO (DT)",
  "HIDROGRAFIA E NAVEGAÇÃO (HN)",
  "OPERADOR DE RADAR (OR)",
  "OPERADOR DE SONAR (OS)",
  "ESCRITA (ES)",
  "PAIOL (PL)",
  "CONTABILIDADE (CL)",
  "PROCESSAMENTO DE DADOS (PD)",
  "ADMINISTRAÇÃO (AD)",
  "COMUNICAÇÃO SOCIAL (CS)",
  "NUTRIÇÃO E DIETÉTICA (ND)",
  "PATOLOGIA CLÍNICA (PC)",
  "HIGIENE DENTAL (HD)",
  "QUÍMICA (QI)",
  "ENFERMAGEM (EF)",
  "EDUCAÇÃO FÍSICA (EP)",
  "BARBEIRO (BA)",
  "ARQUITETURA E URBANISMO (DA)",
  "SECRETARIADO (SC)",
  "ELETROTÉCNICA (TE)",
  "MECÂNICA (MI)",
  "MARCENARIA (NA)",
  "MOTORES (MS)",
  "ELETRÔNICA (EO)",
  "METALURGIA (ML)",
  "ESTATÍSTICA (AE)"
];

interface DashboardFiltersProps {
  filterOptions: FilterOptions;
  selectedFilters: {
    categoria: "TODOS" | "PRAÇAS" | "OFICIAIS";
    om: string[];
    especialidade: string[];
    pessoal: string[];
  };
  onFilterChange: (filterType: string, values: string[] | "TODOS" | "PRAÇAS" | "OFICIAIS") => void;
  filteredData: MilitaryData[];
  metrics: {
    totalTMFT: number;
    totalEXI: number;
    totalDIF: number;
    occupancyPercent?: string;
  };
  chartRef: React.RefObject<HTMLDivElement>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onManual?: () => void;
  extraLotacaoRows?: ExtraLotacaoRow[];
  extraLotacaoTotal?: number;
}

export const DashboardFilters = ({ 
  filterOptions, 
  selectedFilters, 
  onFilterChange,
  filteredData,
  metrics,
  chartRef,
  onRefresh,
  isRefreshing = false,
  onManual,
  extraLotacaoRows = [],
  extraLotacaoTotal = 0,
}: DashboardFiltersProps) => {
  const [open, setOpen] = useState(false);

  const handleCheckboxChange = (filterType: string, value: string, checked: boolean) => {
    const currentFilter = selectedFilters[filterType as keyof typeof selectedFilters];
    
    // Skip categoria as it's handled separately
    if (filterType === 'categoria' || !Array.isArray(currentFilter)) return;
    
    if (checked) {
      onFilterChange(filterType, [...currentFilter, value]);
    } else {
      onFilterChange(filterType, currentFilter.filter(v => v !== value));
    }
  };

  const hasSelectedFilters = selectedFilters.om.length > 0 || selectedFilters.pessoal.length > 0;

  const handleRemoveFilter = (filterType: 'om' | 'especialidade' | 'pessoal', value: string) => {
    const newValues = selectedFilters[filterType].filter(v => v !== value);
    onFilterChange(filterType, newValues);
  };

  const handleGeneratePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const html2canvas = (await import('html2canvas')).default;
    
    try {
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // Load brasão
      const brasaoImg = new Image();
      brasaoImg.src = brasaoRepublica;
      await new Promise((resolve) => { brasaoImg.onload = resolve; });

      // Helper to check and add new page
      const checkNewPage = (currentY: number, neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 20) {
          pdf.addPage();
          return 20;
        }
        return currentY;
      };

      // ====== CAPA / HEADER ======
      pdf.addImage(brasaoImg, "PNG", (pageWidth - 20) / 2, yPos, 20, 24);
      yPos += 28;

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("CENTRO DE OPERAÇÕES DO ABASTECIMENTO", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      const categoriaLabel = selectedFilters.categoria === "TODOS" 
        ? "PRAÇAS E OFICIAIS" 
        : selectedFilters.categoria;
      pdf.setFontSize(14);
      pdf.text(`Tabela Mestra de Força de Trabalho - ${categoriaLabel}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      // Data de geração
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const now = new Date();
      pdf.text(`Gerado em: ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR")}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Filtros aplicados
      const hasFilters = selectedFilters.om.length > 0 || selectedFilters.pessoal.length > 0 || selectedFilters.especialidade.length > 0;
      if (hasFilters) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Filtros Aplicados:", 14, yPos);
        yPos += 6;
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        let filterX = 20;
        if (selectedFilters.om.length > 0) {
          pdf.text(`OM: ${selectedFilters.om.join(", ")}`, filterX, yPos);
          filterX += 80;
        }
        if (selectedFilters.pessoal.length > 0) {
          pdf.text(`Pessoal: ${selectedFilters.pessoal.join(", ")}`, filterX, yPos);
          filterX += 80;
        }
        if (selectedFilters.especialidade.length > 0) {
          pdf.text(`Especialidade: ${selectedFilters.especialidade.join(", ")}`, filterX, yPos);
        }
        yPos += 10;
      }

      // ====== RESUMO TOTAIS ======
      const totalTMFT = metrics.totalTMFT;
      const totalEXI = metrics.totalEXI;
      const totalDIF = metrics.totalDIF;
      const atendimento = metrics.occupancyPercent || (totalTMFT > 0 ? ((totalEXI / totalTMFT) * 100).toFixed(1) : "0.0");
      const semNeo = extraLotacaoTotal;
      const atendTotal = totalTMFT > 0 ? (((totalEXI + semNeo) / totalTMFT) * 100).toFixed(1) : "0.0";

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMO GERAL", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;

      autoTable(pdf, {
        startY: yPos,
        head: [["TMFT", "EFETIVO", "DIFERENÇA", "VAGOS", "SEM NEO", "ATENDIMENTO", "AT. TOTAL"]],
        body: [[
          totalTMFT.toString(),
          totalEXI.toString(),
          (totalEXI - totalTMFT).toString(),
          (totalTMFT - totalEXI).toString(),
          semNeo.toString(),
          `${atendimento}%`,
          `${atendTotal}%`,
        ]],
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3, halign: "center" },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        bodyStyles: { fontStyle: "bold" },
        margin: { left: 60, right: 60 },
      });
      yPos = (pdf as any).lastAutoTable.finalY + 10;

      // ====== RESUMO POR OM ======
      yPos = checkNewPage(yPos, 50);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMO POR OM", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;

      // Group data by OM
      const omGroups = new Map<string, { tmft: number; exi: number; dif: number; extra: number }>();
      filteredData.forEach((item) => {
        const existing = omGroups.get(item.om) || { tmft: 0, exi: 0, dif: 0, extra: 0 };
        existing.tmft += item.tmft;
        existing.exi += item.exi;
        existing.dif += item.exi - item.tmft;
        omGroups.set(item.om, existing);
      });

      // Count extra lotação per OM
      extraLotacaoRows.forEach((row) => {
        const existing = omGroups.get(row.om);
        if (existing) {
          existing.extra += 1;
        }
      });

      const omRows: string[][] = [];
      let totalRowTmft = 0, totalRowExi = 0, totalRowExtra = 0;
      const sortedOMs = Array.from(omGroups.entries()).sort(([a], [b]) => a.localeCompare(b));
      
      for (const [om, vals] of sortedOMs) {
        const vagos = vals.tmft - vals.exi;
        const atTotal = vals.tmft > 0 ? (((vals.exi + vals.extra) / vals.tmft) * 100).toFixed(1) : "0.0";
        const dif = vals.exi - vals.tmft;
        omRows.push([om, vals.tmft.toString(), vals.exi.toString(), dif.toString(), vagos.toString(), vals.extra.toString(), `${atTotal}%`]);
        totalRowTmft += vals.tmft;
        totalRowExi += vals.exi;
        totalRowExtra += vals.extra;
      }

      const totalVagos = totalRowTmft - totalRowExi;
      const totalAtTotal = totalRowTmft > 0 ? (((totalRowExi + totalRowExtra) / totalRowTmft) * 100).toFixed(1) : "0.0";
      const totalDif = totalRowExi - totalRowTmft;
      omRows.push(["TOTAL GERAL", totalRowTmft.toString(), totalRowExi.toString(), totalDif.toString(), totalVagos.toString(), totalRowExtra.toString(), `${totalAtTotal}%`]);

      autoTable(pdf, {
        startY: yPos,
        head: [["OM", "TMFT", "EFETIVO", "DIFERENÇA", "VAGOS", "SEM NEO", "AT. TOTAL"]],
        body: omRows,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, halign: "center" },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
        margin: { left: 20, right: 20 },
        didParseCell: (data: any) => {
          if (data.section === "body") {
            const omCell = data.row.raw?.[0];
            if (omCell === "TOTAL GERAL") {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [229, 231, 235];
            }
          }
        },
      });
      yPos = (pdf as any).lastAutoTable.finalY + 10;

      // ====== GRÁFICO DE TOTAIS ======
      if (chartRef.current) {
        try {
          yPos = checkNewPage(yPos, 100);
          const canvas = await html2canvas(chartRef.current, {
            scale: 2,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 200;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text("GRÁFICO DE TOTAIS", pageWidth / 2, yPos, { align: "center" });
          yPos += 6;
          pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 10;
        } catch (error) {
          console.error('Erro ao capturar gráfico:', error);
        }
      }

      // ====== TABELA DETALHADA POR GRADUAÇÃO - SEPARADA POR OM ======
      pdf.addPage();
      yPos = 20;

      // Group data by OM, then aggregate by graduação
      const omDetailGroups = new Map<string, Map<string, { tmft: number; exi: number; dif: number }>>();
      filteredData.forEach((item) => {
        if (!omDetailGroups.has(item.om)) {
          omDetailGroups.set(item.om, new Map());
        }
        const gradMap = omDetailGroups.get(item.om)!;
        const existing = gradMap.get(item.graduacao) || { tmft: 0, exi: 0, dif: 0 };
        existing.tmft += item.tmft;
        existing.exi += item.exi;
        existing.dif += item.exi - item.tmft;
        gradMap.set(item.graduacao, existing);
      });

      const sortedOMDetails = Array.from(omDetailGroups.entries()).sort(([a], [b]) => a.localeCompare(b));

      for (const [om, gradMap] of sortedOMDetails) {
        yPos = checkNewPage(yPos, 30);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(37, 99, 235);
        pdf.text(`OM: ${om}`, 15, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 5;

        const rows: string[][] = [];
        let omTmft = 0, omExi = 0;
        const gradHierarchy = ["C ALTE", "CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN"];
        const sortedGrads = Array.from(gradMap.entries()).sort(([a], [b]) => {
          const idxA = gradHierarchy.indexOf(a);
          const idxB = gradHierarchy.indexOf(b);
          if (idxA === -1 && idxB === -1) return a.localeCompare(b);
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        for (const [grad, vals] of sortedGrads) {
          const vagos = vals.tmft - vals.exi;
          const atend = vals.tmft > 0 ? ((vals.exi / vals.tmft) * 100).toFixed(1) : "0.0";
          const dif = vals.exi - vals.tmft;
          rows.push([grad, vals.tmft.toString(), vals.exi.toString(), dif.toString(), vagos.toString(), `${atend}%`]);
          omTmft += vals.tmft;
          omExi += vals.exi;
        }
        const omVagos = omTmft - omExi;
        const omAtend = omTmft > 0 ? ((omExi / omTmft) * 100).toFixed(1) : "0.0";
        const omDif = omExi - omTmft;
        rows.push(["TOTAL", omTmft.toString(), omExi.toString(), omDif.toString(), omVagos.toString(), `${omAtend}%`]);

        autoTable(pdf, {
          startY: yPos,
          head: [["GRADUAÇÃO", "TMFT", "EFETIVO", "DIFERENÇA", "VAGOS", "ATEND."]],
          body: rows,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2, halign: "center" },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
          columnStyles: { 0: { halign: "left" } },
          margin: { left: 15, right: 15 },
          didParseCell: (data: any) => {
            if (data.section === "body") {
              const rowRaw = data.row.raw;
              const vagos = Number(rowRaw?.[3] || 0);
              const colIdx = data.column.index;
              if (colIdx === 3 && vagos > 0) {
                data.cell.styles.fillColor = [254, 202, 202];
                data.cell.styles.textColor = [127, 29, 29];
              }
              if (rowRaw?.[0] === "TOTAL") {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [229, 231, 235];
              }
            }
          },
        });
        yPos = (pdf as any).lastAutoTable.finalY + 8;
      }

      // Legenda
      yPos = checkNewPage(yPos, 20);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("LEGENDA:", 15, yPos);
      yPos += 4;
      pdf.setFont("helvetica", "normal");

      // Vermelho - VAGOS
      pdf.setFillColor(254, 202, 202);
      pdf.rect(15, yPos - 3, 6, 4, "F");
      pdf.setTextColor(127, 29, 29);
      pdf.text("VAGOS - Vagas não preenchidas (TMFT > EFETIVO)", 23, yPos);
      yPos += 5;

      // Verde - SEM NEO
      pdf.setFillColor(209, 250, 229);
      pdf.rect(15, yPos - 3, 6, 4, "F");
      pdf.setTextColor(6, 95, 70);
      pdf.text("SEM NEO - Militar SEM NEO", 23, yPos);
      yPos += 5;

      pdf.setTextColor(0, 0, 0);

      // ====== SEM NEO (EXTRA LOTAÇÃO) ======
      if (extraLotacaoRows.length > 0) {
        pdf.addPage();
        yPos = 20;

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(`SEM NEO - EFETIVO EXTRA (${extraLotacaoRows.length} militar(es))`, pageWidth / 2, yPos, { align: "center" });
        yPos += 6;

        const extraRows = extraLotacaoRows.map((row, idx) => [
          (idx + 1).toString(),
          row.om,
          row.posto,
          row.quadro || "-",
          row.cargo,
          row.nome || "-",
          row.ocupado ? "SIM" : "NÃO",
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [["Nº", "OM", "GRADUAÇÃO", "ESPECIALIDADE", "CARGO", "NOME", "OCUPADO"]],
          body: extraRows,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold" },
          margin: { left: 15, right: 15 },
          didParseCell: (data: any) => {
            if (data.section === "body") {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [6, 95, 70];
            }
          },
        });
      }

      // ====== PAGE NUMBERS ======
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      }

      // Save
      const categoriaFile = selectedFilters.categoria === "TODOS" ? "geral" : selectedFilters.categoria.toLowerCase();
      pdf.save(`relatorio-copab-${categoriaFile}-${new Date().toISOString().split('T')[0]}.pdf`);

      const { toast } = await import('sonner');
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      const { toast } = await import('sonner');
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleClearFilters = () => {
    onFilterChange("om", []);
    onFilterChange("pessoal", []);
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Categoria Principal */}
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Visualizar:</span>
              <div className="flex gap-2">
                <Button
                  variant={selectedFilters.categoria === "TODOS" ? "default" : "outline"}
                  onClick={() => onFilterChange("categoria", "TODOS")}
                  className="font-semibold"
                >
                  TODOS
                </Button>
                <Button
                  variant={selectedFilters.categoria === "PRAÇAS" ? "default" : "outline"}
                  onClick={() => onFilterChange("categoria", "PRAÇAS")}
                  className="font-semibold"
                >
                  PRAÇAS
                </Button>
                <Button
                  variant={selectedFilters.categoria === "OFICIAIS" ? "default" : "outline"}
                  onClick={() => onFilterChange("categoria", "OFICIAIS")}
                  className="font-semibold"
                >
                  OFICIAIS
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {onRefresh && (
                <Button variant="outline" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              )}
              {onManual && (
                <Button variant="outline" onClick={onManual} className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Manual
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barra de ações */}
      <Card className="shadow-card bg-gradient-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasSelectedFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedFilters.om.length + selectedFilters.pessoal.length}
                  </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Selecione os filtros para visualizar os dados
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6">
                  <Tabs defaultValue="om" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="om">OM</TabsTrigger>
              <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
            </TabsList>

            {/* Aba OM */}
            <TabsContent value="om">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-2">
                  {filterOptions.oms.map((om) => (
                    <div key={om} className="flex items-center space-x-2">
                      <Checkbox
                        id={`om-${om}`}
                        checked={selectedFilters.om.includes(om)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange("om", om, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`om-${om}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {om}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Aba Pessoal */}
            <TabsContent value="pessoal">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-2">
                  <div className="mb-3 pb-2 border-b">
                    <p className="text-xs text-muted-foreground font-medium">
                      {selectedFilters.categoria === "OFICIAIS" ? "Pessoal OFI" : selectedFilters.categoria === "PRAÇAS" ? "Pessoal Praças" : "Pessoal (Praças e Oficiais)"}
                    </p>
                  </div>
                  {filterOptions.graduacoes.map((grad) => (
                    <div key={grad} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grad-${grad}`}
                        checked={selectedFilters.pessoal.includes(grad)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange("pessoal", grad, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`grad-${grad}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {grad}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              {hasSelectedFilters && (
                <Button 
                  onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
              <Button 
                onClick={handleGeneratePDF}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros selecionados */}
      {hasSelectedFilters && (
        <Card className="shadow-card bg-gradient-card">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Filtros Ativos:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedFilters.om.map((value) => (
                  <Badge key={`om-${value}`} variant="secondary" className="gap-1">
                    OM: {value}
                    <button
                      onClick={() => handleRemoveFilter('om', value)}
                      className="ml-1 hover:bg-background/20 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedFilters.pessoal.map((value) => (
                  <Badge key={`pessoal-${value}`} variant="secondary" className="gap-1">
                    Pessoal: {value}
                    <button
                      onClick={() => handleRemoveFilter('pessoal', value)}
                      className="ml-1 hover:bg-background/20 rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
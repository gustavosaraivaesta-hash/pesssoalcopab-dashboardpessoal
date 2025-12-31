import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterOptions, MilitaryData } from "@/types/military";
import { X, FileText, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

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
    categoria: "PRAÇAS" | "OFICIAIS";
    om: string[];
    especialidade: string[];
    pessoal: string[];
  };
  onFilterChange: (filterType: string, values: string[] | "PRAÇAS" | "OFICIAIS") => void;
  filteredData: MilitaryData[];
  metrics: {
    totalTMFT: number;
    totalEXI: number;
    totalDIF: number;
  };
  chartRef: React.RefObject<HTMLDivElement>;
}

export const DashboardFilters = ({ 
  filterOptions, 
  selectedFilters, 
  onFilterChange,
  filteredData,
  metrics,
  chartRef
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
    
    const pdf = new jsPDF();
    let yPos = 20;
    
    // Título
    pdf.setFontSize(18);
    pdf.text("Relatório COpAb - Dashboard", 14, yPos);
    yPos += 10;
    
    // Filtros aplicados
    pdf.setFontSize(12);
    pdf.text("Filtros Aplicados:", 14, yPos);
    yPos += 7;
    
    if (selectedFilters.om.length > 0) {
      pdf.setFontSize(10);
      pdf.text("OM:", 14, yPos);
      yPos += 5;
      selectedFilters.om.forEach(value => {
        pdf.text(`  • ${value}`, 14, yPos);
        yPos += 4;
      });
      yPos += 3;
    }

    if (selectedFilters.pessoal.length > 0) {
      pdf.setFontSize(10);
      pdf.text("Pessoal:", 14, yPos);
      yPos += 5;
      selectedFilters.pessoal.forEach(value => {
        pdf.text(`  • ${value}`, 14, yPos);
        yPos += 4;
      });
      yPos += 3;
    }
    
    if (!hasSelectedFilters) {
      pdf.setFontSize(10);
      pdf.text("Nenhum filtro aplicado", 14, yPos);
      yPos += 3;
    }
    
    yPos += 10;
    
    // Métricas
    pdf.setFontSize(12);
    pdf.text("Métricas Totais:", 14, yPos);
    yPos += 7;
    
    pdf.setFontSize(10);
    pdf.text(`Total TMFT: ${metrics.totalTMFT}`, 14, yPos);
    yPos += 5;
    pdf.text(`Total EXI: ${metrics.totalEXI}`, 14, yPos);
    yPos += 5;
    pdf.text(`Total DIF: ${metrics.totalDIF}`, 14, yPos);
    yPos += 10;
    
    // Capturar gráfico
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addPage();
        pdf.setFontSize(12);
        pdf.text("Gráfico de Totais:", 14, 20);
        pdf.addImage(imgData, 'PNG', 14, 30, imgWidth, imgHeight);
      } catch (error) {
        console.error('Erro ao capturar gráfico:', error);
      }
    }
    
    // Tabela de dados
    pdf.addPage();
    const tableData = filteredData.map(item => [
      item.graduacao,
      item.om,
      item.tmft.toString(),
      item.exi.toString(),
      item.dif.toString()
    ]);
    
    autoTable(pdf, {
      head: [['Graduação', 'OM', 'TMFT', 'EXI', 'DIF']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    // Salvar
    pdf.save(`relatorio-copab-${new Date().toISOString().split('T')[0]}.pdf`);
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
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Visualizar:</span>
            <div className="flex gap-2">
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
                      {selectedFilters.categoria === "OFICIAIS" ? "Pessoal OFI" : "Pessoal Praças"}
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
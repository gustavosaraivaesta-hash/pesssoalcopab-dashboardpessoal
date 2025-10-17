import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterOptions, MilitaryData } from "@/types/military";
import { X, FileText } from "lucide-react";

const ESPECIALIDADES = [
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
    pessoal: string[];
    om: string[];
    especialidade: string[];
  };
  onFilterChange: (filterType: string, values: string[]) => void;
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
  const handlePessoalToggle = (value: string) => {
    const newValues = selectedFilters.pessoal.includes(value)
      ? selectedFilters.pessoal.filter(v => v !== value)
      : [...selectedFilters.pessoal, value];
    onFilterChange("pessoal", newValues);
  };

  const handleOmToggle = (value: string) => {
    const newValues = selectedFilters.om.includes(value)
      ? selectedFilters.om.filter(v => v !== value)
      : [...selectedFilters.om, value];
    onFilterChange("om", newValues);
  };

  const handleEspecialidadeToggle = (value: string) => {
    const newValues = selectedFilters.especialidade.includes(value)
      ? selectedFilters.especialidade.filter(v => v !== value)
      : [...selectedFilters.especialidade, value];
    onFilterChange("especialidade", newValues);
  };

  const pessoalOptions = [
    ...filterOptions.graduacoes,
    "pracasTTC",
    "servidoresCivis"
  ];

  const getPessoalLabel = (value: string) => {
    if (value === "pracasTTC") return "PRAÇAS TTC";
    if (value === "servidoresCivis") return "SERVIDORES CIVIS (NA + NI)";
    return value;
  };

  const getSelectedLabel = (values: string[], allOptions: string[], type: string) => {
    if (values.length === 0) {
      return type === "pessoal" ? "Selecione pessoal" : "Selecione OMs";
    }
    if (values.length === allOptions.length) {
      return type === "pessoal" ? "Todos selecionados" : "Todas selecionadas";
    }
    return `${values.length} ${type === "pessoal" ? "selecionado(s)" : "selecionada(s)"}`;
  };

  const hasSelectedFilters = selectedFilters.pessoal.length > 0 || selectedFilters.om.length > 0 || selectedFilters.especialidade.length > 0;

  const handleRemoveFilter = (filterType: 'pessoal' | 'om' | 'especialidade', value: string) => {
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
    pdf.text("Relatório DAbM - Dashboard", 14, yPos);
    yPos += 10;
    
    // Filtros aplicados
    pdf.setFontSize(12);
    pdf.text("Filtros Aplicados:", 14, yPos);
    yPos += 7;
    
    if (selectedFilters.pessoal.length > 0) {
      pdf.setFontSize(10);
      pdf.text("Pessoal:", 14, yPos);
      yPos += 5;
      selectedFilters.pessoal.forEach(value => {
        pdf.text(`  • ${getPessoalLabel(value)}`, 14, yPos);
        yPos += 4;
      });
      yPos += 3;
    }
    
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
    pdf.save(`relatorio-dabm-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardContent className="p-6">
        <div className="flex justify-end mb-4">
          <Button 
            onClick={handleGeneratePDF}
            variant="outline"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Gerar PDF
          </Button>
        </div>

        {hasSelectedFilters && (
          <div className="mb-4 pb-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Filtros Selecionados:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedFilters.pessoal.map((value) => (
                <Badge key={`pessoal-${value}`} variant="secondary" className="gap-1">
                  {getPessoalLabel(value)}
                  <button
                    onClick={() => handleRemoveFilter('pessoal', value)}
                    className="ml-1 hover:bg-background/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedFilters.om.map((value) => (
                <Badge key={`om-${value}`} variant="secondary" className="gap-1">
                  {value}
                  <button
                    onClick={() => handleRemoveFilter('om', value)}
                    className="ml-1 hover:bg-background/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedFilters.especialidade.map((value) => (
                <Badge key={`especialidade-${value}`} variant="secondary" className="gap-1">
                  {value}
                  <button
                    onClick={() => handleRemoveFilter('especialidade', value)}
                    className="ml-1 hover:bg-background/20 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="pessoal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pessoal">
              Pessoal {selectedFilters.pessoal.length > 0 && `(${selectedFilters.pessoal.length})`}
            </TabsTrigger>
            <TabsTrigger value="om">
              OM {selectedFilters.om.length > 0 && `(${selectedFilters.om.length})`}
            </TabsTrigger>
            <TabsTrigger value="especialidade">
              Especialidade {selectedFilters.especialidade.length > 0 && `(${selectedFilters.especialidade.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pessoal" className="mt-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="select-all-pessoal"
                  checked={selectedFilters.pessoal.length === pessoalOptions.length}
                  onCheckedChange={(checked) => {
                    onFilterChange("pessoal", checked ? pessoalOptions : []);
                  }}
                />
                <label
                  htmlFor="select-all-pessoal"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Selecionar todos
                </label>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                  {pessoalOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`pessoal-${option}`}
                        checked={selectedFilters.pessoal.includes(option)}
                        onCheckedChange={() => handlePessoalToggle(option)}
                      />
                      <label
                        htmlFor={`pessoal-${option}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {getPessoalLabel(option)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="om" className="mt-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="select-all-om"
                  checked={selectedFilters.om.length === filterOptions.oms.length}
                  onCheckedChange={(checked) => {
                    onFilterChange("om", checked ? filterOptions.oms : []);
                  }}
                />
                <label
                  htmlFor="select-all-om"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Selecionar todas
                </label>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                  {filterOptions.oms.map((om) => (
                    <div key={om} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`om-${om}`}
                        checked={selectedFilters.om.includes(om)}
                        onCheckedChange={() => handleOmToggle(om)}
                      />
                      <label
                        htmlFor={`om-${om}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {om}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="especialidade" className="mt-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                <Checkbox
                  id="select-all-especialidade"
                  checked={selectedFilters.especialidade.length === ESPECIALIDADES.length}
                  onCheckedChange={(checked) => {
                    onFilterChange("especialidade", checked ? ESPECIALIDADES : []);
                  }}
                />
                <label
                  htmlFor="select-all-especialidade"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Selecionar todas
                </label>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-4">
                <div className="space-y-2">
                  {ESPECIALIDADES.map((especialidade) => (
                    <div key={especialidade} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={`especialidade-${especialidade}`}
                        checked={selectedFilters.especialidade.includes(especialidade)}
                        onCheckedChange={() => handleEspecialidadeToggle(especialidade)}
                      />
                      <label
                        htmlFor={`especialidade-${especialidade}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {especialidade}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
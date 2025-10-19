import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterOptions, MilitaryData } from "@/types/military";
import { X, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

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
    om: string[];
    especialidade: string[];
    pessoal: string[];
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
  const handleCheckboxChange = (filterType: string, value: string, checked: boolean) => {
    if (checked) {
      onFilterChange(filterType, [...selectedFilters[filterType as keyof typeof selectedFilters], value]);
    } else {
      onFilterChange(
        filterType, 
        selectedFilters[filterType as keyof typeof selectedFilters].filter(v => v !== value)
      );
    }
  };

  const hasSelectedFilters = selectedFilters.om.length > 0 || selectedFilters.especialidade.length > 0 || selectedFilters.pessoal.length > 0;

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
    pdf.text("Relatório DAbM - Dashboard", 14, yPos);
    yPos += 10;
    
    // Filtros aplicados
    pdf.setFontSize(12);
    pdf.text("Filtros Aplicados:", 14, yPos);
    yPos += 7;
    
    if (selectedFilters.especialidade.length > 0) {
      pdf.setFontSize(10);
      pdf.text("Especialidade:", 14, yPos);
      yPos += 5;
      selectedFilters.especialidade.forEach(value => {
        pdf.text(`  • ${value}`, 14, yPos);
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
    pdf.save(`relatorio-dabm-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleClearFilters = () => {
    onFilterChange("om", []);
    onFilterChange("especialidade", []);
    onFilterChange("pessoal", []);
  };

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Tabs defaultValue="especialidade" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="especialidade">Especialidade</TabsTrigger>
              <TabsTrigger value="om">OM</TabsTrigger>
              <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
            </TabsList>

            {/* Aba Especialidade */}
            <TabsContent value="especialidade">
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-2">
                  {ESPECIALIDADES.map((esp) => (
                    <div key={esp} className="flex items-center space-x-2">
                      <Checkbox
                        id={`esp-${esp}`}
                        checked={selectedFilters.especialidade.includes(esp)}
                        onCheckedChange={(checked) => 
                          handleCheckboxChange("especialidade", esp, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`esp-${esp}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {esp}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Aba OM */}
            <TabsContent value="om">
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
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
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="space-y-2">
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

          {/* Botões de ação */}
          <div className="flex items-end gap-2">
            {hasSelectedFilters && (
              <Button 
                onClick={handleClearFilters}
                variant="outline"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
            <Button 
              onClick={handleGeneratePDF}
              variant="outline"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>

          {/* Filtros selecionados */}
          {hasSelectedFilters && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-2">Filtros Ativos:</h3>
              <div className="flex flex-wrap gap-2">
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};
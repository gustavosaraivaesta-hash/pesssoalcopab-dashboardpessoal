import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterOptions, MilitaryData } from "@/types/military";
import { X, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [openSelect, setOpenSelect] = useState<string | null>(null);

  const handleEspecialidadeSelect = (value: string) => {
    if (value === "all") {
      onFilterChange("especialidade", []);
    } else {
      const newValues = selectedFilters.especialidade.includes(value)
        ? selectedFilters.especialidade.filter(v => v !== value)
        : [...selectedFilters.especialidade, value];
      onFilterChange("especialidade", newValues);
    }
  };

  const handleOmSelect = (value: string) => {
    if (value === "all") {
      onFilterChange("om", []);
    } else {
      const newValues = selectedFilters.om.includes(value)
        ? selectedFilters.om.filter(v => v !== value)
        : [...selectedFilters.om, value];
      onFilterChange("om", newValues);
    }
  };

  const handlePessoalSelect = (value: string) => {
    if (value === "all") {
      onFilterChange("pessoal", []);
    } else {
      const newValues = selectedFilters.pessoal.includes(value)
        ? selectedFilters.pessoal.filter(v => v !== value)
        : [...selectedFilters.pessoal, value];
      onFilterChange("pessoal", newValues);
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
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filtro de Especialidade */}
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Especialidade
              </label>
              <Select onValueChange={handleEspecialidadeSelect}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Selecione uma especialidade" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[300px]">
                  <SelectItem value="all" className="font-medium">
                    Limpar seleção
                  </SelectItem>
                  {ESPECIALIDADES.map((esp) => (
                    <SelectItem 
                      key={esp} 
                      value={esp}
                      className={selectedFilters.especialidade.includes(esp) ? "bg-muted" : ""}
                    >
                      {esp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de OM */}
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                OM
              </label>
              <Select onValueChange={handleOmSelect}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Selecione uma OM" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[300px]">
                  <SelectItem value="all" className="font-medium">
                    Limpar seleção
                  </SelectItem>
                  {filterOptions.oms.map((om) => (
                    <SelectItem 
                      key={om} 
                      value={om}
                      className={selectedFilters.om.includes(om) ? "bg-muted" : ""}
                    >
                      {om}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Pessoal */}
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Pessoal
              </label>
              <Select onValueChange={handlePessoalSelect}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Selecione uma graduação" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[300px]">
                  <SelectItem value="all" className="font-medium">
                    Limpar seleção
                  </SelectItem>
                  {filterOptions.graduacoes.map((grad) => (
                    <SelectItem 
                      key={grad} 
                      value={grad}
                      className={selectedFilters.pessoal.includes(grad) ? "bg-muted" : ""}
                    >
                      {grad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FilterOptions, MilitaryData } from "@/types/military";
import { ChevronDown, X, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface DashboardFiltersProps {
  filterOptions: FilterOptions;
  selectedFilters: {
    pessoal: string[];
    om: string[];
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

  const hasSelectedFilters = selectedFilters.pessoal.length > 0 || selectedFilters.om.length > 0;

  const handleRemoveFilter = (filterType: 'pessoal' | 'om', value: string) => {
    const newValues = selectedFilters[filterType].filter(v => v !== value);
    onFilterChange(filterType, newValues);
  };

  const handleGeneratePDF = async () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text("Relatório DAbM - Dashboard", 14, 20);
    
    // Filtros aplicados
    doc.setFontSize(12);
    doc.text("Filtros Aplicados:", 14, 30);
    
    let yPosition = 38;
    
    if (selectedFilters.pessoal.length > 0) {
      doc.setFontSize(10);
      doc.text("Pessoal:", 14, yPosition);
      yPosition += 6;
      selectedFilters.pessoal.forEach(value => {
        doc.text(`  • ${getPessoalLabel(value)}`, 14, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    }
    
    if (selectedFilters.om.length > 0) {
      doc.setFontSize(10);
      doc.text("OM:", 14, yPosition);
      yPosition += 6;
      selectedFilters.om.forEach(value => {
        doc.text(`  • ${value}`, 14, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    }
    
    if (selectedFilters.pessoal.length === 0 && selectedFilters.om.length === 0) {
      doc.setFontSize(10);
      doc.text("Nenhum filtro aplicado", 14, yPosition);
      yPosition += 8;
    }
    
    yPosition += 5;
    
    // Métricas
    doc.setFontSize(12);
    doc.text("Métricas Totais:", 14, yPosition);
    yPosition += 8;
    
    doc.setFontSize(10);
    doc.text(`Total TMFT: ${metrics.totalTMFT}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Total EXI: ${metrics.totalEXI}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Total DIF: ${metrics.totalDIF}`, 14, yPosition);
    yPosition += 10;
    
    // Capturar e adicionar o gráfico
    if (chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addPage();
        doc.setFontSize(12);
        doc.text("Gráfico de Totais:", 14, 20);
        doc.addImage(imgData, 'PNG', 14, 30, imgWidth, imgHeight);
      } catch (error) {
        console.error('Erro ao capturar gráfico:', error);
      }
    }
    
    // Tabela de dados
    doc.addPage();
    const tableData = filteredData.map(item => [
      item.graduacao,
      item.om,
      item.tmft.toString(),
      item.exi.toString(),
      item.dif.toString()
    ]);
    
    autoTable(doc, {
      head: [['Graduação', 'OM', 'TMFT', 'EXI', 'DIF']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    // Salvar PDF
    doc.save(`relatorio-dabm-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardContent className="p-6">
        {/* PDF Button */}
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

        {/* Selected Filters Display */}
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
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Pessoal
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-background">
                  {getSelectedLabel(selectedFilters.pessoal, pessoalOptions, "pessoal")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full bg-popover z-50" align="start">
                <DropdownMenuCheckboxItem
                  checked={selectedFilters.pessoal.length === pessoalOptions.length}
                  onCheckedChange={(checked) => {
                    onFilterChange("pessoal", checked ? pessoalOptions : []);
                  }}
                >
                  Selecionar todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {pessoalOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option}
                    checked={selectedFilters.pessoal.includes(option)}
                    onCheckedChange={() => handlePessoalToggle(option)}
                  >
                    {getPessoalLabel(option)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              OM
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-background">
                  {getSelectedLabel(selectedFilters.om, filterOptions.oms, "om")}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full bg-popover z-50" align="start">
                <DropdownMenuCheckboxItem
                  checked={selectedFilters.om.length === filterOptions.oms.length}
                  onCheckedChange={(checked) => {
                    onFilterChange("om", checked ? filterOptions.oms : []);
                  }}
                >
                  Selecionar todas
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {filterOptions.oms.map((om) => (
                  <DropdownMenuCheckboxItem
                    key={om}
                    checked={selectedFilters.om.includes(om)}
                    onCheckedChange={() => handleOmToggle(om)}
                  >
                    {om}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

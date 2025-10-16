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
import { FilterOptions } from "@/types/military";
import { ChevronDown, X } from "lucide-react";

interface DashboardFiltersProps {
  filterOptions: FilterOptions;
  selectedFilters: {
    pessoal: string[];
    om: string[];
  };
  onFilterChange: (filterType: string, values: string[]) => void;
}

export const DashboardFilters = ({ 
  filterOptions, 
  selectedFilters, 
  onFilterChange 
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

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardContent className="p-6">
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

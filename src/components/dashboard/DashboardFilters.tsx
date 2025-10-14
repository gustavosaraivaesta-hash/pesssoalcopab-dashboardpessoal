import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FilterOptions } from "@/types/military";

interface DashboardFiltersProps {
  filterOptions: FilterOptions;
  selectedFilters: {
    graduacao: string;
    om: string;
    tipo: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
}

export const DashboardFilters = ({ 
  filterOptions, 
  selectedFilters, 
  onFilterChange 
}: DashboardFiltersProps) => {
  return (
    <Card className="shadow-card bg-gradient-card">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Tipo de Dados
            </label>
            <Select 
              value={selectedFilters.tipo} 
              onValueChange={(value) => onFilterChange("tipo", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Praças da Ativa</SelectItem>
                <SelectItem value="pracasTTC">Praças TTC</SelectItem>
                <SelectItem value="servidoresCivis">Servidores Civis (NA + NI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Graduação
            </label>
            <Select 
              value={selectedFilters.graduacao} 
              onValueChange={(value) => onFilterChange("graduacao", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas</SelectItem>
                {filterOptions.graduacoes.map((grad) => (
                  <SelectItem key={grad} value={grad}>
                    {grad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              OM
            </label>
            <Select 
              value={selectedFilters.om} 
              onValueChange={(value) => onFilterChange("om", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas</SelectItem>
                {filterOptions.oms.map((om) => (
                  <SelectItem key={om} value={om}>
                    {om}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

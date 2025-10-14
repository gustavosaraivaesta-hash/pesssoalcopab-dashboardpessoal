import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FilterOptions } from "@/types/military";

interface DashboardFiltersProps {
  filterOptions: FilterOptions;
  selectedFilters: {
    pessoal: string;
    om: string;
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Pessoal
            </label>
            <Select 
              value={selectedFilters.pessoal} 
              onValueChange={(value) => onFilterChange("pessoal", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pracasTTC">PRAÇAS TTC</SelectItem>
                <SelectItem value="servidoresCivis">SERVIDORES CIVIS (NA + NI)</SelectItem>
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

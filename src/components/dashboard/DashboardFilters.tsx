import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FilterOptions } from "@/types/military";

interface DashboardFiltersProps {
  filterOptions: FilterOptions;
  selectedFilters: {
    especialidade: string;
    graduacao: string;
    sdp: string;
    mes: string;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Especialidade
            </label>
            <Select 
              value={selectedFilters.especialidade} 
              onValueChange={(value) => onFilterChange("especialidade", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas</SelectItem>
                {filterOptions.especialidades.map((esp) => (
                  <SelectItem key={esp} value={esp}>
                    {esp}
                  </SelectItem>
                ))}
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
              SDP DAbM
            </label>
            <Select 
              value={selectedFilters.sdp} 
              onValueChange={(value) => onFilterChange("sdp", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos</SelectItem>
                {filterOptions.sdps.map((sdp) => (
                  <SelectItem key={sdp} value={sdp}>
                    {sdp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Previsão de Embarque
            </label>
            <Select 
              value={selectedFilters.mes} 
              onValueChange={(value) => onFilterChange("mes", value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos os meses</SelectItem>
                {filterOptions.meses.map((mes) => (
                  <SelectItem key={mes} value={mes}>
                    {new Date(mes + "-01").toLocaleDateString("pt-BR", { 
                      month: "long", 
                      year: "numeric" 
                    })}
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

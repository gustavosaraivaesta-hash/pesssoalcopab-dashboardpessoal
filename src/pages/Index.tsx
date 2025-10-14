import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut } from "lucide-react";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { PercentageChart } from "@/components/dashboard/PercentageChart";
import { mockMilitaryData, getUniqueValues } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };
  const [filters, setFilters] = useState({
    graduacao: "all",
    om: "all"
  });

  const filterOptions = useMemo(() => getUniqueValues(mockMilitaryData), []);

  const filteredData = useMemo(() => {
    return mockMilitaryData.filter(item => {
      if (filters.graduacao !== "all" && item.graduacao !== filters.graduacao) return false;
      if (filters.om !== "all" && item.om !== filters.om) return false;
      return true;
    });
  }, [filters]);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-military text-primary-foreground shadow-elevated">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={36} className="text-primary-foreground" />
              <div>
                <h1 className="text-3xl font-bold">Dashboard DAbM</h1>
                <p className="text-sm opacity-90">Diretoria de Abastecimento - Análise de Militares</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-primary-foreground/20 hover:bg-primary-foreground/10"
            >
              <LogOut size={16} className="mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Filtros */}
        <DashboardFilters 
          filterOptions={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Gráfico de Percentuais */}
        <PercentageChart data={filteredData} />
      </main>
    </div>
  );
};

export default Index;

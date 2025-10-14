import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Users, TrendingDown, TrendingUp, LogOut } from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { TotalsChart } from "@/components/dashboard/TotalsChart";
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
    pessoal: "all",
    om: "all"
  });

  const filterOptions = useMemo(() => getUniqueValues(mockMilitaryData), []);

  const filteredData = useMemo(() => {
    let data = mockMilitaryData;
    
    // Filtrar por tipo de pessoal
    if (filters.pessoal === "pracasTTC") {
      // Mostra apenas as linhas de PRAÇAS TTC
      data = data.filter(item => item.graduacao === "PRAÇAS TTC");
    } else if (filters.pessoal === "servidoresCivis") {
      // Mostra apenas as linhas de SERVIDORES CIVIS
      data = data.filter(item => item.graduacao === "SERVIDORES CIVIS");
    } else if (filters.pessoal !== "all") {
      // Filtrar por graduação específica (SO, 1SG, etc) - exclui PRAÇAS TTC e SERVIDORES CIVIS
      data = data.filter(item => item.graduacao === filters.pessoal);
    }
    // Se for "all", mostra TODOS os dados (incluindo PRAÇAS TTC e SERVIDORES CIVIS)
    
    // Filtrar por OM
    if (filters.om !== "all") {
      data = data.filter(item => item.om === filters.om);
    }
    
    return data;
  }, [filters]);

  const metrics = useMemo(() => {
    const totalTMFT = filteredData.reduce((sum, item) => sum + item.tmft, 0);
    const totalEXI = filteredData.reduce((sum, item) => sum + item.exi, 0);
    const totalDIF = filteredData.reduce((sum, item) => sum + item.dif, 0);

    return {
      totalTMFT,
      totalEXI,
      totalDIF
    };
  }, [filteredData]);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-blue-600 text-primary-foreground shadow-elevated">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={36} className="text-primary-foreground" />
              <div>
                <h1 className="text-3xl font-bold">Dashboard DAbM</h1>
                <p className="text-sm opacity-90">Diretoria de Abastecimento - Análise do Pessoal Militar e Civil</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold"
            >
              <LogOut size={18} className="mr-2" />
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

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricsCard 
            title="Total TMFT"
            value={metrics.totalTMFT}
            icon={Shield}
            variant="default"
          />
          <MetricsCard 
            title="Total EXI"
            value={metrics.totalEXI}
            icon={Users}
            variant="success"
          />
          <MetricsCard 
            title="Total DIF"
            value={metrics.totalDIF}
            icon={metrics.totalDIF >= 0 ? TrendingUp : TrendingDown}
            variant={metrics.totalDIF >= 0 ? "success" : "destructive"}
          />
        </div>

        {/* Gráfico de Totais */}
        <TotalsChart 
          totalTMFT={metrics.totalTMFT}
          totalEXI={metrics.totalEXI}
          totalDIF={metrics.totalDIF}
        />
      </main>
    </div>
  );
};

export default Index;

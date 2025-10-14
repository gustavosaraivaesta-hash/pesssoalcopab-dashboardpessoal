import { useState, useMemo } from "react";
import { Shield, Users, TrendingDown, TrendingUp } from "lucide-react";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DataTable } from "@/components/dashboard/DataTable";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { mockMilitaryData, getUniqueValues } from "@/data/mockData";

const Index = () => {
  const [filters, setFilters] = useState({
    especialidade: "all",
    graduacao: "all",
    om: "all",
    sdp: "all",
    mes: "all"
  });

  const filterOptions = useMemo(() => getUniqueValues(mockMilitaryData), []);

  const filteredData = useMemo(() => {
    return mockMilitaryData.filter(item => {
      if (filters.especialidade !== "all" && item.especialidade !== filters.especialidade) return false;
      if (filters.graduacao !== "all" && item.graduacao !== filters.graduacao) return false;
      if (filters.om !== "all" && item.om !== filters.om) return false;
      if (filters.sdp !== "all" && item.sdp !== filters.sdp) return false;
      if (filters.mes !== "all" && item.previsaoEmbarque !== filters.mes) return false;
      return true;
    });
  }, [filters]);

  const metrics = useMemo(() => {
    const totalTMFT = filteredData.reduce((sum, item) => sum + item.tmft, 0);
    const totalEXI = filteredData.reduce((sum, item) => sum + item.exi, 0);
    const totalDIF = filteredData.reduce((sum, item) => sum + item.dif, 0);
    const percentualPreenchimento = totalTMFT > 0 ? Math.round((totalEXI / totalTMFT) * 100) : 0;

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      percentualPreenchimento
    };
  }, [filteredData]);

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-military text-primary-foreground shadow-elevated">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Shield size={36} className="text-primary-foreground" />
            <div>
              <h1 className="text-3xl font-bold">Dashboard DAbM</h1>
              <p className="text-sm opacity-90">Diretoria de Abastecimento - Análise de Militares</p>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricsCard 
            title="Total TMFT"
            value={metrics.totalTMFT}
            icon={Shield}
            variant="default"
          />
          <MetricsCard 
            title="Total Existente"
            value={metrics.totalEXI}
            icon={Users}
            variant="success"
          />
          <MetricsCard 
            title="Diferença"
            value={metrics.totalDIF}
            icon={metrics.totalDIF >= 0 ? TrendingUp : TrendingDown}
            variant={metrics.totalDIF >= 0 ? "success" : "destructive"}
          />
          <MetricsCard 
            title="Taxa de Preenchimento"
            value={metrics.percentualPreenchimento}
            icon={TrendingUp}
            variant={metrics.percentualPreenchimento >= 90 ? "success" : "warning"}
          />
        </div>

        {/* Gráficos */}
        <ChartsSection data={filteredData} />

        {/* Tabela de dados */}
        <DataTable data={filteredData} />
      </main>
    </div>
  );
};

export default Index;

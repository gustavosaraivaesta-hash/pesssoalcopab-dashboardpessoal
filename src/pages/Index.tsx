import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Users, TrendingDown, TrendingUp, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { TotalsChart } from "@/components/dashboard/TotalsChart";
import { MilitaryData } from "@/types/military";
import { getUniqueValues, mockMilitaryData } from "@/data/mockData";
import militaryBg from "@/assets/military-background.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    pessoal: [] as string[],
    om: [] as string[],
  });
  const [militaryData, setMilitaryData] = useState<MilitaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch data from Google Sheets
  const fetchData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    try {
      console.log('Fetching data from edge function...');
      const { data, error } = await supabase.functions.invoke('fetch-sheets-data');
      
      if (error) {
        console.error('Error fetching data:', error);
        toast.error("Erro ao carregar dados da planilha. Usando dados de exemplo.");
        setMilitaryData(mockMilitaryData);
        return;
      }
      
      if (data?.data && data.data.length > 0) {
        console.log(`Loaded ${data.data.length} records from sheets`);
        setMilitaryData(data.data);
        if (showToast) {
          toast.success(`Dados atualizados! ${data.data.length} registros da planilha.`);
        }
      } else {
        console.log('No data from sheets, using mock data');
        toast("Usando dados de exemplo", {
          description: "Adicione dados na planilha para ver informações reais."
        });
        setMilitaryData(mockMilitaryData);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao conectar. Usando dados de exemplo.");
      setMilitaryData(mockMilitaryData);
    } finally {
      setIsLoading(false);
      if (showToast) setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchData(true);
  };

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Initial fetch
    fetchData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('Auto-refreshing data...');
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  const filterOptions = useMemo(() => getUniqueValues(militaryData), [militaryData]);

  const filteredData = useMemo(() => {
    let data = militaryData;
    
    // Filtrar por tipo de pessoal
    if (filters.pessoal.length > 0) {
      data = data.filter(item => {
        // Verifica se algum dos filtros selecionados corresponde ao item
        return filters.pessoal.some(filterValue => {
          if (filterValue === "pracasTTC") {
            return item.graduacao === "PRAÇAS TTC";
          } else if (filterValue === "servidoresCivis") {
            return item.graduacao === "SERVIDORES CIVIS (NA + NI)";
          } else {
            return item.graduacao === filterValue;
          }
        });
      });
    }
    
    // Filtrar por OM
    if (filters.om.length > 0) {
      data = data.filter(item => filters.om.includes(item.om));
    }
    
    return data;
  }, [filters, militaryData]);

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

  const handleFilterChange = (filterType: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [filterType]: values }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-blue-600">Carregando dados da planilha...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 relative">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${militaryBg})` }}
      />
      <div className="fixed inset-0 bg-blue-50/80 pointer-events-none" />
      
      {/* Header */}
      <header className="bg-blue-600 text-primary-foreground shadow-elevated relative z-10">
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
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="border-white text-white hover:bg-white hover:text-blue-600"
            >
              <RefreshCw size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-6 relative z-10">
        {/* Filtros */}
        <DashboardFilters 
          filterOptions={filterOptions}
          selectedFilters={filters}
          onFilterChange={handleFilterChange}
          filteredData={filteredData}
          metrics={metrics}
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

      {/* Botão Sair - Canto Inferior Esquerdo */}
      <div className="fixed bottom-6 left-6 z-20">
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white font-semibold shadow-lg"
        >
          <LogOut size={18} className="mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Index;

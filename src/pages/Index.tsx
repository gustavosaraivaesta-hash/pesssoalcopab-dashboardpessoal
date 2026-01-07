import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Users, TrendingDown, TrendingUp, LogOut, RefreshCw, FileText, Wifi, WifiOff, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { TotalsChart } from "@/components/dashboard/TotalsChart";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { PersonnelTable } from "@/components/dashboard/PersonnelTable";
import { DifferenceByGraduationChart } from "@/components/dashboard/DifferenceByGraduationChart";
import { ExtraLotacaoTable, type ExtraLotacaoRow } from "@/components/dashboard/ExtraLotacaoTable";
import { MilitaryData } from "@/types/military";
import { getUniqueValues, mockMilitaryData } from "@/data/mockData";
import militaryBg from "@/assets/military-background.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllowedOMs, getAvailableOMsForUser, filterDataForCurrentUser } from "@/lib/auth";
import { useOfflineCache, useOnlineStatus } from "@/hooks/useOfflineCache";

// Função para detectar mudanças nos dados
const detectChanges = (oldData: MilitaryData[], newData: MilitaryData[]): string[] => {
  const changes: string[] = [];

  // Criar mapa dos dados antigos para comparação rápida
  const oldDataMap = new Map(oldData.map((item) => [`${item.om}-${item.especialidade}-${item.graduacao}`, item]));

  // Comparar com novos dados
  newData.forEach((newItem) => {
    const key = `${newItem.om}-${newItem.especialidade}-${newItem.graduacao}`;
    const oldItem = oldDataMap.get(key);

    if (oldItem) {
      // Detectar mudanças em TMFT
      if (oldItem.tmft !== newItem.tmft) {
        changes.push(
          `🔄 TMFT alterado em ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao}): ${oldItem.tmft} → ${newItem.tmft}`,
        );
      }

      // Detectar mudanças em EXI
      if (oldItem.exi !== newItem.exi) {
        changes.push(
          `✅ EXI alterado em ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao}): ${oldItem.exi} → ${newItem.exi}`,
        );
      }

      // Detectar mudanças em DIF
      if (oldItem.dif !== newItem.dif) {
        const icon = newItem.dif >= 0 ? "📈" : "📉";
        changes.push(
          `${icon} DIF alterado em ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao}): ${oldItem.dif} → ${newItem.dif}`,
        );
      }
    } else if (newItem.tmft > 0 || newItem.exi > 0) {
      // Novo registro detectado
      changes.push(`🆕 Novo registro: ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao})`);
    }
  });

  return changes.slice(0, 5); // Limitar a 5 notificações por vez
};

const Index = () => {
  const navigate = useNavigate();
  const chartRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    categoria: "TODOS" as "TODOS" | "PRAÇAS" | "OFICIAIS",
    om: [] as string[],
    especialidade: [] as string[],
    pessoal: [] as string[],
  });
  const [militaryData, setMilitaryData] = useState<MilitaryData[]>([]);
  const [rawPersonnel, setRawPersonnel] = useState<{ pracas: any[]; oficiais: any[] }>({
    pracas: [],
    oficiais: [],
  });
  const [previousData, setPreviousData] = useState<MilitaryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

  const isOnline = useOnlineStatus();
  const { getFromCache, saveToCache, clearCache, getCacheTimestamp } = useOfflineCache<MilitaryData[]>('copab_data');

  // Helper function to convert personnel data (same counting logic used in Dashboard PRAÇAS/OFICIAIS)
  const convertToMilitaryData = (personnel: any[], categoria: "PRAÇAS" | "OFICIAIS"): MilitaryData[] => {
    // No Dash de PRAÇAS/OFICIAIS:
    // - TMFT = quantidade de registros (posições) EXCLUINDO "EXTRA LOTAÇÃO" → agrupado por postoTmft
    // - EXI = quantidade de registros ocupados (ocupado=true) EXCLUINDO "EXTRA LOTAÇÃO" → agrupado por postoEfe
    //   (se postoEfe estiver vazio, usa postoTmft como fallback)

    const normalizePostoOficiais = (postoRaw: string) => {
      const raw = String(postoRaw || "").trim().toUpperCase();
      if (!raw) return "";

      const cleaned = raw
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[º°]/g, "")
        .replace(/[-_.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleaned === "CONTRA ALMIRANTE" || cleaned === "CONTRA-ALMIRANTE" || cleaned === "C ALTE") return "C ALTE";

      if (/^1\s*TEN/.test(cleaned) || cleaned.startsWith("1TENENTE") || cleaned === "1TEN" || cleaned === "1T") return "1T";
      if (/^2\s*TEN/.test(cleaned) || cleaned.startsWith("2TENENTE") || cleaned === "2TEN" || cleaned === "2T") return "2T";

      return cleaned;
    };

    const grouped = new Map<
      string,
      { tmft: number; exi: number; om: string; graduacao: string; especialidade: string }
    >();

    const ensureGroup = (om: string, graduacao: string, especialidade: string) => {
      const key = `${om}||${graduacao}||${especialidade}`;
      if (!grouped.has(key)) grouped.set(key, { tmft: 0, exi: 0, om, graduacao, especialidade });
      return grouped.get(key)!;
    };

    for (const person of personnel) {
      const tipoSetor = String(person.tipoSetor || "").trim();
      const isExtraLotacao = tipoSetor.toUpperCase() === "EXTRA LOTAÇÃO" || Boolean(person.isExtraLotacao);
      if (isExtraLotacao) continue;

      const om = String(person.om || "").trim();
      if (!om) continue;

      // Determina ocupado
      const nomeUpper = String(person.nome || "").trim().toUpperCase();
      const isVagoByNome = !nomeUpper || nomeUpper === "VAGO" || nomeUpper === "VAZIO";
      const isVagoByFlag = Boolean(person.isVago);

      let ocupado: boolean;
      if (typeof person.ocupado === "boolean") {
        ocupado = person.ocupado;
      } else if (typeof person.ocupado === "number") {
        ocupado = person.ocupado !== 0;
      } else if (typeof person.ocupado === "string") {
        const v = person.ocupado.trim().toUpperCase();
        if (["TRUE", "SIM", "S", "YES", "1", "X", "OCUPADO"].includes(v)) ocupado = true;
        else if (["FALSE", "NÃO", "NAO", "N", "NO", "0", "VAGO", "VAZIO", ""].includes(v)) ocupado = false;
        else ocupado = true;
      } else {
        ocupado = true;
      }
      if (isVagoByFlag || isVagoByNome) ocupado = false;

      // TMFT: conta a posição pelo postoTmft
      const postoTmftRaw = String(person.postoTmft || "").trim();
      if (postoTmftRaw) {
        const graduacaoTmft = categoria === "OFICIAIS" ? normalizePostoOficiais(postoTmftRaw) : postoTmftRaw;
        const especialidadeTmft = String(person.quadroTmft || person.especialidadeTmft || "").trim();
        if (graduacaoTmft) {
          const g = ensureGroup(om, graduacaoTmft, especialidadeTmft);
          g.tmft += 1;
        }
      }

      // EXI: conta o efetivo pelo postoEfe (ou fallback) quando ocupado
      if (ocupado) {
        const postoEfeRaw = String(person.postoEfe || person.postoTmft || "").trim();
        const graduacaoEfe =
          categoria === "OFICIAIS" ? normalizePostoOficiais(postoEfeRaw) : postoEfeRaw;
        const especialidadeEfe = String(
          person.quadroEfe || person.especialidadeEfe || person.quadroTmft || person.especialidadeTmft || "",
        ).trim();
        if (graduacaoEfe) {
          const g = ensureGroup(om, graduacaoEfe, especialidadeEfe);
          g.exi += 1;
        }
      }
    }

    return Array.from(grouped.values()).map(({ tmft, exi, om, graduacao, especialidade }) => ({
      id: `${categoria}-${om}||${graduacao}||${especialidade}`,
      nome: `${graduacao} - ${om}`,
      especialidade: especialidade || "-",
      graduacao,
      om,
      sdp: "",
      tmft,
      exi,
      dif: exi - tmft,
      previsaoEmbarque: "",
      pracasTTC: 0,
      servidoresCivis: 0,
      percentualPracasAtiva: tmft > 0 ? (exi / tmft) * 100 : 0,
      percentualForcaTrabalho: 0,
      categoria,
    }));
  };

  const filterRawForCurrentUser = (arr: any[]) => {
    const allowedOMs = getAllowedOMs();
    if (allowedOMs === "all") return arr;

    const allowedUpper = new Set(allowedOMs.map((o) => String(o || "").toUpperCase()));
    return arr.filter((item: any) => allowedUpper.has(String(item?.om || "").toUpperCase()));
  };

  // Fetch data from both PRAÇAS and OFICIAIS edge functions
  const fetchData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);

    // Check if offline using navigator.onLine for real-time status
    const currentlyOnline = navigator.onLine;

    if (!currentlyOnline) {
      console.log("Offline mode - attempting to load from cache");
      const cachedData = getFromCache();
      if (cachedData && cachedData.length > 0) {
        console.log("Loading COpAb data from cache:", cachedData.length, "records");

        // Apply user access filtering to cached data (case-insensitive)
        const filteredByAccess = filterDataForCurrentUser(cachedData);

        setMilitaryData(filteredByAccess);
        setRawPersonnel({ pracas: [], oficiais: [] });
        setIsUsingCache(true);
        const cacheTime = getCacheTimestamp();
        if (cacheTime) {
          toast.info(`Modo offline - dados do cache de ${cacheTime.toLocaleString("pt-BR")}`);
        }
      } else {
        console.log("No cache available, using mock data");
        toast.error("Sem conexão e sem dados em cache");
        setMilitaryData(mockMilitaryData);
        setRawPersonnel({ pracas: [], oficiais: [] });
      }
      setIsLoading(false);
      if (showToast) setIsRefreshing(false);
      return;
    }
    
    try {
      console.log("Fetching data from PRAÇAS and OFICIAIS edge functions...");
      
      // Fetch both PRAÇAS and OFICIAIS data in parallel
      const [pracasResponse, oficiaisResponse] = await Promise.all([
        supabase.functions.invoke("fetch-pracas-data"),
        supabase.functions.invoke("fetch-om-data"),
      ]);

      let allMilitaryData: MilitaryData[] = [];

      const nextRawPracas: any[] = [];
      const nextRawOficiais: any[] = [];

      // Process PRAÇAS data - use 'data' property (or 'personnel' for backwards compatibility)
      if (pracasResponse.error) {
        console.error("Error fetching PRAÇAS data:", pracasResponse.error);
      } else {
        const pracasRaw = pracasResponse.data?.data || pracasResponse.data?.personnel || [];
        const pracasFiltered = filterRawForCurrentUser(pracasRaw);
        nextRawPracas.push(...pracasFiltered);

        if (pracasFiltered.length > 0) {
          console.log(`Loaded ${pracasFiltered.length} PRAÇAS records`);
          const pracasData = convertToMilitaryData(pracasFiltered, "PRAÇAS");
          allMilitaryData = [...allMilitaryData, ...pracasData];
        }
      }

      // Process OFICIAIS data - use 'data' property (or 'personnel' for backwards compatibility)
      if (oficiaisResponse.error) {
        console.error("Error fetching OFICIAIS data:", oficiaisResponse.error);
      } else {
        const oficiaisRaw = oficiaisResponse.data?.data || oficiaisResponse.data?.personnel || [];
        const oficiaisFiltered = filterRawForCurrentUser(oficiaisRaw);
        nextRawOficiais.push(...oficiaisFiltered);

        if (oficiaisFiltered.length > 0) {
          console.log(`Loaded ${oficiaisFiltered.length} OFICIAIS records`);

          // Debug: conferir se existe 2T em COpAb nos dados brutos
          const copab = oficiaisFiltered.filter((p: any) => String(p?.om || "") === "COpAb");
          const postosCopab = Array.from(
            new Set(
              copab
                .map((p: any) => String(p?.postoTmft || p?.postoEfe || "").trim())
                .filter(Boolean),
            ),
          ).sort();
          console.log("Index debug (OFICIAIS/COpAb) postos encontrados:", postosCopab);

          const oficiaisData = convertToMilitaryData(oficiaisFiltered, "OFICIAIS");
          allMilitaryData = [...allMilitaryData, ...oficiaisData];
        }
      }

      setRawPersonnel({ pracas: nextRawPracas, oficiais: nextRawOficiais });

      if (allMilitaryData.length > 0) {
        console.log(`Total combined records: ${allMilitaryData.length}`);

        // Save raw data to cache before filtering
        saveToCache(allMilitaryData);
        setIsUsingCache(false);

        // Apply user access filtering (case-insensitive)
        const filteredByAccess = filterDataForCurrentUser<MilitaryData>(allMilitaryData);

        console.log("Index - After access filter:", filteredByAccess.length, "records");

        // Detectar alterações nos valores
        if (previousData.length > 0 && showToast) {
          const changes = detectChanges(previousData, filteredByAccess);
          if (changes.length > 0) {
            changes.forEach((change) => {
              toast.success(change, {
                duration: 5000,
              });
            });
          }
        }

        setPreviousData(militaryData);
        setMilitaryData(filteredByAccess);

        if (showToast) {
          toast.success(`Dados atualizados! ${filteredByAccess.length} registros combinados.`);
        }
      } else {
        console.log("No data from edge functions, using mock data");
        toast("Usando dados de exemplo", {
          description: "Adicione dados na planilha para ver informações reais.",
        });
        
        // Also filter mock data by access (case-insensitive)
        const filteredMock = filterDataForCurrentUser(mockMilitaryData);
        setMilitaryData(filteredMock);
      }
    } catch (error) {
      console.error("Error:", error);
      // Try to load from cache on error
      const cachedData = getFromCache();
      if (cachedData && cachedData.length > 0) {
        console.log("Exception - loading from cache");
        const filteredByAccess = filterDataForCurrentUser(cachedData);
        setMilitaryData(filteredByAccess);
        setIsUsingCache(true);
        toast.warning("Erro ao conectar - usando dados do cache");
      } else {
        toast.error("Erro ao conectar. Usando dados de exemplo.");
        setMilitaryData(mockMilitaryData);
      }
    }
    setIsLoading(false);
    if (showToast) setIsRefreshing(false);
  };

  const handleManualRefresh = () => {
    // Evita ficar preso em dados antigos (ex.: posto 2T não aparecendo por cache)
    clearCache();
    setIsUsingCache(false);
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

    // Auto-refresh a cada 2 minutos
    const interval = setInterval(() => {
      console.log("Auto-refreshing data...");
      fetchData();
    }, 120000); // 2 minutos

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  const filterOptions = useMemo(() => {
    // Filtrar dados baseado na categoria selecionada (ou todos)
    const dataByCategory = filters.categoria === "TODOS" 
      ? militaryData 
      : militaryData.filter((item) => item.categoria === filters.categoria);

    // Obter valores únicos apenas da categoria selecionada
    const filteredOMs = getAvailableOMsForUser(
      Array.from(new Set(dataByCategory.map((item) => item.om))).sort()
    );

    const filteredEspecialidades = Array.from(new Set(dataByCategory.map((item) => item.especialidade).filter((e) => e && e.trim() !== "" && e !== "-"))).sort();

    const filteredGraduacoes = Array.from(new Set(dataByCategory.map((item) => item.graduacao))).sort();

    const filteredSDPs = Array.from(new Set(dataByCategory.map((item) => item.sdp).filter(Boolean))).sort();

    const filteredMeses = Array.from(
      new Set(dataByCategory.map((item) => item.previsaoEmbarque).filter(Boolean)),
    ).sort();

    return {
      oms: filteredOMs,
      especialidades: filteredEspecialidades,
      graduacoes: filteredGraduacoes,
      sdps: filteredSDPs,
      meses: filteredMeses,
    };
  }, [militaryData, filters.categoria]);

  const filteredData = useMemo(() => {
    let data = militaryData;

    // Filtrar por categoria (PRAÇAS/OFICIAIS) - apenas se não for "TODOS"
    if (filters.categoria !== "TODOS") {
      data = data.filter((item) => item.categoria === filters.categoria);
    }

    // Filtrar por OM
    if (filters.om.length > 0) {
      data = data.filter((item) => filters.om.includes(item.om));
    }

    // Filtrar por especialidade
    if (filters.especialidade.length > 0) {
      data = data.filter((item) => filters.especialidade.includes(item.especialidade));
    }

    // Filtrar por pessoal (graduação)
    if (filters.pessoal.length > 0) {
      data = data.filter((item) => filters.pessoal.includes(item.graduacao));
    }

    return data;
  }, [filters, militaryData]);

  const extraLotacaoTotal = useMemo(() => {
    const categoriaSelecionada = filters.categoria;

    const candidates: any[] =
      categoriaSelecionada === "PRAÇAS"
        ? rawPersonnel.pracas
        : categoriaSelecionada === "OFICIAIS"
          ? rawPersonnel.oficiais
          : [...rawPersonnel.pracas, ...rawPersonnel.oficiais];

    const isExtra = (p: any) => {
      const tipoSetor = String(p.tipoSetor || "").trim().toUpperCase();
      return tipoSetor === "EXTRA LOTAÇÃO" || Boolean(p.isExtraLotacao);
    };

    const matches = (p: any) => {
      // OM
      if (filters.om.length > 0 && !filters.om.includes(String(p.om || "").trim())) return false;

      // Pessoal (graduação) - para EXTRA LOTAÇÃO normalmente vem em postoEfe
      if (filters.pessoal.length > 0) {
        const posto = String(p.postoEfe || p.postoTmft || "").trim();
        if (!filters.pessoal.includes(posto)) return false;
      }

      // Especialidade (quadro/especialidade)
      if (filters.especialidade.length > 0) {
        const esp = String(p.quadroEfe || p.quadroTmft || p.especialidadeEfe || p.especialidadeTmft || "").trim();
        if (!filters.especialidade.includes(esp)) return false;
      }

      return true;
    };

    return candidates.filter((p) => isExtra(p) && matches(p)).length;
  }, [filters.categoria, filters.om, filters.pessoal, filters.especialidade, rawPersonnel]);

  const extraLotacaoRows = useMemo<ExtraLotacaoRow[]>(() => {
    const categoriaSelecionada = filters.categoria;

    const candidates: Array<{ categoria: "PRAÇAS" | "OFICIAIS"; p: any }> = [];
    if (categoriaSelecionada === "PRAÇAS" || categoriaSelecionada === "TODOS") {
      candidates.push(...rawPersonnel.pracas.map((p) => ({ categoria: "PRAÇAS" as const, p })));
    }
    if (categoriaSelecionada === "OFICIAIS" || categoriaSelecionada === "TODOS") {
      candidates.push(...rawPersonnel.oficiais.map((p) => ({ categoria: "OFICIAIS" as const, p })));
    }

    const isExtra = (p: any) => {
      const tipoSetor = String(p.tipoSetor || "").trim().toUpperCase();
      return tipoSetor === "EXTRA LOTAÇÃO" || Boolean(p.isExtraLotacao);
    };

    const matches = (p: any) => {
      if (filters.om.length > 0 && !filters.om.includes(String(p.om || "").trim())) return false;

      if (filters.pessoal.length > 0) {
        const posto = String(p.postoEfe || p.postoTmft || "").trim();
        if (!filters.pessoal.includes(posto)) return false;
      }

      if (filters.especialidade.length > 0) {
        const esp = String(p.quadroEfe || p.quadroTmft || p.especialidadeEfe || p.especialidadeTmft || "").trim();
        if (!filters.especialidade.includes(esp)) return false;
      }

      return true;
    };

    const normalizeOcupado = (p: any) => {
      if (typeof p.ocupado === "boolean") return p.ocupado;
      const nome = String(p.nome || "").trim().toUpperCase();
      if (!nome || nome === "VAGO" || nome === "VAZIO") return false;
      if (Boolean(p.isVago)) return false;
      return true;
    };

    return candidates
      .filter(({ p }) => isExtra(p) && matches(p))
      .map(({ categoria, p }, idx) => {
        const om = String(p.om || "").trim();
        const posto = String(p.postoEfe || p.postoTmft || "").trim();
        const quadro = String(p.quadroEfe || p.quadroTmft || p.especialidadeEfe || p.especialidadeTmft || "").trim();
        const opcao = String(p.opcaoEfe || p.opcaoTmft || "").trim();
        const cargo = String(p.cargo || "").trim();
        const nome = String(p.nome || "").trim();
        const ocupado = normalizeOcupado(p);

        return {
          id: `${categoria}-${om}-${posto}-${quadro}-${opcao}-${idx}`,
          categoria,
          om,
          posto,
          quadro,
          opcao,
          cargo,
          nome,
          ocupado,
        };
      });
  }, [filters.categoria, filters.om, filters.pessoal, filters.especialidade, rawPersonnel]);

  const metrics = useMemo(() => {
    const totalTMFT = filteredData.reduce((sum, item) => sum + item.tmft, 0);
    const totalEXI = filteredData.reduce((sum, item) => sum + item.exi, 0);
    const totalDIF = filteredData.reduce((sum, item) => sum + item.dif, 0);
    // Porcentagem de ocupação (EXI/TMFT)
    const occupancyPercent = totalTMFT > 0 ? ((totalEXI / totalTMFT) * 100).toFixed(1) : "0.0";

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      occupancyPercent,
    };
  }, [filteredData]);

  const handleFilterChange = (filterType: string, values: string[] | "TODOS" | "PRAÇAS" | "OFICIAIS") => {
    if (filterType === "categoria") {
      // Limpar filtros de pessoal ao trocar de categoria
      setFilters((prev) => ({
        ...prev,
        categoria: values as "TODOS" | "PRAÇAS" | "OFICIAIS",
        pessoal: [],
      }));
    } else {
      setFilters((prev) => ({ ...prev, [filterType]: values }));
    }
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
        className="fixed inset-0 bg-cover bg-no-repeat opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${militaryBg})`, backgroundPosition: "45% center" }}
      />
      <div className="fixed inset-0 bg-blue-50/80 pointer-events-none" />

      {/* Header */}
      <header className="bg-blue-600 text-primary-foreground shadow-elevated relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={36} className="text-primary-foreground" />
              <div>
                <h1 className="text-3xl font-bold">Dashboard COpAb</h1>
                <p className="text-sm opacity-90">
                  Centro de Operações do Abastecimento - Análise do Pessoal Militar e Civil
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Online/Offline Status */}
              <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                {isOnline ? "Online" : "Offline"}
              </Badge>
              {isUsingCache && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  Cache
                </Badge>
              )}
              <Button variant="secondary" onClick={() => navigate("/dashboard-pracas")}>
                <FileText size={18} className="mr-2" />
                PRAÇAS
              </Button>
              <Button variant="secondary" onClick={() => navigate("/dashboard-om")}>
                <FileText size={18} className="mr-2" />
                OFICIAIS
              </Button>
              <Button variant="secondary" onClick={() => navigate("/dashboard-ttc")}>
                <FileText size={18} className="mr-2" />
                TTC
              </Button>
              <Button variant="secondary" onClick={handleManualRefresh} disabled={isRefreshing}>
                <RefreshCw size={18} className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
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
          chartRef={chartRef}
        />

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <MetricsCard title="Total TMFT" value={metrics.totalTMFT} icon={Shield} variant="default" />
          <MetricsCard title="Total EXI" value={metrics.totalEXI} icon={Users} variant="success" />
          <MetricsCard
            title="Total DIF"
            value={metrics.totalDIF}
            icon={metrics.totalDIF >= 0 ? TrendingUp : TrendingDown}
            variant={metrics.totalDIF >= 0 ? "success" : "destructive"}
          />
          <MetricsCard
            title="Atendimento"
            value={`${metrics.occupancyPercent}%`}
            icon={Percent}
            variant={
              parseFloat(metrics.occupancyPercent) >= 90
                ? "success"
                : parseFloat(metrics.occupancyPercent) >= 70
                  ? "warning"
                  : "destructive"
            }
          />
          <MetricsCard title="Extra Lotação" value={extraLotacaoTotal} icon={Users} variant="warning" />
        </div>

        {/* Gráfico de Totais */}
        <div ref={chartRef}>
          <TotalsChart totalTMFT={metrics.totalTMFT} totalEXI={metrics.totalEXI} totalDIF={metrics.totalDIF} />
        </div>

        {/* Gráfico de Distribuição por OM (quando há filtro de especialidade) */}
        {filters.especialidade.length > 0 && (
          <DistributionChart data={filteredData} selectedSpecialties={filters.especialidade} />
        )}

        {/* Tabela de Pessoal por OM */}
        <PersonnelTable data={filteredData} categoria={filters.categoria} />

        {/* Lista de Extra Lotação (filtrada pelos mesmos filtros acima) */}
        <ExtraLotacaoTable rows={extraLotacaoRows} />

        {/* Gráfico de Diferença por Graduação */}
        <DifferenceByGraduationChart data={filteredData} categoria={filters.categoria} />
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

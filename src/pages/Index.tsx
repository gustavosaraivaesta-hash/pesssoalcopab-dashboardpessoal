import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Users, TrendingDown, TrendingUp, LogOut, RefreshCw, FileText, Wifi, WifiOff, Percent, Settings, X, ClipboardList, Archive, Lock, ChevronDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/hooks/useAuth";

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
  const { signOut, role } = useAuth();
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
  
  // NEO Comparison states
  const [showNeoComparison, setShowNeoComparison] = useState(false);
  const [showNeoPersonnel, setShowNeoPersonnel] = useState<"fora" | "na" | null>(null);
  
  // Pending requests count for COpAb
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Admin password modal state
  const ADMIN_PASSWORD = "COPABADMIN";
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [pendingAdminRoute, setPendingAdminRoute] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const handleAdminNavigation = (route: string) => {
    if (isAdminUnlocked) {
      navigate(route);
    } else {
      setPendingAdminRoute(route);
      setShowAdminPasswordModal(true);
    }
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword.toUpperCase() === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      setShowAdminPasswordModal(false);
      setAdminPassword("");
      if (pendingAdminRoute) {
        navigate(pendingAdminRoute);
        setPendingAdminRoute(null);
      }
    } else {
      toast.error("Senha incorreta!");
      setAdminPassword("");
    }
  };

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

  const fetchData = async (showToast = false, isBackground = false) => {
    if (showToast) setIsRefreshing(true);

    // Check if offline using navigator.onLine for real-time status
    const currentlyOnline = navigator.onLine;

    if (!currentlyOnline) {
      console.log("Offline mode - attempting to load from cache");
      const cachedData = getFromCache();
      if (cachedData && cachedData.length > 0) {
        console.log("Loading COpAb data from cache:", cachedData.length, "records");
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
      // Only show loading spinner if no data displayed yet
      if (!isBackground && militaryData.length === 0) {
        setIsLoading(true);
      }
      console.log("Fetching data from PRAÇAS and OFICIAIS edge functions...");
      
      const invoke = (name: string, ms = 25000) =>
        Promise.race([
          supabase.functions.invoke(name),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout ao chamar ${name}`)), ms),
          ),
        ]);

      // Fetch both PRAÇAS and OFICIAIS data in parallel
      const [pracasResponse, oficiaisResponse] = await Promise.all([
        invoke("fetch-pracas-data"),
        invoke("fetch-om-data"),
      ]);

      let allMilitaryData: MilitaryData[] = [];

      const nextRawPracas: any[] = [];
      const nextRawOficiais: any[] = [];

      // Process PRAÇAS data
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

      // Process OFICIAIS data
      if (oficiaisResponse.error) {
        console.error("Error fetching OFICIAIS data:", oficiaisResponse.error);
      } else {
        const oficiaisRaw = oficiaisResponse.data?.data || oficiaisResponse.data?.personnel || [];
        const oficiaisFiltered = filterRawForCurrentUser(oficiaisRaw);
        nextRawOficiais.push(...oficiaisFiltered);

        if (oficiaisFiltered.length > 0) {
          console.log(`Loaded ${oficiaisFiltered.length} OFICIAIS records`);

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

        saveToCache(allMilitaryData);
        setIsUsingCache(false);

        const filteredByAccess = filterDataForCurrentUser<MilitaryData>(allMilitaryData);

        console.log("Index - After access filter:", filteredByAccess.length, "records");

        if (previousData.length > 0 && showToast) {
          const changes = detectChanges(previousData, filteredByAccess);
          if (changes.length > 0) {
            changes.forEach((change) => {
              toast.success(change, { duration: 5000 });
            });
          }
        }

        setPreviousData(militaryData);
        setMilitaryData(filteredByAccess);

        if (showToast) {
          toast.success(`Dados atualizados! ${filteredByAccess.length} registros combinados.`);
        }
      } else if (militaryData.length === 0) {
        console.log("No data from edge functions, using mock data");
        toast("Usando dados de exemplo", {
          description: "Adicione dados na planilha para ver informações reais.",
        });
        const filteredMock = filterDataForCurrentUser(mockMilitaryData);
        setMilitaryData(filteredMock);
      }
    } catch (error) {
      console.error("Error:", error);
      if (militaryData.length === 0) {
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
    }
    setIsLoading(false);
    if (showToast) setIsRefreshing(false);
  };

  const handleManualRefresh = () => {
    clearCache();
    setIsUsingCache(false);
    fetchData(true);
  };

  useEffect(() => {
    // Show cached data instantly
    const cachedData = getFromCache();
    if (cachedData && cachedData.length > 0) {
      const filteredByAccess = filterDataForCurrentUser(cachedData);
      setMilitaryData(filteredByAccess);
      setRawPersonnel({ pracas: [], oficiais: [] });
      setIsUsingCache(true);
      setIsLoading(false);
    }

    // Fetch fresh data in background
    fetchData(false, !!cachedData);

    // Auto-refresh a cada 5 minutos
    const interval = setInterval(() => {
      console.log("Auto-refreshing data...");
      fetchData(false, true);
    }, 300000);

    // Auto-refresh when user returns to the tab/app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log("Tab visible - refreshing Index data...");
        fetchData(false, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Refresh immediately when data changes are triggered from other pages
    const handleDataRefresh = () => {
      console.log("Data refresh triggered - reloading Index data...");
      fetchData(false, true);
    };
    window.addEventListener('data-refresh', handleDataRefresh);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'data_refresh_requested') handleDataRefresh();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('data-refresh', handleDataRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Fetch pending requests count for COpAb
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (role !== "COPAB") return;
      
      try {
        const withTimeout = <T,>(promise: Promise<T>, ms = 15000) =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
          ]);

        const { data, error } = await withTimeout(
          supabase.functions.invoke("manage-personnel-requests", {
            body: { action: "list" },
          }),
          15000,
        );

        if (!error && data?.requests) {
          const pending = data.requests.filter((r: any) => r.status === "PENDENTE").length;
          setPendingRequestsCount(pending);
        }
      } catch (error) {
        console.error("Error fetching pending requests:", error);
      }
    };

    fetchPendingRequests();
    
    // Auto-refresh pending count every 30 seconds
    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao realizar logout");
    }
  };

  const filterOptions = useMemo(() => {
    // Filtrar dados baseado na categoria selecionada (ou todos)
    const dataByCategory = filters.categoria === "TODOS" 
      ? militaryData 
      : militaryData.filter((item) => item.categoria === filters.categoria);

    // Obter valores únicos apenas da categoria selecionada (normalizar para uppercase)
    const filteredOMs = getAvailableOMsForUser(
      Array.from(new Set(dataByCategory.map((item) => String(item.om || "").toUpperCase()).filter(Boolean))).sort()
    );

    const filteredEspecialidades = Array.from(new Set(dataByCategory.map((item) => item.especialidade).filter((e) => e && e.trim() !== "" && e !== "-"))).sort();

    const graduacaoHierarchy = ["C ALTE", "CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN"];
    const filteredGraduacoes = Array.from(new Set(dataByCategory.map((item) => item.graduacao))).sort((a, b) => {
      const idxA = graduacaoHierarchy.indexOf(a);
      const idxB = graduacaoHierarchy.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

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

    // Filtrar por OM (comparação case-insensitive)
    if (filters.om.length > 0) {
      data = data.filter((item) => filters.om.includes(String(item.om || "").toUpperCase()));
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
      if (filters.om.length > 0 && !filters.om.includes(String(p.om || "").toUpperCase())) return false;

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
      if (filters.om.length > 0 && !filters.om.includes(String(p.om || "").toUpperCase())) return false;

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
        const cargoRaw = String(p.cargo || "").trim();
        const cargo = cargoRaw.toUpperCase() === "EXTRA LOTAÇÃO" ? "SEM NEO" : cargoRaw;
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
    const totalDIF = totalEXI - totalTMFT;
    // Porcentagem de ocupação (EXI/TMFT)
    const occupancyPercent = totalTMFT > 0 ? ((totalEXI / totalTMFT) * 100).toFixed(1) : "0.0";

    // NEO comparison counts (when specialty filter is active)
    let foraDaNeo = 0;
    let naNeo = 0;

    if (filters.especialidade.length > 0) {
      const categoriaSelecionada = filters.categoria;
      const candidates: any[] =
        categoriaSelecionada === "PRAÇAS"
          ? rawPersonnel.pracas
          : categoriaSelecionada === "OFICIAIS"
            ? rawPersonnel.oficiais
            : [...rawPersonnel.pracas, ...rawPersonnel.oficiais];

      // Filter by OM
      let baseData = candidates;
      if (filters.om.length > 0) {
        baseData = baseData.filter((p) => filters.om.includes(String(p.om || "").toUpperCase()));
      }

      // Filter by especialidade (TMFT)
      baseData = baseData.filter((p) => {
        const esp = String(p.quadroTmft || p.especialidadeTmft || "").trim();
        return filters.especialidade.includes(esp);
      });

      // Exclude EXTRA LOTAÇÃO
      baseData = baseData.filter((p) => {
        const tipoSetor = String(p.tipoSetor || "").trim().toUpperCase();
        return tipoSetor !== "EXTRA LOTAÇÃO" && !Boolean(p.isExtraLotacao);
      });

      // Only count occupied (efetivo)
      const ocupados = baseData.filter((p) => {
        const nomeUpper = String(p.nome || "").trim().toUpperCase();
        const isVagoByNome = !nomeUpper || nomeUpper === "VAGO" || nomeUpper === "VAZIO";
        const isVagoByFlag = Boolean(p.isVago);
        let ocupado: boolean;
        if (typeof p.ocupado === "boolean") {
          ocupado = p.ocupado;
        } else if (typeof p.ocupado === "number") {
          ocupado = p.ocupado !== 0;
        } else if (typeof p.ocupado === "string") {
          const v = p.ocupado.trim().toUpperCase();
          if (["TRUE", "SIM", "S", "YES", "1", "X", "OCUPADO"].includes(v)) ocupado = true;
          else if (["FALSE", "NÃO", "NAO", "N", "NO", "0", "VAGO", "VAZIO", ""].includes(v)) ocupado = false;
          else ocupado = true;
        } else {
          ocupado = true;
        }
        if (isVagoByFlag || isVagoByNome) ocupado = false;
        return ocupado;
      });

      foraDaNeo = ocupados.filter((item) => {
        const especialidadeTmft = (item.quadroTmft || item.especialidadeTmft || "").trim().toUpperCase();
        const especialidadeEfe = (item.quadroEfe || item.especialidadeEfe || "").trim().toUpperCase();
        return especialidadeTmft !== especialidadeEfe;
      }).length;

      naNeo = ocupados.filter((item) => {
        const especialidadeTmft = (item.quadroTmft || item.especialidadeTmft || "").trim().toUpperCase();
        const especialidadeEfe = (item.quadroEfe || item.especialidadeEfe || "").trim().toUpperCase();
        return especialidadeTmft === especialidadeEfe;
      }).length;
    }

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      occupancyPercent,
      foraDaNeo,
      naNeo,
    };
  }, [filteredData, filters.especialidade, filters.categoria, filters.om, rawPersonnel]);

  // NEO comparison personnel list
  const neoComparisonPersonnel = useMemo(() => {
    if (!showNeoPersonnel || filters.especialidade.length === 0) return [];

    const categoriaSelecionada = filters.categoria;
    const candidates: any[] =
      categoriaSelecionada === "PRAÇAS"
        ? rawPersonnel.pracas
        : categoriaSelecionada === "OFICIAIS"
          ? rawPersonnel.oficiais
          : [...rawPersonnel.pracas, ...rawPersonnel.oficiais];

    // Filter by OM
    let baseData = candidates;
    if (filters.om.length > 0) {
      baseData = baseData.filter((p) => filters.om.includes(String(p.om || "").toUpperCase()));
    }

    // Filter by especialidade (TMFT)
    baseData = baseData.filter((p) => {
      const esp = String(p.quadroTmft || p.especialidadeTmft || "").trim();
      return filters.especialidade.includes(esp);
    });

    // Exclude EXTRA LOTAÇÃO
    baseData = baseData.filter((p) => {
      const tipoSetor = String(p.tipoSetor || "").trim().toUpperCase();
      return tipoSetor !== "EXTRA LOTAÇÃO" && !Boolean(p.isExtraLotacao);
    });

    // Only count occupied (efetivo)
    const ocupados = baseData.filter((p) => {
      const nomeUpper = String(p.nome || "").trim().toUpperCase();
      const isVagoByNome = !nomeUpper || nomeUpper === "VAGO" || nomeUpper === "VAZIO";
      const isVagoByFlag = Boolean(p.isVago);
      let ocupado: boolean;
      if (typeof p.ocupado === "boolean") {
        ocupado = p.ocupado;
      } else if (typeof p.ocupado === "number") {
        ocupado = p.ocupado !== 0;
      } else if (typeof p.ocupado === "string") {
        const v = p.ocupado.trim().toUpperCase();
        if (["TRUE", "SIM", "S", "YES", "1", "X", "OCUPADO"].includes(v)) ocupado = true;
        else if (["FALSE", "NÃO", "NAO", "N", "NO", "0", "VAGO", "VAZIO", ""].includes(v)) ocupado = false;
        else ocupado = true;
      } else {
        ocupado = true;
      }
      if (isVagoByFlag || isVagoByNome) ocupado = false;
      return ocupado;
    });

    return ocupados.filter((item) => {
      const especialidadeTmft = (item.quadroTmft || item.especialidadeTmft || "").trim().toUpperCase();
      const especialidadeEfe = (item.quadroEfe || item.especialidadeEfe || "").trim().toUpperCase();
      return showNeoPersonnel === "fora" ? especialidadeTmft !== especialidadeEfe : especialidadeTmft === especialidadeEfe;
    });
  }, [showNeoPersonnel, filters.especialidade, filters.categoria, filters.om, rawPersonnel]);

  const handleEfetivoCardClick = () => {
    if (filters.especialidade.length > 0) {
      setShowNeoComparison(!showNeoComparison);
      if (showNeoComparison) {
        setShowNeoPersonnel(null);
      }
    }
  };

  const handleFilterChange = (filterType: string, values: string[] | "TODOS" | "PRAÇAS" | "OFICIAIS") => {
    // Reset NEO comparison when filters change
    setShowNeoComparison(false);
    setShowNeoPersonnel(null);
    
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
                Dashboard de Oficiais
              </Button>
              <Button variant="secondary" onClick={() => navigate("/dashboard-ttc")}>
                <FileText size={18} className="mr-2" />
                TTC
              </Button>
              
              {/* Solicitações button for non-COPAB users */}
              {role && role !== "COPAB" && (
                <Button variant="secondary" onClick={() => navigate("/solicitacoes")}>
                  <ClipboardList size={18} className="mr-2" />
                  Solicitações
                </Button>
              )}
              
              {/* Admin Dropdown Menu - Only for COPAB */}
              {role === "COPAB" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="flex items-center gap-1">
                      <Lock size={18} className="mr-1" />
                      Admin
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleAdminNavigation("/solicitacoes")}>
                      <ClipboardList size={16} className="mr-2" />
                      Solicitações
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdminNavigation("/admin/solicitacoes")}>
                      <Settings size={16} className="mr-2" />
                      Gestão
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdminNavigation("/admin/historico")}>
                      <Archive size={16} className="mr-2" />
                      Histórico
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdminNavigation("/admin/users")}>
                      <Users size={16} className="mr-2" />
                      Usuários
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}


              <Button variant="destructive" onClick={handleLogout}>
                <LogOut size={18} className="mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Password Modal */}
      <Dialog open={showAdminPasswordModal} onOpenChange={setShowAdminPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Acesso Administrativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Digite a senha de administrador</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Senha..."
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminPasswordSubmit()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAdminPasswordModal(false);
              setAdminPassword("");
              setPendingAdminRoute(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAdminPasswordSubmit}>
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          onManual={() => navigate("/manual")}
          extraLotacaoRows={extraLotacaoRows}
          extraLotacaoTotal={extraLotacaoTotal}
        />

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <MetricsCard title="Total TMFT" value={metrics.totalTMFT} icon={Shield} variant="default" />
          <div 
            onClick={handleEfetivoCardClick}
            className={`${filters.especialidade.length > 0 ? "cursor-pointer" : ""} ${showNeoComparison ? "ring-2 ring-green-500 rounded-lg" : ""}`}
          >
            <MetricsCard 
              title="Total EXI" 
              value={metrics.totalEXI} 
              icon={Users} 
              variant="success"
            />
          </div>
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
          <MetricsCard title="Sem NEO" value={extraLotacaoTotal} icon={Users} variant="warning" />
        </div>

        {/* Card de Solicitações Pendentes - Apenas para COpAb */}
        {role === "COPAB" && pendingRequestsCount > 0 && (
          <Card 
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white cursor-pointer hover:shadow-lg transition-all"
            onClick={() => navigate("/admin/solicitacoes")}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-full p-3">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Solicitações Pendentes</h3>
                    <p className="text-sm opacity-90">
                      {pendingRequestsCount} {pendingRequestsCount === 1 ? 'solicitação aguarda' : 'solicitações aguardam'} análise
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="bg-white/90 hover:bg-white text-orange-600 font-semibold border-0 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/admin/solicitacoes");
                  }}
                >
                  Analisar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NEO Comparison Cards */}
        {showNeoComparison && filters.especialidade.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => setShowNeoPersonnel(showNeoPersonnel === "fora" ? null : "fora")}
              className={`cursor-pointer transition-all ${showNeoPersonnel === "fora" ? "ring-2 ring-orange-500" : ""}`}
            >
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <X size={20} />
                    FORA DA NEO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.foraDaNeo}</div>
                  <p className="text-sm opacity-80">Especialidade TMFT ≠ EFE</p>
                </CardContent>
              </Card>
            </div>
            <div
              onClick={() => setShowNeoPersonnel(showNeoPersonnel === "na" ? null : "na")}
              className={`cursor-pointer transition-all ${showNeoPersonnel === "na" ? "ring-2 ring-green-500" : ""}`}
            >
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users size={20} />
                    NA NEO
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.naNeo}</div>
                  <p className="text-sm opacity-80">Especialidade TMFT = EFE</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* NEO Comparison Personnel List */}
        {showNeoPersonnel && neoComparisonPersonnel.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                {showNeoPersonnel === "fora" ? "Militares FORA DA NEO" : "Militares NA NEO"}
                <Badge variant="outline" className="ml-2">
                  {neoComparisonPersonnel.length} militar(es)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {neoComparisonPersonnel.map((person, index) => {
                  const nome = String(person.nome || "").trim();
                  const om = String(person.om || "").trim();
                  const postoTmft = String(person.postoTmft || "").trim();
                  const postoEfe = String(person.postoEfe || "").trim();
                  const quadroTmft = String(person.quadroTmft || person.especialidadeTmft || "").trim();
                  const quadroEfe = String(person.quadroEfe || person.especialidadeEfe || "").trim();
                  const cargo = String(person.cargo || "").trim();
                  const setor = String(person.setor || "").trim();

                  return (
                    <Card 
                      key={`${nome}-${index}`} 
                      className={`border-l-4 ${showNeoPersonnel === "fora" ? "border-l-orange-500" : "border-l-green-500"}`}
                    >
                      <CardContent className="p-4">
                        <div className="font-medium text-sm text-muted-foreground mb-1">
                          {postoTmft || postoEfe}
                        </div>
                        <div className="font-semibold">{nome}</div>
                        <div className="text-sm text-muted-foreground mt-1">OM: {om}</div>
                        <div className="text-xs mt-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">NEO:</span>
                            <span className="font-medium">{quadroTmft || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">EFE:</span>
                            <span className="font-medium">{quadroEfe || "-"}</span>
                          </div>
                          {cargo && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cargo:</span>
                              <span className="font-medium">{cargo}</span>
                            </div>
                          )}
                          {setor && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Setor:</span>
                              <span className="font-medium">{setor}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

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

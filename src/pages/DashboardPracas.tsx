import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAllowedOMs, getAvailableOMsForUser } from "@/lib/auth";
import { useOfflineCache, useOnlineStatus } from "@/hooks/useOfflineCache";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Home,
  Users2,
  UserCheck,
  UserX,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Building2,
  Filter,
  Wifi,
  WifiOff,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { isForaDaNeo, expandSpecialtyEquivalents } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  Legend,
  Brush,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
  AlignmentType,
  ShadingType,
} from "docx";

import brasaoRepublica from "@/assets/brasao-republica.png";

interface PersonnelRecord {
  id: string;
  neo: number | string;
  tipoSetor: string;
  setor: string;
  cargo: string;
  postoTmft: string;
  corpoTmft: string;
  quadroTmft: string;
  opcaoTmft: string;
  postoEfe: string;
  corpoEfe: string;
  quadroEfe: string;
  opcaoEfe: string;
  nome: string;
  ocupado: boolean;
  om: string;
  isExtraLotacao?: boolean;
}

interface DesembarqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  nome: string;
  destino: string;
  mesAno: string;
  documento: string;
  om: string;
}

interface TrrmRecord {
  posto: string;
  corpo: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  nome: string;
  epocaPrevista: string;
  om: string;
}

interface LicencaRecord {
  posto: string;
  corpo: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  nome: string;
  emOutraOm: string;
  deOutraOm: string;
  periodo: string;
  om: string;
}

interface DestaqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  nome: string;
  emOutraOm: string;
  deOutraOm: string;
  periodo: string;
  om: string;
}

interface CursoRecord {
  posto: string;
  quadro: string;
  especialidade: string;
  opcao: string;
  cargo: string;
  nome: string;
  anoPrevisto: string;
  om: string;
}

const DashboardPracas = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isOnline = useOnlineStatus();
  const [personnelData, setPersonnelData] = useState<PersonnelRecord[]>([]);
  const [desembarqueData, setDesembarqueData] = useState<DesembarqueRecord[]>([]);
  const [embarqueData, setEmbarqueData] = useState<DesembarqueRecord[]>([]);
  const [trrmData, setTrrmData] = useState<TrrmRecord[]>([]);
  const [licencasData, setLicencasData] = useState<LicencaRecord[]>([]);
  const [destaquesData, setDestaquesData] = useState<DestaqueRecord[]>([]);
  const [cursoData, setCursoData] = useState<CursoRecord[]>([]);
  const [availableOMs, setAvailableOMs] = useState<string[]>([]);
  const [availableQuadros, setAvailableQuadros] = useState<string[]>([]);
  
  const [availableOpcoes, setAvailableOpcoes] = useState<string[]>([]);
  const [availableGraduacoes, setAvailableGraduacoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedQuadros, setSelectedQuadros] = useState<string[]>([]);
  
  const [selectedOpcoes, setSelectedOpcoes] = useState<string[]>([]);
  const [selectedGraduacoes, setSelectedGraduacoes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("efetivo");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ocupados" | "vagos">("all");
  const [selectedOMsForVagos, setSelectedOMsForVagos] = useState<string[]>([]);
  const [showOnlyExtraLotacao, setShowOnlyExtraLotacao] = useState(false);
  const [selectedPostos, setSelectedPostos] = useState<string[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNeoComparison, setShowNeoComparison] = useState(false);
  const [neoComparisonFilter, setNeoComparisonFilter] = useState<"all" | "fora" | "na">("all");
  const [showNeoPersonnel, setShowNeoPersonnel] = useState<"fora" | "na" | null>(null);

  // Ordem fixa das graduações de praças
  const GRADUACAO_ORDER = ["SO", "SG", "CB", "MN", "SD"];
  // selectedOMsForVagos is now used for both vagos list and top especialidades chart

  const chartRef = useRef<HTMLDivElement>(null);

  const { getFromCache, saveToCache, getCacheTimestamp } = useOfflineCache<{
    data: PersonnelRecord[];
    desembarque: DesembarqueRecord[];
    embarque: DesembarqueRecord[];
    trrm: TrrmRecord[];
    licencas: LicencaRecord[];
    destaques: DestaqueRecord[];
    concurso: CursoRecord[];
    quadros: string[];
    lastUpdate: string;
  }>("pracas_data");

  const loadFromCache = () => {
    const cachedData = getFromCache();
    if (cachedData) {
      const allowedOMs = getAllowedOMs();
      const filterByOM = (arr: any[]): any[] => {
        if (allowedOMs === "all") return arr;
        return arr.filter((item: any) => allowedOMs.includes(item.om));
      };

      const data = filterByOM(cachedData.data || []) as PersonnelRecord[];
      setPersonnelData(data);
      setDesembarqueData(filterByOM(cachedData.desembarque || []) as DesembarqueRecord[]);
      setEmbarqueData(filterByOM(cachedData.embarque || []) as DesembarqueRecord[]);
      setTrrmData(filterByOM(cachedData.trrm || []) as TrrmRecord[]);
      setLicencasData(filterByOM(cachedData.licencas || []) as LicencaRecord[]);
      setDestaquesData(filterByOM(cachedData.destaques || []) as DestaqueRecord[]);
      setCursoData(filterByOM(cachedData.concurso || []) as CursoRecord[]);

      const oms = [...new Set(data.map((item: any) => item.om).filter(Boolean))];
      const opcoes = [...new Set(data.map((item: any) => item.opcaoTmft).filter(Boolean))];
      // Extrair especialidades TMFT diretamente dos dados em cache
      const quadrosFromData = [
        ...new Set(
          data
            .map((item: any) => item.quadroTmft)
            .filter((q: string) => q && q.trim() !== "" && q !== "-" && q !== "RM2" && q !== "RM-2"),
        ),
      ];

      // Extrair graduações disponíveis (postoTmft) para praças
      const graduacoesFromData = [
        ...new Set(
          data
            .map((item: any) => item.postoEfe)
            .filter((g: string) => g && g.trim() !== "" && g !== "-"),
        ),
      ].sort((a, b) => {
        const order = ["SO", "SG", "CB", "MN", "SD"];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      setAvailableOMs(getAvailableOMsForUser(oms as string[]));
      setAvailableQuadros(quadrosFromData as string[]);
      setAvailableOpcoes(opcoes as string[]);
      setAvailableGraduacoes(graduacoesFromData as string[]);

      const cacheTime = getCacheTimestamp();
      setLastUpdate(cacheTime ? cacheTime.toLocaleString("pt-BR") : "Cache");
      setIsUsingCache(true);
      return true;
    }
    return false;
  };

  const invokeFunction = async <T,>(name: string, ms = 25000) => {
    return await Promise.race([
      supabase.functions.invoke<T>(name),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout ao chamar ${name}`)), ms)),
    ]);
  };

  const fetchData = async () => {
    // If offline, try to load from cache
    if (!navigator.onLine) {
      const hasCache = loadFromCache();
      if (hasCache) {
        toast.info("Modo offline - usando dados em cache");
      } else {
        toast.error("Sem conexão e sem dados em cache");
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching PRAÇAS data...");

      const { data: result, error } = await invokeFunction<any>("fetch-pracas-data");

      if (error) {
        console.error("Error fetching PRAÇAS data:", error);
        // Try cache on error
        const hasCache = loadFromCache();
        if (hasCache) {
          toast.warning("Erro ao atualizar - usando dados em cache");
        } else {
          toast.error("Erro ao carregar dados de PRAÇAS");
        }
        return;
      }

      if (result) {
        console.log("Received PRAÇAS data:", result);

        // Save raw data to cache before filtering
        saveToCache({
          data: result.data || [],
          desembarque: result.desembarque || [],
          embarque: result.embarque || [],
          trrm: result.trrm || [],
          licencas: result.licencas || [],
          destaques: result.destaques || [],
          concurso: result.concurso || [],
          quadros: result.quadros || [],
          lastUpdate: result.lastUpdate || new Date().toLocaleTimeString("pt-BR"),
        });
        setIsUsingCache(false);

        // Apply user access filtering
        const allowedOMs = getAllowedOMs();
        console.log("DashboardPracas - allowedOMs:", allowedOMs);

        const rawData = result.data || [];
        console.log("DashboardPracas - rawData count:", rawData.length);
        console.log("DashboardPracas - unique OMs in data:", [...new Set(rawData.map((item: any) => item.om))]);

        const filterByOM = (arr: any[]): any[] => {
          if (allowedOMs === "all") return arr;
          return arr.filter((item: any) => allowedOMs.includes(item.om));
        };

        const data = filterByOM(rawData) as PersonnelRecord[];
        console.log("DashboardPracas - filtered data count:", data.length);

        const desembarque = filterByOM(result.desembarque || []) as DesembarqueRecord[];
        const embarque = filterByOM(result.embarque || []) as DesembarqueRecord[];
        const trrm = filterByOM(result.trrm || []) as TrrmRecord[];
        const licencas = filterByOM(result.licencas || []) as LicencaRecord[];
        const destaques = filterByOM(result.destaques || []) as DestaqueRecord[];
        const curso = filterByOM(result.concurso || []) as CursoRecord[];

        setPersonnelData(data);
        setDesembarqueData(desembarque);
        setEmbarqueData(embarque);
        setTrrmData(trrm);
        setLicencasData(licencas);
        setDestaquesData(destaques);
        setCursoData(curso);

        // Extract unique OMs and Opcoes from filtered data
        const oms = [...new Set(data.map((item: any) => item.om).filter(Boolean))];
        const opcoes = [...new Set(data.map((item: any) => item.opcaoTmft).filter(Boolean))];

        setAvailableOMs(getAvailableOMsForUser(oms as string[]));
        // Extrair especialidades TMFT diretamente dos dados atuais da planilha
        const quadrosFromData = [
          ...new Set(
            data
              .map((item: any) => item.quadroTmft)
              .filter((q: string) => q && q.trim() !== "" && q !== "-" && q !== "RM2" && q !== "RM-2"),
          ),
        ];
        setAvailableQuadros(quadrosFromData as string[]);
        // Extrair graduações disponíveis (postoEfe) para praças
        const graduacoesFromData = [
          ...new Set(
            data
              .map((item: any) => item.postoEfe)
              .filter((g: string) => g && g.trim() !== "" && g !== "-"),
          ),
        ].sort((a, b) => {
          const order = ["SO", "SG", "CB", "MN", "SD"];
          const indexA = order.indexOf(a);
          const indexB = order.indexOf(b);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setAvailableGraduacoes(graduacoesFromData as string[]);
        setAvailableOpcoes(opcoes as string[]);
        setLastUpdate(result.lastUpdate || new Date().toLocaleTimeString("pt-BR"));
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
      // Try cache on error
      const hasCache = loadFromCache();
      if (hasCache) {
        toast.warning("Erro ao atualizar - usando dados em cache");
      } else {
        toast.error("Erro ao carregar dados");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Base filtered data: only common filters (OM + search)
  const baseFilteredData = useMemo(() => {
    let filtered = personnelData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.nome?.toLowerCase().includes(query) ||
          item.cargo?.toLowerCase().includes(query) ||
          item.setor?.toLowerCase().includes(query) ||
          item.postoTmft?.toLowerCase().includes(query) ||
          item.postoEfe?.toLowerCase().includes(query) ||
          item.quadroTmft?.toLowerCase().includes(query) ||
          item.quadroEfe?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [personnelData, selectedOMs, searchQuery]);

  // Independent filter matching functions
  const hasSpecificFilters = selectedQuadros.length > 0 || selectedGraduacoes.length > 0 || selectedOpcoes.length > 0;

  const expandedQuadros = useMemo(() => expandSpecialtyEquivalents(selectedQuadros), [selectedQuadros]);

  const matchesTmftFilters = (item: PersonnelRecord) => {
    if (selectedQuadros.length > 0 && !expandedQuadros.includes(item.quadroTmft)) return false;
    if (selectedGraduacoes.length > 0 && !selectedGraduacoes.includes(item.postoTmft)) return false;
    if (selectedOpcoes.length > 0 && !selectedOpcoes.includes(item.opcaoTmft)) return false;
    return true;
  };

  const matchesEfeFilters = (item: PersonnelRecord) => {
    if (selectedQuadros.length > 0 && !expandedQuadros.includes(item.quadroEfe)) return false;
    if (selectedGraduacoes.length > 0 && !selectedGraduacoes.includes(item.postoEfe)) return false;
    if (selectedOpcoes.length > 0 && !selectedOpcoes.includes(item.opcaoEfe)) return false;
    return true;
  };

  // Display data: union of records matching TMFT or EFE filters
  const displayFilteredData = useMemo(() => {
    if (!hasSpecificFilters) return baseFilteredData;
    return baseFilteredData.filter((item) => matchesTmftFilters(item) || (item.ocupado && matchesEfeFilters(item)));
  }, [baseFilteredData, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  // Filtered data for display (applies status filter and extra lotação for drill-down)
  const filteredData = useMemo(() => {
    let filtered = displayFilteredData;

    if (statusFilter === "ocupados") {
      filtered = filtered.filter((item) => item.ocupado);
    } else if (statusFilter === "vagos") {
      filtered = filtered.filter((item) => !item.ocupado);
    }

    if (showOnlyExtraLotacao) {
      filtered = filtered.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO");
    }

    return filtered;
  }, [displayFilteredData, statusFilter, showOnlyExtraLotacao]);

  const toggleOM = (om: string) => {
    setSelectedOMs((prev) => (prev.includes(om) ? prev.filter((o) => o !== om) : [...prev, om]));
  };

  const toggleQuadro = (quadro: string) => {
    setSelectedQuadros((prev) => (prev.includes(quadro) ? prev.filter((q) => q !== quadro) : [...prev, quadro]));
  };


  const toggleOpcao = (opcao: string) => {
    setSelectedOpcoes((prev) => (prev.includes(opcao) ? prev.filter((o) => o !== opcao) : [...prev, opcao]));
  };

  const toggleGraduacao = (graduacao: string) => {
    setSelectedGraduacoes((prev) => (prev.includes(graduacao) ? prev.filter((g) => g !== graduacao) : [...prev, graduacao]));
  };

  const clearFilters = () => {
    setSelectedOMs([]);
    setSelectedQuadros([]);
    
    setSelectedOpcoes([]);
    setSelectedGraduacoes([]);
    setStatusFilter("all");
    setShowOnlyExtraLotacao(false);
    setSearchQuery("");
    setShowNeoComparison(false);
    setNeoComparisonFilter("all");
    setShowNeoPersonnel(null);
  };

  const handleStatusCardClick = (status: "all" | "ocupados" | "vagos") => {
    setStatusFilter((prev) => (prev === status ? "all" : status));
    // Reset NEO comparison when clicking on other status cards
    if (status !== "ocupados") {
      setShowNeoComparison(false);
      setNeoComparisonFilter("all");
      setShowNeoPersonnel(null);
    }
  };

  const handleEfetivoCardClick = () => {
    // Toggle efetivo filter
    setStatusFilter((prev) => (prev === "ocupados" ? "all" : "ocupados"));

    // Always show NEO comparison when clicking EFETIVO
    setShowNeoComparison((prev) => !prev || statusFilter !== "ocupados");
    setNeoComparisonFilter("all");
    setShowNeoPersonnel(null);
  };

  // Personnel for "Fora da NEO" and "Na NEO" cards - independent from main filters
  const neoComparisonPersonnel = useMemo(() => {
    if (!showNeoPersonnel) return [];

    // Filter from base data (OM + search), always show ocupados, exclude extra lotação
    let baseData = baseFilteredData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO" && item.ocupado);

    // Apply independent EFE filters
    if (hasSpecificFilters) {
      baseData = baseData.filter(matchesEfeFilters);
    }

    return baseData.filter((item) => {
      const isForaNeoResult = isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
      if (showNeoPersonnel === "fora") {
        return isForaNeoResult;
      } else {
        return !isForaNeoResult;
      }
    });
  }, [showNeoPersonnel, baseFilteredData, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const OPCOES_FIXAS = ["CARREIRA", "RM-2", "TTC"];

  // Metrics calculated independently for TMFT and EFETIVO
  const metrics = useMemo(() => {
    const regularData = baseFilteredData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");

    let totalTMFT: number;
    let totalEXI: number;

    if (hasSpecificFilters) {
      // Independent counting: TMFT by TMFT fields, EFETIVO by EFE fields
      totalTMFT = regularData.filter(matchesTmftFilters).length;
      totalEXI = regularData.filter((item) => item.ocupado && matchesEfeFilters(item)).length;
    } else {
      totalTMFT = regularData.length;
      totalEXI = regularData.filter((item) => item.ocupado).length;
    }

    const totalDIF = totalEXI - totalTMFT;
    const percentualPreenchimento = totalTMFT > 0 ? (totalEXI / totalTMFT) * 100 : 0;

    const totalExtraLotacao = hasSpecificFilters
      ? baseFilteredData.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO" && matchesEfeFilters(item)).length
      : baseFilteredData.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO").length;

    const atendimentoTotal = totalTMFT > 0 ? ((totalExtraLotacao + totalEXI) / totalTMFT) * 100 : 0;

    // Calculate "Fora da NEO" and "Na NEO" based on EFETIVO
    // FORA DA NEO: quadro TMFT ≠ quadro EFE (when both exist and are meaningful)
    // NA NEO = EFETIVO - FORA DA NEO (ensures the sum matches)
    const occupiedRegular = regularData.filter((item) => item.ocupado);
    const efetivoForNeo = hasSpecificFilters
      ? occupiedRegular.filter(matchesEfeFilters)
      : occupiedRegular;

    const foraDaNeoList = efetivoForNeo.filter((item) => {
      return isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
    });

    const foraDaNeo = foraDaNeoList.length;
    const naNeo = totalEXI - foraDaNeo;

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      percentualPreenchimento,
      totalExtraLotacao,
      atendimentoTotal,
      foraDaNeo,
      naNeo,
    };
  }, [baseFilteredData, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const groupedBySetor = useMemo(() => {
    const groups: Record<string, PersonnelRecord[]> = {};

    filteredData.forEach((item) => {
      if (!groups[item.setor]) {
        groups[item.setor] = [];
      }
      groups[item.setor].push(item);
    });

    return groups;
  }, [filteredData]);

  const filterAuxiliaryData = <T extends { om: string; quadro?: string; especialidade?: string; posto?: string; opcao?: string }>(data: T[]): T[] => {
    let filtered = data;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(
        (item) => expandedQuadros.includes(item.quadro || '') || expandedQuadros.includes(item.especialidade || ''),
      );
    }

    if (selectedGraduacoes.length > 0) {
      filtered = filtered.filter((item) => selectedGraduacoes.includes(item.posto || ''));
    }

    if (selectedOpcoes.length > 0) {
      filtered = filtered.filter((item) => selectedOpcoes.includes(item.opcao || ''));
    }

    return filtered;
  };

  const filteredDesembarqueData = useMemo(() => {
    return filterAuxiliaryData(desembarqueData);
  }, [desembarqueData, selectedOMs, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const filteredEmbarqueData = useMemo(() => {
    return filterAuxiliaryData(embarqueData);
  }, [embarqueData, selectedOMs, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const filteredTrrmData = useMemo(() => {
    return filterAuxiliaryData(trrmData);
  }, [trrmData, selectedOMs, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const filteredLicencasData = useMemo(() => {
    return filterAuxiliaryData(licencasData);
  }, [licencasData, selectedOMs, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const filteredDestaquesData = useMemo(() => {
    return filterAuxiliaryData(destaquesData);
  }, [destaquesData, selectedOMs, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const filteredCursoData = useMemo(() => {
    return filterAuxiliaryData(cursoData);
  }, [cursoData, selectedOMs, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const chartDataByPosto = useMemo(() => {
    const POSTO_ORDER = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

    const grouped = filteredData.reduce(
      (acc, item) => {
        // TMFT: contar a posição pelo postoTmft
        const postoTmft = String(item.postoTmft || "").trim();
        if (postoTmft) {
          if (!acc[postoTmft]) {
            acc[postoTmft] = { name: postoTmft, tmft: 0, efe: 0 };
          }
          acc[postoTmft].tmft += 1;
        }

        // EFE: contar o efetivo pelo postoEfe (se vazio, usar postoTmft como fallback)
        if (item.ocupado) {
          const postoEfe = String(item.postoEfe || item.postoTmft || "").trim();
          if (postoEfe) {
            if (!acc[postoEfe]) {
              acc[postoEfe] = { name: postoEfe, tmft: 0, efe: 0 };
            }
            acc[postoEfe].efe += 1;
          }
        }

        return acc;
      },
      {} as Record<string, { name: string; tmft: number; efe: number }>,
    );

    const values = Object.values(grouped).filter((item) => item.tmft > 0 || item.efe > 0);

    return values.sort((a, b) => {
      const indexA = POSTO_ORDER.indexOf(a.name);
      const indexB = POSTO_ORDER.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [filteredData]);

  // Use TMFT-filtered data for vagas chart (vagas are position-based)
  const baseFilteredForVagos = useMemo(() => {
    if (!hasSpecificFilters) return baseFilteredData;
    return baseFilteredData.filter(matchesTmftFilters);
  }, [baseFilteredData, selectedQuadros, selectedGraduacoes, selectedOpcoes]);

  const chartDataVagosByOM = useMemo(() => {
    const grouped = baseFilteredForVagos.reduce(
      (acc, item) => {
        if (!acc[item.om]) {
          acc[item.om] = { om: item.om, vagos: 0, ocupados: 0, total: 0 };
        }
        acc[item.om].total += 1;
        if (item.ocupado) {
          acc[item.om].ocupados += 1;
        } else {
          acc[item.om].vagos += 1;
        }
        return acc;
      },
      {} as Record<string, { om: string; vagos: number; ocupados: number; total: number }>,
    );

    return Object.values(grouped)
      .filter((item) => item.vagos > 0)
      .sort((a, b) => b.vagos - a.vagos);
  }, [baseFilteredForVagos]);

  const vagosForSelectedOMs = useMemo(() => {
    if (selectedOMsForVagos.length === 0) return [];
    return baseFilteredForVagos.filter((item) => selectedOMsForVagos.includes(item.om) && !item.ocupado);
  }, [baseFilteredForVagos, selectedOMsForVagos]);

  const handleVagosBarClick = (data: any) => {
    if (data && data.om) {
      setSelectedOMsForVagos((prev) =>
        prev.includes(data.om) ? prev.filter((om) => om !== data.om) : [...prev, data.om],
      );
    }
  };

  // Top 5 especialidades com vagos para as OMs selecionadas (usa selectedOMsForVagos)
  const topEspecialidadesVagos = useMemo(() => {
    if (selectedOMsForVagos.length === 0) return [];

    const vagosData = baseFilteredForVagos.filter((item) => selectedOMsForVagos.includes(item.om) && !item.ocupado);

    // Agrupar por especialidade (quadroTmft)
    const grouped = vagosData.reduce(
      (acc, item) => {
        const especialidade = item.quadroTmft || "Sem Especialidade";
        if (!acc[especialidade]) {
          acc[especialidade] = { especialidade, vagos: 0 };
        }
        acc[especialidade].vagos += 1;
        return acc;
      },
      {} as Record<string, { especialidade: string; vagos: number }>,
    );

    // Ordenar por quantidade de vagos e pegar top 5
    return Object.values(grouped)
      .sort((a, b) => b.vagos - a.vagos)
      .slice(0, 5);
  }, [baseFilteredForVagos, selectedOMsForVagos]);

  // Track which bar type was clicked (tmft or efe)
  const [selectedPostoType, setSelectedPostoType] = useState<"tmft" | "efe" | null>(null);

  const handlePostoTmftClick = (data: any) => {
    if (data && data.name) {
      const isAlreadySelected = selectedPostos.includes(data.name) && selectedPostoType === "tmft";

      if (isAlreadySelected) {
        setSelectedPostos((prev) => prev.filter((p) => p !== data.name));
        setSelectedPostoType(null);
      } else {
        setSelectedPostos([data.name]);
        setSelectedPostoType("tmft");
      }
    }
  };

  const handlePostoEfeClick = (data: any) => {
    if (data && data.name) {
      const isAlreadySelected = selectedPostos.includes(data.name) && selectedPostoType === "efe";

      if (isAlreadySelected) {
        setSelectedPostos((prev) => prev.filter((p) => p !== data.name));
        setSelectedPostoType(null);
      } else {
        setSelectedPostos([data.name]);
        setSelectedPostoType("efe");
      }
    }
  };

  const personnelForSelectedPostos = useMemo(() => {
    if (selectedPostos.length === 0 || !selectedPostoType) return [];

    return filteredData.filter((item) => {
      if (selectedPostoType === "tmft") {
        // TMFT: mostrar todos os NEOs daquele posto (postoTmft)
        return selectedPostos.includes(item.postoTmft);
      }

      // EFE: mostrar apenas os ocupados daquele posto (postoEfe; fallback para postoTmft)
      const postoEfe = String(item.postoEfe || item.postoTmft || "").trim();
      return item.ocupado && selectedPostos.includes(postoEfe);
    });
  }, [filteredData, selectedPostos, selectedPostoType]);

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      const brasaoImg = new Image();
      brasaoImg.src = brasaoRepublica;
      await new Promise((resolve) => {
        brasaoImg.onload = resolve;
      });

      // Helper to check and add new page if needed
      const checkNewPage = (currentY: number, neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 20) {
          pdf.addPage();
          return 20;
        }
        return currentY;
      };

      // Helper to add OM title
      const addOMTitle = (omName: string, startY: number) => {
        let y = startY;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(omName, pageWidth / 2, y, { align: "center" });
        y += 8;
        return y;
      };

      // First page with brasão and general info
      pdf.addImage(brasaoImg, "PNG", (pageWidth - 20) / 2, yPosition, 20, 24);
      yPosition += 28;

      pdf.setFontSize(16);
      pdf.text("CENTRO DE OPERAÇÕES DO ABASTECIMENTO", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      pdf.setFontSize(14);
      pdf.text("Tabela Mestra de Força de Trabalho - PRAÇAS", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 15;

      if (
        selectedOMs.length > 0 ||
        selectedOpcoes.length > 0 ||
        selectedQuadros.length > 0 ||
        selectedGraduacoes.length > 0
      ) {
        pdf.setFontSize(10);
        pdf.text("Filtros Aplicados:", 14, yPosition);
        yPosition += 6;
        let filterX = 20;
        if (selectedOMs.length > 0) {
          pdf.text(`OM: ${selectedOMs.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedQuadros.length > 0) {
          pdf.text(`Especialidade: ${selectedQuadros.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedGraduacoes.length > 0) {
          pdf.text(`Graduação: ${selectedGraduacoes.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedOpcoes.length > 0) {
          pdf.text(`Opção: ${selectedOpcoes.join(", ")}`, filterX, yPosition);
        }
        yPosition += 10;
      }

      const activeOMs = selectedOMs.length > 0 ? selectedOMs : availableOMs;

      // ====== RESUMO - CONFORMIDADE DE ESPECIALIDADE ======
      yPosition = checkNewPage(yPosition, 50);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMO", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 6;

      const neoResumoRows: string[][] = [];
      let totalNaNeo = 0;
      let totalForaNeo = 0;
      let totalEfetivoGeral = 0;
      let totalVagosGeral = 0;
      let totalTmftConformidade = 0;

      for (const om of activeOMs) {
        // Get OM data from base (OM + search filtered)
        const omBaseData = baseFilteredData.filter((item) => item.om === om);
        if (omBaseData.length === 0) continue;

        const omRegularData = omBaseData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");

        // TMFT: count using TMFT fields
        let omTmft: number;
        if (hasSpecificFilters) {
          omTmft = omRegularData.filter(matchesTmftFilters).length;
        } else {
          omTmft = omRegularData.length;
        }

        // EFETIVO: count using EFE fields (independent filtering)
        let omEfetivoTotal: number;
        if (hasSpecificFilters) {
          omEfetivoTotal = omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item)).length;
        } else {
          omEfetivoTotal = omRegularData.filter((item) => item.ocupado).length;
        }

        const omVagos = omTmft - omEfetivoTotal;

        // FORA DA NEO: especialidade TMFT ≠ especialidade EFE (based on EFETIVO filtered)
        const omEfetivoForNeo = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item))
          : omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omEfetivoForNeo.filter((item) => {
          return isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
        }).length;

        const omNaNeo = omEfetivoTotal - omForaNeoCount;
        const omForaNeo = omForaNeoCount;

        const displayAtendimento = omTmft > 0 ? (omEfetivoTotal / omTmft) * 100 : 0;

        totalNaNeo += omNaNeo;
        totalForaNeo += omForaNeo;
        totalEfetivoGeral += omEfetivoTotal;
        totalVagosGeral += omVagos;
        totalTmftConformidade += omTmft;

        if (omTmft > 0) {
          neoResumoRows.push([
            om,
            omTmft.toString(),
            omEfetivoTotal.toString(),
            omNaNeo.toString(),
            omForaNeo.toString(),
            omVagos.toString(),
            `${displayAtendimento.toFixed(1)}%`,
          ]);
        }
      }

      // Add TOTAL row
      const totalDisplayAtendimento = totalTmftConformidade > 0 ? (totalEfetivoGeral / totalTmftConformidade) * 100 : 0;

      neoResumoRows.push([
        "TOTAL GERAL",
        totalTmftConformidade.toString(),
        totalEfetivoGeral.toString(),
        totalNaNeo.toString(),
        totalForaNeo.toString(),
        totalVagosGeral.toString(),
        `${totalDisplayAtendimento.toFixed(1)}%`,
      ]);

      if (neoResumoRows.length > 1) {
        autoTable(pdf, {
          startY: yPosition,
          head: [["OM", "TMFT", "EFETIVO", "NA NEO", "FORA DA NEO", "VAGAS", "ATENDIMENTO"]],
          body: neoResumoRows,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 3, halign: "center" },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
          bodyStyles: { fontStyle: "normal" },
          margin: { left: 20, right: 20 },
          didParseCell: (data) => {
            if (data.section === "body") {
              const omCell = data.row.raw?.[0];
              if (omCell === "TOTAL GERAL") {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [229, 231, 235];
              }
              // Highlight FORA DA NEO column if value > 0
              const colIndex = data.column.index;
              if (colIndex === 4) {
                const value = parseInt(data.row.raw?.[4] || "0");
                if (value > 0) {
                  data.cell.styles.fillColor = [255, 237, 213]; // orange-100
                  data.cell.styles.textColor = [194, 65, 12]; // orange-700
                }
              }
            }
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // ====== TABLES BY OM - each OM on a separate page ======
      for (const om of activeOMs) {
        // Get display data for this OM (union of TMFT + EFE matches)
        const omData = displayFilteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        // Always start a new page for each OM
        pdf.addPage();
        yPosition = 15;

        // OM title
        yPosition = addOMTitle(om, yPosition);

        // Calculate metrics per OM
        const omBaseData = baseFilteredData.filter((item) => item.om === om);
        const omRegularData = omBaseData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");

        let omTmft: number;
        let omEfetivo: number;

        if (hasSpecificFilters) {
          omTmft = omRegularData.filter(matchesTmftFilters).length;
          omEfetivo = omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item)).length;
        } else {
          omTmft = omRegularData.length;
          omEfetivo = omRegularData.filter((item) => item.ocupado).length;
        }

        const omVagos = omTmft - omEfetivo;
        const omAtendimento = omTmft > 0 ? (omEfetivo / omTmft) * 100 : 0;

        // FORA DA NEO for this OM (based on EFETIVO filtered)
        const omEfetivoForNeo = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item))
          : omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omEfetivoForNeo.filter((item) => {
          return isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
        }).length;
        const omNaNeoCount = omEfetivo - omForaNeoCount;

        // Add CONFORMIDADE metrics table for this OM
        autoTable(pdf, {
          startY: yPosition,
          head: [["TMFT", "EFETIVO", "VAGAS", "NA NEO", "FORA DA NEO", "ATENDIMENTO"]],
          body: [
            [
              omTmft.toString(),
              omEfetivo.toString(),
              omVagos.toString(),
              omNaNeoCount.toString(),
              omForaNeoCount.toString(),
              `${omAtendimento.toFixed(1)}%`,
            ],
          ],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2, halign: "center" },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
          bodyStyles: { fontStyle: "bold" },
          margin: { left: 40, right: 40 },
          didParseCell: (data) => {
            if (data.section === "body") {
              const colIndex = data.column.index;
              if (colIndex === 4) {
                const value = parseInt(data.row.raw?.[4] || "0");
                if (value > 0) {
                  data.cell.styles.fillColor = [255, 237, 213]; // orange-100
                  data.cell.styles.textColor = [194, 65, 12]; // orange-700
                }
              }
            }
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 8;

        // ====== TABELA DE EFETIVO ======
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("TABELA DE EFETIVO", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        // Include extra EFE rows when filters are active
        let omTableData = [...omData];
        if (hasSpecificFilters) {
          // Find personnel matching EFE filters but not TMFT filters (extra rows)
          const extraEfetivoRows = personnelData.filter((item) => {
            if (item.om !== om || item.tipoSetor === "EXTRA LOTAÇÃO" || !item.ocupado) return false;
            return matchesEfeFilters(item) && !matchesTmftFilters(item);
          });
          const existingIds = new Set(omTableData.map((item) => item.id));
          const newRows = extraEfetivoRows.filter((item) => !existingIds.has(item.id));
          omTableData = [...omTableData, ...newRows];
        }

        // Sort by NEO
        const sortedData = [...omTableData].sort((a, b) => {
          const neoA = String(a.neo || '');
          const neoB = String(b.neo || '');
          return neoA.localeCompare(neoB, undefined, { numeric: true });
        });

        const tableData = sortedData.map((item) => {
          // Determine status
          let isExtraRow = false;
          if (hasSpecificFilters && item.ocupado) {
            isExtraRow = matchesEfeFilters(item) && !matchesTmftFilters(item);
          }

          let status: string;
          if (isExtraRow) {
            status = "EFETIVO EXTRA";
          } else if (!item.ocupado) {
            status = "VAGO";
          } else {
            if (isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "")) {
              status = "FORA NEO";
            } else {
              status = "NA NEO";
            }
          }

          return [
            item.neo.toString(),
            item.setor,
            item.cargo,
            item.postoTmft,
            item.quadroTmft,
            item.nome || "-",
            item.postoEfe || "-",
            item.quadroEfe || "-",
            status,
          ];
        });

        autoTable(pdf, {
          startY: yPosition,
          head: [["NEO", "SETOR", "CARGO", "GRAD TMFT", "ESP TMFT", "NOME", "GRAD EFE", "ESP EFE", "STATUS"]],
          body: tableData,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          margin: { left: 15, right: 15 },
          didParseCell: (data) => {
            if (data.section === "body") {
              const nome = data.row.raw?.[5];
              const setor = data.row.raw?.[1];
              const status = data.row.raw?.[8];
              const nomeStr = nome ? nome.toString().trim().toUpperCase() : "";
              const setorStr = setor ? setor.toString().trim().toUpperCase() : "";
              const statusStr = status ? status.toString().trim().toUpperCase() : "";

              const isOcupado = nome && nome !== "-" && nomeStr !== "" && nomeStr !== "VAGO" && nomeStr !== "VAZIO";

              // Destaque AZUL CLARO para EFETIVO EXTRA
              if (statusStr === "EFETIVO EXTRA") {
                data.cell.styles.fillColor = [219, 234, 254]; // blue-100
                data.cell.styles.textColor = [30, 64, 175]; // blue-800
              }
              // Destaque LARANJA para FORA DA NEO
              else if (statusStr === "FORA NEO") {
                data.cell.styles.fillColor = [255, 237, 213]; // orange-100
                data.cell.styles.textColor = [194, 65, 12]; // orange-700
              }
              // Destaque amarelo para EXTRA LOTAÇÃO
              else if (setorStr.includes("EXTRA LOTA") || setorStr === "EXTRA LOTAÇÃO") {
                data.cell.styles.fillColor = [254, 240, 138];
                data.cell.styles.textColor = [113, 63, 18];
              }
              // Destaque vermelho para VAGO
              else if (!isOcupado) {
                data.cell.styles.fillColor = [254, 202, 202];
                data.cell.styles.textColor = [127, 29, 29];
              }
            }
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 8;

        // ====== PREVISÃO DE DESEMBARQUE (per OM) ======
        const omDesembarque = filterAuxiliaryData(desembarqueData).filter((item) => item.om === om);
        if (omDesembarque.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("PREVISÃO DE DESEMBARQUE", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const desembarqueTableData = omDesembarque.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo,
            item.destino,
            item.mesAno,
            item.documento || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "DESTINO", "MÊS/ANO", "DOCUMENTO"]],
            body: desembarqueTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [217, 119, 6], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== PREVISÃO DE TRRM (per OM) ======
        const omTrrm = filterAuxiliaryData(trrmData).filter((item) => item.om === om);
        if (omTrrm.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("PREVISÃO DE TRRM", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const trrmTableData = omTrrm.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.opcao || "-",
            item.cargo,
            item.epocaPrevista || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "OPÇÃO", "CARGO", "ÉPOCA PREVISTA"]],
            body: trrmTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [147, 51, 234], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== LICENÇAS (per OM) ======
        const omLicencas = filterAuxiliaryData(licencasData).filter((item) => item.om === om);
        if (omLicencas.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("LICENÇAS", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const licencasTableData = omLicencas.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo,
            item.periodo || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "PERÍODO"]],
            body: licencasTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [234, 88, 12], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== DESTAQUES (per OM) ======
        const omDestaques = filterAuxiliaryData(destaquesData).filter((item) => item.om === om);
        if (omDestaques.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("DESTAQUES", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const destaquesTableData = omDestaques.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo,
            item.emOutraOm || "-",
            item.deOutraOm || "-",
            item.periodo || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "EM OUTRA OM", "DE OUTRA OM", "PERÍODO"]],
            body: destaquesTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [202, 138, 4], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== PREVISÃO DE CURSO (per OM) ======
        const omCurso = filterAuxiliaryData(cursoData).filter((item) => item.om === om);
        if (omCurso.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("PREVISÃO DE CURSO", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const cursoTableData = omCurso.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo || "-",
            item.anoPrevisto || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "ANO PREVISTO"]],
            body: cursoTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [5, 150, 105], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }
      }

      // Add page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.text(`${i} - ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      }

      pdf.save("tabela-mestra-forca-trabalho-pracas.pdf");
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const exportToWord = async () => {
    try {
      const activeOMs = selectedOMs.length > 0 ? selectedOMs : availableOMs;
      const sections: any[] = [];

      const createCell = (text: string, isHeader = false, bgColor?: string, textColor?: string) => {
        const shading = bgColor ? { type: ShadingType.SOLID, color: bgColor } : undefined;
        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text,
                  bold: isHeader,
                  size: isHeader ? 20 : 18,
                  color: textColor || (isHeader ? "FFFFFF" : "000000"),
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading,
          width: { size: 100 / 7, type: WidthType.PERCENTAGE },
        });
      };

      // Title section
      const titleParagraphs: any[] = [
        new Paragraph({
          children: [new TextRun({ text: "CENTRO DE OPERAÇÕES DO ABASTECIMENTO", bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Tabela Mestra de Força de Trabalho - PRAÇAS", bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      ];

      // Filters applied
      if (selectedOMs.length > 0 || selectedQuadros.length > 0 || selectedGraduacoes.length > 0 || selectedOpcoes.length > 0) {
        titleParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "Filtros Aplicados:", bold: true, size: 20 })],
            spacing: { after: 100 },
          }),
        );
        if (selectedOMs.length > 0) {
          titleParagraphs.push(new Paragraph({ children: [new TextRun({ text: `OM: ${selectedOMs.join(", ")}`, size: 20 })] }));
        }
        if (selectedQuadros.length > 0) {
          titleParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Especialidade: ${selectedQuadros.join(", ")}`, size: 20 })] }));
        }
        if (selectedGraduacoes.length > 0) {
          titleParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Graduação: ${selectedGraduacoes.join(", ")}`, size: 20 })] }));
        }
        if (selectedOpcoes.length > 0) {
          titleParagraphs.push(new Paragraph({ children: [new TextRun({ text: `Opção: ${selectedOpcoes.join(", ")}`, size: 20 })] }));
        }
        titleParagraphs.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // RESUMO table
      titleParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "RESUMO", bold: true, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        }),
      );

      const neoResumoRows: TableRow[] = [
        new TableRow({
          children: [
            createCell("OM", true, "10B981"),
            createCell("TMFT", true, "10B981"),
            createCell("EFETIVO", true, "10B981"),
            createCell("NA NEO", true, "10B981"),
            createCell("FORA DA NEO", true, "10B981"),
            createCell("VAGAS", true, "10B981"),
            createCell("ATENDIMENTO", true, "10B981"),
          ],
        }),
      ];

      let totalNaNeo = 0, totalForaNeo = 0, totalEfetivoGeral = 0, totalTmftConformidade = 0;

      for (const om of activeOMs) {
        const omBaseData = baseFilteredData.filter((item) => item.om === om);
        if (omBaseData.length === 0) continue;
        const omRegularData = omBaseData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");

        const omTmft = hasSpecificFilters ? omRegularData.filter(matchesTmftFilters).length : omRegularData.length;
        const omEfetivoTotal = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item)).length
          : omRegularData.filter((item) => item.ocupado).length;

        const omEfetivoForNeo = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item))
          : omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omEfetivoForNeo.filter((item) => {
          return isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
        }).length;

        const omNaNeo = omEfetivoTotal - omForaNeoCount;
        const omVagos = omTmft - omEfetivoTotal;
        const displayAtendimento = omTmft > 0 ? (omEfetivoTotal / omTmft) * 100 : 0;

        totalNaNeo += omNaNeo;
        totalForaNeo += omForaNeoCount;
        totalEfetivoGeral += omEfetivoTotal;
        totalTmftConformidade += omTmft;

        if (omTmft > 0) {
          const foraNeoColor = omForaNeoCount > 0 ? "FFEDD5" : undefined;
          const foraNeoTextColor = omForaNeoCount > 0 ? "C2410C" : undefined;
          neoResumoRows.push(
            new TableRow({
              children: [
                createCell(om),
                createCell(omTmft.toString()),
                createCell(omEfetivoTotal.toString()),
                createCell(omNaNeo.toString()),
                createCell(omForaNeoCount.toString(), false, foraNeoColor, foraNeoTextColor),
                createCell(omVagos.toString()),
                createCell(`${displayAtendimento.toFixed(1)}%`),
              ],
            }),
          );
        }
      }

      const totalDisplayAtendimento = totalTmftConformidade > 0 ? (totalEfetivoGeral / totalTmftConformidade) * 100 : 0;
      neoResumoRows.push(
        new TableRow({
          children: [
            createCell("TOTAL GERAL", true, "E5E7EB"),
            createCell(totalTmftConformidade.toString(), true, "E5E7EB"),
            createCell(totalEfetivoGeral.toString(), true, "E5E7EB"),
            createCell(totalNaNeo.toString(), true, "E5E7EB"),
            createCell(totalForaNeo.toString(), true, totalForaNeo > 0 ? "FFEDD5" : "E5E7EB", totalForaNeo > 0 ? "C2410C" : undefined),
            createCell((totalTmftConformidade - totalEfetivoGeral).toString(), true, "E5E7EB"),
            createCell(`${totalDisplayAtendimento.toFixed(1)}%`, true, "E5E7EB"),
          ],
        }),
      );

      titleParagraphs.push(new Table({ rows: neoResumoRows, width: { size: 100, type: WidthType.PERCENTAGE } }) as unknown as Paragraph);
      titleParagraphs.push(new Paragraph({ spacing: { after: 400 } }));

      sections.push({
        properties: { page: { size: { orientation: "landscape" } } },
        children: titleParagraphs,
      });

      // Per OM sections
      for (const om of activeOMs) {
        const omData = displayFilteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        const omChildren: any[] = [];
        omChildren.push(
          new Paragraph({
            children: [new TextRun({ text: om, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
        );

        // Metrics
        const omBaseData = baseFilteredData.filter((item) => item.om === om);
        const omRegularData = omBaseData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
        const omTmft = hasSpecificFilters ? omRegularData.filter(matchesTmftFilters).length : omRegularData.length;
        const omEfetivo = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item)).length
          : omRegularData.filter((item) => item.ocupado).length;
        const omVagos = omTmft - omEfetivo;
        const omAtendimento = omTmft > 0 ? (omEfetivo / omTmft) * 100 : 0;

        const omEfetivoForNeo = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item))
          : omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omEfetivoForNeo.filter((item) => {
          return isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
        }).length;
        const omNaNeoCount = omEfetivo - omForaNeoCount;

        const metricsRows: TableRow[] = [
          new TableRow({
            children: [
              createCell("TMFT", true, "10B981"),
              createCell("EFETIVO", true, "10B981"),
              createCell("VAGAS", true, "10B981"),
              createCell("NA NEO", true, "10B981"),
              createCell("FORA DA NEO", true, "10B981"),
              createCell("ATENDIMENTO", true, "10B981"),
            ],
          }),
          new TableRow({
            children: [
              createCell(omTmft.toString(), true),
              createCell(omEfetivo.toString(), true),
              createCell(omVagos.toString(), true),
              createCell(omNaNeoCount.toString(), true),
              createCell(omForaNeoCount.toString(), true, omForaNeoCount > 0 ? "FFEDD5" : undefined, omForaNeoCount > 0 ? "C2410C" : undefined),
              createCell(`${omAtendimento.toFixed(1)}%`, true),
            ],
          }),
        ];

        omChildren.push(new Table({ rows: metricsRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        omChildren.push(new Paragraph({ spacing: { after: 300 } }));

        // TABELA DE EFETIVO
        omChildren.push(
          new Paragraph({
            children: [new TextRun({ text: "TABELA DE EFETIVO", bold: true, size: 22 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }),
        );

        let omTableData = [...omData];
        if (hasSpecificFilters) {
          const extraEfetivoRows = personnelData.filter((item) => {
            if (item.om !== om || item.tipoSetor === "EXTRA LOTAÇÃO" || !item.ocupado) return false;
            return matchesEfeFilters(item) && !matchesTmftFilters(item);
          });
          const existingIds = new Set(omTableData.map((item) => item.id));
          omTableData = [...omTableData, ...extraEfetivoRows.filter((item) => !existingIds.has(item.id))];
        }

        const sortedData = [...omTableData].sort((a, b) => String(a.neo || '').localeCompare(String(b.neo || ''), undefined, { numeric: true }));

        const efetivoRows: TableRow[] = [
          new TableRow({
            children: [
              createCell("NEO", true, "2980B9"),
              createCell("SETOR", true, "2980B9"),
              createCell("CARGO", true, "2980B9"),
              createCell("GRAD TMFT", true, "2980B9"),
              createCell("ESP TMFT", true, "2980B9"),
              createCell("NOME", true, "2980B9"),
              createCell("GRAD EFE", true, "2980B9"),
              createCell("ESP EFE", true, "2980B9"),
              createCell("STATUS", true, "2980B9"),
            ],
          }),
        ];

        for (const item of sortedData) {
          let isExtraRow = false;
          if (hasSpecificFilters && item.ocupado) {
            isExtraRow = matchesEfeFilters(item) && !matchesTmftFilters(item);
          }

          let status: string;
          let bgColor: string | undefined;
          let txtColor: string | undefined;
          const setorStr = (item.setor || "").trim().toUpperCase();

          if (isExtraRow) {
            status = "EFETIVO EXTRA";
            bgColor = "DBEAFE"; txtColor = "1E40AF";
          } else if (!item.ocupado) {
            status = "VAGO";
            bgColor = "FECACA"; txtColor = "7F1D1D";
          } else {
            if (isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "")) {
              status = "FORA NEO";
              bgColor = "FFEDD5"; txtColor = "C2410C";
            } else if (setorStr.includes("EXTRA LOTA")) {
              status = "EXTRA LOTAÇÃO";
              bgColor = "FEF08A"; txtColor = "713F12";
            } else {
              status = "NA NEO";
            }
          }

          efetivoRows.push(
            new TableRow({
              children: [
                createCell(item.neo.toString(), false, bgColor, txtColor),
                createCell(item.setor || "-", false, bgColor, txtColor),
                createCell(item.cargo || "-", false, bgColor, txtColor),
                createCell(item.postoTmft || "-", false, bgColor, txtColor),
                createCell(item.quadroTmft || "-", false, bgColor, txtColor),
                createCell(item.nome || "-", false, bgColor, txtColor),
                createCell(item.postoEfe || "-", false, bgColor, txtColor),
                createCell(item.quadroEfe || "-", false, bgColor, txtColor),
                createCell(status, false, bgColor, txtColor),
              ],
            }),
          );
        }

        omChildren.push(new Table({ rows: efetivoRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        omChildren.push(new Paragraph({ spacing: { after: 300 } }));

        // Auxiliary tables with filters
        const omDesembarque = filterAuxiliaryData(desembarqueData).filter((item) => item.om === om);
        if (omDesembarque.length > 0) {
          omChildren.push(new Paragraph({ children: [new TextRun({ text: "PREVISÃO DE DESEMBARQUE", bold: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
          const rows: TableRow[] = [new TableRow({ children: [createCell("NOME", true, "D97706"), createCell("GRAD/ESP", true, "D97706"), createCell("CARGO", true, "D97706"), createCell("DESTINO", true, "D97706"), createCell("MÊS/ANO", true, "D97706"), createCell("DOCUMENTO", true, "D97706")] })];
          for (const d of omDesembarque) rows.push(new TableRow({ children: [createCell(d.nome || "-"), createCell(`${d.posto}, ${d.quadro || "-"}, ${d.especialidade || "-"}`), createCell(d.cargo || "-"), createCell(d.destino || "-"), createCell(d.mesAno || "-"), createCell(d.documento || "-")] }));
          omChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        const omTrrm = filterAuxiliaryData(trrmData).filter((item) => item.om === om);
        if (omTrrm.length > 0) {
          omChildren.push(new Paragraph({ children: [new TextRun({ text: "PREVISÃO DE TRRM", bold: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
          const rows: TableRow[] = [new TableRow({ children: [createCell("NOME", true, "9333EA"), createCell("GRAD/ESP", true, "9333EA"), createCell("OPÇÃO", true, "9333EA"), createCell("CARGO", true, "9333EA"), createCell("ÉPOCA PREVISTA", true, "9333EA")] })];
          for (const t of omTrrm) rows.push(new TableRow({ children: [createCell(t.nome || "-"), createCell(`${t.posto}, ${t.quadro || "-"}, ${t.especialidade || "-"}`), createCell(t.opcao || "-"), createCell(t.cargo || "-"), createCell(t.epocaPrevista || "-")] }));
          omChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        const omLicencas = filterAuxiliaryData(licencasData).filter((item) => item.om === om);
        if (omLicencas.length > 0) {
          omChildren.push(new Paragraph({ children: [new TextRun({ text: "LICENÇAS", bold: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
          const rows: TableRow[] = [new TableRow({ children: [createCell("NOME", true, "EA580C"), createCell("GRAD/ESP", true, "EA580C"), createCell("CARGO", true, "EA580C"), createCell("PERÍODO", true, "EA580C")] })];
          for (const l of omLicencas) rows.push(new TableRow({ children: [createCell(l.nome || "-"), createCell(`${l.posto}, ${l.quadro || "-"}, ${l.especialidade || "-"}`), createCell(l.cargo || "-"), createCell(l.periodo || "-")] }));
          omChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        const omDestaques = filterAuxiliaryData(destaquesData).filter((item) => item.om === om);
        if (omDestaques.length > 0) {
          omChildren.push(new Paragraph({ children: [new TextRun({ text: "DESTAQUES", bold: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
          const rows: TableRow[] = [new TableRow({ children: [createCell("NOME", true, "CA8A04"), createCell("GRAD/ESP", true, "CA8A04"), createCell("CARGO", true, "CA8A04"), createCell("EM OUTRA OM", true, "CA8A04"), createCell("DE OUTRA OM", true, "CA8A04"), createCell("PERÍODO", true, "CA8A04")] })];
          for (const d of omDestaques) rows.push(new TableRow({ children: [createCell(d.nome || "-"), createCell(`${d.posto}, ${d.quadro || "-"}, ${d.especialidade || "-"}`), createCell(d.cargo || "-"), createCell(d.emOutraOm || "-"), createCell(d.deOutraOm || "-"), createCell(d.periodo || "-")] }));
          omChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        const omCurso = filterAuxiliaryData(cursoData).filter((item) => item.om === om);
        if (omCurso.length > 0) {
          omChildren.push(new Paragraph({ children: [new TextRun({ text: "PREVISÃO DE CURSO", bold: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
          const rows: TableRow[] = [new TableRow({ children: [createCell("NOME", true, "059669"), createCell("GRAD/ESP", true, "059669"), createCell("CARGO", true, "059669"), createCell("ANO PREVISTO", true, "059669")] })];
          for (const c of omCurso) rows.push(new TableRow({ children: [createCell(c.nome || "-"), createCell(`${c.posto}, ${c.quadro || "-"}, ${c.especialidade || "-"}`), createCell(c.cargo || "-"), createCell(c.anoPrevisto || "-")] }));
          omChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        }

        sections.push({
          properties: { page: { size: { orientation: "landscape" } } },
          children: omChildren,
        });
      }

      const doc = new Document({ sections });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tabela-mestra-forca-trabalho-pracas.docx";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Documento Word gerado com sucesso!");
    } catch (error) {
      console.error("Error generating Word document:", error);
      toast.error("Erro ao gerar documento Word");
    }
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const activeOMs = selectedOMs.length > 0 ? selectedOMs : availableOMs;

      // Sheet 1: Resumo
      const resumoData: any[][] = [["RESUMO"], [], ["OM", "TMFT", "EFETIVO", "VAGAS", "NA NEO", "FORA DA NEO", "ATENDIMENTO (%)"]];
      let totalTmft = 0, totalEfetivo = 0, totalVagos = 0, totalNaNeo = 0, totalForaNeo = 0;

      for (const om of activeOMs) {
        const omBaseData = baseFilteredData.filter((item) => item.om === om);
        if (omBaseData.length === 0) continue;
        const omRegularData = omBaseData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");

        const omTmft = hasSpecificFilters ? omRegularData.filter(matchesTmftFilters).length : omRegularData.length;
        const omEfetivoTotal = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item)).length
          : omRegularData.filter((item) => item.ocupado).length;
        const omVagos = omTmft - omEfetivoTotal;

        const omEfetivoForNeo = hasSpecificFilters
          ? omRegularData.filter((item) => item.ocupado && matchesEfeFilters(item))
          : omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omEfetivoForNeo.filter((item) => {
          return isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "");
        }).length;
        const omNaNeoCount = omEfetivoTotal - omForaNeoCount;
        const atendimento = omTmft > 0 ? parseFloat(((omEfetivoTotal / omTmft) * 100).toFixed(1)) : 0;

        totalTmft += omTmft; totalEfetivo += omEfetivoTotal; totalVagos += omVagos;
        totalNaNeo += omNaNeoCount; totalForaNeo += omForaNeoCount;

        resumoData.push([om, omTmft, omEfetivoTotal, omVagos, omNaNeoCount, omForaNeoCount, atendimento]);
      }

      const totalAtendimento = totalTmft > 0 ? parseFloat(((totalEfetivo / totalTmft) * 100).toFixed(1)) : 0;
      resumoData.push(["TOTAL GERAL", totalTmft, totalEfetivo, totalVagos, totalNaNeo, totalForaNeo, totalAtendimento]);

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(resumoData), "Resumo");

      // Sheet 2: Efetivo Completo
      const efetivoHeaders = ["OM", "NEO", "TIPO SETOR", "SETOR", "CARGO", "GRAD TMFT", "ESP TMFT", "OPÇÃO TMFT", "NOME", "GRAD EFE", "ESP EFE", "OPÇÃO EFE", "OCUPADO", "STATUS"];
      const efetivoData: any[][] = [efetivoHeaders];

      for (const item of displayFilteredData) {
        let status = "VAGO";
        if (item.ocupado) {
          status = isForaDaNeo(item.quadroTmft || "", item.quadroEfe || "") ? "FORA DA NEO" : "NA NEO";
        }
        efetivoData.push([item.om, item.neo, item.tipoSetor, item.setor, item.cargo, item.postoTmft, item.quadroTmft, item.opcaoTmft, item.nome || "-", item.postoEfe || "-", item.quadroEfe || "-", item.opcaoEfe || "-", item.ocupado ? "SIM" : "NÃO", status]);
      }

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(efetivoData), "Efetivo Completo");

      // Sheet 3: Desembarque
      const filtDesembarque = filterAuxiliaryData(desembarqueData);
      if (filtDesembarque.length > 0) {
        const rows: any[][] = [["OM", "NOME", "GRAD/ESP", "CARGO", "DESTINO", "MÊS/ANO", "DOCUMENTO"]];
        for (const d of filtDesembarque) rows.push([d.om, d.nome, `${d.posto}, ${d.quadro || "-"}, ${d.especialidade || "-"}`, d.cargo || "-", d.destino || "-", d.mesAno || "-", d.documento || "-"]);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Previsão Desembarque");
      }

      // Sheet 4: Embarque
      const filtEmbarque = filterAuxiliaryData(embarqueData);
      if (filtEmbarque.length > 0) {
        const rows: any[][] = [["OM", "NOME", "GRAD/ESP", "CARGO", "DESTINO", "MÊS/ANO", "DOCUMENTO"]];
        for (const d of filtEmbarque) rows.push([d.om, d.nome, `${d.posto}, ${d.quadro || "-"}, ${d.especialidade || "-"}`, d.cargo || "-", d.destino || "-", d.mesAno || "-", d.documento || "-"]);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Previsão Embarque");
      }

      // Sheet 5: TRRM
      const filtTrrm = filterAuxiliaryData(trrmData);
      if (filtTrrm.length > 0) {
        const rows: any[][] = [["OM", "NOME", "GRAD/ESP", "OPÇÃO", "CARGO", "ÉPOCA PREVISTA"]];
        for (const t of filtTrrm) rows.push([t.om, t.nome, `${t.posto}, ${t.quadro || "-"}, ${t.especialidade || "-"}`, t.opcao || "-", t.cargo || "-", t.epocaPrevista || "-"]);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "TRRM");
      }

      // Sheet 6: Licenças
      const filtLicencas = filterAuxiliaryData(licencasData);
      if (filtLicencas.length > 0) {
        const rows: any[][] = [["OM", "NOME", "GRAD/ESP", "CARGO", "PERÍODO"]];
        for (const l of filtLicencas) rows.push([l.om, l.nome, `${l.posto}, ${l.quadro || "-"}, ${l.especialidade || "-"}`, l.cargo || "-", l.periodo || "-"]);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Licenças");
      }

      // Sheet 7: Destaques
      const filtDestaques = filterAuxiliaryData(destaquesData);
      if (filtDestaques.length > 0) {
        const rows: any[][] = [["OM", "NOME", "GRAD/ESP", "CARGO", "EM OUTRA OM", "DE OUTRA OM", "PERÍODO"]];
        for (const d of filtDestaques) rows.push([d.om, d.nome, `${d.posto}, ${d.quadro || "-"}, ${d.especialidade || "-"}`, d.cargo || "-", d.emOutraOm || "-", d.deOutraOm || "-", d.periodo || "-"]);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Destaques");
      }

      // Sheet 8: Curso
      const filtCurso = filterAuxiliaryData(cursoData);
      if (filtCurso.length > 0) {
        const rows: any[][] = [["OM", "NOME", "GRAD/ESP", "CARGO", "ANO PREVISTO"]];
        for (const c of filtCurso) rows.push([c.om, c.nome, `${c.posto}, ${c.quadro || "-"}, ${c.especialidade || "-"}`, c.cargo || "-", c.anoPrevisto || "-"]);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Curso");
      }

      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `tabela-mestra-pracas-${today}.xlsx`);
      toast.success("Excel gerado com sucesso!");
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast.error("Erro ao gerar Excel");
    }
  };


  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erro ao realizar logout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando dados de PRAÇAS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Dashboard PRAÇAS</h1>
                {isOnline ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
                {isUsingCache && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                    Dados em cache
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Centro de Operações do Abastecimento - Praças</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleLogout} variant="destructive">
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Top Filters */}
        <Card className="p-4 bg-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </h3>
              <div className="flex items-center gap-2">
                {(selectedOMs.length > 0 ||
                  selectedQuadros.length > 0 ||
                  selectedOpcoes.length > 0 ||
                  selectedGraduacoes.length > 0 ||
                  searchQuery) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
                <Button onClick={fetchData} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
                <Button onClick={exportToPDF} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button onClick={exportToWord} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Word
                </Button>
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisa rápida por nome, cargo, setor, posto ou especialidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* OM Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">OM</h4>
                  {selectedOMs.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedOMs.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                  {availableOMs.map((om) => (
                    <div key={om} className="flex items-center space-x-2">
                      <Checkbox
                        id={`om-${om}`}
                        checked={selectedOMs.includes(om)}
                        onCheckedChange={() => toggleOM(om)}
                      />
                      <label htmlFor={`om-${om}`} className="text-xs cursor-pointer">
                        {om}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Especialidade TMFT Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Especialidade TMFT</h4>
                  {selectedQuadros.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedQuadros.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 border rounded-lg bg-muted/30 max-h-48 overflow-y-auto">
                  {availableQuadros.map((quadro) => (
                    <div key={quadro} className="flex items-center space-x-2">
                      <Checkbox
                        id={`quadro-${quadro}`}
                        checked={selectedQuadros.includes(quadro)}
                        onCheckedChange={() => toggleQuadro(quadro)}
                      />
                      <label htmlFor={`quadro-${quadro}`} className="text-xs cursor-pointer">
                        {quadro}
                      </label>
                    </div>
                  ))}
                </div>
              </div>


              {/* Graduação Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Graduação</h4>
                  {selectedGraduacoes.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedGraduacoes.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 p-2 border rounded-lg bg-muted/30">
                  {availableGraduacoes.map((graduacao) => (
                    <div key={graduacao} className="flex items-center space-x-2">
                      <Checkbox
                        id={`grad-${graduacao}`}
                        checked={selectedGraduacoes.includes(graduacao)}
                        onCheckedChange={() => toggleGraduacao(graduacao)}
                      />
                      <label htmlFor={`grad-${graduacao}`} className="text-xs cursor-pointer">
                        {graduacao}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opção Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Opção</h4>
                  {selectedOpcoes.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedOpcoes.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 border rounded-lg bg-muted/30">
                  {OPCOES_FIXAS.map((opcao) => (
                    <div key={opcao} className="flex items-center space-x-2">
                      <Checkbox
                        id={`opcao-${opcao}`}
                        checked={selectedOpcoes.includes(opcao)}
                        onCheckedChange={() => toggleOpcao(opcao)}
                      />
                      <label htmlFor={`opcao-${opcao}`} className="text-xs cursor-pointer">
                        {opcao}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card
            className={`bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${statusFilter === "all" ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
            onClick={() => handleStatusCardClick("all")}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">TMFT</p>
                  <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{metrics.totalTMFT}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Tabela Mestra</p>
                </div>
                <Users2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${statusFilter === "ocupados" ? "ring-2 ring-green-500 ring-offset-2" : ""}`}
            onClick={handleEfetivoCardClick}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">EFETIVO</p>
                  <p className="text-4xl font-bold text-green-900 dark:text-green-100">{metrics.totalEXI}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Cargos ocupados{" "}
                    {selectedQuadros.length > 0 &&
                      "(Clique para ver Na/Fora da NEO)"}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${statusFilter === "vagos" ? "ring-2 ring-red-500 ring-offset-2" : ""}`}
            onClick={() => handleStatusCardClick("vagos")}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">VAGOS</p>
                  <p className="text-4xl font-bold text-red-900 dark:text-red-100">{Math.abs(metrics.totalDIF)}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">Cargos sem ocupante</p>
                </div>
                <UserX className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br ${
              metrics.percentualPreenchimento >= 90
                ? "from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200"
                : metrics.percentualPreenchimento >= 70
                  ? "from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200"
                  : "from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      metrics.percentualPreenchimento >= 90
                        ? "text-green-700 dark:text-green-300"
                        : metrics.percentualPreenchimento >= 70
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    ATENDIMENTO
                  </p>
                  <p
                    className={`text-4xl font-bold ${
                      metrics.percentualPreenchimento >= 90
                        ? "text-green-900 dark:text-green-100"
                        : metrics.percentualPreenchimento >= 70
                          ? "text-amber-900 dark:text-amber-100"
                          : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {metrics.percentualPreenchimento.toFixed(0)}%
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      metrics.percentualPreenchimento >= 90
                        ? "text-green-600 dark:text-green-400"
                        : metrics.percentualPreenchimento >= 70
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    Situação: {metrics.totalDIF < 0 ? metrics.totalDIF : `+${metrics.totalDIF}`}
                  </p>
                </div>
                <TrendingUp
                  className={`h-8 w-8 ${
                    metrics.percentualPreenchimento >= 90
                      ? "text-green-500"
                      : metrics.percentualPreenchimento >= 70
                        ? "text-amber-500"
                        : "text-red-500"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br ${
              metrics.atendimentoTotal >= 100
                ? "from-cyan-50 to-cyan-100 dark:from-cyan-950/20 dark:to-cyan-900/20 border-cyan-200"
                : metrics.atendimentoTotal >= 90
                  ? "from-teal-50 to-teal-100 dark:from-teal-950/20 dark:to-teal-900/20 border-teal-200"
                  : "from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className={`text-sm font-medium mb-1 ${
                      metrics.atendimentoTotal >= 100
                        ? "text-cyan-700 dark:text-cyan-300"
                        : metrics.atendimentoTotal >= 90
                          ? "text-teal-700 dark:text-teal-300"
                          : "text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    ATEND. TOTAL
                  </p>
                  <p
                    className={`text-4xl font-bold ${
                      metrics.atendimentoTotal >= 100
                        ? "text-cyan-900 dark:text-cyan-100"
                        : metrics.atendimentoTotal >= 90
                          ? "text-teal-900 dark:text-teal-100"
                          : "text-amber-900 dark:text-amber-100"
                    }`}
                  >
                    {metrics.atendimentoTotal.toFixed(0)}%
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      metrics.atendimentoTotal >= 100
                        ? "text-cyan-600 dark:text-cyan-400"
                        : metrics.atendimentoTotal >= 90
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    (Extra + EFE) / TMFT
                  </p>
                </div>
                <TrendingUp
                  className={`h-8 w-8 ${
                    metrics.atendimentoTotal >= 100
                      ? "text-cyan-500"
                      : metrics.atendimentoTotal >= 90
                        ? "text-teal-500"
                        : "text-amber-500"
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${showOnlyExtraLotacao ? "ring-2 ring-orange-500 ring-offset-2" : ""}`}
            onClick={() => setShowOnlyExtraLotacao((prev) => !prev)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">EXTRA LOTAÇÃO</p>
                  <p className="text-4xl font-bold text-orange-900 dark:text-orange-100">{metrics.totalExtraLotacao}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Militares sem NEO</p>
                </div>
                <Users2 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards "Fora da NEO" e "Na NEO" - aparecem quando especialidade TMFT ou EFETIVO é filtrada e EFETIVO é clicado */}
        {showNeoComparison &&
          selectedQuadros.length > 0 &&
          statusFilter === "ocupados" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className={`bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${showNeoPersonnel === "fora" ? "ring-2 ring-amber-500 ring-offset-2" : ""}`}
                onClick={() => setShowNeoPersonnel((prev) => (prev === "fora" ? null : "fora"))}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">FORA DA NEO</p>
                      <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">{metrics.foraDaNeo}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Especialidade TMFT ≠ EFETIVO</p>
                    </div>
                    <UserX className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${showNeoPersonnel === "na" ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
                onClick={() => setShowNeoPersonnel((prev) => (prev === "na" ? null : "na"))}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">NA NEO</p>
                      <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">{metrics.naNeo}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Especialidade TMFT = EFETIVO
                      </p>
                    </div>
                    <UserCheck className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        {/* Lista de militares Fora da NEO ou Na NEO */}
        {showNeoPersonnel && neoComparisonPersonnel.length > 0 && (
          <Card
            className={`border-2 ${showNeoPersonnel === "fora" ? "border-amber-300 bg-gradient-to-br from-amber-50/50 to-background" : "border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-background"}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle
                  className={`flex items-center gap-2 ${showNeoPersonnel === "fora" ? "text-amber-700" : "text-emerald-700"}`}
                >
                  {showNeoPersonnel === "fora" ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                  {showNeoPersonnel === "fora" ? "Militares FORA DA NEO" : "Militares NA NEO"}
                  <Badge variant="outline" className="ml-2">
                    {neoComparisonPersonnel.length} militar(es)
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNeoPersonnel(null)}>
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {neoComparisonPersonnel.map((item, index) => {
                  const formatMilitarName = () => {
                    if (!item.nome || item.nome.toUpperCase() === "VAGO") return "VAGO";
                    const grad = String(item.postoEfe || item.postoTmft || "")
                      .trim()
                      .toUpperCase()
                      .replace(/^-+$/, "")
                      .replace(/-+$/g, "");
                    const esp = String(item.quadroEfe || item.quadroTmft || "")
                      .trim()
                      .toUpperCase()
                      .replace(/^-+$/, "")
                      .replace(/^-+|-+$/g, "");
                    const nomeCompleto = String(item.nome || "")
                      .trim()
                      .toUpperCase();
                    const isValidEsp =
                      esp &&
                      grad !== "MN" &&
                      esp !== "-" &&
                      !["QPA", "CPA", "QAP", "CAP", "PRM", "CPRM", "QFN", "CFN"].includes(esp);
                    if (!grad) return nomeCompleto;
                    return `${grad}${isValidEsp ? `-${esp}` : ""} ${nomeCompleto}`;
                  };

                  return (
                    <div
                      key={`neo-${index}`}
                      className={`p-3 border rounded-lg ${showNeoPersonnel === "fora" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {(() => {
                          const neoRaw = String(item.neo ?? "").trim();
                          if (!neoRaw || neoRaw === "0") return null;
                          const neoText = neoRaw.toUpperCase().startsWith("NEO") ? neoRaw : `NEO ${neoRaw}`;
                          return (
                            <Badge variant="outline" className="bg-blue-500 text-white border-blue-500 text-xs">
                              {neoText}
                            </Badge>
                          );
                        })()}
                        <Badge variant="outline" className="text-xs">
                          {item.postoTmft || item.postoEfe}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.om}
                        </Badge>
                      </div>
                      <p
                        className={`font-semibold text-sm uppercase ${showNeoPersonnel === "fora" ? "text-amber-800" : "text-emerald-800"}`}
                      >
                        {formatMilitarName()}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.cargo}</p>
                      <p className="text-xs text-muted-foreground">{item.setor}</p>
                      <div className="mt-2 text-xs">
                        <span className="font-medium">NEO:</span> {item.quadroTmft || "-"}
                        <span className="mx-2">•</span>
                        <span className="font-medium">EFE:</span> {item.quadroEfe || "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-red-200 bg-gradient-to-br from-red-50/50 to-background" data-chart="vagas-om">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <UserX className="h-5 w-5" />
              Vagas por Organização Militar
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Clique na barra para ver detalhes)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartDataVagosByOM.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, chartDataVagosByOM.length * 45)}>
                <BarChart
                  data={chartDataVagosByOM}
                  layout="vertical"
                  onClick={(e) => e && e.activePayload && handleVagosBarClick(e.activePayload[0]?.payload)}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
                  />
                  <YAxis dataKey="om" type="category" className="text-xs" width={120} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name === "vagos" ? "Vagos" : name]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="vagos" name="Vagos" fill="#ef4444" radius={[0, 4, 4, 0]} style={{ cursor: "pointer" }}>
                    {chartDataVagosByOM.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={selectedOMsForVagos.includes(entry.om) ? "#b91c1c" : "#ef4444"}
                        stroke={selectedOMsForVagos.includes(entry.om) ? "#7f1d1d" : "none"}
                        strokeWidth={selectedOMsForVagos.includes(entry.om) ? 2 : 0}
                      />
                    ))}
                    <LabelList dataKey="vagos" position="right" style={{ fontWeight: "bold", fontSize: "12px" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhuma vaga encontrada</div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes dos NEOs Vagos */}
        {selectedOMsForVagos.length > 0 && vagosForSelectedOMs.length > 0 && (
          <Card className="border-red-300 bg-gradient-to-br from-red-50 to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <UserX className="h-5 w-5" />
                  NEOs Vagos - {selectedOMsForVagos.join(", ")}
                  <Badge variant="outline" className="ml-2">
                    {vagosForSelectedOMs.length} vagas
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedOMsForVagos([])}>
                  Limpar seleção
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vagosForSelectedOMs.map((item, index) => (
                  <div key={`vago-${index}`} className="p-3 bg-red-100/50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-red-500 text-white border-red-500 text-xs">
                        NEO {item.neo}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.postoTmft}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.om}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm text-foreground">{item.cargo}</p>
                    <p className="text-xs text-muted-foreground">{item.setor}</p>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      <span>Especialidade: {item.quadroTmft || "-"}</span>
                      <span>•</span>
                      <span>Opção: {item.opcaoTmft || "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 5 Especialidades com NEO Vagos */}
        {selectedOMsForVagos.length > 0 && topEspecialidadesVagos.length > 0 && (
          <Card className="border-orange-300 bg-gradient-to-br from-orange-50/50 to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <BarChart3 className="h-5 w-5" />
                  Top 5 Especialidades com Vagas - {selectedOMsForVagos.join(", ")}
                  <Badge variant="outline" className="ml-2">
                    {topEspecialidadesVagos.reduce((sum, item) => sum + item.vagos, 0)} vagas
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedOMsForVagos([])}>
                  Fechar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topEspecialidadesVagos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]} />
                  <YAxis dataKey="especialidade" type="category" className="text-xs" width={120} />
                  <Tooltip
                    formatter={(value: number) => [value, "NEO Vagos"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="vagos" name="NEO Vagos" fill="#f97316" radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="vagos"
                      position="right"
                      style={{ fontWeight: "bold", fontSize: "12px", fill: "#c2410c" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Chart Distribuição por Posto */}
        <Card ref={chartRef} data-chart="graduacao">
          <CardHeader>
            <CardTitle>Distribuição por Graduação</CardTitle>
            <p className="text-sm text-muted-foreground">Clique nas colunas para ver os militares</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartDataByPosto} barCategoryGap="15%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis
                  className="text-xs"
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [value, name === "tmft" ? "TMFT" : "Efetivo"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />
                <Bar
                  dataKey="tmft"
                  name="TMFT"
                  fill="#93c5fd"
                  cursor="pointer"
                  onClick={handlePostoTmftClick}
                  minPointSize={8}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="tmft"
                    position="top"
                    style={{ fontWeight: "bold", fontSize: "11px", fill: "#1e40af" }}
                    formatter={(value: number) => (value > 0 ? value : "")}
                  />
                </Bar>
                <Bar
                  dataKey="efe"
                  name="EFE"
                  fill="#ef4444"
                  cursor="pointer"
                  onClick={handlePostoEfeClick}
                  minPointSize={8}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="efe"
                    position="top"
                    style={{ fontWeight: "bold", fontSize: "11px", fill: "#b91c1c" }}
                    formatter={(value: number) => (value > 0 ? value : "")}
                  />
                </Bar>
                <Brush
                  dataKey="name"
                  height={30}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--muted))"
                  travellerWidth={10}
                  startIndex={0}
                  endIndex={Math.min(5, chartDataByPosto.length - 1)}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detalhes por Posto selecionado */}
        {selectedPostos.length > 0 && personnelForSelectedPostos.length > 0 && (
          <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Users2 className="h-5 w-5" />
                  Militares - {selectedPostos.join(", ")}
                  <Badge variant="outline" className="ml-2">
                    {personnelForSelectedPostos.length} pessoa(s)
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPostos([])}>
                  Limpar seleção
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {personnelForSelectedPostos.map((item, index) => {
                  const itemGraduacao = selectedPostoType === "efe" ? item.postoEfe || item.postoTmft : item.postoTmft;
                  const isDifferentGraduacao = itemGraduacao && !selectedPostos.includes(itemGraduacao);
                  // Check if NEO (postoTmft/quadroTmft) and EFE (postoEfe/quadroEfe) are different
                  const neoQuadroNormalized = (item.quadroTmft || "").trim().toUpperCase().replace(/^-+$/, "");
                  const efeQuadroNormalized = (item.quadroEfe || "").trim().toUpperCase().replace(/^-+$/, "");
                  const neoPostoNormalized = (item.postoTmft || "").trim().toUpperCase().replace(/^-+$/, "");
                  const efePostoNormalized = (item.postoEfe || "").trim().toUpperCase().replace(/^-+$/, "");

                  // Divergência se posto OU quadro forem diferentes (ignorando vazios)
                  const isDifferentQuadro =
                    neoQuadroNormalized && efeQuadroNormalized && neoQuadroNormalized !== efeQuadroNormalized;
                  const isDifferentPosto =
                    neoPostoNormalized && efePostoNormalized && neoPostoNormalized !== efePostoNormalized;
                  const isDifferentNeoEfe = item.ocupado && (isDifferentQuadro || isDifferentPosto);

                  // Format military name: graduação-especialidade nome
                  const formatMilitarName = () => {
                    if (!item.nome || item.nome.toUpperCase() === "VAGO") return "VAGO";

                    // Mostrar a identidade do militar ocupante (EFE), não do cargo (TMFT)
                    const gradRaw = item.postoEfe || item.postoTmft || "";
                    const espRaw = item.quadroEfe || item.quadroTmft || "";

                    const grad = String(gradRaw || "")
                      .trim()
                      .toUpperCase()
                      .replace(/^-+$/, "") // "-" sozinho = vazio
                      .replace(/-+$/g, "");

                    const esp = String(espRaw || "")
                      .trim()
                      .toUpperCase()
                      .replace(/^-+$/, "") // "-" sozinho = vazio
                      .replace(/^-+|-+$/g, "");

                    const nomeCompleto = String(item.nome || "")
                      .trim()
                      .toUpperCase();

                    // Ignore invalid esp values like "-", "QPA", "CPA", "QAP", "CAP", "PRM", etc.
                    // E regra: para MN, não exibir especialidade (ex: "MN-MR" -> "MN")
                    const isValidEsp =
                      esp &&
                      grad !== "MN" &&
                      esp !== "-" &&
                      !["QPA", "CPA", "QAP", "CAP", "PRM", "CPRM", "QFN", "CFN"].includes(esp);

                    if (!grad) return nomeCompleto;
                    return `${grad}${isValidEsp ? `-${esp}` : ""} ${nomeCompleto}`;
                  };

                  return (
                    <div
                      key={`posto-${index}`}
                      className={`p-3 border rounded-lg ${
                        isDifferentNeoEfe
                          ? "bg-amber-50 border-amber-400 border-2"
                          : item.tipoSetor === "EXTRA LOTAÇÃO"
                            ? "bg-orange-100/50 border-orange-200"
                            : item.ocupado
                              ? "bg-green-100/50 border-green-200"
                              : "bg-red-100/50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {(() => {
                          const neoRaw = String(item.neo ?? "").trim();
                          if (!neoRaw || neoRaw === "0") return null;
                          const neoText = neoRaw.toUpperCase().startsWith("NEO") ? neoRaw : `NEO ${neoRaw}`;

                          return (
                            <Badge variant="outline" className="bg-blue-500 text-white border-blue-500 text-xs">
                              {neoText}
                            </Badge>
                          );
                        })()}
                        <Badge variant="outline" className="text-xs">
                          {item.postoTmft || item.postoEfe}
                        </Badge>
                        <Badge
                          variant={isDifferentNeoEfe ? "default" : "outline"}
                          className={isDifferentNeoEfe ? "bg-blue-500 text-white text-xs" : "text-xs"}
                        >
                          {item.quadroTmft || item.quadroEfe || "-"}
                        </Badge>
                        {(item.opcaoEfe || item.opcaoTmft) && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            {item.opcaoEfe || item.opcaoTmft}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.om}
                        </Badge>
                        {item.tipoSetor === "EXTRA LOTAÇÃO" && (
                          <Badge className="bg-orange-500 text-white text-xs">EXTRA</Badge>
                        )}
                      </div>
                      <p
                        className={`font-semibold text-sm uppercase ${isDifferentNeoEfe ? "text-amber-700" : "text-foreground"}`}
                      >
                        {item.ocupado && item.nome && item.nome.toUpperCase() !== "VAGO"
                          ? formatMilitarName()
                          : item.nome || "VAGO"}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.cargo}</p>
                      <p className="text-xs text-muted-foreground">{item.setor}</p>
                      {isDifferentNeoEfe && (
                        <p className="text-xs mt-1 font-medium text-amber-700">
                          ⚠️ NEO ({item.postoTmft || "?"}/{item.quadroTmft || "-"}) ≠ EFE ({item.postoEfe || "?"}/
                          {item.quadroEfe || "-"})
                        </p>
                      )}
                      {isDifferentGraduacao && !isDifferentNeoEfe && (
                        <p className="text-xs mt-1 font-medium text-amber-700">
                          ⚠ Graduação diferente: {itemGraduacao}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela Mestra com Tabs */}
        <Card>
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-muted/30 flex-wrap h-auto gap-1">
                <TabsTrigger
                  value="efetivo"
                  className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:border-blue-400"
                >
                  📋 Tabela de Efetivo
                </TabsTrigger>
                <TabsTrigger
                  value="previsao"
                  className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 data-[state=active]:border-amber-400"
                >
                  🚢 Previsão de Desembarque
                </TabsTrigger>
                <TabsTrigger
                  value="embarque"
                  className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:border-green-400"
                >
                  ⛵ Previsão de Embarque
                </TabsTrigger>
                <TabsTrigger
                  value="trrm"
                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 data-[state=active]:border-purple-400"
                >
                  📅 Previsão de TRRM
                </TabsTrigger>
                <TabsTrigger
                  value="licencas"
                  className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 data-[state=active]:border-orange-400"
                >
                  🏠 Licenças
                </TabsTrigger>
                <TabsTrigger
                  value="destaques"
                  className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800 data-[state=active]:border-yellow-400"
                >
                  ⭐ Destaques
                </TabsTrigger>
                <TabsTrigger
                  value="concurso"
                  className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 data-[state=active]:border-emerald-400"
                >
                  🎓 Previsão de Curso
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-6">Tabela Mestra de Força de Trabalho - PRAÇAS</h2>

            {activeTab === "efetivo" && (
              <div className="space-y-8">
                {Object.entries(groupedBySetor).map(([setor, items]) => (
                  <div key={setor}>
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">{setor}</h3>
                      <Badge variant="secondary" className="rounded-full">
                        {items.length}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => {
                        // Check if NEO (postoTmft/quadroTmft) and EFE (postoEfe/quadroEfe) are different
                        const neoQuadroNormalized = (item.quadroTmft || "").trim().toUpperCase().replace(/^-+$/, "");
                        const efeQuadroNormalized = (item.quadroEfe || "").trim().toUpperCase().replace(/^-+$/, "");
                        const neoPostoNormalized = (item.postoTmft || "").trim().toUpperCase().replace(/^-+$/, "");
                        const efePostoNormalized = (item.postoEfe || "").trim().toUpperCase().replace(/^-+$/, "");

                        // Divergência se posto OU quadro forem diferentes (ignorando vazios)
                        const isDifferentQuadro =
                          neoQuadroNormalized && efeQuadroNormalized && neoQuadroNormalized !== efeQuadroNormalized;
                        const isDifferentPosto =
                          neoPostoNormalized && efePostoNormalized && neoPostoNormalized !== efePostoNormalized;
                        const isDifferentNeoEfe = item.ocupado && (isDifferentQuadro || isDifferentPosto);

                        // Format military name: graduação-especialidade nome
                        const formatMilitarName = () => {
                          if (!item.nome || item.nome.toUpperCase() === "VAGO") return null;

                          // Mostrar a identidade do militar ocupante (EFE), não do cargo (TMFT)
                          const gradRaw = item.postoEfe || item.postoTmft || "";
                          const espRaw = item.quadroEfe || item.quadroTmft || "";

                          const grad = String(gradRaw || "")
                            .trim()
                            .toUpperCase()
                            .replace(/^-+$/, "") // "-" sozinho = vazio
                            .replace(/-+$/g, "");

                          const esp = String(espRaw || "")
                            .trim()
                            .toUpperCase()
                            .replace(/^-+$/, "") // "-" sozinho = vazio
                            .replace(/^-+|-+$/g, "");

                          const nomeCompleto = String(item.nome || "")
                            .trim()
                            .toUpperCase();

                          // Ignore invalid esp values like "-", "QPA", "CPA", "QAP", "CAP", "PRM", etc.
                          // E regra: para MN, não exibir especialidade (ex: "MN-MR" -> "MN")
                          const isValidEsp =
                            esp &&
                            grad !== "MN" &&
                            esp !== "-" &&
                            !["QPA", "CPA", "QAP", "CAP", "PRM", "CPRM", "QFN", "CFN"].includes(esp);

                          if (!grad) return nomeCompleto;
                          return `${grad}${isValidEsp ? `-${esp}` : ""} ${nomeCompleto}`;
                        };

                        return (
                          <div
                            key={item.id}
                            className={`border-l-4 ${isDifferentNeoEfe ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : "border-l-blue-500 bg-card"} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4
                                  className={`text-base font-bold ${isDifferentNeoEfe ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}
                                >
                                  {item.ocupado && item.nome && item.nome.toUpperCase() !== "VAGO"
                                    ? formatMilitarName()
                                    : item.nome || `NEO ${item.neo} - VAZIO`}
                                </h4>
                                <p className="text-sm text-muted-foreground">{item.cargo}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  NEO: {item.neo} - {item.cargo}
                                </p>
                                {isDifferentNeoEfe && (
                                  <p className="text-xs text-amber-600 mt-1 font-medium">
                                    ⚠️ NEO ({item.postoTmft || "?"}/{item.quadroTmft || "-"}) ≠ EFE (
                                    {item.postoEfe || "?"}/{item.quadroEfe || "-"})
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge
                                  variant={item.ocupado ? "default" : "destructive"}
                                  className={
                                    item.ocupado
                                      ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-100"
                                      : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-100"
                                  }
                                >
                                  {item.ocupado ? "Ocupado" : "Vago"}
                                </Badge>
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="outline" className="bg-background">
                                    {item.ocupado ? item.postoEfe : item.postoTmft}
                                  </Badge>
                                  <Badge
                                    variant={isDifferentNeoEfe ? "default" : "outline"}
                                    className={isDifferentNeoEfe ? "bg-blue-500 text-white" : "bg-background"}
                                  >
                                    NEO: {item.quadroTmft}
                                  </Badge>
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    {item.ocupado ? item.opcaoEfe : item.opcaoTmft}
                                  </Badge>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                                    {item.om}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado com os filtros selecionados.
                  </div>
                )}
              </div>
            )}

            {activeTab === "previsao" && (
              <div className="space-y-4">
                {filteredDesembarqueData.length > 0 ? (
                  filteredDesembarqueData.map((item, index) => (
                    <div key={index} className="border-l-4 border-l-amber-500 bg-card rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                          <p className="text-sm text-muted-foreground">{item.cargo}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-amber-600">Destino: {item.destino}</span>
                            <span className="text-muted-foreground">{item.mesAno}</span>
                          </div>
                          {item.documento && <p className="text-xs text-muted-foreground mt-1">{item.documento}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.quadro || "-"}, {item.especialidade || "-"}, {item.opcao || "-"}
                          </Badge>
                          <Badge variant="secondary">{item.om}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma previsão de desembarque encontrada.
                  </div>
                )}
              </div>
            )}

            {activeTab === "embarque" && (
              <div className="space-y-4">
                {filteredEmbarqueData.length > 0 ? (
                  filteredEmbarqueData.map((item, index) => (
                    <div key={index} className="border-l-4 border-l-green-500 bg-card rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                          <p className="text-sm text-muted-foreground">{item.cargo}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-green-600">Destino: {item.destino}</span>
                            <span className="text-muted-foreground">{item.mesAno}</span>
                          </div>
                          {item.documento && <p className="text-xs text-muted-foreground mt-1">{item.documento}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.quadro || "-"}, {item.especialidade || "-"}, {item.opcao || "-"}
                          </Badge>
                          <Badge variant="secondary">{item.om}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma previsão de embarque encontrada.</div>
                )}
              </div>
            )}

            {activeTab === "trrm" && (
              <div className="space-y-4">
                {filteredTrrmData.length > 0 ? (
                  filteredTrrmData.map((item, index) => (
                    <div key={index} className="border-l-4 border-l-purple-500 bg-card rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                          <p className="text-sm text-muted-foreground">{item.cargo}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-purple-600">
                              Época Prevista: {item.epocaPrevista || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.quadro || "-"}, {item.especialidade || "-"}, {item.opcao || "-"}
                          </Badge>
                          <Badge variant="secondary">{item.om}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma previsão de TRRM encontrada.</div>
                )}
              </div>
            )}

            {activeTab === "licencas" && (
              <div className="space-y-4">
                {filteredLicencasData.length > 0 ? (
                  filteredLicencasData.map((item, index) => (
                    <div key={index} className="border-l-4 border-l-orange-500 bg-card rounded-lg p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                          <p className="text-sm text-muted-foreground">{item.cargo}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-orange-600">Motivo: {item.periodo || "Não informado"}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.quadro || "-"}, {item.especialidade || "-"}, {item.opcao || "-"}
                          </Badge>
                          <Badge variant="secondary">{item.om}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma licença encontrada.</div>
                )}
              </div>
            )}

            {activeTab === "destaques" && (
              <div className="space-y-4">
                {filteredDestaquesData.length > 0 ? (
                  filteredDestaquesData.map((item, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                          <p className="text-sm text-muted-foreground">{item.cargo}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {item.emOutraOm && <span className="text-cyan-600">Em: {item.emOutraOm}</span>}
                            {item.deOutraOm && <span className="text-cyan-600">De: {item.deOutraOm}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.quadro || "-"}, {item.especialidade || "-"}, {item.opcao || "-"}
                          </Badge>
                          <Badge variant="secondary">{item.om}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum destaque encontrado.</div>
                )}
              </div>
            )}

            {activeTab === "concurso" && (
              <div className="space-y-4">
                {filteredCursoData.length > 0 ? (
                  filteredCursoData.map((item, index) => (
                    <div
                      key={index}
                      className="border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                          <p className="text-sm text-muted-foreground">{item.cargo || "-"}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-emerald-600 font-medium">
                              Ano Previsto: {item.anoPrevisto || "Não informado"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.quadro || "-"}, {item.especialidade || "-"}, {item.opcao || "-"}
                          </Badge>
                          <Badge variant="secondary">{item.om}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro de Previsão de Curso encontrado.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPracas;

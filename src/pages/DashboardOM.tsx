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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
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
  HeadingLevel,
  BorderStyle,
  ShadingType,
} from "docx";
import brasaoRepublica from "@/assets/brasao-republica.png";
import OfficerCard from "@/components/dashboard/OfficerCard";

interface PersonnelRecord {
  id: string;
  neo: string;
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
}

interface DesembarqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
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
  opcao: string;
  cargo: string;
  nome: string;
  emOutraOm: string;
  deOutraOm: string;
  periodo: string;
  om: string;
}

interface ConcursoRecord {
  posto: string;
  corpo: string;
  quadro: string;
  opcao: string;
  cargo: string;
  nome: string;
  anoPrevisto: string;
  om: string;
}

interface CachedOMData {
  data: PersonnelRecord[];
  desembarque: DesembarqueRecord[];
  embarque: DesembarqueRecord[];
  trrm: TrrmRecord[];
  licencas: LicencaRecord[];
  destaques: DestaqueRecord[];
  concurso: ConcursoRecord[];
  quadros: string[];
  lastUpdate: string;
}

const DashboardOM = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [personnelData, setPersonnelData] = useState<PersonnelRecord[]>([]);
  const [desembarqueData, setDesembarqueData] = useState<DesembarqueRecord[]>([]);
  const [embarqueData, setEmbarqueData] = useState<DesembarqueRecord[]>([]);
  const [trrmData, setTrrmData] = useState<TrrmRecord[]>([]);
  const [licencasData, setLicencasData] = useState<LicencaRecord[]>([]);
  const [destaquesData, setDestaquesData] = useState<DestaqueRecord[]>([]);
  const [concursoData, setConcursoData] = useState<ConcursoRecord[]>([]);
  const [availableOMs, setAvailableOMs] = useState<string[]>([]);
  const [availableQuadros, setAvailableQuadros] = useState<string[]>([]);
  const [availableOpcoes, setAvailableOpcoes] = useState<string[]>([]);
  const [availablePostos, setAvailablePostos] = useState<string[]>([]);
  const [availableCorpos, setAvailableCorpos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedQuadros, setSelectedQuadros] = useState<string[]>([]);
  const [selectedOpcoes, setSelectedOpcoes] = useState<string[]>([]);
  const [selectedPostoFilter, setSelectedPostoFilter] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("efetivo");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "ocupados" | "vagos">("all");
  const [selectedOMsForVagos, setSelectedOMsForVagos] = useState<string[]>([]);
  const [showOnlyExtraLotacao, setShowOnlyExtraLotacao] = useState(false);
  const [selectedPostos, setSelectedPostos] = useState<string[]>([]);
  const [selectedPostosEfe, setSelectedPostosEfe] = useState<string[]>([]);
  const [selectedCorpos, setSelectedCorpos] = useState<string[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [efetivoSubFilter, setEfetivoSubFilter] = useState<"all" | "na_neo" | "fora_neo">("all");

  // Ordem fixa dos postos de oficiais
  const POSTO_ORDER = ["C ALTE", "CMG", "CF", "CC", "CT", "1T", "2T", "GM"];

  const chartRef = useRef<HTMLDivElement>(null);

  const isOnline = useOnlineStatus();
  const { getFromCache, saveToCache, getCacheTimestamp } = useOfflineCache<CachedOMData>("om_data");

  const applyUserFiltering = (rawResult: any) => {
    const allowedOMs = getAllowedOMs();
    console.log("DashboardOM - allowedOMs:", allowedOMs);

    const rawData = rawResult.data || [];
    console.log("DashboardOM - rawData count:", rawData.length);
    console.log("DashboardOM - unique OMs in data:", [...new Set(rawData.map((item: any) => item.om))]);

    const filterByOM = (arr: any[]): any[] => {
      if (allowedOMs === "all") return arr;
      return arr.filter((item: any) => allowedOMs.includes(item.om));
    };

    const data = filterByOM(rawData) as PersonnelRecord[];
    console.log("DashboardOM - filtered data count:", data.length);

    const desembarque = filterByOM(rawResult.desembarque || []) as DesembarqueRecord[];
    const embarque = filterByOM(rawResult.embarque || []) as DesembarqueRecord[];
    const trrm = filterByOM(rawResult.trrm || []) as TrrmRecord[];
    const licencas = filterByOM(rawResult.licencas || []) as LicencaRecord[];
    const destaques = filterByOM(rawResult.destaques || []) as DestaqueRecord[];
    const concurso = filterByOM(rawResult.concurso || []) as ConcursoRecord[];

    setPersonnelData(data);
    setDesembarqueData(desembarque);
    setEmbarqueData(embarque);
    setTrrmData(trrm);
    setLicencasData(licencas);
    setDestaquesData(destaques);
    setConcursoData(concurso);

    // Extract unique OMs and Opcoes from filtered data
    const oms = [...new Set(data.map((item: any) => item.om).filter(Boolean))];
    const opcoes = [...new Set(data.map((item: any) => item.opcaoTmft).filter(Boolean))];

    setAvailableOMs(getAvailableOMsForUser(oms as string[]));
    setAvailableQuadros((rawResult.quadros || []).filter((q: string) => q && q.trim() !== "" && q !== "-"));
    // Extrair postos disponíveis (postoEfe) para oficiais
    const postosFromData = [
      ...new Set(data.map((item: any) => item.postoEfe).filter((p: string) => p && p.trim() !== "" && p !== "-")),
    ].sort((a, b) => {
      const order = ["C ALTE", "CMG", "CF", "CC", "CT", "1T", "2T", "GM"];
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    setAvailablePostos(postosFromData as string[]);
    setAvailableOpcoes(opcoes as string[]);

    // Extrair corpos disponíveis (corpoTmft ou corpoEfe)
    const corposFromData = [
      ...new Set(
        data
          .map((item: any) => item.corpoTmft || item.corpoEfe)
          .filter((c: string) => c && c.trim() !== "" && c !== "-"),
      ),
    ].sort();
    setAvailableCorpos(corposFromData as string[]);

    setLastUpdate(rawResult.lastUpdate || new Date().toLocaleTimeString("pt-BR"));
  };

  const invokeFunction = async <T,>(name: string, ms = 25000) => {
    return await Promise.race([
      supabase.functions.invoke<T>(name),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout ao chamar ${name}`)), ms)),
    ]);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("Fetching OM data...");

      // Check if offline using navigator.onLine for real-time status
      const currentlyOnline = navigator.onLine;

      if (!currentlyOnline) {
        console.log("Offline mode - attempting to load from cache");
        const cachedData = getFromCache();
        if (cachedData) {
          console.log("Loading OM data from cache");
          applyUserFiltering(cachedData);
          setIsUsingCache(true);
          const cacheTime = getCacheTimestamp();
          if (cacheTime) {
            toast.info(`Modo offline - dados do cache de ${cacheTime.toLocaleString("pt-BR")}`);
          }
          setLoading(false);
          return;
        } else {
          toast.error("Sem conexão e sem dados em cache");
          setLoading(false);
          return;
        }
      }

      const { data: result, error } = await invokeFunction<any>("fetch-om-data");

      if (error) {
        console.error("Error fetching OM data:", error);
        // Try to load from cache on error
        const cachedData = getFromCache();
        if (cachedData) {
          console.log("Error fetching - loading from cache");
          applyUserFiltering(cachedData);
          setIsUsingCache(true);
          toast.warning("Erro ao atualizar - usando dados do cache");
          return;
        }
        toast.error("Erro ao carregar dados");
        return;
      }

      if (result) {
        console.log("Received OM data:", result);

        // Save raw data to cache before filtering
        const cacheData: CachedOMData = {
          data: result.data || [],
          desembarque: result.desembarque || [],
          embarque: result.embarque || [],
          trrm: result.trrm || [],
          licencas: result.licencas || [],
          destaques: result.destaques || [],
          concurso: result.concurso || [],
          quadros: result.quadros || [],
          lastUpdate: result.lastUpdate || new Date().toLocaleTimeString("pt-BR"),
        };
        saveToCache(cacheData);
        setIsUsingCache(false);

        applyUserFiltering(result);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
      // Try to load from cache on error
      const cachedData = getFromCache();
      if (cachedData) {
        console.log("Exception - loading from cache");
        applyUserFiltering(cachedData);
        setIsUsingCache(true);
        toast.warning("Erro ao atualizar - usando dados do cache");
        return;
      }
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-sync every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Base filtered data for metrics calculation (independent of card clicks)
  // Para TMFT: usa postoTmft, quadroTmft, corpoTmft
  const baseFilteredData = useMemo(() => {
    let filtered = personnelData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    // Filtro de Quadro - filtra pela TMFT para que as métricas sejam baseadas nas posições do quadro selecionado
    if (selectedQuadros.length > 0) {
      filtered = filtered.filter((item) => selectedQuadros.includes(item.quadroTmft));
    }

    if (selectedOpcoes.length > 0) {
      filtered = filtered.filter((item) => selectedOpcoes.includes(item.opcaoTmft));
    }

    // Filtro de posto - filtra pela TMFT para que as métricas sejam baseadas nas posições do posto selecionado
    if (selectedPostoFilter.length > 0) {
      filtered = filtered.filter((item) => selectedPostoFilter.includes(item.postoTmft));
    }

    // Filtro de corpo - filtra pela TMFT para que as métricas sejam baseadas nas posições do corpo selecionado
    if (selectedCorpos.length > 0) {
      filtered = filtered.filter((item) => selectedCorpos.includes(item.corpoTmft));
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
  }, [personnelData, selectedOMs, selectedQuadros, selectedOpcoes, selectedPostoFilter, selectedCorpos, searchQuery]);

  // Filtered data for display (applies status filter and extra lotação for drill-down)
  const filteredData = useMemo(() => {
    let filtered = baseFilteredData;

    // Apply status filter from card click
    if (statusFilter === "ocupados") {
      filtered = filtered.filter((item) => item.ocupado);

      // Apply efetivo sub-filter based on CORPO match
      if (efetivoSubFilter === "na_neo") {
        filtered = filtered.filter((item) => {
          const corpoTmft = (item.corpoTmft || "").trim().toUpperCase();
          const corpoEfe = (item.corpoEfe || "").trim().toUpperCase();
          return !corpoEfe || corpoEfe === "-" || corpoTmft === corpoEfe;
        });
      } else if (efetivoSubFilter === "fora_neo") {
        filtered = filtered.filter((item) => {
          const corpoTmft = (item.corpoTmft || "").trim().toUpperCase();
          const corpoEfe = (item.corpoEfe || "").trim().toUpperCase();
          return corpoTmft && corpoEfe && corpoTmft !== "-" && corpoEfe !== "-" && corpoTmft !== corpoEfe;
        });
      }
    } else if (statusFilter === "vagos") {
      filtered = filtered.filter((item) => !item.ocupado);
    }

    // Apply EXTRA LOTAÇÃO filter
    if (showOnlyExtraLotacao) {
      filtered = filtered.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO");
    }

    return filtered;
  }, [baseFilteredData, statusFilter, showOnlyExtraLotacao, efetivoSubFilter]);

  const toggleOM = (om: string) => {
    setSelectedOMs((prev) => (prev.includes(om) ? prev.filter((o) => o !== om) : [...prev, om]));
  };

  const toggleQuadro = (quadro: string) => {
    setSelectedQuadros((prev) => (prev.includes(quadro) ? prev.filter((q) => q !== quadro) : [...prev, quadro]));
  };

  const toggleOpcao = (opcao: string) => {
    setSelectedOpcoes((prev) => (prev.includes(opcao) ? prev.filter((o) => o !== opcao) : [...prev, opcao]));
  };

  const togglePosto = (posto: string) => {
    setSelectedPostoFilter((prev) => (prev.includes(posto) ? prev.filter((p) => p !== posto) : [...prev, posto]));
  };

  const toggleCorpo = (corpo: string) => {
    setSelectedCorpos((prev) => (prev.includes(corpo) ? prev.filter((c) => c !== corpo) : [...prev, corpo]));
  };

  const clearFilters = () => {
    setSelectedOMs([]);
    setSelectedQuadros([]);
    setSelectedOpcoes([]);
    setSelectedPostoFilter([]);
    setStatusFilter("all");
    setShowOnlyExtraLotacao(false);
    setSelectedCorpos([]);
    setSearchQuery("");
    setEfetivoSubFilter("all");
  };

  const handleStatusCardClick = (status: "all" | "ocupados" | "vagos") => {
    setStatusFilter((prev) => {
      const newStatus = prev === status ? "all" : status;
      if (newStatus !== "ocupados") {
        setEfetivoSubFilter("all");
      }
      return newStatus;
    });
  };

  const OPCOES_FIXAS = ["CARREIRA", "RM-2", "TTC"];

  // Metrics calculated from baseFilteredData (independent of card clicks)
  const metrics = useMemo(() => {
    const regularData = baseFilteredData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
    const totalTMFT = regularData.length;

    // EFETIVO: quando há filtros de corpo/quadro/posto, conta ocupados pelo campo EFE correspondente
    // Aplica os mesmos filtros (OM, Opção, Search) mas usa corpoEfe/quadroEfe/postoEfe ao invés de TMFT
    const hasEfeFilters = selectedCorpos.length > 0 || selectedQuadros.length > 0 || selectedPostoFilter.length > 0;

    let totalEXI: number;
    if (hasEfeFilters) {
      // Aplica todos os filtros usando campos EFE para corpo/quadro/posto
      let efetivoData = personnelData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO" && item.ocupado);

      // Aplicar filtro de OM
      if (selectedOMs.length > 0) {
        efetivoData = efetivoData.filter((item) => selectedOMs.includes(item.om));
      }
      // Aplicar filtro de Opção
      if (selectedOpcoes.length > 0) {
        efetivoData = efetivoData.filter((item) => selectedOpcoes.includes(item.opcaoTmft));
      }
      // Aplicar filtro de busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        efetivoData = efetivoData.filter(
          (item) =>
            (item.nome && item.nome.toLowerCase().includes(query)) ||
            (item.postoTmft && item.postoTmft.toLowerCase().includes(query)) ||
            (item.postoEfe && item.postoEfe.toLowerCase().includes(query)) ||
            (item.setor && item.setor.toLowerCase().includes(query)) ||
            (item.quadroTmft && item.quadroTmft.toLowerCase().includes(query)) ||
            (item.quadroEfe && item.quadroEfe.toLowerCase().includes(query)) ||
            (item.neo && item.neo.toString().includes(query)),
        );
      }

      // Agora filtra por campos EFE (corpo/quadro/posto reais do militar)
      if (selectedCorpos.length > 0) {
        efetivoData = efetivoData.filter((item) => selectedCorpos.includes(item.corpoEfe));
      }
      if (selectedQuadros.length > 0) {
        efetivoData = efetivoData.filter((item) => selectedQuadros.includes(item.quadroEfe));
      }
      if (selectedPostoFilter.length > 0) {
        efetivoData = efetivoData.filter((item) => selectedPostoFilter.includes(item.postoEfe));
      }

      totalEXI = efetivoData.length;
    } else {
      totalEXI = regularData.filter((item) => item.ocupado).length;
    }

    const totalDIF = totalEXI - totalTMFT;
    const percentualPreenchimento = totalTMFT > 0 ? (totalEXI / totalTMFT) * 100 : 0;
    const totalExtraLotacao = baseFilteredData.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO").length;
    // ATENDIMENTO TOTAL = (Extra Lotação + Efetivo) / TMFT * 100
    const atendimentoTotal = totalTMFT > 0 ? ((totalExtraLotacao + totalEXI) / totalTMFT) * 100 : 0;

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      percentualPreenchimento,
      totalExtraLotacao,
      atendimentoTotal,
    };
  }, [
    baseFilteredData,
    personnelData,
    selectedCorpos,
    selectedQuadros,
    selectedPostoFilter,
    selectedOMs,
    selectedOpcoes,
    searchQuery,
  ]);

  // Calculate NA NEO and FORA DA NEO metrics for EFETIVO drill-down (based on CORPO match)
  const neoMetrics = useMemo(() => {
    const regularData = baseFilteredData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO" && item.ocupado);

    // FORA DA NEO: quadro TMFT ≠ quadro EFE (when both exist and are meaningful)
    // Corpo difference alone does NOT make someone "FORA DA NEO"
    const foraNeo = regularData.filter((item) => {
      const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
      const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
      // Only consider FORA DA NEO if quadro values exist and are different
      return quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
    });

    // NA NEO: everyone who is NOT FORA DA NEO
    // This ensures NA NEO + FORA DA NEO = EFETIVO (total occupied)
    const foraNeoIds = new Set(foraNeo.map((item) => item.id));
    const naNeo = regularData.filter((item) => !foraNeoIds.has(item.id));

    return {
      foraNeoCount: foraNeo.length,
      naNeoCount: naNeo.length,
      foraNeoPersonnel: foraNeo,
      naNeoPersonnel: naNeo,
    };
  }, [baseFilteredData]);

  // Handle NA NEO sub-card click
  const handleNaNeoClick = () => {
    if (efetivoSubFilter === "na_neo") {
      setEfetivoSubFilter("all");
      setStatusFilter("all");
    } else {
      setStatusFilter("ocupados");
      setEfetivoSubFilter("na_neo");
    }
  };

  // Handle FORA DA NEO sub-card click
  const handleForaNeoClick = () => {
    if (efetivoSubFilter === "fora_neo") {
      setEfetivoSubFilter("all");
      setStatusFilter("all");
    } else {
      setStatusFilter("ocupados");
      setEfetivoSubFilter("fora_neo");
    }
  };

  // Group data by setor
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

  const filteredDesembarqueData = useMemo(() => {
    let filtered = desembarqueData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter((item) => selectedQuadros.includes(item.quadro));
    }

    return filtered;
  }, [desembarqueData, selectedOMs, selectedQuadros]);

  const filteredEmbarqueData = useMemo(() => {
    let filtered = embarqueData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter((item) => selectedQuadros.includes(item.quadro));
    }

    return filtered;
  }, [embarqueData, selectedOMs, selectedQuadros]);

  const chartDataByPosto = useMemo(() => {
    const POSTO_ORDER = ["C ALTE", "CMG", "CF", "CC", "CT", "1T", "2T", "GM"];

    const normalizePosto = (posto: string) => {
      if (posto === "CONTRA-ALMIRANTE") return "C ALTE";
      if (posto === "1TEN") return "1T";
      if (posto === "2TEN") return "2T";
      return posto;
    };

    const grouped = filteredData.reduce(
      (acc, item) => {
        // TMFT: contar a posição pelo postoTmft
        const postoTmft = normalizePosto(String(item.postoTmft || "").trim());
        if (postoTmft) {
          if (!acc[postoTmft]) {
            acc[postoTmft] = { name: postoTmft, quantidade: 0, efe: 0 };
          }
          acc[postoTmft].quantidade += 1;
        }

        // EFE: contar o efetivo pelo postoEfe (se vazio, usar postoTmft como fallback)
        if (item.ocupado) {
          const postoEfe = normalizePosto(String(item.postoEfe || item.postoTmft || "").trim());
          if (postoEfe) {
            if (!acc[postoEfe]) {
              acc[postoEfe] = { name: postoEfe, quantidade: 0, efe: 0 };
            }
            acc[postoEfe].efe += 1;
          }
        }

        return acc;
      },
      {} as Record<string, { name: string; quantidade: number; efe: number }>,
    );

    const values = Object.values(grouped).filter((item) => item.quantidade > 0 || item.efe > 0);

    // Sort by the defined order
    return values.sort((a, b) => {
      const indexA = POSTO_ORDER.indexOf(a.name);
      const indexB = POSTO_ORDER.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [filteredData]);

  // Base filtered data for vagas chart (respects all filters: OM, Quadro, Opção, Posto, Corpo, Search)
  const baseFilteredForVagos = useMemo(() => {
    let filtered = personnelData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter((item) => selectedQuadros.includes(item.quadroTmft));
    }

    if (selectedOpcoes.length > 0) {
      filtered = filtered.filter((item) => selectedOpcoes.includes(item.opcaoTmft));
    }

    // Filtro de posto (postoEfe) para oficiais
    if (selectedPostoFilter.length > 0) {
      filtered = filtered.filter((item) => selectedPostoFilter.includes(item.postoEfe));
    }

    // Filtro de corpo
    if (selectedCorpos.length > 0) {
      filtered = filtered.filter(
        (item) => selectedCorpos.includes(item.corpoTmft) || selectedCorpos.includes(item.corpoEfe),
      );
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
  }, [personnelData, selectedOMs, selectedQuadros, selectedOpcoes, selectedPostoFilter, selectedCorpos, searchQuery]);

  // Chart data showing vacancies by OM
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

  // Get vacant positions for selected OMs
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

  const handlePostoBarClick = (data: any) => {
    if (data && data.name) {
      setSelectedPostos((prev) =>
        prev.includes(data.name) ? prev.filter((p) => p !== data.name) : [...prev, data.name],
      );
      // Limpa seleção EFE ao selecionar Quantidade
      setSelectedPostosEfe([]);
    }
  };

  const handlePostoEfeBarClick = (data: any) => {
    if (data && data.name) {
      setSelectedPostosEfe((prev) =>
        prev.includes(data.name) ? prev.filter((p) => p !== data.name) : [...prev, data.name],
      );
      // Limpa seleção Quantidade ao selecionar EFE
      setSelectedPostos([]);
    }
  };

  // Get personnel for selected postos (Quantidade)
  const personnelForSelectedPostos = useMemo(() => {
    if (selectedPostos.length === 0) return [];

    return filteredData.filter((item) => {
      let posto = item.postoTmft;
      // Normalize posto names for comparison
      if (posto === "CONTRA-ALMIRANTE") posto = "C ALTE";
      if (posto === "1TEN") posto = "1T";
      if (posto === "2TEN") posto = "2T";
      return selectedPostos.includes(posto);
    });
  }, [filteredData, selectedPostos]);

  // Get personnel for selected postos EFE (somente ocupados pelo posto efetivo)
  const personnelForSelectedPostosEfe = useMemo(() => {
    if (selectedPostosEfe.length === 0) return [];

    return filteredData.filter((item) => {
      if (!item.ocupado) return false;
      let postoEfe = item.postoEfe || item.postoTmft;
      if (postoEfe === "CONTRA-ALMIRANTE") postoEfe = "C ALTE";
      if (postoEfe === "1TEN") postoEfe = "1T";
      if (postoEfe === "2TEN") postoEfe = "2T";
      return selectedPostosEfe.includes(postoEfe);
    });
  }, [filteredData, selectedPostosEfe]);

  // Chart data by Corpo (CORPO)
  const chartDataByCorpo = useMemo(() => {
    const grouped = filteredData.reduce(
      (acc, item) => {
        const corpo = item.ocupado ? item.corpoEfe : item.corpoTmft;
        if (corpo && corpo.trim() !== "") {
          if (!acc[corpo]) {
            acc[corpo] = { name: corpo, value: 0 };
          }
          acc[corpo].value += 1;
        }
        return acc;
      },
      {} as Record<string, { name: string; value: number }>,
    );

    return Object.values(grouped)
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const handleCorpoBarClick = (data: any) => {
    if (data && data.name) {
      setSelectedCorpos((prev) =>
        prev.includes(data.name) ? prev.filter((c) => c !== data.name) : [...prev, data.name],
      );
    }
  };

  // Get personnel for selected corpos
  const personnelForSelectedCorpos = useMemo(() => {
    if (selectedCorpos.length === 0) return [];

    return filteredData.filter((item) => {
      const corpo = item.ocupado ? item.corpoEfe : item.corpoTmft;
      return selectedCorpos.includes(corpo);
    });
  }, [filteredData, selectedCorpos]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

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

      // Helper to add OM title (without brasão - brasão only on first page)
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
      pdf.text("Tabela Mestra de Força de Trabalho - OFICIAIS", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 15;

      if (
        selectedOMs.length > 0 ||
        selectedOpcoes.length > 0 ||
        selectedCorpos.length > 0 ||
        selectedQuadros.length > 0 ||
        selectedPostoFilter.length > 0
      ) {
        pdf.setFontSize(10);
        pdf.text("Filtros Aplicados:", 14, yPosition);
        yPosition += 6;
        let filterX = 20;
        if (selectedOMs.length > 0) {
          pdf.text(`OM: ${selectedOMs.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedCorpos.length > 0) {
          pdf.text(`Corpo: ${selectedCorpos.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedQuadros.length > 0) {
          pdf.text(`Quadro: ${selectedQuadros.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedOpcoes.length > 0) {
          pdf.text(`Opção: ${selectedOpcoes.join(", ")}`, filterX, yPosition);
          filterX += 50;
        }
        if (selectedPostoFilter.length > 0) {
          pdf.text(`Posto: ${selectedPostoFilter.join(", ")}`, filterX, yPosition);
        }
        yPosition += 10;
      }

      const activeOMs = selectedOMs.length > 0 ? selectedOMs : availableOMs;

      // NA NEO / FORA DA NEO summary table
      yPosition = checkNewPage(yPosition, 50);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMO)", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 6;

      const neoResumoRows: string[][] = [];
      let totalNaNeo = 0;
      let totalForaNeo = 0;
      let totalEfetivoGeral = 0;
      let totalVagosGeral = 0;
      let totalTmftConformidade = 0;

      for (const om of activeOMs) {
        const omData = filteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        const omRegularData = omData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
        const omTmft = omRegularData.length;

        // EFETIVO: quando há filtros de corpo/quadro/posto, conta ocupados pelos campos EFE correspondentes
        let omEfetivoTotal: number;
        const hasEfeFilters = selectedCorpos.length > 0 || selectedQuadros.length > 0 || selectedPostoFilter.length > 0;

        if (hasEfeFilters) {
          // Conta todos os ocupados desta OM que têm os campos EFE no filtro
          let efetivoFiltered = personnelData.filter(
            (item) => item.om === om && item.tipoSetor !== "EXTRA LOTAÇÃO" && item.ocupado,
          );

          if (selectedCorpos.length > 0) {
            efetivoFiltered = efetivoFiltered.filter((item) => selectedCorpos.includes(item.corpoEfe));
          }
          if (selectedQuadros.length > 0) {
            efetivoFiltered = efetivoFiltered.filter((item) => selectedQuadros.includes(item.quadroEfe));
          }
          if (selectedPostoFilter.length > 0) {
            efetivoFiltered = efetivoFiltered.filter((item) => selectedPostoFilter.includes(item.postoEfe));
          }

          omEfetivoTotal = efetivoFiltered.length;
        } else {
          const omRegularOcupados = omRegularData.filter((item) => item.ocupado);
          omEfetivoTotal = omRegularOcupados.length;
        }

        const omVagos = omTmft - omEfetivoTotal;

        // FORA DA NEO: quadro TMFT ≠ quadro EFE (when both exist and are different)
        const omRegularOcupadosForNeo = omRegularData.filter((item) => item.ocupado);
        const omForaNeoList = omRegularOcupadosForNeo.filter((item) => {
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          return quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
        }).length;

        // NA NEO: everyone who is NOT FORA DA NEO (ensures NA NEO + FORA DA NEO = EFETIVO)
        const omNaNeo = omEfetivoTotal - omForaNeoList;
        const omForaNeo = omForaNeoList;

        // When FORA DA NEO = 0 (all occupied have matching quadros), show FALTAS = 0 and ATENDIMENTO = 100%
        const displayVagos = omTmft - omEfetivoTotal;
        const displayAtendimento = omTmft > 0 ? (omEfetivoTotal / omTmft) * 100 : 0;

        totalNaNeo += omNaNeo;
        totalForaNeo += omForaNeo;
        totalEfetivoGeral += omEfetivoTotal;
        totalVagosGeral += displayVagos;
        totalTmftConformidade += omTmft;

        if (omTmft > 0) {
          neoResumoRows.push([
            om,
            omTmft.toString(),
            omEfetivoTotal.toString(),
            omNaNeo.toString(),
            omForaNeo.toString(),
            displayVagos.toString(),
            `${displayAtendimento.toFixed(1)}%`,
          ]);
        }
      }

      // Add TOTAL row
      const totalDisplayVagos = totalTmftConformidade - totalEfetivoGeral;
      const totalDisplayAtendimento = totalTmftConformidade > 0 ? (totalEfetivoGeral / totalTmftConformidade) * 100 : 0;

      neoResumoRows.push([
        "TOTAL GERAL",
        totalTmftConformidade.toString(),
        totalEfetivoGeral.toString(),
        totalNaNeo.toString(),
        totalForaNeo.toString(),
        totalDisplayVagos.toString(),
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

      // IM (Infantaria de Marinha) table by OM - with all columns like RESUMO GERAL
      const imDataBase = filteredData.filter((item) => item.corpoTmft === "IM" && item.tipoSetor !== "EXTRA LOTAÇÃO");
      const imExtraData = filteredData.filter((item) => item.corpoTmft === "IM" && item.tipoSetor === "EXTRA LOTAÇÃO");

      if (imDataBase.length > 0 || imExtraData.length > 0) {
        yPosition = checkNewPage(yPosition, 60);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("RESUMO IM (INFANTARIA DE MARINHA)", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        const imResumoRows: string[][] = [];
        let totalImTmft = 0;
        let totalImEfetivo = 0;
        let totalImExtra = 0;

        for (const om of activeOMs) {
          const omImData = imDataBase.filter((item) => item.om === om);
          const omImExtraData = imExtraData.filter((item) => item.om === om);

          if (omImData.length === 0 && omImExtraData.length === 0) continue;

          const omImTmft = omImData.length;
          const omImEfetivo = omImData.filter((item) => item.ocupado).length;
          const omImVagos = omImTmft - omImEfetivo;
          const omImAtendimento = omImTmft > 0 ? (omImEfetivo / omImTmft) * 100 : 0;
          const omImExtra = omImExtraData.length;
          const omImAtendTotal = omImTmft > 0 ? ((omImEfetivo + omImExtra) / omImTmft) * 100 : 0;

          totalImTmft += omImTmft;
          totalImEfetivo += omImEfetivo;
          totalImExtra += omImExtra;

          imResumoRows.push([
            om,
            omImTmft.toString(),
            omImEfetivo.toString(),
            omImVagos.toString(),
            `${omImAtendimento.toFixed(1)}%`,
          ]);
        }

        // Add TOTAL IM row
        const totalImVagos = totalImTmft - totalImEfetivo;
        const totalImAtendimento = totalImTmft > 0 ? (totalImEfetivo / totalImTmft) * 100 : 0;
        const totalImAtendTotal = totalImTmft > 0 ? ((totalImEfetivo + totalImExtra) / totalImTmft) * 100 : 0;

        imResumoRows.push([
          "TOTAL IM",
          totalImTmft.toString(),
          totalImEfetivo.toString(),
          totalImVagos.toString(),
          `${totalImAtendimento.toFixed(1)}%`,
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [["OM", "TMFT IM", "EFETIVO IM", "FALTAS IM", "ATENDIMENTO IM"]],
          body: imResumoRows,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 3, halign: "center" },
          headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
          bodyStyles: { fontStyle: "normal" },
          margin: { left: 30, right: 30 },
          didParseCell: (data) => {
            if (data.section === "body") {
              const omCell = data.row.raw?.[0];
              if (omCell === "TOTAL IM") {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [229, 231, 235];
              }
            }
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Chart removed from PDF as requested

      // activeOMs already defined above
      // Tables by OM - each OM on a separate page with all its data
      for (const om of activeOMs) {
        const omData = filteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        // Always start a new page for each OM
        pdf.addPage();
        yPosition = 15;

        // Calculate metrics per OM
        const omRegularData = omData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
        const omTmft = omRegularData.length;

        // EFETIVO: quando há filtros de corpo/quadro/posto, conta ocupados pelos campos EFE correspondentes
        let omEfetivo: number;
        const hasEfeFiltersPDF =
          selectedCorpos.length > 0 || selectedQuadros.length > 0 || selectedPostoFilter.length > 0;

        if (hasEfeFiltersPDF) {
          let efetivoFiltered = personnelData.filter(
            (item) => item.om === om && item.tipoSetor !== "EXTRA LOTAÇÃO" && item.ocupado,
          );

          if (selectedCorpos.length > 0) {
            efetivoFiltered = efetivoFiltered.filter((item) => selectedCorpos.includes(item.corpoEfe));
          }
          if (selectedQuadros.length > 0) {
            efetivoFiltered = efetivoFiltered.filter((item) => selectedQuadros.includes(item.quadroEfe));
          }
          if (selectedPostoFilter.length > 0) {
            efetivoFiltered = efetivoFiltered.filter((item) => selectedPostoFilter.includes(item.postoEfe));
          }

          omEfetivo = efetivoFiltered.length;
        } else {
          omEfetivo = omRegularData.filter((item) => item.ocupado).length;
        }

        const omVagos = omTmft - omEfetivo;
        const omAtendimento = omTmft > 0 ? (omEfetivo / omTmft) * 100 : 0;
        const omExtraLotacao = omData.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO").length;
        const omAtendTotal = omTmft > 0 ? ((omExtraLotacao + omEfetivo) / omTmft) * 100 : 0;

        // OM title with brasão
        yPosition = addOMTitle(om, yPosition);

        // Calculate NA NEO / FORA DA NEO for this OM
        const omRegularOcupados = omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omRegularOcupados.filter((item) => {
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          return quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
        }).length;
        const omNaNeoCount = omEfetivo - omForaNeoCount;

        // When FORA DA NEO = 0, show FALTAS = 0 and ATENDIMENTO = 100%
        const displayOmVagos = omForaNeoCount === 0 ? 0 : omVagos;
        const displayOmAtendimento = omForaNeoCount === 0 ? 100 : omTmft > 0 ? (omEfetivo / omTmft) * 100 : 0;

        // Add CONFORMIDADE DE CORPO metrics table for this OM
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");

        autoTable(pdf, {
          startY: yPosition,
          head: [["TMFT", "EFETIVO", "FALTAS", "NA NEO", "FORA DA NEO", "ATENDIMENTO"]],
          body: [
            [
              omTmft.toString(),
              omEfetivo.toString(),
              displayOmVagos.toString(),
              omNaNeoCount.toString(),
              omForaNeoCount.toString(),
              `${displayOmAtendimento.toFixed(1)}%`,
            ],
          ],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2, halign: "center" },
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
          bodyStyles: { fontStyle: "bold" },
          margin: { left: 40, right: 40 },
          didParseCell: (data) => {
            if (data.section === "body") {
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
        yPosition = (pdf as any).lastAutoTable.finalY + 8;

        // ====== TABELA DE EFETIVO ======
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("TABELA DE EFETIVO", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        // Quando há filtros de corpo/quadro/posto, incluir linhas extras de militares que estão em outras posições
        let omTableData = omData;
        const hasEfeFiltersTable =
          selectedCorpos.length > 0 || selectedQuadros.length > 0 || selectedPostoFilter.length > 0;

        if (hasEfeFiltersTable) {
          // Buscar militares desta OM que têm campos EFE no filtro mas TMFT diferente
          const extraEfetivoRows = personnelData.filter((item) => {
            if (item.om !== om || item.tipoSetor === "EXTRA LOTAÇÃO" || !item.ocupado) return false;

            // Verifica se o militar atende aos critérios EFE mas não está na lista filtrada por TMFT
            let matchesEfeFilters = true;
            let matchesTmftFilters = true;

            if (selectedCorpos.length > 0) {
              matchesEfeFilters = matchesEfeFilters && selectedCorpos.includes(item.corpoEfe);
              matchesTmftFilters = matchesTmftFilters && selectedCorpos.includes(item.corpoTmft);
            }
            if (selectedQuadros.length > 0) {
              matchesEfeFilters = matchesEfeFilters && selectedQuadros.includes(item.quadroEfe);
              matchesTmftFilters = matchesTmftFilters && selectedQuadros.includes(item.quadroTmft);
            }
            if (selectedPostoFilter.length > 0) {
              matchesEfeFilters = matchesEfeFilters && selectedPostoFilter.includes(item.postoEfe);
              matchesTmftFilters = matchesTmftFilters && selectedPostoFilter.includes(item.postoTmft);
            }

            // Incluir se atende aos filtros EFE mas NÃO aos filtros TMFT (linha extra)
            return matchesEfeFilters && !matchesTmftFilters;
          });

          // Combinar dados originais com as linhas extras (sem duplicar)
          const existingIds = new Set(omData.map((item) => item.id));
          const newRows = extraEfetivoRows.filter((item) => !existingIds.has(item.id));
          omTableData = [...omData, ...newRows];
        }

        const tableData = omTableData.map((item) => {
          // Marcar se é linha extra (campos EFE no filtro mas TMFT fora)
          let isExtraRow = false;
          if (hasEfeFiltersTable) {
            let matchesEfe = true;
            let matchesTmft = true;

            if (selectedCorpos.length > 0) {
              matchesEfe = matchesEfe && selectedCorpos.includes(item.corpoEfe);
              matchesTmft = matchesTmft && selectedCorpos.includes(item.corpoTmft);
            }
            if (selectedQuadros.length > 0) {
              matchesEfe = matchesEfe && selectedQuadros.includes(item.quadroEfe);
              matchesTmft = matchesTmft && selectedQuadros.includes(item.quadroTmft);
            }
            if (selectedPostoFilter.length > 0) {
              matchesEfe = matchesEfe && selectedPostoFilter.includes(item.postoEfe);
              matchesTmft = matchesTmft && selectedPostoFilter.includes(item.postoTmft);
            }

            isExtraRow = item.ocupado && matchesEfe && !matchesTmft;
          }

          return [
            item.neo.toString(),
            item.setor,
            item.cargo,
            item.postoTmft,
            item.quadroTmft,
            item.corpoTmft || "-",
            item.nome || "-",
            item.postoEfe || "-",
            item.quadroEfe || "-",
            item.corpoEfe || "-",
            item.ocupado
              ? (() => {
                  const corpoTmft = (item.corpoTmft || "").trim().toUpperCase();
                  const corpoEfe = (item.corpoEfe || "").trim().toUpperCase();
                  if (isExtraRow) {
                    return "EFETIVO";
                  } else if (!corpoEfe || corpoEfe === "-" || corpoTmft === corpoEfe) {
                    return "NA NEO";
                  } else {
                    return "FORA NEO";
                  }
                })()
              : "VAGO",
          ];
        });

        autoTable(pdf, {
          startY: yPosition,
          head: [
            [
              "NEO",
              "SETOR",
              "CARGO",
              "POSTO TMFT",
              "QUADRO TMFT",
              "CORPO TMFT",
              "NOME",
              "POSTO EFE",
              "QUADRO EFE",
              "CORPO EFE",
              "STATUS",
            ],
          ],
          body: tableData,
          theme: "grid",
          styles: { fontSize: 7, cellPadding: 1 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          margin: { left: 15, right: 15 },
          didParseCell: (data) => {
            if (data.section === "body") {
              const nome = data.row.raw?.[6];
              const setor = data.row.raw?.[1];
              const quadroTmft = data.row.raw?.[4];
              const quadroEfe = data.row.raw?.[8];
              const corpoTmft = data.row.raw?.[5];
              const corpoEfe = data.row.raw?.[9];
              const status = data.row.raw?.[10];
              const nomeStr = nome ? nome.toString().trim().toUpperCase() : "";
              const setorStr = setor ? setor.toString().trim().toUpperCase() : "";
              const quadroTmftStr = quadroTmft ? quadroTmft.toString().trim().toUpperCase() : "";
              const quadroEfeStr = quadroEfe ? quadroEfe.toString().trim().toUpperCase() : "";
              const corpoTmftStr = corpoTmft ? corpoTmft.toString().trim().toUpperCase() : "";
              const corpoEfeStr = corpoEfe ? corpoEfe.toString().trim().toUpperCase() : "";
              const statusStr = status ? status.toString().trim().toUpperCase() : "";

              // Verifica se é ocupado (tem nome válido)
              const isOcupado = nome && nome !== "-" && nomeStr !== "" && nomeStr !== "VAGO" && nomeStr !== "VAZIO";

              // Destaque AZUL CLARO para EFETIVO EXTRA (militar do corpo filtrado em posição de outro corpo)
              if (statusStr === "EFETIVO") {
                data.cell.styles.fillColor = [219, 234, 254]; // blue-100
                data.cell.styles.textColor = [30, 64, 175]; // blue-800
              }
              // Destaque LARANJA para FORA DA NEO (Quadro ou Corpo divergente quando ocupado)
              else if (statusStr === "FORA NEO") {
                data.cell.styles.fillColor = [255, 237, 213]; // orange-100
                data.cell.styles.textColor = [194, 65, 12]; // orange-700
              }
              // Destaque amarelo para EXTRA LOTAÇÃO
              else if (setorStr.includes("EXTRA LOTA") || setorStr === "EXTRA LOTAÇÃO") {
                data.cell.styles.fillColor = [254, 240, 138];
                data.cell.styles.textColor = [113, 63, 18];
              }
              // Destaque vermelho para NOME vazio/vago
              else if (!isOcupado) {
                data.cell.styles.fillColor = [254, 202, 202];
                data.cell.styles.textColor = [127, 29, 29];
              }
            }
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 8;

        // ====== PREVISÃO DE DESEMBARQUE (per OM) ======
        const omDesembarque = desembarqueData.filter(
          (item) => item.om === om && (selectedQuadros.length === 0 || selectedQuadros.includes(item.quadro)),
        );
        if (omDesembarque.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("PREVISÃO DE DESEMBARQUE", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const desembarqueTableData = omDesembarque.map((item) => [
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo,
            item.destino,
            item.mesAno,
            item.documento || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "POSTO/CORPO/QUADRO", "CARGO", "DESTINO", "MÊS/ANO", "DOCUMENTO"]],
            body: desembarqueTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [217, 119, 6], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== PREVISÃO DE TRRM (per OM) ======
        const omTrrm = trrmData.filter((item) => item.om === om);
        if (omTrrm.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("PREVISÃO DE TRRM", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const trrmTableData = omTrrm.map((item) => [
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.opcao || "-",
            item.cargo,
            item.epocaPrevista || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "POSTO/CORPO/QUADRO", "OPÇÃO", "CARGO", "ÉPOCA PREVISTA"]],
            body: trrmTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [147, 51, 234], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== LICENÇAS (per OM) ======
        const omLicencas = licencasData.filter((item) => item.om === om);
        if (omLicencas.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("LICENÇAS", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const licencasTableData = omLicencas.map((item) => [
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo,
            item.periodo || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "POSTO/CORPO/QUADRO", "CARGO", "PERÍODO"]],
            body: licencasTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [234, 88, 12], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== DESTAQUES (per OM) ======
        const omDestaques = destaquesData.filter((item) => item.om === om);
        if (omDestaques.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("DESTAQUES", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const destaquesTableData = omDestaques.map((item) => [
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo,
            item.emOutraOm || "-",
            item.deOutraOm || "-",
            item.periodo || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "POSTO/CORPO/QUADRO", "CARGO", "EM OUTRA OM", "DE OUTRA OM", "PERÍODO"]],
            body: destaquesTableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [202, 138, 4], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 8;
        }

        // ====== CONCURSO C-EMOS (per OM) ======
        const omConcurso = concursoData.filter((item) => item.om === om);
        if (omConcurso.length > 0) {
          yPosition = checkNewPage(yPosition, 30);

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("CONCURSO C-EMOS", pageWidth / 2, yPosition, { align: "center" });
          yPosition += 6;

          const concursoTableData = omConcurso.map((item) => [
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo || "-",
            item.anoPrevisto || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "POSTO/CORPO/QUADRO", "CARGO", "ANO PREVISTO"]],
            body: concursoTableData,
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

      pdf.save("tabela-mestra-forca-trabalho.pdf");
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

      // Helper to create table cell with styling
      const createCell = (text: string, isHeader = false, bgColor?: string, textColor?: string) => {
        const shading = bgColor ? { type: ShadingType.SOLID, color: bgColor } : undefined;
        return new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
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
      const titleParagraphs = [
        new Paragraph({
          children: [new TextRun({ text: "CENTRO DE OPERAÇÕES DO ABASTECIMENTO", bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Tabela Mestra de Força de Trabalho - OFICIAIS", bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      ];

      // Filters applied
      if (selectedOMs.length > 0 || selectedOpcoes.length > 0) {
        titleParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "Filtros Aplicados:", bold: true, size: 20 })],
            spacing: { after: 100 },
          }),
        );
        if (selectedOMs.length > 0) {
          titleParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `OM: ${selectedOMs.join(", ")}`, size: 20 })],
            }),
          );
        }
        if (selectedOpcoes.length > 0) {
          titleParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: `Opção: ${selectedOpcoes.join(", ")}`, size: 20 })],
            }),
          );
        }
        titleParagraphs.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // RESUMO - CONFORMIDADE DE CORPO table
      titleParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "RESUMO", bold: true, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        }),
      );

      const neoResumoRows: TableRow[] = [];
      let totalNaNeo = 0;
      let totalForaNeo = 0;
      let totalEfetivoGeral = 0;
      let totalTmftConformidade = 0;

      // Header row
      neoResumoRows.push(
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
      );

      for (const om of activeOMs) {
        const omData = filteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        const omRegularData = omData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
        const omTmft = omRegularData.length;
        const omRegularOcupados = omRegularData.filter((item) => item.ocupado);
        const omEfetivoTotal = omRegularOcupados.length;

        const omForaNeoList = omRegularOcupados.filter((item) => {
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          return quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
        }).length;

        const omNaNeo = omEfetivoTotal - omForaNeoList;
        const omForaNeo = omForaNeoList;
        const displayVagos = omTmft - omEfetivoTotal;
        const displayAtendimento = omTmft > 0 ? (omEfetivoTotal / omTmft) * 100 : 0;

        totalNaNeo += omNaNeo;
        totalForaNeo += omForaNeo;
        totalEfetivoGeral += omEfetivoTotal;
        totalTmftConformidade += omTmft;

        if (omTmft > 0) {
          const foraNeoColor = omForaNeo > 0 ? "FFEDD5" : undefined;
          const foraNeoTextColor = omForaNeo > 0 ? "C2410C" : undefined;

          neoResumoRows.push(
            new TableRow({
              children: [
                createCell(om),
                createCell(omTmft.toString()),
                createCell(omEfetivoTotal.toString()),
                createCell(omNaNeo.toString()),
                createCell(omForaNeo.toString(), false, foraNeoColor, foraNeoTextColor),
                createCell(displayVagos.toString()),
                createCell(`${displayAtendimento.toFixed(1)}%`),
              ],
            }),
          );
        }
      }

      // Total row
      const totalDisplayVagos = totalTmftConformidade - totalEfetivoGeral;
      const totalDisplayAtendimento = totalTmftConformidade > 0 ? (totalEfetivoGeral / totalTmftConformidade) * 100 : 0;
      const totalForaNeoColor = totalForaNeo > 0 ? "FFEDD5" : undefined;
      const totalForaNeoTextColor = totalForaNeo > 0 ? "C2410C" : undefined;

      neoResumoRows.push(
        new TableRow({
          children: [
            createCell("TOTAL GERAL", true, "E5E7EB"),
            createCell(totalTmftConformidade.toString(), true, "E5E7EB"),
            createCell(totalEfetivoGeral.toString(), true, "E5E7EB"),
            createCell(totalNaNeo.toString(), true, "E5E7EB"),
            createCell(totalForaNeo.toString(), true, totalForaNeoColor || "E5E7EB", totalForaNeoTextColor),
            createCell(totalDisplayVagos.toString(), true, "E5E7EB"),
            createCell(`${totalDisplayAtendimento.toFixed(1)}%`, true, "E5E7EB"),
          ],
        }),
      );

      const neoResumoTable = new Table({
        rows: neoResumoRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      titleParagraphs.push(neoResumoTable as unknown as Paragraph);
      titleParagraphs.push(new Paragraph({ spacing: { after: 400 } }));

      // IM Summary Table
      const imDataBase = filteredData.filter((item) => item.corpoTmft === "IM" && item.tipoSetor !== "EXTRA LOTAÇÃO");

      if (imDataBase.length > 0) {
        titleParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: "RESUMO IM (INFANTARIA DE MARINHA)", bold: true, size: 22 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }),
        );

        const imResumoRows: TableRow[] = [];
        let totalImTmft = 0;
        let totalImEfetivo = 0;

        imResumoRows.push(
          new TableRow({
            children: [
              createCell("OM", true, "22C55E"),
              createCell("TMFT IM", true, "22C55E"),
              createCell("EFETIVO IM", true, "22C55E"),
              createCell("FALTAS IM", true, "22C55E"),
              createCell("ATENDIMENTO IM", true, "22C55E"),
            ],
          }),
        );

        for (const om of activeOMs) {
          const omImData = imDataBase.filter((item) => item.om === om);
          if (omImData.length === 0) continue;

          const omImTmft = omImData.length;
          const omImEfetivo = omImData.filter((item) => item.ocupado).length;
          const omImVagos = omImTmft - omImEfetivo;
          const omImAtendimento = omImTmft > 0 ? (omImEfetivo / omImTmft) * 100 : 0;

          totalImTmft += omImTmft;
          totalImEfetivo += omImEfetivo;

          imResumoRows.push(
            new TableRow({
              children: [
                createCell(om),
                createCell(omImTmft.toString()),
                createCell(omImEfetivo.toString()),
                createCell(omImVagos.toString()),
                createCell(`${omImAtendimento.toFixed(1)}%`),
              ],
            }),
          );
        }

        const totalImVagos = totalImTmft - totalImEfetivo;
        const totalImAtendimento = totalImTmft > 0 ? (totalImEfetivo / totalImTmft) * 100 : 0;

        imResumoRows.push(
          new TableRow({
            children: [
              createCell("TOTAL IM", true, "E5E7EB"),
              createCell(totalImTmft.toString(), true, "E5E7EB"),
              createCell(totalImEfetivo.toString(), true, "E5E7EB"),
              createCell(totalImVagos.toString(), true, "E5E7EB"),
              createCell(`${totalImAtendimento.toFixed(1)}%`, true, "E5E7EB"),
            ],
          }),
        );

        const imResumoTable = new Table({
          rows: imResumoRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        });

        titleParagraphs.push(imResumoTable as unknown as Paragraph);
      }

      sections.push({
        properties: { page: { size: { orientation: "landscape" } } },
        children: titleParagraphs,
      });

      // Per OM sections
      for (const om of activeOMs) {
        const omData = filteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        const omChildren: any[] = [];

        // OM Title
        omChildren.push(
          new Paragraph({
            children: [new TextRun({ text: om, bold: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
        );

        // Calculate metrics
        const omRegularData = omData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
        const omTmft = omRegularData.length;
        const omEfetivo = omRegularData.filter((item) => item.ocupado).length;
        const omVagos = omTmft - omEfetivo;
        const omAtendimento = omTmft > 0 ? (omEfetivo / omTmft) * 100 : 0;

        const omRegularOcupados = omRegularData.filter((item) => item.ocupado);
        const omForaNeoCount = omRegularOcupados.filter((item) => {
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          return quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
        }).length;
        const omNaNeoCount = omEfetivo - omForaNeoCount;

        // Metrics table
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
              createCell(
                omForaNeoCount.toString(),
                true,
                omForaNeoCount > 0 ? "FFEDD5" : undefined,
                omForaNeoCount > 0 ? "C2410C" : undefined,
              ),
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

        const efetivoRows: TableRow[] = [
          new TableRow({
            children: [
              createCell("NEO", true, "2980B9"),
              createCell("SETOR", true, "2980B9"),
              createCell("CARGO", true, "2980B9"),
              createCell("POSTO TMFT", true, "2980B9"),
              createCell("QUADRO TMFT", true, "2980B9"),
              createCell("CORPO TMFT", true, "2980B9"),
              createCell("NOME", true, "2980B9"),
              createCell("POSTO EFE", true, "2980B9"),
              createCell("QUADRO EFE", true, "2980B9"),
              createCell("CORPO EFE", true, "2980B9"),
              createCell("STATUS", true, "2980B9"),
            ],
          }),
        ];

        for (const item of omData) {
          const isOcupado = item.ocupado;
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          const corpoTmft = (item.corpoTmft || "").trim().toUpperCase();
          const corpoEfe = (item.corpoEfe || "").trim().toUpperCase();
          const setorStr = (item.setor || "").trim().toUpperCase();

          const quadroDivergente =
            isOcupado && quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
          const corpoDivergente =
            isOcupado && corpoTmft && corpoEfe && corpoTmft !== "-" && corpoEfe !== "-" && corpoTmft !== corpoEfe;

          let bgColor: string | undefined;
          let textColor: string | undefined;

          if (quadroDivergente || corpoDivergente) {
            bgColor = "FFEDD5";
            textColor = "C2410C";
          } else if (setorStr.includes("EXTRA LOTA")) {
            bgColor = "FEF08A";
            textColor = "713F12";
          } else if (!isOcupado) {
            bgColor = "FECACA";
            textColor = "7F1D1D";
          }

          const status = isOcupado ? (quadroDivergente || corpoDivergente ? "FORA NEO" : "NA NEO") : "VAGO";

          efetivoRows.push(
            new TableRow({
              children: [
                createCell(item.neo.toString(), false, bgColor, textColor),
                createCell(item.setor || "-", false, bgColor, textColor),
                createCell(item.cargo || "-", false, bgColor, textColor),
                createCell(item.postoTmft || "-", false, bgColor, textColor),
                createCell(item.quadroTmft || "-", false, bgColor, textColor),
                createCell(item.corpoTmft || "-", false, bgColor, textColor),
                createCell(item.nome || "-", false, bgColor, textColor),
                createCell(item.postoEfe || "-", false, bgColor, textColor),
                createCell(item.quadroEfe || "-", false, bgColor, textColor),
                createCell(item.corpoEfe || "-", false, bgColor, textColor),
                createCell(status, false, bgColor, textColor),
              ],
            }),
          );
        }

        omChildren.push(new Table({ rows: efetivoRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        omChildren.push(new Paragraph({ spacing: { after: 300 } }));

        // PREVISÃO DE DESEMBARQUE
        const omDesembarque = desembarqueData.filter(
          (item) => item.om === om && (selectedQuadros.length === 0 || selectedQuadros.includes(item.quadro)),
        );
        if (omDesembarque.length > 0) {
          omChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "PREVISÃO DE DESEMBARQUE", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }),
          );

          const desembarqueRows: TableRow[] = [
            new TableRow({
              children: [
                createCell("NOME", true, "D97706"),
                createCell("POSTO/CORPO/QUADRO", true, "D97706"),
                createCell("CARGO", true, "D97706"),
                createCell("DESTINO", true, "D97706"),
                createCell("MÊS/ANO", true, "D97706"),
                createCell("DOCUMENTO", true, "D97706"),
              ],
            }),
          ];

          for (const d of omDesembarque) {
            desembarqueRows.push(
              new TableRow({
                children: [
                  createCell(d.nome || "-"),
                  createCell(`${d.posto}, ${d.corpo || "-"}, ${d.quadro || "-"}`),
                  createCell(d.cargo || "-"),
                  createCell(d.destino || "-"),
                  createCell(d.mesAno || "-"),
                  createCell(d.documento || "-"),
                ],
              }),
            );
          }

          omChildren.push(new Table({ rows: desembarqueRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        // PREVISÃO DE TRRM
        const omTrrm = trrmData.filter((item) => item.om === om);
        if (omTrrm.length > 0) {
          omChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "PREVISÃO DE TRRM", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }),
          );

          const trrmRows: TableRow[] = [
            new TableRow({
              children: [
                createCell("NOME", true, "9333EA"),
                createCell("POSTO/CORPO/QUADRO", true, "9333EA"),
                createCell("OPÇÃO", true, "9333EA"),
                createCell("CARGO", true, "9333EA"),
                createCell("ÉPOCA PREVISTA", true, "9333EA"),
              ],
            }),
          ];

          for (const t of omTrrm) {
            trrmRows.push(
              new TableRow({
                children: [
                  createCell(t.nome || "-"),
                  createCell(`${t.posto}, ${t.corpo || "-"}, ${t.quadro || "-"}`),
                  createCell(t.opcao || "-"),
                  createCell(t.cargo || "-"),
                  createCell(t.epocaPrevista || "-"),
                ],
              }),
            );
          }

          omChildren.push(new Table({ rows: trrmRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        // LICENÇAS
        const omLicencas = licencasData.filter((item) => item.om === om);
        if (omLicencas.length > 0) {
          omChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "LICENÇAS", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }),
          );

          const licencasRows: TableRow[] = [
            new TableRow({
              children: [
                createCell("NOME", true, "EA580C"),
                createCell("POSTO/CORPO/QUADRO", true, "EA580C"),
                createCell("CARGO", true, "EA580C"),
                createCell("PERÍODO", true, "EA580C"),
              ],
            }),
          ];

          for (const l of omLicencas) {
            licencasRows.push(
              new TableRow({
                children: [
                  createCell(l.nome || "-"),
                  createCell(`${l.posto}, ${l.corpo || "-"}, ${l.quadro || "-"}`),
                  createCell(l.cargo || "-"),
                  createCell(l.periodo || "-"),
                ],
              }),
            );
          }

          omChildren.push(new Table({ rows: licencasRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        // DESTAQUES
        const omDestaques = destaquesData.filter((item) => item.om === om);
        if (omDestaques.length > 0) {
          omChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "DESTAQUES", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }),
          );

          const destaquesRows: TableRow[] = [
            new TableRow({
              children: [
                createCell("NOME", true, "CA8A04"),
                createCell("POSTO/CORPO/QUADRO", true, "CA8A04"),
                createCell("CARGO", true, "CA8A04"),
                createCell("EM OUTRA OM", true, "CA8A04"),
                createCell("DE OUTRA OM", true, "CA8A04"),
                createCell("PERÍODO", true, "CA8A04"),
              ],
            }),
          ];

          for (const d of omDestaques) {
            destaquesRows.push(
              new TableRow({
                children: [
                  createCell(d.nome || "-"),
                  createCell(`${d.posto}, ${d.corpo || "-"}, ${d.quadro || "-"}`),
                  createCell(d.cargo || "-"),
                  createCell(d.emOutraOm || "-"),
                  createCell(d.deOutraOm || "-"),
                  createCell(d.periodo || "-"),
                ],
              }),
            );
          }

          omChildren.push(new Table({ rows: destaquesRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          omChildren.push(new Paragraph({ spacing: { after: 300 } }));
        }

        // CONCURSO C-EMOS
        const omConcurso = concursoData.filter((item) => item.om === om);
        if (omConcurso.length > 0) {
          omChildren.push(
            new Paragraph({
              children: [new TextRun({ text: "CONCURSO C-EMOS", bold: true, size: 22 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }),
          );

          const concursoRows: TableRow[] = [
            new TableRow({
              children: [
                createCell("NOME", true, "059669"),
                createCell("POSTO/CORPO/QUADRO", true, "059669"),
                createCell("CARGO", true, "059669"),
                createCell("ANO PREVISTO", true, "059669"),
              ],
            }),
          ];

          for (const c of omConcurso) {
            concursoRows.push(
              new TableRow({
                children: [
                  createCell(c.nome || "-"),
                  createCell(`${c.posto}, ${c.corpo || "-"}, ${c.quadro || "-"}`),
                  createCell(c.cargo || "-"),
                  createCell(c.anoPrevisto || "-"),
                ],
              }),
            );
          }

          omChildren.push(new Table({ rows: concursoRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
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
      link.download = "tabela-mestra-forca-trabalho.docx";
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

      // Sheet 1: Resumo Geral por OM
      const resumoData: any[][] = [
        ["RESUMO"],
        [],
        ["OM", "TMFT", "EFETIVO", "FALTAS", "NA NEO", "FORA DA NEO", "ATENDIMENTO (%)"],
      ];

      let totalTmft = 0;
      let totalEfetivo = 0;
      let totalVagos = 0;
      let totalNaNeo = 0;
      let totalForaNeo = 0;

      for (const om of activeOMs) {
        const omData = filteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        const omRegularData = omData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
        const omTmft = omRegularData.length;
        const omRegularOcupados = omRegularData.filter((item) => item.ocupado);
        const omEfetivoTotal = omRegularOcupados.length;
        const omVagos = omTmft - omEfetivoTotal;

        const omForaNeoCount = omRegularOcupados.filter((item) => {
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          return quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe;
        }).length;
        const omNaNeoCount = omEfetivoTotal - omForaNeoCount;
        const atendimento = omTmft > 0 ? ((omEfetivoTotal / omTmft) * 100).toFixed(1) : "0";

        totalTmft += omTmft;
        totalEfetivo += omEfetivoTotal;
        totalVagos += omVagos;
        totalNaNeo += omNaNeoCount;
        totalForaNeo += omForaNeoCount;

        resumoData.push([om, omTmft, omEfetivoTotal, omVagos, omNaNeoCount, omForaNeoCount, parseFloat(atendimento)]);
      }

      // Add total row
      const totalAtendimento = totalTmft > 0 ? ((totalEfetivo / totalTmft) * 100).toFixed(1) : "0";
      resumoData.push([
        "TOTAL GERAL",
        totalTmft,
        totalEfetivo,
        totalVagos,
        totalNaNeo,
        totalForaNeo,
        parseFloat(totalAtendimento),
      ]);

      const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, resumoSheet, "Resumo");

      // Sheet 2: Dados Completos do Efetivo
      const efetivoHeaders = [
        "OM",
        "NEO",
        "TIPO SETOR",
        "SETOR",
        "CARGO",
        "POSTO TMFT",
        "CORPO TMFT",
        "QUADRO TMFT",
        "OPÇÃO TMFT",
        "NOME",
        "POSTO EFE",
        "CORPO EFE",
        "QUADRO EFE",
        "OPÇÃO EFE",
        "OCUPADO",
        "STATUS",
      ];

      const efetivoData: any[][] = [efetivoHeaders];

      for (const item of filteredData) {
        const isOcupado = item.ocupado;
        let status = "VAGO";

        if (isOcupado) {
          const quadroTmft = (item.quadroTmft || "").trim().toUpperCase();
          const quadroEfe = (item.quadroEfe || "").trim().toUpperCase();
          if (quadroTmft && quadroEfe && quadroTmft !== "-" && quadroEfe !== "-" && quadroTmft !== quadroEfe) {
            status = "FORA DA NEO";
          } else {
            status = "NA NEO";
          }
        }

        efetivoData.push([
          item.om,
          item.neo,
          item.tipoSetor,
          item.setor,
          item.cargo,
          item.postoTmft,
          item.corpoTmft,
          item.quadroTmft,
          item.opcaoTmft,
          item.nome || "-",
          item.postoEfe || "-",
          item.corpoEfe || "-",
          item.quadroEfe || "-",
          item.opcaoEfe || "-",
          isOcupado ? "SIM" : "NÃO",
          status,
        ]);
      }

      const efetivoSheet = XLSX.utils.aoa_to_sheet(efetivoData);
      XLSX.utils.book_append_sheet(workbook, efetivoSheet, "Efetivo Completo");

      // Sheet 3: Previsão de Desembarque
      if (desembarqueData.length > 0) {
        const desembarqueHeaders = ["OM", "NOME", "POSTO/CORPO/QUADRO", "CARGO", "DESTINO", "MÊS/ANO", "DOCUMENTO"];
        const desembarqueRows: any[][] = [desembarqueHeaders];

        for (const item of desembarqueData) {
          if (selectedOMs.length > 0 && !selectedOMs.includes(item.om)) continue;
          desembarqueRows.push([
            item.om,
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo || "-",
            item.destino || "-",
            item.mesAno || "-",
            item.documento || "-",
          ]);
        }

        if (desembarqueRows.length > 1) {
          const desembarqueSheet = XLSX.utils.aoa_to_sheet(desembarqueRows);
          XLSX.utils.book_append_sheet(workbook, desembarqueSheet, "Previsão Desembarque");
        }
      }

      // Sheet 4: Previsão de Embarque
      if (embarqueData.length > 0) {
        const embarqueHeaders = ["OM", "NOME", "POSTO/CORPO/QUADRO", "CARGO", "DESTINO", "MÊS/ANO", "DOCUMENTO"];
        const embarqueRows: any[][] = [embarqueHeaders];

        for (const item of embarqueData) {
          if (selectedOMs.length > 0 && !selectedOMs.includes(item.om)) continue;
          embarqueRows.push([
            item.om,
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo || "-",
            item.destino || "-",
            item.mesAno || "-",
            item.documento || "-",
          ]);
        }

        if (embarqueRows.length > 1) {
          const embarqueSheet = XLSX.utils.aoa_to_sheet(embarqueRows);
          XLSX.utils.book_append_sheet(workbook, embarqueSheet, "Previsão Embarque");
        }
      }

      // Sheet 5: TRRM
      if (trrmData.length > 0) {
        const trrmHeaders = ["OM", "NOME", "POSTO/CORPO/QUADRO", "CARGO", "ÉPOCA PREVISTA"];
        const trrmRows: any[][] = [trrmHeaders];

        for (const item of trrmData) {
          if (selectedOMs.length > 0 && !selectedOMs.includes(item.om)) continue;
          trrmRows.push([
            item.om,
            item.nome,
            `${item.posto}, ${item.corpo || "-"}, ${item.quadro || "-"}`,
            item.cargo || "-",
            item.epocaPrevista || "-",
          ]);
        }

        if (trrmRows.length > 1) {
          const trrmSheet = XLSX.utils.aoa_to_sheet(trrmRows);
          XLSX.utils.book_append_sheet(workbook, trrmSheet, "TRRM");
        }
      }

      // Generate filename with date
      const today = new Date().toISOString().split("T")[0];
      const filename = `tabela-mestra-oficiais-${today}.xlsx`;

      XLSX.writeFile(workbook, filename);
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
        <div className="text-white text-xl">Carregando dados...</div>
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
                <h1 className="text-3xl font-bold">Dashboard OFICIAIS</h1>
                {isOnline ? (
                  <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                    <Wifi className="h-3 w-3" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-600">
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </Badge>
                )}
                {isUsingCache && (
                  <Badge variant="secondary" className="text-xs">
                    Dados do cache
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Centro de Operações do Abastecimento</p>
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
                  selectedPostoFilter.length > 0 ||
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
                  Exportar PDF
                </Button>
                <Button onClick={exportToWord} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Word
                </Button>
                <Button onClick={exportToExcel} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisa rápida por nome, cargo, setor, posto ou quadro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              {/* Posto Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Posto</h4>
                  {selectedPostoFilter.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedPostoFilter.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 border rounded-lg bg-muted/30">
                  {availablePostos.map((posto) => (
                    <div key={posto} className="flex items-center space-x-2">
                      <Checkbox
                        id={`posto-${posto}`}
                        checked={selectedPostoFilter.includes(posto)}
                        onCheckedChange={() => togglePosto(posto)}
                      />
                      <label htmlFor={`posto-${posto}`} className="text-xs cursor-pointer">
                        {posto}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Corpo Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Corpo</h4>
                  {selectedCorpos.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCorpos.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1 p-2 border rounded-lg bg-muted/30">
                  {availableCorpos.map((corpo) => (
                    <div key={corpo} className="flex items-center space-x-2">
                      <Checkbox
                        id={`corpo-${corpo}`}
                        checked={selectedCorpos.includes(corpo)}
                        onCheckedChange={() => toggleCorpo(corpo)}
                      />
                      <label htmlFor={`corpo-${corpo}`} className="text-xs cursor-pointer">
                        {corpo}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quadro Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Quadro</h4>
                  {selectedQuadros.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedQuadros.length} selecionado(s)
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 border rounded-lg bg-muted/30">
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
            onClick={() => handleStatusCardClick("ocupados")}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">EFETIVO</p>
                  <p className="text-4xl font-bold text-green-900 dark:text-green-100">{metrics.totalEXI}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">Cargos ocupados</p>
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
        </div>

        {/* Sub-cards for EFETIVO drill-down: NA NEO and FORA DA NEO */}
        {(statusFilter === "ocupados" || statusFilter === "vagos") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statusFilter === "ocupados" && (
              <>
                <Card
                  className={`bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${efetivoSubFilter === "na_neo" ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
                  onClick={handleNaNeoClick}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">NA NEO</p>
                        <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                          {neoMetrics.naNeoCount}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Corpo TMFT = Corpo EFE</p>
                      </div>
                      <UserCheck className="h-7 w-7 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${efetivoSubFilter === "fora_neo" ? "ring-2 ring-orange-500 ring-offset-2" : ""}`}
                  onClick={handleForaNeoClick}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">FORA DA NEO</p>
                        <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                          {neoMetrics.foraNeoCount}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Corpo TMFT ≠ Corpo EFE</p>
                      </div>
                      <UserX className="h-7 w-7 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {statusFilter === "vagos" && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">POSIÇÕES VAGAS</p>
                      <p className="text-3xl font-bold text-red-900 dark:text-red-100">{Math.abs(metrics.totalDIF)}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">Posições sem ocupante na TMFT</p>
                    </div>
                    <UserX className="h-7 w-7 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Vagos por OM */}
        <Card className="border-red-200 bg-gradient-to-br from-red-50/50 to-background">
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
                      <span>Quadro: {item.quadroTmft || "-"}</span>
                      <span>•</span>
                      <span>Opção: {item.opcaoTmft || "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart Distribuição por Posto */}
        <Card ref={chartRef}>
          <CardHeader>
            <CardTitle>Distribuição por Posto</CardTitle>
            <p className="text-sm text-muted-foreground">Clique nas colunas para ver os militares</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataByPosto}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis
                  className="text-xs"
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                  allowDecimals={false}
                />
                <Tooltip />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: value === "TMFT" ? "#3b82f6" : "#10b981" }}>{value}</span>
                  )}
                />
                <Bar dataKey="quantidade" name="TMFT" cursor="pointer" onClick={handlePostoBarClick}>
                  {chartDataByPosto.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={selectedPostos.includes(entry.name) ? "#3b82f6" : "#93c5fd"}
                      stroke={selectedPostos.includes(entry.name) ? "#1d4ed8" : "transparent"}
                      strokeWidth={selectedPostos.includes(entry.name) ? 2 : 0}
                    />
                  ))}
                  <LabelList
                    dataKey="quantidade"
                    position="top"
                    style={{ fontWeight: "bold", fontSize: "12px", fill: "#3b82f6" }}
                  />
                </Bar>
                <Bar dataKey="efe" name="EFE" cursor="pointer" onClick={handlePostoEfeBarClick}>
                  {chartDataByPosto.map((entry, index) => {
                    const isSelected = selectedPostosEfe.includes(entry.name);
                    return (
                      <Cell
                        key={`cell-efe-${index}`}
                        fill={isSelected ? "#10b981" : "#6ee7b7"}
                        stroke={isSelected ? "#047857" : "transparent"}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="efe"
                    position="top"
                    style={{ fontWeight: "bold", fontSize: "12px", fill: "#10b981" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detalhes dos Militares por Posto */}
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
                {personnelForSelectedPostos.map((item, index) => (
                  <OfficerCard key={`posto-${index}`} item={item} index={index} keyPrefix="posto" variant="blue" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalhes dos Militares por Posto EFE */}
        {selectedPostosEfe.length > 0 && personnelForSelectedPostosEfe.length > 0 && (
          <Card className="border-green-300 bg-gradient-to-br from-green-50 to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Users2 className="h-5 w-5" />
                  Efetivo - {selectedPostosEfe.join(", ")}
                  <Badge variant="outline" className="ml-2">
                    {personnelForSelectedPostosEfe.length} pessoa(s)
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPostosEfe([])}>
                  Limpar seleção
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {personnelForSelectedPostosEfe.map((item, index) => (
                  <OfficerCard
                    key={`posto-efe-${index}`}
                    item={item}
                    index={index}
                    keyPrefix="posto-efe"
                    variant="green"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart Distribuição por Corpo (CORPO) */}
        <Card>
          <CardHeader>
            <CardTitle>Corpo</CardTitle>
            <p className="text-sm text-muted-foreground">Clique nas colunas para ver os militares</p>
          </CardHeader>
          <CardContent>
            {chartDataByCorpo.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByCorpo}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Bar dataKey="value" name="Quantidade" cursor="pointer" onClick={handleCorpoBarClick}>
                    {chartDataByCorpo.map((entry, index) => (
                      <Cell
                        key={`cell-corpo-${index}`}
                        fill={selectedCorpos.includes(entry.name) ? "#8b5cf6" : "#c4b5fd"}
                        stroke={selectedCorpos.includes(entry.name) ? "#6d28d9" : "transparent"}
                        strokeWidth={selectedCorpos.includes(entry.name) ? 2 : 0}
                      />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontWeight: "bold", fontSize: "14px" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhum dado de corpo encontrado</div>
            )}
          </CardContent>
        </Card>

        {/* Detalhes dos Militares por Corpo */}
        {selectedCorpos.length > 0 && personnelForSelectedCorpos.length > 0 && (
          <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Users2 className="h-5 w-5" />
                  Militares - {selectedCorpos.join(", ")}
                  <Badge variant="outline" className="ml-2">
                    {personnelForSelectedCorpos.length} pessoa(s)
                  </Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCorpos([])}>
                  Limpar seleção
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {personnelForSelectedCorpos.map((item, index) => (
                  <OfficerCard key={`corpo-${index}`} item={item} index={index} keyPrefix="corpo" variant="purple" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela Mestra com Tabs */}
        <Card>
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-muted/30 flex-wrap h-auto gap-1">
                <TabsTrigger value="efetivo" className="data-[state=active]:bg-background">
                  Tabela de Efetivo
                </TabsTrigger>
                <TabsTrigger value="previsao" className="data-[state=active]:bg-background">
                  Previsão de Desembarque
                </TabsTrigger>
                <TabsTrigger value="embarque" className="data-[state=active]:bg-background">
                  Previsão de Embarque
                </TabsTrigger>
                <TabsTrigger value="trrm" className="data-[state=active]:bg-background">
                  Previsão de TRRM
                </TabsTrigger>
                <TabsTrigger value="licencas" className="data-[state=active]:bg-background">
                  Licenças
                </TabsTrigger>
                <TabsTrigger value="destaques" className="data-[state=active]:bg-background">
                  Destaques
                </TabsTrigger>
                <TabsTrigger value="concurso" className="data-[state=active]:bg-background">
                  Concurso C-EMOS
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-6">Tabela Mestra de Força de Trabalho</h2>

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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item, index) => (
                        <OfficerCard
                          key={item.id}
                          item={item}
                          index={index}
                          keyPrefix={`efetivo-${setor}`}
                          variant="blue"
                        />
                      ))}
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
                            <span className="text-amber-600">Destino: {item.destino || "-"}</span>
                            <span className="text-muted-foreground">{item.mesAno || "-"}</span>
                          </div>
                          {item.documento && <p className="text-xs text-muted-foreground mt-1">{item.documento}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.corpo || "-"}, {item.quadro || "-"}, {item.opcao || "-"}
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
                            <span className="text-green-600">Destino: {item.destino || "-"}</span>
                            <span className="text-muted-foreground">{item.mesAno || "-"}</span>
                          </div>
                          {item.documento && <p className="text-xs text-muted-foreground mt-1">{item.documento}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                            {item.posto}, {item.corpo || "-"}, {item.quadro || "-"}, {item.opcao || "-"}
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
                {trrmData.filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om)).length > 0 ? (
                  trrmData
                    .filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om))
                    .map((item, index) => (
                      <div key={index} className="border-l-4 border-l-purple-500 bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                            <p className="text-sm text-muted-foreground">{item.cargo}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-purple-600">
                                Época Prevista: {item.epocaPrevista || "Não informado"}
                              </span>
                              <Badge variant="secondary">{item.om}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{item.posto}</Badge>
                            <Badge variant="outline">{item.quadro}</Badge>
                            {item.opcao && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                {item.opcao}
                              </Badge>
                            )}
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
                {licencasData.filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om)).length > 0 ? (
                  licencasData
                    .filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om))
                    .map((item, index) => (
                      <div key={index} className="border-l-4 border-l-orange-500 bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                            <p className="text-sm text-muted-foreground">{item.cargo}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-orange-600">Período: {item.periodo || "Não informado"}</span>
                              <Badge variant="secondary">{item.om}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{item.posto}</Badge>
                            <Badge variant="outline">{item.quadro}</Badge>
                            {item.opcao && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                {item.opcao}
                              </Badge>
                            )}
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
                {destaquesData.filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om)).length >
                0 ? (
                  destaquesData
                    .filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om))
                    .map((item, index) => (
                      <div key={index} className="border-l-4 border-l-cyan-500 bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                            <p className="text-sm text-muted-foreground">{item.cargo}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              {item.emOutraOm && <span className="text-cyan-600">Em: {item.emOutraOm}</span>}
                              {item.deOutraOm && <span className="text-cyan-600">De: {item.deOutraOm}</span>}
                              <Badge variant="secondary">{item.om}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{item.posto}</Badge>
                            <Badge variant="outline">{item.quadro}</Badge>
                            {item.opcao && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                {item.opcao}
                              </Badge>
                            )}
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
                {concursoData.filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om)).length > 0 ? (
                  concursoData
                    .filter((item) => selectedOMs.length === 0 || selectedOMs.includes(item.om))
                    .map((item, index) => (
                      <div key={index} className="border-l-4 border-l-emerald-500 bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-base font-bold text-foreground">{item.nome}</h4>
                            <p className="text-sm text-muted-foreground">{item.cargo}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-emerald-600">
                                Ano Previsto: {item.anoPrevisto || "Não informado"}
                              </span>
                              <Badge variant="secondary">{item.om}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{item.posto}</Badge>
                            <Badge variant="outline">{item.quadro}</Badge>
                            {item.opcao && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                {item.opcao}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro de Concurso C-EMOS encontrado.
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

export default DashboardOM;

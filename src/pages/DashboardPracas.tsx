import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getAllowedOMs, getAvailableOMsForUser } from "@/lib/auth";
import { useOfflineCache, useOnlineStatus } from "@/hooks/useOfflineCache";
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
} from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend, Brush } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
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
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedQuadros, setSelectedQuadros] = useState<string[]>([]);
  const [selectedOpcoes, setSelectedOpcoes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("efetivo");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ocupados" | "vagos">("all");
  const [selectedOMsForVagos, setSelectedOMsForVagos] = useState<string[]>([]);
  const [showOnlyExtraLotacao, setShowOnlyExtraLotacao] = useState(false);
  const [selectedPostos, setSelectedPostos] = useState<string[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
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
  }>('pracas_data');

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
      
      setAvailableOMs(getAvailableOMsForUser(oms as string[]));
      setAvailableQuadros((cachedData.quadros || []).filter((q: string) => q && q.trim() !== "" && q !== "-" && q !== "RM2" && q !== "RM-2"));
      setAvailableOpcoes(opcoes as string[]);
      
      const cacheTime = getCacheTimestamp();
      setLastUpdate(cacheTime ? cacheTime.toLocaleString("pt-BR") : "Cache");
      setIsUsingCache(true);
      return true;
    }
    return false;
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

      const { data: result, error } = await supabase.functions.invoke("fetch-pracas-data");

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
        setAvailableQuadros((result.quadros || []).filter((q: string) => q && q.trim() !== "" && q !== "-" && q !== "RM2" && q !== "RM-2"));
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
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    fetchData();

    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [navigate]);

  const filteredData = useMemo(() => {
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

    if (statusFilter === "ocupados") {
      filtered = filtered.filter((item) => item.ocupado);
    } else if (statusFilter === "vagos") {
      filtered = filtered.filter((item) => !item.ocupado);
    }

    if (showOnlyExtraLotacao) {
      filtered = filtered.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO");
    }

    return filtered;
  }, [personnelData, selectedOMs, selectedQuadros, selectedOpcoes, statusFilter, showOnlyExtraLotacao]);

  const toggleOM = (om: string) => {
    setSelectedOMs((prev) => (prev.includes(om) ? prev.filter((o) => o !== om) : [...prev, om]));
  };

  const toggleQuadro = (quadro: string) => {
    setSelectedQuadros((prev) => (prev.includes(quadro) ? prev.filter((q) => q !== quadro) : [...prev, quadro]));
  };

  const toggleOpcao = (opcao: string) => {
    setSelectedOpcoes((prev) => (prev.includes(opcao) ? prev.filter((o) => o !== opcao) : [...prev, opcao]));
  };

  const clearFilters = () => {
    setSelectedOMs([]);
    setSelectedQuadros([]);
    setSelectedOpcoes([]);
    setStatusFilter("all");
    setShowOnlyExtraLotacao(false);
  };

  const handleStatusCardClick = (status: "all" | "ocupados" | "vagos") => {
    setStatusFilter((prev) => (prev === status ? "all" : status));
  };

  const OPCOES_FIXAS = ["CARREIRA", "RM-2", "TTC"];

  const metrics = useMemo(() => {
    const regularData = filteredData.filter((item) => item.tipoSetor !== "EXTRA LOTAÇÃO");
    const totalTMFT = regularData.length;
    const totalEXI = regularData.filter((item) => item.ocupado).length;
    const totalDIF = totalEXI - totalTMFT;
    const percentualPreenchimento = totalTMFT > 0 ? (totalEXI / totalTMFT) * 100 : 0;
    const totalExtraLotacao = filteredData.filter((item) => item.tipoSetor === "EXTRA LOTAÇÃO").length;

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      percentualPreenchimento,
      totalExtraLotacao,
    };
  }, [filteredData]);

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
      filtered = filtered.filter(
        (item) => selectedQuadros.includes(item.quadro) || selectedQuadros.includes(item.especialidade),
      );
    }

    return filtered;
  }, [desembarqueData, selectedOMs, selectedQuadros]);

  const filteredEmbarqueData = useMemo(() => {
    let filtered = embarqueData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(
        (item) => selectedQuadros.includes(item.quadro) || selectedQuadros.includes(item.especialidade),
      );
    }

    return filtered;
  }, [embarqueData, selectedOMs, selectedQuadros]);

  const filteredTrrmData = useMemo(() => {
    let filtered = trrmData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(
        (item) => selectedQuadros.includes(item.quadro) || selectedQuadros.includes(item.especialidade),
      );
    }

    return filtered;
  }, [trrmData, selectedOMs, selectedQuadros]);

  const filteredLicencasData = useMemo(() => {
    let filtered = licencasData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(
        (item) => selectedQuadros.includes(item.quadro) || selectedQuadros.includes(item.especialidade),
      );
    }

    return filtered;
  }, [licencasData, selectedOMs, selectedQuadros]);

  const filteredDestaquesData = useMemo(() => {
    let filtered = destaquesData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(
        (item) => selectedQuadros.includes(item.quadro) || selectedQuadros.includes(item.especialidade),
      );
    }

    return filtered;
  }, [destaquesData, selectedOMs, selectedQuadros]);

  const filteredCursoData = useMemo(() => {
    let filtered = cursoData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter((item) => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(
        (item) => selectedQuadros.includes(item.quadro) || selectedQuadros.includes(item.especialidade),
      );
    }

    return filtered;
  }, [cursoData, selectedOMs, selectedQuadros]);

  const chartDataByPosto = useMemo(() => {
    const POSTO_ORDER = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

    const grouped = filteredData.reduce(
      (acc, item) => {
        // Contar TMFT por posto
        const postoTmft = item.postoTmft;
        if (postoTmft) {
          if (!acc[postoTmft]) {
            acc[postoTmft] = { name: postoTmft, tmft: 0, efe: 0 };
          }
          acc[postoTmft].tmft += 1;
        }

        // Contar EFE apenas se ocupado
        if (item.ocupado && item.postoEfe) {
          const postoEfe = item.postoEfe;
          if (!acc[postoEfe]) {
            acc[postoEfe] = { name: postoEfe, tmft: 0, efe: 0 };
          }
          acc[postoEfe].efe += 1;
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

    return filtered;
  }, [personnelData, selectedOMs, selectedQuadros, selectedOpcoes]);

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

    const vagosData = baseFilteredForVagos.filter(
      (item) => selectedOMsForVagos.includes(item.om) && !item.ocupado
    );

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
      {} as Record<string, { especialidade: string; vagos: number }>
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
      } else {
        // EFE: mostrar apenas os ocupados daquele posto (postoEfe)
        return item.ocupado && selectedPostos.includes(item.postoEfe);
      }
    });
  }, [filteredData, selectedPostos, selectedPostoType]);

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Load brasao image
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

      // Add page numbers
      const addPageNumbers = () => {
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(10);
          pdf.text(`${i} - ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        }
      };

      // Helper to add OM title (without brasão, used on all pages except first)
      const addOMTitle = (omName: string, startY: number) => {
        let y = startY;
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(omName, pageWidth / 2, y, { align: "center" });
        y += 8;
        return y;
      };

      // Get unique OMs from filtered data
      const activeOMs = selectedOMs.length > 0 ? selectedOMs : availableOMs;

      // ====== FIRST PAGE - BRASÃO + GENERAL INFO + CHARTS ======
      let yPosition = 15;

      // Brasao and title (ONLY ON FIRST PAGE)
      pdf.addImage(brasaoImg, "PNG", (pageWidth - 20) / 2, yPosition, 20, 24);
      yPosition += 28;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("CENTRO DE OPERAÇÕES DO ABASTECIMENTO", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;

      pdf.setFontSize(12);
      pdf.text("DASHBOARD PRAÇAS - RELATÓRIO COMPLETO", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      // Filters
      if (selectedOMs.length > 0 || selectedQuadros.length > 0 || selectedOpcoes.length > 0) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        let filterText = "Filtros: ";
        if (selectedOMs.length > 0) filterText += `OM: ${selectedOMs.join(", ")} | `;
        if (selectedQuadros.length > 0) filterText += `Especialidade: ${selectedQuadros.join(", ")} | `;
        if (selectedOpcoes.length > 0) filterText += `Opção: ${selectedOpcoes.join(", ")}`;
        pdf.text(filterText, 14, yPosition);
        yPosition += 8;
      }

      // Metrics summary
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("RESUMO GERAL", 14, yPosition);
      yPosition += 6;
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `TMFT: ${metrics.totalTMFT} | Efetivo: ${metrics.totalEXI} | Vagos: ${Math.abs(metrics.totalDIF)} | Atendimento: ${metrics.percentualPreenchimento.toFixed(1)}% | Extra Lotação: ${metrics.totalExtraLotacao}`,
        14,
        yPosition,
      );
      yPosition += 12;

      // ====== CHARTS SECTION (larger charts - full width) ======
      // Capture Vagas por OM chart
      const vagosChartElement = document.querySelector('[data-chart="vagas-om"]') as HTMLElement;
      if (vagosChartElement) {
        try {
          const canvas = await html2canvas(vagosChartElement, { scale: 2, backgroundColor: "#ffffff" });
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pageWidth - 28; // Full page width minus margins
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          yPosition = checkNewPage(yPosition, imgHeight + 10);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("GRÁFICO - VAGAS POR OM", 14, yPosition);
          yPosition += 4;
          pdf.addImage(imgData, "PNG", 14, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 6;
        } catch (e) {
          console.error("Error capturing vagas chart:", e);
        }
      }

      // Capture Distribuição por Graduação chart
      const graduacaoChartElement = document.querySelector('[data-chart="graduacao"]') as HTMLElement;
      if (graduacaoChartElement) {
        try {
          const canvas = await html2canvas(graduacaoChartElement, { scale: 2, backgroundColor: "#ffffff" });
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pageWidth - 28; // Full page width minus margins
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          yPosition = checkNewPage(yPosition, imgHeight + 10);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text("GRÁFICO - DISTRIBUIÇÃO POR GRADUAÇÃO", 14, yPosition);
          yPosition += 4;
          pdf.addImage(imgData, "PNG", 14, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 6;
        } catch (e) {
          console.error("Error capturing graduacao chart:", e);
        }
      }

      // ====== TABELA DE EFETIVO POR OM (todas OMs na mesma página, 4 linhas entre cada) ======
      let isFirstOM = true;
      for (const om of activeOMs) {
        const omData = filteredData.filter((item) => item.om === om);
        if (omData.length === 0) continue;

        // Estimate table height to check if we need a new page
        const estimatedHeight = 20 + omData.length * 5;

        if (isFirstOM) {
          pdf.addPage();
          yPosition = 15;
          isFirstOM = false;
        } else {
          // Reduced spacing between OMs
          yPosition += 8;
          yPosition = checkNewPage(yPosition, estimatedHeight);
        }

        // OM title
        yPosition = addOMTitle(om, yPosition);

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("TABELA DE EFETIVO", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        // All NEOs in single table, sorted by NEO
        const sortedData = [...omData].sort((a, b) => {
          const neoA = typeof a.neo === "number" ? a.neo : parseFloat(a.neo.toString()) || 0;
          const neoB = typeof b.neo === "number" ? b.neo : parseFloat(b.neo.toString()) || 0;
          return neoA - neoB;
        });

        const tableData = sortedData.map((item) => [
          item.neo.toString(),
          item.setor,
          item.cargo,
          item.postoTmft,
          item.quadroTmft,
          item.nome || "VAGO",
          item.postoEfe || "-",
          item.quadroEfe || "-",
          item.ocupado ? "Ocupado" : "Vago",
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [["NEO", "SETOR", "CARGO", "GRAD TMFT", "ESP TMFT", "NOME", "GRAD EFETIVO", "ESP EFETIVO", "STATUS"]],
          body: tableData,
          theme: "grid",
          styles: { fontSize: 6, cellPadding: 0.5 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          margin: { left: 14, right: 14 },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const nome = data.row.raw?.[5];
              const setor = data.row.raw?.[1];
              const nomeStr = nome ? nome.toString().trim().toUpperCase() : "";
              const setorStr = setor ? setor.toString().trim().toUpperCase() : "";
              
              // Destaque amarelo para EXTRA LOTAÇÃO
              if (setorStr.includes("EXTRA LOTA") || setorStr === "EXTRA LOTAÇÃO") {
                data.cell.styles.fillColor = [254, 240, 138];
                data.cell.styles.textColor = [113, 63, 18];
              }
              // Destaque vermelho para NOME vazio/vago
              else if (!nome || nome === "VAGO" || nome === "-" || nomeStr === "" || nomeStr === "VAZIO") {
                data.cell.styles.fillColor = [254, 202, 202];
                data.cell.styles.textColor = [127, 29, 29];
              }
            }
          },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 4;
      }

      // ====== PREVISÃO DE DESEMBARQUE (consolidated - all OMs sequentially) ======
      const filteredDesembarque = desembarqueData.filter(
        (item) =>
          activeOMs.includes(item.om) && (selectedQuadros.length === 0 || selectedQuadros.includes(item.quadro)),
      );
      if (filteredDesembarque.length > 0) {
        yPosition += 8;
        yPosition = checkNewPage(yPosition, 30);
        
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("PREVISÃO DE DESEMBARQUE", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        for (const om of activeOMs) {
          const omDesembarque = filteredDesembarque.filter((item) => item.om === om);
          if (omDesembarque.length === 0) continue;

          const estimatedHeight = 15 + omDesembarque.length * 4;
          yPosition = checkNewPage(yPosition, estimatedHeight);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(om, 14, yPosition);
          yPosition += 4;

          const tableData = omDesembarque.map((item) => [
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
            body: tableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [217, 119, 6], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 4;
        }
      }

      // ====== PREVISÃO DE TRRM (consolidated) ======
      const filteredTrrm = trrmData.filter((item) => activeOMs.includes(item.om));
      if (filteredTrrm.length > 0) {
        yPosition += 8;
        yPosition = checkNewPage(yPosition, 30);
        
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("PREVISÃO DE TRRM", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        for (const om of activeOMs) {
          const omTrrm = filteredTrrm.filter((item) => item.om === om);
          if (omTrrm.length === 0) continue;

          const estimatedHeight = 15 + omTrrm.length * 4;
          yPosition = checkNewPage(yPosition, estimatedHeight);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(om, 14, yPosition);
          yPosition += 4;

          const tableData = omTrrm.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo,
            item.epocaPrevista || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "ÉPOCA PREVISTA"]],
            body: tableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [147, 51, 234], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 4;
        }
      }

      // ====== LICENÇAS (consolidated) ======
      const filteredLicencas = licencasData.filter((item) => activeOMs.includes(item.om));
      if (filteredLicencas.length > 0) {
        yPosition += 8;
        yPosition = checkNewPage(yPosition, 30);
        
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("LICENÇAS", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        for (const om of activeOMs) {
          const omLicencas = filteredLicencas.filter((item) => item.om === om);
          if (omLicencas.length === 0) continue;

          const estimatedHeight = 15 + omLicencas.length * 4;
          yPosition = checkNewPage(yPosition, estimatedHeight);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(om, 14, yPosition);
          yPosition += 4;

          const tableData = omLicencas.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo,
            item.periodo || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "MOTIVO"]],
            body: tableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [234, 88, 12], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 4;
        }
      }

      // ====== DESTAQUES (consolidated) ======
      const filteredDestaques = destaquesData.filter((item) => activeOMs.includes(item.om));
      if (filteredDestaques.length > 0) {
        yPosition += 8;
        yPosition = checkNewPage(yPosition, 30);
        
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("DESTAQUES", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        for (const om of activeOMs) {
          const omDestaques = filteredDestaques.filter((item) => item.om === om);
          if (omDestaques.length === 0) continue;

          const estimatedHeight = 15 + omDestaques.length * 4;
          yPosition = checkNewPage(yPosition, estimatedHeight);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(om, 14, yPosition);
          yPosition += 4;

          const tableData = omDestaques.map((item) => [
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
            body: tableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [202, 138, 4], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 4;
        }
      }

      // ====== PREVISÃO DE CURSO (consolidated) ======
      const filteredCurso = cursoData.filter((item) => activeOMs.includes(item.om));
      if (filteredCurso.length > 0) {
        yPosition += 8;
        yPosition = checkNewPage(yPosition, 30);
        
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text("PREVISÃO DE CURSO", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;

        for (const om of activeOMs) {
          const omCurso = filteredCurso.filter((item) => item.om === om);
          if (omCurso.length === 0) continue;

          const estimatedHeight = 15 + omCurso.length * 4;
          yPosition = checkNewPage(yPosition, estimatedHeight);
          
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text(om, 14, yPosition);
          yPosition += 4;

          const tableData = omCurso.map((item) => [
            item.nome,
            `${item.posto}, ${item.quadro || "-"}, ${item.especialidade || "-"}`,
            item.cargo || "-",
            item.anoPrevisto || "-",
          ]);

          autoTable(pdf, {
            startY: yPosition,
            head: [["NOME", "GRAD/ESP", "CARGO", "ANO PREVISTO"]],
            body: tableData,
            theme: "grid",
            styles: { fontSize: 6, cellPadding: 0.5 },
            headStyles: { fillColor: [5, 150, 105], textColor: 255 },
            margin: { left: 14, right: 14 },
          });
          yPosition = (pdf as any).lastAutoTable.finalY + 4;
        }
      }

      // Add page numbers to all pages
      addPageNumbers();

      pdf.save("dashboard-pracas-completo.pdf");
      toast.success("PDF completo gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    navigate("/login");
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
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard PRAÇAS </h1>
            <div className="flex items-center gap-3">
              <p className="text-muted-foreground">Centro de Operações do Abastecimento - Praças</p>
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
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate("/")} variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Início
            </Button>
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
                {(selectedOMs.length > 0 || selectedQuadros.length > 0 || selectedOpcoes.length > 0) && (
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Especialidade Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Especialidade</h4>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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

          <Card className={`bg-gradient-to-br ${
            metrics.percentualPreenchimento >= 90 
              ? "from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200" 
              : metrics.percentualPreenchimento >= 70 
                ? "from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200"
                : "from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200"
          }`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-sm font-medium mb-1 ${
                    metrics.percentualPreenchimento >= 90 
                      ? "text-green-700 dark:text-green-300" 
                      : metrics.percentualPreenchimento >= 70 
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-red-700 dark:text-red-300"
                  }`}>ATENDIMENTO</p>
                  <p className={`text-4xl font-bold ${
                    metrics.percentualPreenchimento >= 90 
                      ? "text-green-900 dark:text-green-100" 
                      : metrics.percentualPreenchimento >= 70 
                        ? "text-amber-900 dark:text-amber-100"
                        : "text-red-900 dark:text-red-100"
                  }`}>
                    {metrics.percentualPreenchimento.toFixed(0)}%
                  </p>
                  <p className={`text-xs mt-1 ${
                    metrics.percentualPreenchimento >= 90 
                      ? "text-green-600 dark:text-green-400" 
                      : metrics.percentualPreenchimento >= 70 
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  }`}>
                    Situação: {metrics.totalDIF < 0 ? metrics.totalDIF : `+${metrics.totalDIF}`}
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${
                  metrics.percentualPreenchimento >= 90 
                    ? "text-green-500" 
                    : metrics.percentualPreenchimento >= 70 
                      ? "text-amber-500"
                      : "text-red-500"
                }`} />
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

        {/* Vagos por OM */}
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
                  <XAxis type="number" className="text-xs" domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]} />
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
                    <LabelList dataKey="vagos" position="right" style={{ fontWeight: "bold", fontSize: "12px", fill: "#c2410c" }} />
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
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
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
                    formatter={(value: number) => value > 0 ? value : ""}
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
                    formatter={(value: number) => value > 0 ? value : ""}
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
                {personnelForSelectedPostos.map((item, index) => (
                  <div
                    key={`posto-${index}`}
                    className={`p-3 border rounded-lg ${
                      item.tipoSetor === "EXTRA LOTAÇÃO"
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
                        const neoText = neoRaw.toUpperCase().startsWith("NEO")
                          ? neoRaw
                          : `NEO ${neoRaw}`;

                        return (
                          <Badge variant="outline" className="bg-blue-500 text-white border-blue-500 text-xs">
                            {neoText}
                          </Badge>
                        );
                      })()}
                      <Badge variant="outline" className="text-xs">
                        {item.postoEfe || item.postoTmft}
                      </Badge>
                      {(item.quadroEfe || item.quadroTmft) && (
                        <Badge variant="outline" className="text-xs">
                          {item.quadroEfe || item.quadroTmft}
                        </Badge>
                      )}
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
                    <p className="font-semibold text-sm text-foreground uppercase">{item.nome || "VAGO"}</p>
                    <p className="text-xs text-muted-foreground">{item.cargo}</p>
                    <p className="text-xs text-muted-foreground">{item.setor}</p>
                  </div>
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
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="border-l-4 border-l-blue-500 bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-bold text-foreground">
                                {item.nome || `NEO ${item.neo} - VAZIO`}
                              </h4>
                              <p className="text-sm text-muted-foreground">{item.cargo}</p>
                              <p className="text-xs text-blue-600 mt-1">
                                NEO: {item.neo} - {item.cargo}
                              </p>
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
                                <Badge variant="outline" className="bg-background">
                                  {item.ocupado ? item.quadroEfe : item.quadroTmft}
                                </Badge>
                                <Badge variant="outline" className="bg-green-100 border-green-300">
                                  {item.ocupado ? item.opcaoEfe : item.opcaoTmft}
                                </Badge>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300">
                                  {item.om}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
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
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma previsão de embarque encontrada.
                  </div>
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

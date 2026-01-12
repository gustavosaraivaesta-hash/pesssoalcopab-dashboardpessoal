import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserX, RefreshCw, LogOut, Wifi, WifiOff, Calendar, Award, FileDown, X, ChevronDown, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TTCData, TTCSummary } from "@/types/ttc";
import militaryBg from "@/assets/military-background.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOfflineCache";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { differenceInYears, differenceInMonths, differenceInDays, parse, isValid, addYears, addMonths, isBefore, isAfter } from "date-fns";

// Calculates current age from birth date string with years, months, and days
const calcularIdadeAtual = (idadeOuData: string): string => {
  if (!idadeOuData) return "-";
  
  let birthDate: Date | null = null;
  
  // Handle Google Sheets Date format: Date(year, month, day) - month is 0-indexed
  const googleDateMatch = idadeOuData.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (googleDateMatch) {
    const year = parseInt(googleDateMatch[1]);
    const month = parseInt(googleDateMatch[2]); // 0-indexed in Google Sheets
    const day = parseInt(googleDateMatch[3]);
    birthDate = new Date(year, month, day);
  }
  
  // Try to parse as date (DD/MM/YYYY)
  if (!birthDate || !isValid(birthDate)) {
    birthDate = parse(idadeOuData, "dd/MM/yyyy", new Date());
  }
  
  // Try alternate format if first fails
  if (!isValid(birthDate)) {
    birthDate = parse(idadeOuData, "MM/dd/yyyy", new Date());
  }
  
  if (birthDate && isValid(birthDate)) {
    const today = new Date();
    const anos = differenceInYears(today, birthDate);
    const afterYears = addYears(birthDate, anos);
    const meses = differenceInMonths(today, afterYears);
    const afterMonths = addMonths(afterYears, meses);
    const dias = differenceInDays(today, afterMonths);
    
    return `${anos}a ${meses}m ${dias}d`;
  }
  
  // If it's already a number (age), return as is
  const numericAge = parseInt(idadeOuData);
  if (!isNaN(numericAge) && idadeOuData.length <= 3) {
    return `${numericAge} anos`;
  }
  
  return idadeOuData;
};

// Parse date from various formats
const parseDataFlexivel = (dataStr: string): Date | null => {
  if (!dataStr) return null;
  
  // Handle Google Sheets Date format: Date(year, month, day)
  const googleDateMatch = dataStr.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (googleDateMatch) {
    const year = parseInt(googleDateMatch[1]);
    const month = parseInt(googleDateMatch[2]);
    const day = parseInt(googleDateMatch[3]);
    return new Date(year, month, day);
  }
  
  // Try DD/MM/YYYY format
  let parsed = parse(dataStr, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) return parsed;
  
  // Try MM/DD/YYYY format
  parsed = parse(dataStr, "MM/dd/yyyy", new Date());
  if (isValid(parsed)) return parsed;
  
  return null;
};

// Calculate remaining time until termino date
const calcularTempoRestante = (terminoStr: string): { texto: string; status: 'normal' | 'warning' | 'danger' | 'expired' } => {
  if (!terminoStr) return { texto: "-", status: 'normal' };
  
  const termino = parseDataFlexivel(terminoStr);
  if (!termino) return { texto: "-", status: 'normal' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If already expired
  if (isBefore(termino, today)) {
    const totalMesesPassados = differenceInMonths(today, termino);
    const anosPassados = Math.floor(totalMesesPassados / 12);
    const mesesPassados = totalMesesPassados % 12;
    const afterMonths = addMonths(termino, totalMesesPassados);
    const diasPassados = differenceInDays(today, afterMonths);
    
    const partes = [];
    if (anosPassados > 0) partes.push(`${anosPassados}a`);
    if (mesesPassados > 0) partes.push(`${mesesPassados}m`);
    if (diasPassados > 0 || partes.length === 0) partes.push(`${diasPassados}d`);
    
    return { 
      texto: `Vencido há ${partes.join(' ')}`, 
      status: 'expired' 
    };
  }
  
  // Calculate remaining time
  const totalMeses = differenceInMonths(termino, today);
  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  const afterMonths = addMonths(today, totalMeses);
  const dias = differenceInDays(termino, afterMonths);
  
  // Determine status based on remaining time
  let status: 'normal' | 'warning' | 'danger' | 'expired' = 'normal';
  if (totalMeses < 1) {
    status = 'danger';
  } else if (totalMeses < 3) {
    status = 'warning';
  }
  
  const partes = [];
  if (anos > 0) partes.push(`${anos}a`);
  if (meses > 0) partes.push(`${meses}m`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias}d`);
  
  return { 
    texto: partes.join(' '), 
    status 
  };
};

const DashboardTTC = () => {
  const navigate = useNavigate();
  const [ttcData, setTtcData] = useState<TTCData[]>([]);
  const [summary, setSummary] = useState<TTCSummary>({ total: 0, contratados: 0, vagasAbertas: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOM, setFilterOM] = useState<string[]>([]);
  const [filterArea, setFilterArea] = useState<string[]>([]);
  const [filterGraduacao, setFilterGraduacao] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterEspQuadro, setFilterEspQuadro] = useState<string[]>([]);
  const [filterRenovacoes, setFilterRenovacoes] = useState<string[]>([]);
  const [filterCategoria, setFilterCategoria] = useState<string[]>([]);
  
  // Lista de graduações de oficiais
  const graduacoesOficiais = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM", "ASP"];
  
  const isOficial = (graduacao: string): boolean => {
    return graduacoesOficiais.includes(graduacao?.toUpperCase());
  };
  
  const isOnline = useOnlineStatus();

  const fetchData = async (showToast = false) => {
    if (showToast) setIsRefreshing(true);
    
    try {
      console.log("Fetching TTC data...");
      
      const response = await supabase.functions.invoke("fetch-ttc-data");
      
      if (response.error) {
        console.error("Error fetching TTC data:", response.error);
        toast.error("Erro ao carregar dados TTC");
        return;
      }
      
      const data = response.data?.data || [];
      const summaryData = response.data?.summary || { total: 0, contratados: 0, vagasAbertas: 0 };
      
      console.log(`Loaded ${data.length} TTC records`);
      
      setTtcData(data);
      setSummary(summaryData);
      
      if (showToast) {
        toast.success(`Dados TTC atualizados! ${data.length} registros.`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao conectar com o servidor");
    }
    
    setIsLoading(false);
    if (showToast) setIsRefreshing(false);
  };

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    fetchData();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => {
      console.log("Auto-refreshing TTC data...");
      fetchData();
    }, 120000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    // Header
    doc.setFontSize(18);
    doc.text("Dashboard TTC - Tempo de Trabalho Complementar", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Data de exportação: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 30);
    doc.text(`Total: ${filteredSummary.total} | Contratados: ${filteredSummary.contratados} | Vagas Abertas: ${filteredSummary.vagasAbertas}`, 14, 36);
    
    // Group data by OM
    const groupedByOM: { [key: string]: typeof filteredData } = {};
    filteredData.forEach(item => {
      const om = item.om || "Sem OM";
      if (!groupedByOM[om]) {
        groupedByOM[om] = [];
      }
      groupedByOM[om].push(item);
    });
    
    // Sort OMs alphabetically
    const sortedOMs = Object.keys(groupedByOM).sort();
    
    let currentY = 42;
    
    sortedOMs.forEach((om, omIndex) => {
      const omData = groupedByOM[om];
      
      // Check if we need a new page
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
      }
      
      // OM Section Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`${om}`, 14, currentY);
      
      // OM Summary
      const omContratados = omData.filter(d => !d.isVaga).length;
      const omVagas = omData.filter(d => d.isVaga).length;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Total: ${omData.length} | Contratados: ${omContratados} | Vagas: ${omVagas}`, 14, currentY + 5);
      doc.setTextColor(0, 0, 0);
      
      currentY += 8;
      
      // Table data for this OM
      const tableData = omData.map(item => [
        item.graduacao,
        item.nomeCompleto || "VAGO",
        item.espQuadro,
        item.area,
        item.tarefaDesignada,
        item.qtdRenovacoes.toString(),
        calcularTempoRestante(item.termino).texto,
        item.isVaga ? "VAGO" : "CONTRATADO"
      ]);
      
      // Track which rows are "VAGO" for styling
      const vagaRowIndexes = omData.map((item, index) => item.isVaga ? index : -1).filter(i => i !== -1);
      
      autoTable(doc, {
        head: [["Grad", "Nome Completo", "Esp/Quadro", "Área", "Tarefa", "Renov.", "Tempo Rest.", "Status"]],
        body: tableData,
        startY: currentY,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        didParseCell: (data) => {
          // Highlight VAGO rows in red
          if (data.section === 'body' && vagaRowIndexes.includes(data.row.index)) {
            data.cell.styles.fillColor = [254, 202, 202]; // Light red background
            data.cell.styles.textColor = [153, 27, 27]; // Dark red text
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      
      // Get the final Y position after the table
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
    
    doc.save(`dashboard-ttc-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  // Filter options
  const filterOptions = useMemo(() => {
    const oms = Array.from(new Set(ttcData.map(d => d.om).filter(Boolean))).sort();
    const areas = Array.from(new Set(ttcData.map(d => d.area).filter(Boolean))).sort();
    const graduacoes = Array.from(new Set(ttcData.map(d => d.graduacao).filter(Boolean))).sort();
    const espQuadros = Array.from(new Set(ttcData.map(d => d.espQuadro).filter(Boolean))).sort();
    const renovacoes = Array.from(new Set(ttcData.filter(d => !d.isVaga).map(d => d.qtdRenovacoes))).sort((a, b) => a - b);
    return { oms, areas, graduacoes, espQuadros, renovacoes };
  }, [ttcData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = ttcData;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(d => 
        d.nomeCompleto.toLowerCase().includes(term) ||
        d.tarefaDesignada.toLowerCase().includes(term) ||
        d.neo.toLowerCase().includes(term) ||
        d.espQuadro.toLowerCase().includes(term)
      );
    }
    
    if (filterOM.length > 0) {
      data = data.filter(d => filterOM.includes(d.om));
    }
    
    if (filterArea.length > 0) {
      data = data.filter(d => filterArea.includes(d.area));
    }
    
    if (filterGraduacao.length > 0) {
      data = data.filter(d => filterGraduacao.includes(d.graduacao));
    }
    
    if (filterStatus.length > 0) {
      data = data.filter(d => {
        if (filterStatus.includes("contratado") && !d.isVaga) return true;
        if (filterStatus.includes("vaga") && d.isVaga) return true;
        return false;
      });
    }
    
    if (filterEspQuadro.length > 0) {
      data = data.filter(d => filterEspQuadro.includes(d.espQuadro));
    }
    
    if (filterRenovacoes.length > 0) {
      data = data.filter(d => filterRenovacoes.includes(String(d.qtdRenovacoes)));
    }
    
    if (filterCategoria.length > 0) {
      data = data.filter(d => {
        if (filterCategoria.includes("oficial") && isOficial(d.graduacao)) return true;
        if (filterCategoria.includes("praca") && !isOficial(d.graduacao)) return true;
        return false;
      });
    }
    
    return data;
  }, [ttcData, searchTerm, filterOM, filterArea, filterGraduacao, filterStatus, filterEspQuadro, filterRenovacoes, filterCategoria]);

  // Filtered summary
  const filteredSummary = useMemo(() => {
    const total = filteredData.length;
    const contratados = filteredData.filter(d => !d.isVaga).length;
    const vagasAbertas = filteredData.filter(d => d.isVaga).length;
    return { total, contratados, vagasAbertas };
  }, [filteredData]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterOM([]);
    setFilterArea([]);
    setFilterGraduacao([]);
    setFilterStatus([]);
    setFilterEspQuadro([]);
    setFilterRenovacoes([]);
    setFilterCategoria([]);
  };

  const hasActiveFilters = searchTerm || filterOM.length > 0 || filterArea.length > 0 || filterGraduacao.length > 0 || 
    filterStatus.length > 0 || filterEspQuadro.length > 0 || filterRenovacoes.length > 0 || filterCategoria.length > 0;

  // Toggle filter value helper
  const toggleFilter = (
    currentValues: string[], 
    setValue: React.Dispatch<React.SetStateAction<string[]>>, 
    value: string
  ) => {
    if (currentValues.includes(value)) {
      setValue(currentValues.filter(v => v !== value));
    } else {
      setValue([...currentValues, value]);
    }
  };

  // Multi-select filter component
  const MultiSelectFilter = ({ 
    label, 
    options, 
    selectedValues, 
    onToggle 
  }: { 
    label: string; 
    options: { value: string; label: string }[]; 
    selectedValues: string[]; 
    onToggle: (value: string) => void;
  }) => (
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-2 block">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="truncate">
              {selectedValues.length === 0 
                ? `Todos` 
                : selectedValues.length === 1 
                  ? options.find(o => o.value === selectedValues[0])?.label || selectedValues[0]
                  : `${selectedValues.length} selecionados`}
            </span>
            <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0 bg-popover" align="start">
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {options.map(option => (
                <div 
                  key={option.value} 
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                  onClick={() => onToggle(option.value)}
                >
                  <Checkbox 
                    checked={selectedValues.includes(option.value)} 
                    onCheckedChange={() => onToggle(option.value)}
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );

  // Chart data - using FILTERED data (blue colors)
  const statusChartData = useMemo(() => [
    { name: "Contratados", value: filteredSummary.contratados, fill: "#3b82f6" },
    { name: "Vagas Abertas", value: filteredSummary.vagasAbertas, fill: "#93c5fd" },
  ], [filteredSummary]);

  const areaChartData = useMemo(() => {
    const byArea = new Map<string, { contratados: number; vagas: number }>();
    
    filteredData.forEach(d => {
      const area = d.area || "Sem Área";
      if (!byArea.has(area)) {
        byArea.set(area, { contratados: 0, vagas: 0 });
      }
      const entry = byArea.get(area)!;
      if (d.isVaga) {
        entry.vagas++;
      } else {
        entry.contratados++;
      }
    });
    
    return Array.from(byArea.entries()).map(([area, data]) => ({
      area,
      contratados: data.contratados,
      vagas: data.vagas,
    }));
  }, [filteredData]);

  const renovacoesChartData = useMemo(() => {
    const byRenovacoes = new Map<number, number>();
    
    filteredData.filter(d => !d.isVaga).forEach(d => {
      const renovacoes = d.qtdRenovacoes;
      byRenovacoes.set(renovacoes, (byRenovacoes.get(renovacoes) || 0) + 1);
    });
    
    return Array.from(byRenovacoes.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([renovacoes, count]) => ({
        renovacoes: `${renovacoes}x`,
        quantidade: count,
      }));
  }, [filteredData]);

  const chartConfig = {
    contratados: { label: "Contratados", color: "#3b82f6" },
    vagas: { label: "Vagas", color: "#93c5fd" },
    quantidade: { label: "Quantidade", color: "#2563eb" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${militaryBg})`, backgroundSize: "cover" }}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Carregando dados TTC...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${militaryBg})` }}
    >
      <div className="min-h-screen bg-background/95 backdrop-blur-sm">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Dashboard TTC</h1>
                  <p className="text-sm text-muted-foreground">Praças em Tempo de Trabalho Complementar</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant={isOnline ? "default" : "secondary"} className="flex items-center gap-1">
                  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isOnline ? "Online" : "Offline"}
                </Badge>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchData(true)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                
                <Button variant="destructive" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vagas</CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{filteredSummary.total}</div>
                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground mt-1">de {summary.total} total</p>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contratados</CardTitle>
                <UserCheck className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{filteredSummary.contratados}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredSummary.total > 0 ? ((filteredSummary.contratados / filteredSummary.total) * 100).toFixed(1) : 0}% preenchido
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vagas Abertas</CardTitle>
                <UserX className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{filteredSummary.vagasAbertas}</div>
                {hasActiveFilters && (
                  <p className="text-xs text-muted-foreground mt-1">de {summary.vagasAbertas} total</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Status Pie Chart */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Situação Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Area Bar Chart */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Por Área</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <BarChart data={areaChartData}>
                    <XAxis dataKey="area" fontSize={12} />
                    <YAxis fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="contratados" fill="#3b82f6" name="Contratados" />
                    <Bar dataKey="vagas" fill="#93c5fd" name="Vagas" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Renovations Bar Chart */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Renovações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <BarChart data={renovacoesChartData}>
                    <XAxis dataKey="renovacoes" fontSize={12} />
                    <YAxis fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="quantidade" fill="#2563eb" name="Quantidade" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Buscar</label>
                  <Input
                    placeholder="Nome, tarefa, NEO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <MultiSelectFilter
                  label="OM"
                  options={filterOptions.oms.map(om => ({ value: om, label: om }))}
                  selectedValues={filterOM}
                  onToggle={(value) => toggleFilter(filterOM, setFilterOM, value)}
                />
                
                <MultiSelectFilter
                  label="Status"
                  options={[
                    { value: "contratado", label: "Contratados" },
                    { value: "vaga", label: "Vagas Abertas" }
                  ]}
                  selectedValues={filterStatus}
                  onToggle={(value) => toggleFilter(filterStatus, setFilterStatus, value)}
                />
                
                <MultiSelectFilter
                  label="Área"
                  options={filterOptions.areas.map(area => ({ value: area, label: area }))}
                  selectedValues={filterArea}
                  onToggle={(value) => toggleFilter(filterArea, setFilterArea, value)}
                />
                
                <MultiSelectFilter
                  label="Graduação"
                  options={filterOptions.graduacoes.map(grad => ({ value: grad, label: grad }))}
                  selectedValues={filterGraduacao}
                  onToggle={(value) => toggleFilter(filterGraduacao, setFilterGraduacao, value)}
                />
                
                <MultiSelectFilter
                  label="ESP/Quadro"
                  options={filterOptions.espQuadros.map(esp => ({ value: esp, label: esp }))}
                  selectedValues={filterEspQuadro}
                  onToggle={(value) => toggleFilter(filterEspQuadro, setFilterEspQuadro, value)}
                />
                
                <MultiSelectFilter
                  label="Renovações"
                  options={filterOptions.renovacoes.map(ren => ({ value: String(ren), label: `${ren}x renovações` }))}
                  selectedValues={filterRenovacoes}
                  onToggle={(value) => toggleFilter(filterRenovacoes, setFilterRenovacoes, value)}
                />
                
                <MultiSelectFilter
                  label="Categoria"
                  options={[
                    { value: "oficial", label: "Oficiais" },
                    { value: "praca", label: "Praças" }
                  ]}
                  selectedValues={filterCategoria}
                  onToggle={(value) => toggleFilter(filterCategoria, setFilterCategoria, value)}
                />
              </div>
              
              {hasActiveFilters && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Exibindo <span className="font-medium text-foreground">{filteredSummary.total}</span> registros 
                    ({filteredSummary.contratados} contratados, {filteredSummary.vagasAbertas} vagas)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Praças TTC ({filteredData.length} registros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>OM</TableHead>
                      <TableHead>Militar</TableHead>
                      <TableHead>NEO</TableHead>
                      <TableHead>EFE</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead className="min-w-[200px]">Tarefa Designada</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Tempo Restante</TableHead>
                      <TableHead className="text-center">Renovações</TableHead>
                      <TableHead>Portaria Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => {
                      // Check if NEO and EspQuadro are different
                      const neoNormalized = row.neo?.trim().toUpperCase() || '';
                      const efeNormalized = row.espQuadro?.trim().toUpperCase() || '';
                      const isDifferentNeoEfe = !row.isVaga && neoNormalized && efeNormalized && neoNormalized !== efeNormalized;
                      
                      // Format military name: graduação-especialidade nome
                      const formatMilitarName = () => {
                        if (row.isVaga) return null;

                        const grad = (row.graduacao || '').trim().toUpperCase();
                        const esp = (row.espQuadro || '').trim().toUpperCase();
                        const nome = row.nomeCompleto?.split(' ')[0] || row.nomeCompleto || '';
                        
                        // Ignore invalid esp values like "-", "QPA", "CPA", "QAP", "CAP", "PRM", etc.
                        const isValidEsp = esp && esp !== "-" && !["QPA", "CPA", "QAP", "CAP", "PRM", "CPRM", "QFN", "CFN"].includes(esp);

                        if (!grad) return nome;
                        return `${grad}${isValidEsp ? `-${esp}` : ""} ${nome}`;
                      };
                      
                      return (
                      <TableRow 
                        key={row.id}
                        className={`${row.isVaga ? "bg-red-100 dark:bg-red-950/40 border-l-4 border-l-red-500" : ""} ${isDifferentNeoEfe ? "bg-amber-50/80 dark:bg-amber-950/30" : ""}`}
                      >
                        <TableCell className={`font-medium ${row.isVaga ? "text-red-600 font-bold" : ""}`}>{row.numero}</TableCell>
                        <TableCell>
                          <Badge variant={row.isVaga ? "destructive" : "outline"} className={row.isVaga ? "bg-red-500" : ""}>
                            {row.om}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.isVaga ? (
                            <span className="text-red-600 font-bold italic">VAGO</span>
                          ) : (
                            <span className={isDifferentNeoEfe ? "text-amber-700 dark:text-amber-400 font-semibold" : ""}>
                              {formatMilitarName()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant={isDifferentNeoEfe ? "default" : "outline"} className={isDifferentNeoEfe ? "bg-blue-500" : ""}>
                            {row.neo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant={isDifferentNeoEfe ? "default" : "outline"}>
                            {row.espQuadro || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{calcularIdadeAtual(row.idade)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.area}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.tarefaDesignada}</TableCell>
                        <TableCell className="text-sm">{row.periodoInicio}</TableCell>
                        <TableCell className="text-sm">{row.termino}</TableCell>
                        <TableCell className="text-sm">
                          {!row.isVaga && (() => {
                            const { texto, status } = calcularTempoRestante(row.termino);
                            return (
                              <Badge 
                                variant={status === 'expired' ? 'destructive' : status === 'danger' ? 'destructive' : status === 'warning' ? 'default' : 'secondary'}
                                className={status === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                              >
                                {texto}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {!row.isVaga && (
                            <Badge 
                              variant={row.qtdRenovacoes >= 5 ? "destructive" : row.qtdRenovacoes >= 3 ? "default" : "secondary"}
                            >
                              {row.qtdRenovacoes}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{row.portariaAtual || '-'}</TableCell>
                      </TableRow>
                    );
                    })}
                    
                    {filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default DashboardTTC;

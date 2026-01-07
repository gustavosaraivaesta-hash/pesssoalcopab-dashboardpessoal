import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserX, RefreshCw, LogOut, Wifi, WifiOff, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TTCData, TTCSummary } from "@/types/ttc";
import militaryBg from "@/assets/military-background.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOfflineCache";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import { differenceInYears, differenceInMonths, differenceInDays, parse, isValid, addYears, addMonths } from "date-fns";

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

const DashboardTTC = () => {
  const navigate = useNavigate();
  const [ttcData, setTtcData] = useState<TTCData[]>([]);
  const [summary, setSummary] = useState<TTCSummary>({ total: 0, contratados: 0, vagasAbertas: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOM, setFilterOM] = useState<string>("all");
  const [filterArea, setFilterArea] = useState<string>("all");
  const [filterGraduacao, setFilterGraduacao] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterEspQuadro, setFilterEspQuadro] = useState<string>("all");
  const [filterRenovacoes, setFilterRenovacoes] = useState<string>("all");
  
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
    
    if (filterOM !== "all") {
      data = data.filter(d => d.om === filterOM);
    }
    
    if (filterArea !== "all") {
      data = data.filter(d => d.area === filterArea);
    }
    
    if (filterGraduacao !== "all") {
      data = data.filter(d => d.graduacao === filterGraduacao);
    }
    
    if (filterStatus !== "all") {
      if (filterStatus === "contratado") {
        data = data.filter(d => !d.isVaga);
      } else if (filterStatus === "vaga") {
        data = data.filter(d => d.isVaga);
      }
    }
    
    if (filterEspQuadro !== "all") {
      data = data.filter(d => d.espQuadro === filterEspQuadro);
    }
    
    if (filterRenovacoes !== "all") {
      const renovacoesNum = parseInt(filterRenovacoes);
      data = data.filter(d => d.qtdRenovacoes === renovacoesNum);
    }
    
    return data;
  }, [ttcData, searchTerm, filterOM, filterArea, filterGraduacao, filterStatus, filterEspQuadro, filterRenovacoes]);

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
    setFilterOM("all");
    setFilterArea("all");
    setFilterGraduacao("all");
    setFilterStatus("all");
    setFilterEspQuadro("all");
    setFilterRenovacoes("all");
  };

  const hasActiveFilters = searchTerm || filterOM !== "all" || filterArea !== "all" || filterGraduacao !== "all" || 
    filterStatus !== "all" || filterEspQuadro !== "all" || filterRenovacoes !== "all";

  // Chart data
  const statusChartData = useMemo(() => [
    { name: "Contratados", value: summary.contratados, fill: "hsl(var(--chart-1))" },
    { name: "Vagas Abertas", value: summary.vagasAbertas, fill: "hsl(var(--chart-2))" },
  ], [summary]);

  const areaChartData = useMemo(() => {
    const byArea = new Map<string, { contratados: number; vagas: number }>();
    
    ttcData.forEach(d => {
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
  }, [ttcData]);

  const renovacoesChartData = useMemo(() => {
    const byRenovacoes = new Map<number, number>();
    
    ttcData.filter(d => !d.isVaga).forEach(d => {
      const renovacoes = d.qtdRenovacoes;
      byRenovacoes.set(renovacoes, (byRenovacoes.get(renovacoes) || 0) + 1);
    });
    
    return Array.from(byRenovacoes.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([renovacoes, count]) => ({
        renovacoes: `${renovacoes}x`,
        quantidade: count,
      }));
  }, [ttcData]);

  const chartConfig = {
    contratados: { label: "Contratados", color: "hsl(var(--chart-1))" },
    vagas: { label: "Vagas", color: "hsl(var(--chart-2))" },
    quantidade: { label: "Quantidade", color: "hsl(var(--chart-3))" },
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
                  ← Voltar
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
                <div className="text-3xl font-bold">{summary.total}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contratados</CardTitle>
                <UserCheck className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{summary.contratados}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.total > 0 ? ((summary.contratados / summary.total) * 100).toFixed(1) : 0}% preenchido
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vagas Abertas</CardTitle>
                <UserX className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{summary.vagasAbertas}</div>
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
                    <Bar dataKey="contratados" fill="hsl(var(--chart-1))" name="Contratados" />
                    <Bar dataKey="vagas" fill="hsl(var(--chart-2))" name="Vagas" />
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
                    <Bar dataKey="quantidade" fill="hsl(var(--chart-3))" name="Quantidade" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Buscar</label>
                  <Input
                    placeholder="Nome, tarefa, NEO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">OM</label>
                  <Select value={filterOM} onValueChange={setFilterOM}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as OMs</SelectItem>
                      {filterOptions.oms.map(om => (
                        <SelectItem key={om} value={om}>{om}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="contratado">Contratados</SelectItem>
                      <SelectItem value="vaga">Vagas Abertas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Área</label>
                  <Select value={filterArea} onValueChange={setFilterArea}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as áreas</SelectItem>
                      {filterOptions.areas.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Graduação</label>
                  <Select value={filterGraduacao} onValueChange={setFilterGraduacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as graduações</SelectItem>
                      {filterOptions.graduacoes.map(grad => (
                        <SelectItem key={grad} value={grad}>{grad}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">ESP/Quadro</label>
                  <Select value={filterEspQuadro} onValueChange={setFilterEspQuadro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {filterOptions.espQuadros.map(esp => (
                        <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Renovações</label>
                  <Select value={filterRenovacoes} onValueChange={setFilterRenovacoes}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {filterOptions.renovacoes.map(ren => (
                        <SelectItem key={ren} value={String(ren)}>{ren}x renovações</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      <TableHead>Graduação</TableHead>
                      <TableHead>Esp/Quadro</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>NEO</TableHead>
                      <TableHead className="min-w-[200px]">Tarefa Designada</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead className="text-center">Renovações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row) => (
                      <TableRow 
                        key={row.id}
                        className={row.isVaga ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                      >
                        <TableCell className="font-medium">{row.numero}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.graduacao}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.espQuadro}</TableCell>
                        <TableCell className="font-medium">
                          {row.isVaga ? (
                            <span className="text-red-500 italic">VAGA ABERTA</span>
                          ) : (
                            row.nomeCompleto
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{calcularIdadeAtual(row.idade)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.area}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{row.neo}</TableCell>
                        <TableCell className="text-sm">{row.tarefaDesignada}</TableCell>
                        <TableCell className="text-sm">{row.periodoInicio}</TableCell>
                        <TableCell className="text-sm">{row.termino}</TableCell>
                        <TableCell className="text-center">
                          {!row.isVaga && (
                            <Badge 
                              variant={row.qtdRenovacoes >= 5 ? "destructive" : row.qtdRenovacoes >= 3 ? "default" : "secondary"}
                            >
                              {row.qtdRenovacoes}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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

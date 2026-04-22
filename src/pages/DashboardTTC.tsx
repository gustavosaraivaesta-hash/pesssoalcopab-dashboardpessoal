import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, UserX, RefreshCw, LogOut, Wifi, WifiOff, Calendar, FileDown, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerWithSelectors } from "@/components/ui/date-picker-with-selectors";
import { TTCData, TTCSummary } from "@/types/ttc";
import militaryBg from "@/assets/military-background.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOfflineCache";
import { useAuth } from "@/hooks/useAuth";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDataFlexivel, calcularTempoRestante, isOficial, getGradIndex, calcularIdadeAtual } from "@/lib/ttcUtils";
import { isBefore, isAfter } from "date-fns";
import MultiSelectFilter from "@/components/dashboard/ttc/MultiSelectFilter";
import TTCTableRow from "@/components/dashboard/ttc/TTCTableRow";

const DashboardTTC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
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
  const [filterDataInicioFrom, setFilterDataInicioFrom] = useState<Date | undefined>(undefined);
  const [filterDataInicioTo, setFilterDataInicioTo] = useState<Date | undefined>(undefined);
  const [filterDataTerminoFrom, setFilterDataTerminoFrom] = useState<Date | undefined>(undefined);
  const [filterDataTerminoTo, setFilterDataTerminoTo] = useState<Date | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState<{ mes: string; militares: TTCData[] } | null>(null);

  const isOnline = useOnlineStatus();

  const fetchData = useCallback(async (showToast = false, isBackground = false) => {
    if (showToast) setIsRefreshing(true);

    if (!navigator.onLine) {
      toast.info("Modo offline - dados TTC indisponíveis");
      setIsLoading(false);
      if (showToast) setIsRefreshing(false);
      return;
    }

    try {
      if (!isBackground && ttcData.length === 0) setIsLoading(true);

      const response = await Promise.race([
        supabase.functions.invoke<any>("fetch-ttc-data"),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000)),
      ]);

      if (response.error) {
        if (!isBackground) toast.error("Erro ao carregar dados TTC");
        return;
      }

      const data = response.data?.data || [];
      const summaryData = response.data?.summary || { total: 0, contratados: 0, vagasAbertas: 0 };

      setTtcData(data);
      setSummary(summaryData);

      if (showToast) toast.success(`Dados TTC atualizados! ${data.length} registros.`);
    } catch {
      if (!isBackground) toast.error("Erro ao conectar com o servidor");
    }

    setIsLoading(false);
    if (showToast) setIsRefreshing(false);
  }, [ttcData.length]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(() => fetchData(false, true), 300000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData(false, true);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleDataRefresh = () => fetchData(false, true);
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

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/login");
    } catch {
      toast.error("Erro ao realizar logout");
    }
  }, [signOut, navigate]);

  // handleExportPDF defined below after filteredData/filteredSummary



  // Filter options
  const filterOptions = useMemo(() => ({
    oms: Array.from(new Set(ttcData.map(d => d.om).filter(Boolean))).sort(),
    areas: Array.from(new Set(ttcData.map(d => d.area).filter(Boolean))).sort(),
    graduacoes: Array.from(new Set(ttcData.map(d => d.graduacao).filter(Boolean))).sort(),
    espQuadros: Array.from(new Set(ttcData.map(d => d.espQuadro).filter(Boolean))).sort(),
  }), [ttcData]);

  // Filtered data
  const applyTtcFilters = useCallback((sourceData: TTCData[]) => {
    let data = sourceData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(d =>
        d.nomeCompleto.toLowerCase().includes(term) ||
        d.tarefaDesignada.toLowerCase().includes(term) ||
        d.neo.toLowerCase().includes(term) ||
        d.espQuadro.toLowerCase().includes(term)
      );
    }

    if (filterOM.length > 0) data = data.filter(d => filterOM.includes(d.om));
    if (filterArea.length > 0) data = data.filter(d => filterArea.includes(d.area));
    if (filterGraduacao.length > 0) data = data.filter(d => filterGraduacao.includes(d.graduacao));

    if (filterStatus.length > 0) {
      data = data.filter(d =>
        (filterStatus.includes("contratado") && !d.isVaga) ||
        (filterStatus.includes("vaga") && d.isVaga)
      );
    }

    if (filterEspQuadro.length > 0) data = data.filter(d => filterEspQuadro.includes(d.espQuadro));
    if (filterRenovacoes.length > 0) data = data.filter(d => filterRenovacoes.includes(String(d.qtdRenovacoes)));

    if (filterCategoria.length > 0) {
      data = data.filter(d =>
        (filterCategoria.includes("oficial") && isOficial(d.graduacao)) ||
        (filterCategoria.includes("praca") && !isOficial(d.graduacao))
      );
    }

    if (filterDataInicioFrom || filterDataInicioTo) {
      data = data.filter(d => {
        const dt = parseDataFlexivel(d.periodoInicio);
        if (!dt) return false;
        if (filterDataInicioFrom && isBefore(dt, filterDataInicioFrom)) return false;
        if (filterDataInicioTo && isAfter(dt, filterDataInicioTo)) return false;
        return true;
      });
    }

    if (filterDataTerminoFrom || filterDataTerminoTo) {
      data = data.filter(d => {
        const dt = parseDataFlexivel(d.termino);
        if (!dt) return false;
        if (filterDataTerminoFrom && isBefore(dt, filterDataTerminoFrom)) return false;
        if (filterDataTerminoTo && isAfter(dt, filterDataTerminoTo)) return false;
        return true;
      });
    }

    return data;
  }, [searchTerm, filterOM, filterArea, filterGraduacao, filterStatus, filterEspQuadro, filterRenovacoes, filterCategoria, filterDataInicioFrom, filterDataInicioTo, filterDataTerminoFrom, filterDataTerminoTo]);

  const filteredData = useMemo(() => applyTtcFilters(ttcData), [ttcData, applyTtcFilters]);

  const filteredSummary = useMemo(() => {
    const total = filteredData.length;
    const contratados = filteredData.filter(d => !d.isVaga).length;
    return { total, contratados, vagasAbertas: total - contratados };
  }, [filteredData]);

  const handleExportPDF = useCallback(async () => {
    const exportData = applyTtcFilters(ttcData);
    const exportSummary = {
      total: exportData.length,
      contratados: exportData.filter(d => !d.isVaga).length,
      vagasAbertas: exportData.filter(d => d.isVaga).length,
    };

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Dashboard TTC - Tempo de Trabalho Complementar", 14, 22);
    doc.setFontSize(10);
    doc.text(`Data de exportação: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 30);
    doc.text(`Total: ${exportSummary.total} | Contratados: ${exportSummary.contratados} | Vagas Abertas: ${exportSummary.vagasAbertas}`, 14, 36);

    if (exportData.length === 0) {
      doc.setFontSize(12);
      doc.text("Nenhum registro encontrado para os filtros selecionados.", 14, 48);
      doc.save(`dashboard-ttc-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado com sucesso!");
      return;
    }

    const groupedByOM: Record<string, TTCData[]> = {};
    exportData.forEach(item => {
      const om = item.om || "Sem OM";
      (groupedByOM[om] ??= []).push(item);
    });

    let currentY = 42;

    Object.keys(groupedByOM).sort().forEach(om => {
      const omData = groupedByOM[om];
      if (currentY > 180) { doc.addPage(); currentY = 20; }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(om, 14, currentY);

      const omContratados = omData.filter(d => !d.isVaga).length;
      const omVagas = omData.filter(d => d.isVaga).length;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Total: ${omData.length} | Contratados: ${omContratados} | Vagas: ${omVagas}`, 14, currentY + 5);
      doc.setTextColor(0, 0, 0);
      currentY += 8;

      const tableData = omData.map(item => [
        item.graduacao, item.nomeCompleto || "VAGO", item.neo || "-", item.espQuadro || "-",
        item.isVaga ? "-" : calcularIdadeAtual(item.idade), item.area || "-", item.tarefaDesignada || "-",
        item.isVaga ? "-" : (item.periodoInicio || "-"), item.isVaga ? "-" : (item.termino || "-"),
        calcularTempoRestante(item.termino).texto,
        item.isVaga ? "-" : (item.tempoServido || "-"), item.isVaga ? "-" : (item.tempoFaltante || "-"),
        item.isVaga ? "-" : (item.dataLimite || "-"), item.isVaga ? "-" : (item.portariaAtual || "-"),
      ]);

      const vagaRowIndexes = omData.map((item, i) => item.isVaga ? i : -1).filter(i => i !== -1);

      autoTable(doc, {
        head: [["Grad", "Nome", "NEO", "EFE", "Idade", "Área", "Tarefa", "Início", "Término", "Tempo Rest. Contrato", "Tempo Total TTC", "Faltante (10a)", "Data Limite", "Portaria Atual"]],
        body: tableData,
        startY: currentY,
        styles: { fontSize: 5.5, cellPadding: 1 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        didParseCell: (data) => {
          if (data.section === "body" && vagaRowIndexes.includes(data.row.index)) {
            data.cell.styles.fillColor = [254, 202, 202];
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`dashboard-ttc-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado com sucesso!");
  }, [applyTtcFilters, ttcData]);

  // Sorted data for the table
  const sortedData = useMemo(() =>
    [...filteredData].sort((a, b) => {
      const omCmp = (a.om || '').localeCompare(b.om || '');
      return omCmp !== 0 ? omCmp : getGradIndex(a.graduacao) - getGradIndex(b.graduacao);
    }),
    [filteredData]
  );

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterOM([]);
    setFilterArea([]);
    setFilterGraduacao([]);
    setFilterStatus([]);
    setFilterEspQuadro([]);
    setFilterRenovacoes([]);
    setFilterCategoria([]);
    setFilterDataInicioFrom(undefined);
    setFilterDataInicioTo(undefined);
    setFilterDataTerminoFrom(undefined);
    setFilterDataTerminoTo(undefined);
  }, []);

  const hasActiveFilters = searchTerm || filterOM.length > 0 || filterArea.length > 0 || filterGraduacao.length > 0 ||
    filterStatus.length > 0 || filterEspQuadro.length > 0 || filterRenovacoes.length > 0 || filterCategoria.length > 0 ||
    filterDataInicioFrom || filterDataInicioTo || filterDataTerminoFrom || filterDataTerminoTo;

  const toggleFilter = useCallback((currentValues: string[], setValue: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setValue(currentValues.includes(value) ? currentValues.filter(v => v !== value) : [...currentValues, value]);
  }, []);

  // Chart data
  const statusChartData = useMemo(() => [
    { name: "Contratados", value: filteredSummary.contratados, fill: "#3b82f6" },
    { name: "Vagas Abertas", value: filteredSummary.vagasAbertas, fill: "#93c5fd" },
  ], [filteredSummary]);

  const previsaoMensalData = useMemo(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthGroups = new Map<string, TTCData[]>();

    for (const d of filteredData) {
      if (d.isVaga || !d.termino) continue;
      const dt = parseDataFlexivel(d.termino);
      if (!dt) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (key >= todayKey) {
        let arr = monthGroups.get(key);
        if (!arr) { arr = []; monthGroups.set(key, arr); }
        arr.push(d);
      }
    }

    return Array.from(monthGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 12)
      .map(([key, militares]) => {
        const [year, month] = key.split('-');
        const label = format(new Date(parseInt(year), parseInt(month) - 1), "MMM/yy", { locale: ptBR });
        return { mes: label, quantidade: militares.length, militares };
      });
  }, [filteredData]);

  const chartConfig = useMemo(() => ({
    contratados: { label: "Contratados", color: "#3b82f6" },
    vagas: { label: "Vagas", color: "#93c5fd" },
    quantidade: { label: "Quantidade", color: "#2563eb" },
  }), []);

  const handleBarClick = useCallback((e: any) => {
    if (e?.activePayload?.[0]?.payload) {
      const p = e.activePayload[0].payload;
      setSelectedMonth({ mes: p.mes, militares: p.militares });
    }
  }, []);

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
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${militaryBg})` }}>
      <div className="min-h-screen bg-background/95 backdrop-blur-sm">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate("/")}>
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
                <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={isRefreshing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
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
                {hasActiveFilters && <p className="text-xs text-muted-foreground mt-1">de {summary.total} total</p>}
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
                {hasActiveFilters && <p className="text-xs text-muted-foreground mt-1">de {summary.vagasAbertas} total</p>}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Situação Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px]">
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {statusChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Previsão Mensal de Término de Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                {previsaoMensalData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[280px]">
                    <BarChart data={previsaoMensalData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantidade" fill="#2563eb" radius={[4, 4, 0, 0]} name="Militares" label={{ position: 'top', fontSize: 11 }} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum término futuro encontrado</p>
                )}

                {selectedMonth && (
                  <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedMonth(null)}>
                    <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="text-lg font-semibold">Término em {selectedMonth.mes} ({selectedMonth.militares.length} militares)</h3>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <ScrollArea className="max-h-[60vh]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Graduação</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>OM</TableHead>
                              <TableHead>Área</TableHead>
                              <TableHead>Término</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMonth.militares.map(mil => (
                              <TableRow key={mil.id}>
                                <TableCell className="font-medium">{mil.graduacao}</TableCell>
                                <TableCell>{mil.nomeCompleto}</TableCell>
                                <TableCell>{mil.om}</TableCell>
                                <TableCell>{mil.area}</TableCell>
                                <TableCell>{mil.termino}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Filtros</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar Filtros</Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Buscar</label>
                  <Input placeholder="Nome, tarefa, NEO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <MultiSelectFilter label="OM" options={filterOptions.oms.map(om => ({ value: om, label: om }))} selectedValues={filterOM} onToggle={v => toggleFilter(filterOM, setFilterOM, v)} />
                <MultiSelectFilter label="Status" options={[{ value: "contratado", label: "Contratados" }, { value: "vaga", label: "Vagas Abertas" }]} selectedValues={filterStatus} onToggle={v => toggleFilter(filterStatus, setFilterStatus, v)} />
                <MultiSelectFilter label="Área" options={filterOptions.areas.map(a => ({ value: a, label: a }))} selectedValues={filterArea} onToggle={v => toggleFilter(filterArea, setFilterArea, v)} />
                <MultiSelectFilter label="Graduação" options={filterOptions.graduacoes.map(g => ({ value: g, label: g }))} selectedValues={filterGraduacao} onToggle={v => toggleFilter(filterGraduacao, setFilterGraduacao, v)} />
                <MultiSelectFilter label="ESP/Quadro" options={filterOptions.espQuadros.map(e => ({ value: e, label: e }))} selectedValues={filterEspQuadro} onToggle={v => toggleFilter(filterEspQuadro, setFilterEspQuadro, v)} />
                <MultiSelectFilter label="Categoria" options={[{ value: "oficial", label: "Oficiais" }, { value: "praca", label: "Praças" }]} selectedValues={filterCategoria} onToggle={v => toggleFilter(filterCategoria, setFilterCategoria, v)} />
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Início (De)</label>
                  <DatePickerWithSelectors date={filterDataInicioFrom} onDateChange={setFilterDataInicioFrom} placeholder="Selecione..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Início (Até)</label>
                  <DatePickerWithSelectors date={filterDataInicioTo} onDateChange={setFilterDataInicioTo} placeholder="Selecione..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Término (De)</label>
                  <DatePickerWithSelectors date={filterDataTerminoFrom} onDateChange={setFilterDataTerminoFrom} placeholder="Selecione..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Término (Até)</label>
                  <DatePickerWithSelectors date={filterDataTerminoTo} onDateChange={setFilterDataTerminoTo} placeholder="Selecione..." />
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
                      <TableHead>OM</TableHead>
                      <TableHead>Militar</TableHead>
                      <TableHead>NEO</TableHead>
                      <TableHead>EFE</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead className="min-w-[200px]">Tarefa Designada</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Tempo Restante no Contrato Vigente</TableHead>
                      <TableHead>Tempo Total de TTC até Hoje</TableHead>
                      <TableHead>Tempo Faltante (10a)</TableHead>
                      <TableHead>Data Limite</TableHead>
                      <TableHead>Portaria Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map(row => (
                      <TTCTableRow key={row.id} row={row} />
                    ))}
                    {filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
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

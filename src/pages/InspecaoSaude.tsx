import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, HeartPulse, Search, X, CalendarClock, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { inspecaoSaudeData, type InspecaoRecord } from "@/data/inspecaoSaude";

const POSTO_ORDER = [
  "CA", "CMG", "CF", "CC", "CT", "1T", "2T", "GM",
  "SO", "1° SG", "2° SG", "3° SG", "CB", "MN",
];

const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function statusValidade(d: Date | null): "vencida" | "atencao" | "ok" {
  if (!d) return "ok";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (d < hoje) return "vencida";
  const diffMs = d.getTime() - hoje.getTime();
  const dias = diffMs / (1000 * 60 * 60 * 24);
  if (dias <= 180) return "atencao";
  return "ok";
}

const InspecaoSaude = () => {
  const navigate = useNavigate();
  const [postoFilter, setPostoFilter] = useState<string>("TODOS");
  const [quadroFilter, setQuadroFilter] = useState<string>("TODOS");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "vencida" | "atencao" | "ok">("TODOS");

  const postos = useMemo(() => {
    const set = new Set(inspecaoSaudeData.map((r) => r.posto));
    return Array.from(set).sort(
      (a, b) => POSTO_ORDER.indexOf(a) - POSTO_ORDER.indexOf(b),
    );
  }, []);

  const quadros = useMemo(() => {
    const filtered = inspecaoSaudeData.filter(
      (r) => postoFilter === "TODOS" || r.posto === postoFilter,
    );
    return Array.from(new Set(filtered.map((r) => r.quadro))).sort();
  }, [postoFilter]);

  const filtered = useMemo(() => {
    const ini = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;
    const q = search.trim().toUpperCase();

    return inspecaoSaudeData
      .filter((r) => postoFilter === "TODOS" || r.posto === postoFilter)
      .filter((r) => quadroFilter === "TODOS" || r.quadro === quadroFilter)
      .filter((r) => {
        if (!ini && !fim) return true;
        const d = parseDate(r.validade);
        if (!d) return false;
        if (ini && d < ini) return false;
        if (fim && d > fim) return false;
        return true;
      })
      .filter((r) =>
        q ? r.nome.toUpperCase().includes(q) || r.quadro.toUpperCase().includes(q) : true,
      )
      .filter((r) => {
        if (statusFilter === "TODOS") return true;
        return statusValidade(parseDate(r.validade)) === statusFilter;
      })
      .sort((a, b) => {
        const da = parseDate(a.validade)?.getTime() ?? 0;
        const db = parseDate(b.validade)?.getTime() ?? 0;
        return da - db;
      });
  }, [postoFilter, quadroFilter, dataInicio, dataFim, search, statusFilter]);

  // Gráfico mensal (mês de validade)
  const chartData = useMemo(() => {
    const byKey = new Map<string, { label: string; key: string; total: number; sort: number }>();
    filtered.forEach((r) => {
      const d = parseDate(r.validade);
      if (!d) return;
      const ano = d.getFullYear();
      const mes = d.getMonth();
      const key = `${ano}-${String(mes + 1).padStart(2, "0")}`;
      const label = `${MESES_PT[mes]}/${String(ano).slice(2)}`;
      const sort = ano * 12 + mes;
      const cur = byKey.get(key);
      if (cur) cur.total += 1;
      else byKey.set(key, { label, key, total: 1, sort });
    });
    return Array.from(byKey.values()).sort((a, b) => a.sort - b.sort);
  }, [filtered]);

  const stats = useMemo(() => {
    let vencidas = 0, atencao = 0, ok = 0;
    filtered.forEach((r) => {
      const s = statusValidade(parseDate(r.validade));
      if (s === "vencida") vencidas++;
      else if (s === "atencao") atencao++;
      else ok++;
    });
    return { total: filtered.length, vencidas, atencao, ok };
  }, [filtered]);

  const limparFiltros = () => {
    setPostoFilter("TODOS");
    setQuadroFilter("TODOS");
    setDataInicio("");
    setDataFim("");
    setSearch("");
    setStatusFilter("TODOS");
  };

  const statusLabel = (s: "vencida" | "atencao" | "ok") =>
    s === "vencida" ? "Vencida" : s === "atencao" ? "Vence em ≤ 6 meses" : "Em dia";

  const gerarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleString("pt-BR");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Controle de Inspeção de Saúde", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const filtros: string[] = [];
    if (postoFilter !== "TODOS") filtros.push(`P/G: ${postoFilter}`);
    if (quadroFilter !== "TODOS") filtros.push(`Esp/Quadro: ${quadroFilter}`);
    if (statusFilter !== "TODOS") filtros.push(`Status: ${statusLabel(statusFilter)}`);
    if (dataInicio) filtros.push(`De: ${dataInicio.split("-").reverse().join("/")}`);
    if (dataFim) filtros.push(`Até: ${dataFim.split("-").reverse().join("/")}`);
    if (search) filtros.push(`Busca: ${search}`);
    const filtrosText = filtros.length ? filtros.join("  |  ") : "Sem filtros aplicados";
    doc.text(filtrosText, pageWidth / 2, 21, { align: "center" });
    doc.text(`Gerado em ${now}`, pageWidth / 2, 26, { align: "center" });

    doc.setFontSize(9);
    doc.text(
      `Total: ${stats.total}   |   Vencidas: ${stats.vencidas}   |   ≤ 6 meses: ${stats.atencao}   |   Em dia: ${stats.ok}`,
      pageWidth / 2,
      32,
      { align: "center" },
    );

    autoTable(doc, {
      startY: 38,
      head: [["P/G", "Esp/Quadro", "Nome de Guerra", "Validade", "Status"]],
      body: filtered.map((r) => {
        const s = statusValidade(parseDate(r.validade));
        return [r.posto, r.quadro, r.nome, r.validade, statusLabel(s)];
      }),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [243, 244, 246] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const v = String(data.cell.raw);
          if (v === "Vencida") data.cell.styles.textColor = [185, 28, 28];
          else if (v.startsWith("Vence")) data.cell.styles.textColor = [180, 83, 9];
          else if (v === "Em dia") data.cell.styles.textColor = [4, 120, 87];
        }
      },
      didDrawPage: () => {
        const pageNum = doc.getNumberOfPages();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Página ${pageNum}`, pageWidth - 15, pageHeight - 8, { align: "right" });
        doc.setTextColor(0);
      },
    });

    doc.save(`inspecao-saude-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <HeartPulse className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Inspeção de Saúde</h1>
              <p className="text-xs text-muted-foreground">
                Controle de validade da Inspeção de Saúde
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={gerarPDF} variant="default" size="sm">
              <FileDown className="h-4 w-4 mr-1" />
              Gerar PDF
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold text-destructive">{stats.vencidas}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vencem ≤ 6 meses</p>
              <p className="text-2xl font-bold text-amber-500">{stats.atencao}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Em dia</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.ok}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Posto/Graduação</label>
                <Select
                  value={postoFilter}
                  onValueChange={(v) => {
                    setPostoFilter(v);
                    setQuadroFilter("TODOS");
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {postos.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Esp/Quadro</label>
                <Select value={quadroFilter} onValueChange={setQuadroFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {quadros.map((q) => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="atencao">Vence ≤ 6 meses</SelectItem>
                    <SelectItem value="ok">Em dia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Validade de</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Validade até</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Buscar nome</label>
                <Input
                  placeholder="Nome de guerra…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button variant="outline" className="w-full" onClick={limparFiltros}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico mensal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Validades por mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado para o filtro atual.
              </p>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [v, "Inspeções"]}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {chartData.map((d) => {
                        const [y, m] = d.key.split("-").map(Number);
                        const dt = new Date(y, m - 1, 1);
                        const today = new Date();
                        today.setDate(1);
                        today.setHours(0, 0, 0, 0);
                        const diffMonths =
                          (dt.getFullYear() - today.getFullYear()) * 12 +
                          (dt.getMonth() - today.getMonth());
                        let color = "hsl(var(--primary))";
                        if (diffMonths < 0) color = "hsl(var(--destructive))";
                        else if (diffMonths <= 6) color = "#f59e0b";
                        return <Cell key={d.key} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Militares ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>P/G</TableHead>
                    <TableHead>Esp/Quadro</TableHead>
                    <TableHead>Nome de Guerra</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r, i) => {
                      const d = parseDate(r.validade);
                      const s = statusValidade(d);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.posto}</TableCell>
                          <TableCell>{r.quadro}</TableCell>
                          <TableCell>{r.nome}</TableCell>
                          <TableCell>{r.validade}</TableCell>
                          <TableCell>
                            {s === "vencida" && (
                              <Badge variant="destructive">Vencida</Badge>
                            )}
                            {s === "atencao" && (
                              <Badge className="bg-amber-500 hover:bg-amber-600">Vence ≤ 6m</Badge>
                            )}
                            {s === "ok" && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700">Em dia</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InspecaoSaude;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Cake, Search, X, FileDown, PartyPopper } from "lucide-react";
import { useLiveSheet } from "@/hooks/useLiveSheet";
import { fetchAniversariantes, type AniversarianteRecord } from "@/lib/sheetsLive";
import { openPdfPreview } from "@/lib/pdfPreview";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const POSTO_ORDER = [
  "CA", "CMG", "CF", "CC", "CT", "1T", "2T", "GM",
  "SO", "1° SG", "2° SG", "3° SG", "CB", "MN",
];

const parseNasc = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return { dia: Number(m[1]), mes: Number(m[2]), ano: Number(m[3]) };
};

// Idade que o militar completa no ano corrente
const idadeEm = (ano: number) => new Date().getFullYear() - ano;

const formatNome = (r: AniversarianteRecord) => {
  const esp = (r.quadro || "").trim();
  return `${r.posto}${esp ? `-${esp}` : ""} ${r.nome}`;
};

const toMMDD = (mes: number, dia: number) => mes * 100 + dia;

const Aniversariantes = () => {
  const navigate = useNavigate();
  const hoje = new Date();
  const [modo, setModo] = useState<"mes" | "periodo">("mes");
  const [meses, setMeses] = useState<number[]>([hoje.getMonth() + 1]);
  const toggleMes = (n: number) =>
    setMeses((prev) =>
      prev.includes(n) ? prev.filter((m) => m !== n) : [...prev, n].sort((a, b) => a - b),
    );
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [search, setSearch] = useState("");

  const { data, loading, lastUpdated } = useLiveSheet<AniversarianteRecord[]>(
    fetchAniversariantes,
    [],
    60_000,
  );

  const enriched = useMemo(
    () =>
      data
        .map((r) => {
          const p = parseNasc(r.nascimento);
          if (!p) return null;
          return {
            ...r,
            dia: p.dia,
            mes: p.mes,
            ano: p.ano,
            idade: idadeEm(p.ano),
          };
        })
        .filter(Boolean) as (AniversarianteRecord & {
        dia: number;
        mes: number;
        ano: number;
        idade: number;
      })[],
    [data],
  );

  const porMes = useMemo(() => {
    const arr = Array(13).fill(0) as number[];
    enriched.forEach((r) => (arr[r.mes] += 1));
    return arr;
  }, [enriched]);

  const periodoAtivo = modo === "periodo" && !!dataIni && !!dataFim;

  const periodoLabel = useMemo(() => {
    if (!periodoAtivo) return "";
    const f = (s: string) => s.split("-").reverse().join("/");
    return `${f(dataIni)} a ${f(dataFim)}`;
  }, [periodoAtivo, dataIni, dataFim]);

  const lista = useMemo(() => {
    const q = search.trim().toUpperCase();
    let base = enriched;

    if (periodoAtivo) {
      const [, mi, di] = dataIni.split("-").map(Number);
      const [, mf, df] = dataFim.split("-").map(Number);
      const ini = toMMDD(mi, di);
      const fim = toMMDD(mf, df);
      base = base.filter((r) => {
        const v = toMMDD(r.mes, r.dia);
        return ini <= fim ? v >= ini && v <= fim : v >= ini || v <= fim;
      });
    } else if (modo === "mes" && meses.length) {
      base = base.filter((r) => meses.includes(r.mes));
    }

    return base
      .filter((r) => !q || formatNome(r).toUpperCase().includes(q))
      .sort((a, b) => {
        if (a.mes !== b.mes) return a.mes - b.mes;
        if (a.dia !== b.dia) return a.dia - b.dia;
        const ia = POSTO_ORDER.indexOf(a.posto);
        const ib = POSTO_ORDER.indexOf(b.posto);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
  }, [enriched, meses, search, modo, periodoAtivo, dataIni, dataFim]);

  const mesesLabel = useMemo(
    () =>
      meses.length === 0
        ? "Nenhum mês selecionado"
        : meses.length === 12
          ? "Ano inteiro"
          : meses.map((m) => MESES[m - 1]).join(", "),
    [meses],
  );


  const doHoje = useMemo(
    () =>
      enriched.filter(
        (r) => r.mes === hoje.getMonth() + 1 && r.dia === hoje.getDate(),
      ),
    [enriched],
  );

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("MARINHA DO BRASIL - COPAB", 105, 16, { align: "center" });
    doc.setFontSize(12);
    doc.text(
      periodoAtivo
        ? `ANIVERSARIANTES - PERÍODO ${periodoLabel}`
        : `ANIVERSARIANTES - ${mesesLabel.toUpperCase()}`,
      105,
      23,
      { align: "center" },
    );

    doc.setFontSize(9);
    doc.text(
      `Gerado em ${hoje.toLocaleDateString("pt-BR")} - Total: ${lista.length}`,
      105,
      29,
      { align: "center" },
    );
    autoTable(doc, {
      startY: 34,
      head: [["DIA", "P/G - ESP - NOME DE GUERRA", "NASCIMENTO", "IDADE"]],
      body: lista.map((r) => [
        periodoAtivo
          ? `${String(r.dia).padStart(2, "0")}/${String(r.mes).padStart(2, "0")}`
          : String(r.dia).padStart(2, "0"),

        formatNome(r),
        r.nascimento,
        `${r.idade} anos`,
      ]),
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [15, 60, 110], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
    });
    openPdfPreview(
      doc,
      periodoAtivo
        ? `aniversariantes-${dataIni}-a-${dataFim}.pdf`
        : `aniversariantes-${meses.map((m) => MESES[m - 1].toLowerCase()).join("-")}.pdf`,
    );

  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="w-full px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft size={16} className="mr-1" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Cake className="text-primary" size={22} />
              <h1 className="text-lg font-bold">Aniversariantes — COpAb</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Atualizado {lastUpdated.toLocaleTimeString("pt-BR")}
              </span>
            )}
            <Button size="sm" onClick={exportPdf} disabled={!lista.length}>
              <FileDown size={16} className="mr-1" /> PDF
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 space-y-6">
        {doHoje.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PartyPopper size={16} className="text-primary" />
                Aniversariantes de hoje ({hoje.toLocaleDateString("pt-BR")})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {doHoje.map((r, i) => (
                <Badge key={i} className="text-xs uppercase">
                  {formatNome(r)} — {r.idade} anos
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Filtro
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={modo === "mes" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setModo("mes")}
                >
                  Por mês
                </Button>
                <Button
                  size="sm"
                  variant={modo === "periodo" ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setModo("periodo")}
                >
                  Por período
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modo === "mes" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {MESES.map((m, idx) => {
                  const n = idx + 1;
                  const ativo = n === mes;
                  return (
                    <Button
                      key={m}
                      variant={ativo ? "default" : "secondary"}
                      className="h-auto py-2 flex flex-col gap-0.5"
                      onClick={() => setMes(n)}
                    >
                      <span className="text-xs font-semibold">{m}</span>
                      <span className="text-[10px] opacity-80">{porMes[n]} militar(es)</span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">De</label>
                  <Input
                    type="date"
                    value={dataIni}
                    onChange={(e) => setDataIni(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Até</label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-44"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDataIni("");
                    setDataFim("");
                  }}
                >
                  <X size={14} className="mr-1" /> Limpar
                </Button>
                <p className="text-xs text-muted-foreground">
                  O período considera apenas dia/mês (o ano é ignorado), então
                  pode atravessar a virada do ano.
                </p>
              </div>
            )}

            <div className="relative max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {periodoAtivo
                ? `Período ${periodoLabel}`
                : modo === "periodo"
                  ? "Selecione as datas"
                  : MESES[mes - 1]}{" "}
              — {lista.length} aniversariante(s)
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading && !enriched.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Carregando dados...
              </p>
            ) : lista.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum aniversariante neste mês.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Dia</TableHead>
                      <TableHead>P/G - ESP - Nome de Guerra</TableHead>
                      <TableHead className="w-32">Nascimento</TableHead>
                      <TableHead className="w-28">Idade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((r, i) => {
                      const isHoje =
                        r.mes === hoje.getMonth() + 1 && r.dia === hoje.getDate();
                      return (
                        <TableRow
                          key={`${r.nome}-${i}`}
                          className={isHoje ? "bg-primary/10" : ""}
                        >
                          <TableCell className="font-bold">
                            {String(r.dia).padStart(2, "0")}
                            {periodoAtivo && `/${String(r.mes).padStart(2, "0")}`}

                          </TableCell>
                          <TableCell className="uppercase font-medium">
                            {formatNome(r)}
                            {isHoje && (
                              <Badge className="ml-2 text-[10px]">HOJE</Badge>
                            )}
                          </TableCell>
                          <TableCell>{r.nascimento}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.idade} anos</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Aniversariantes;

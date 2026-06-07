import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Search, Users, GraduationCap, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cursosRealizados } from "@/data/cursosRealizados";
import { supabase } from "@/integrations/supabase/client";

type EnrichedMilitar = {
  nome: string;
  cursos: string[];
  posto: string;
  especialidade: string;
};

type PersonnelMapRecord = {
  nome?: string | null;
  postoEfe?: string | null;
  quadroEfe?: string | null;
  especialidadeEfe?: string | null;
};

type PersonnelMapResponse = {
  data?: PersonnelMapRecord[];
};

const normalizeName = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

// Distância de Levenshtein para tolerar pequenos erros de digitação (ex: OLIVIERA vs OLIVEIRA)
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[a.length];
};

const findFuzzyKey = (target: string, keys: string[]): string | null => {
  if (!target || target.length < 6) return null;
  const maxAllowed = target.length >= 14 ? 3 : target.length >= 10 ? 2 : 1;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const k of keys) {
    if (Math.abs(k.length - target.length) > maxAllowed) continue;
    const d = levenshtein(target, k);
    if (d < bestDist) {
      bestDist = d;
      best = k;
      if (d === 0) break;
    }
  }
  return bestDist <= maxAllowed ? best : null;
};

const invokeFunction = async <T,>(name: string, ms = 25000) => {
  return await Promise.race([
    supabase.functions.invoke<T>(name),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${name}`)), ms),
    ),
  ]);
};

const loadMaps = async () => {
  const pMap: Record<string, string> = {};
  const eMap: Record<string, string> = {};
  const addPosto = (nome: string, posto: string) => {
    const key = normalizeName(nome);
    const p = (posto || "").trim();
    if (key && p && p !== "-" && !pMap[key]) pMap[key] = p;
  };
  const addEsp = (nome: string, esp: string) => {
    const key = normalizeName(nome);
    const e = (esp || "").trim();
    if (key && e && e !== "-" && !eMap[key]) eMap[key] = e;
  };

  const emptyResponse = { data: null };
  const getRecords = (res: { data: PersonnelMapResponse | null }) => res.data?.data || [];

  const [omRes, pracasRes] = await Promise.all([
    invokeFunction<PersonnelMapResponse>("fetch-om-data").catch(() => emptyResponse),
    invokeFunction<PersonnelMapResponse>("fetch-pracas-data").catch(() => emptyResponse),
  ]);

  const omData = getRecords(omRes);
  omData.forEach((it) => {
    addPosto(it?.nome, it?.postoEfe);
    addEsp(it?.nome, it?.quadroEfe);
  });

  const pracasData = getRecords(pracasRes);
  pracasData.forEach((it) => {
    addPosto(it?.nome, it?.postoEfe);
    // Especialidade EFE para praças; fallback para quadroEfe quando vazia.
    addEsp(it?.nome, it?.especialidadeEfe || it?.quadroEfe);
  });

  return { pMap, eMap };
};

// Resolve posto/especialidade com fallback fuzzy para tolerar pequenos erros de digitação no nome.
const resolve = (
  nome: string,
  pMap: Record<string, string>,
  eMap: Record<string, string>,
  cachedKeys?: string[],
) => {
  const key = normalizeName(nome);
  let posto = pMap[key] || "";
  let especialidade = eMap[key] || "";
  if (!posto || !especialidade) {
    const keys = cachedKeys || Array.from(new Set([...Object.keys(pMap), ...Object.keys(eMap)]));
    const alt = findFuzzyKey(key, keys);
    if (alt) {
      if (!posto) posto = pMap[alt] || "";
      if (!especialidade) especialidade = eMap[alt] || "";
    }
  }
  return { posto, especialidade };
};

const CursosRealizados = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [postoMap, setPostoMap] = useState<Record<string, string>>({});
  const [espMap, setEspMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<EnrichedMilitar | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { pMap, eMap } = await loadMaps();
        if (cancelled) return;
        setPostoMap(pMap);
        setEspMap(eMap);
      } catch (e) {
        console.error("Erro ao carregar postos:", e);
      }
    };
    load();

    // Recarrega quando há mudanças (aprovação de solicitação, etc.)
    const handleRefresh = () => load();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "data_refresh_requested") load();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("data-refresh", handleRefresh);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("data-refresh", handleRefresh);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const enriched = useMemo(() => {
    const keys = Array.from(new Set([...Object.keys(postoMap), ...Object.keys(espMap)]));
    return cursosRealizados.map((m) => {
      const { posto, especialidade } = resolve(m.nome, postoMap, espMap, keys);
      return { ...m, posto, especialidade };
    });
  }, [postoMap, espMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return enriched;
    return enriched.filter(
      (m) =>
        m.nome.toUpperCase().includes(q) ||
        m.posto.toUpperCase().includes(q) ||
        m.especialidade.toUpperCase().includes(q) ||
        m.cursos.some((c) => c.toUpperCase().includes(q)),
    );
  }, [search, enriched]);

  const totals = useMemo(() => {
    const totalMilitares = cursosRealizados.length;
    const totalCursos = cursosRealizados.reduce((acc, m) => acc + m.cursos.length, 0);
    const semCursos = cursosRealizados.filter((m) => m.cursos.length === 0).length;
    return { totalMilitares, totalCursos, semCursos };
  }, []);

  const exportPDF = async () => {
    setExporting(true);
    try {
      let pMap = postoMap;
      let eMap = espMap;
      // Sempre recarrega para garantir dados atualizados no PDF
      if (Object.keys(pMap).length === 0 || Object.keys(eMap).length === 0) {
        const fresh = await loadMaps();
        pMap = fresh.pMap;
        eMap = fresh.eMap;
        setPostoMap(pMap);
        setEspMap(eMap);
      }

      const q = search.trim().toUpperCase();
      const keys = Array.from(new Set([...Object.keys(pMap), ...Object.keys(eMap)]));
      const list = cursosRealizados.map((m) => {
        const { posto, especialidade } = resolve(m.nome, pMap, eMap, keys);
        return { ...m, posto, especialidade };
      });
      const rows = q
        ? list.filter(
            (m) =>
              m.nome.toUpperCase().includes(q) ||
              m.posto.toUpperCase().includes(q) ||
              m.especialidade.toUpperCase().includes(q) ||
              m.cursos.some((c) => c.toUpperCase().includes(q)),
          )
        : list;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(14);
      doc.text("Cursos Realizados — COPAB", pageWidth / 2, 12, { align: "center" });
      doc.setFontSize(9);
      doc.text(
        `Militares: ${totals.totalMilitares}   |   Total de Cursos: ${totals.totalCursos}   |   Sem cursos: ${totals.semCursos}`,
        pageWidth / 2,
        18,
        { align: "center" },
      );

      autoTable(doc, {
        startY: 24,
        head: [["Posto/Grad.", "Especialidade/Quadro", "Nome", "Qtd.", "Cursos Realizados"]],
        body: rows.map((m) => [
          m.posto || "—",
          m.especialidade || "—",
          m.nome,
          String(m.cursos.length),
          m.cursos.length ? m.cursos.join(" • ") : "Sem cursos registrados",
        ]),
        styles: { fontSize: 8, cellPadding: 2, valign: "top", overflow: "linebreak" },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 34 },
          2: { cellWidth: 65 },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: "auto" },
        },
        didDrawPage: () => {
          const str = `Página ${doc.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.text(str, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, { align: "right" });
        },
      });

      doc.save("cursos-realizados-copab.pdf");
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft size={18} className="mr-1" /> Voltar
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="text-primary" size={24} />
              <h1 className="text-xl font-semibold">Cursos Realizados — COPAB</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={exportPDF} size="sm" disabled={exporting}>
            <FileDown size={16} className="mr-1" /> {exporting ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Militares</CardTitle>
              <Users size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalMilitares}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
              <GraduationCap size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalCursos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sem cursos registrados</CardTitle>
              <Users size={18} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.semCursos}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search size={18} className="text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, posto/grad., especialidade/quadro ou curso..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
              <span className="text-sm text-muted-foreground ml-auto">
                {filtered.length} resultado(s)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[10%]">Posto/Grad.</TableHead>
                  <TableHead className="w-[10%]">Especialidade/Quadro</TableHead>
                  <TableHead className="w-[22%]">Nome</TableHead>
                  <TableHead className="w-[7%] text-center">Qtd.</TableHead>
                  <TableHead>Cursos Realizados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow
                    key={m.nome}
                    className="cursor-pointer"
                    onClick={() => setSelected(m)}
                  >
                    <TableCell className="align-top">
                      {m.posto ? (
                        <Badge variant="secondary" className="font-semibold">
                          {m.posto}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {m.especialidade ? (
                        <Badge variant="outline" className="font-semibold">
                          {m.especialidade}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium align-top text-primary hover:underline">
                      {m.nome}
                    </TableCell>
                    <TableCell className="text-center align-top">
                      <Badge variant={m.cursos.length > 0 ? "default" : "secondary"}>
                        {m.cursos.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      {m.cursos.length === 0 ? (
                        <span className="text-muted-foreground italic text-sm">
                          Sem cursos registrados
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {m.cursos.map((c, i) => (
                            <Badge key={i} variant="outline" className="font-normal">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum resultado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selected?.posto && (
                <Badge variant="secondary" className="font-semibold">{selected.posto}</Badge>
              )}
              {selected?.especialidade && (
                <Badge variant="outline" className="font-semibold">{selected.especialidade}</Badge>
              )}
              <span>{selected?.nome}</span>
            </DialogTitle>
            <DialogDescription>
              {selected?.cursos.length ?? 0} curso(s) realizado(s)
            </DialogDescription>
          </DialogHeader>
          {selected && (
            selected.cursos.length === 0 ? (
              <p className="text-muted-foreground italic text-sm">Sem cursos registrados</p>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-auto">
                {selected.cursos.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <Badge variant="default" className="shrink-0">{i + 1}</Badge>
                    <span className="text-sm font-medium">{c}</span>
                  </li>
                ))}
              </ul>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CursosRealizados;

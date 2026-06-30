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
import MultiSelectFilter from "@/components/dashboard/ttc/MultiSelectFilter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cursosRealizados as cursosFallback } from "@/data/cursosRealizados";
import { useLiveSheet } from "@/hooks/useLiveSheet";
import { fetchCursosRealizados } from "@/lib/sheetsLive";
import { supabase } from "@/integrations/supabase/client";
import brasaoRepublica from "@/assets/brasao-republica.png";


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
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [postoFilter, setPostoFilter] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const { data: cursosRealizados } = useLiveSheet(fetchCursosRealizados, cursosFallback, 30_000);

  const toggleName = (nome: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  };

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

  const postoOptions = useMemo(() => {
    const order = ["CMG", "CF", "CC", "CT", "1TEN", "2TEN", "SO", "1SG", "2SG", "3SG", "CB", "MN"];
    const rank = (v: string) => {
      const u = v.toUpperCase().replace(/[º°\s-]/g, "");
      const idx = order.findIndex((o) => u.startsWith(o));
      return idx === -1 ? 999 : idx;
    };
    const set = new Set<string>();
    enriched.forEach((m) => {
      if (m.posto) set.add(m.posto);
    });
    return Array.from(set)
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    return enriched
      .filter((m) => {
        if (postoFilter.length > 0 && !postoFilter.includes(m.posto)) return false;
        if (!q) return true;
        return (
          m.nome.toUpperCase().includes(q) ||
          m.posto.toUpperCase().includes(q) ||
          m.especialidade.toUpperCase().includes(q) ||
          m.cursos.some((c) => c.toUpperCase().includes(q))
        );
      })
      .map((m) => {
        if (!q) return m;
        const nomeMatch =
          m.nome.toUpperCase().includes(q) ||
          m.posto.toUpperCase().includes(q) ||
          m.especialidade.toUpperCase().includes(q);
        if (nomeMatch) return m;
        return { ...m, cursos: m.cursos.filter((c) => c.toUpperCase().includes(q)) };
      });
  }, [search, enriched, postoFilter]);

  const totals = useMemo(() => {
    const totalMilitares = filtered.length;
    const totalCursos = filtered.reduce((acc, m) => acc + m.cursos.length, 0);
    const semCursos = filtered.filter((m) => m.cursos.length === 0).length;
    return { totalMilitares, totalCursos, semCursos };
  }, [filtered]);


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
      const baseRows = list.filter((m) => {
        if (postoFilter.length > 0 && !postoFilter.includes(m.posto)) return false;
        if (!q) return true;
        return (
          m.nome.toUpperCase().includes(q) ||
          m.posto.toUpperCase().includes(q) ||
          m.especialidade.toUpperCase().includes(q) ||
          m.cursos.some((c) => c.toUpperCase().includes(q))
        );
      });
      const filteredBySel = selectedNames.size > 0
        ? baseRows.filter((m) => selectedNames.has(m.nome))
        : baseRows;
      // Quando há busca, mostra apenas os cursos que casam com o termo (não todos do militar)
      const rows = q
        ? filteredBySel.map((m) => {
            const nomeMatch =
              m.nome.toUpperCase().includes(q) ||
              m.posto.toUpperCase().includes(q) ||
              m.especialidade.toUpperCase().includes(q);
            const cursosMatch = m.cursos.filter((c) => c.toUpperCase().includes(q));
            return { ...m, cursos: nomeMatch ? m.cursos : cursosMatch };
          })
        : filteredBySel;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      const brasaoImg = new Image();
      brasaoImg.src = brasaoRepublica;
      await new Promise((resolve) => {
        brasaoImg.onload = resolve;
      });

      // Brasão e título padronizado
      doc.addImage(brasaoImg, "PNG", (pageWidth - 20) / 2, yPosition, 20, 24);
      yPosition += 28;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("CENTRO DE OPERAÇÕES DO ABASTECIMENTO", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      doc.setFontSize(14);
      doc.text("Cursos Realizados — COPAB", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      // Filtros aplicados
      if (q || selectedNames.size > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Filtros Aplicados:", 14, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        if (q) {
          doc.text(`Busca: ${q}`, 20, yPosition);
          yPosition += 6;
        }
        if (selectedNames.size > 0) {
          doc.text(`Selecionados: ${selectedNames.size} militar(es)`, 20, yPosition);
          yPosition += 6;
        }
        yPosition += 4;
      }

      // Resumo
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Militares: ${totals.totalMilitares}   |   Total de Cursos: ${totals.totalCursos}   |   Sem cursos: ${totals.semCursos}`,
        pageWidth / 2,
        yPosition,
        { align: "center" },
      );
      yPosition += 10;

      autoTable(doc, {
        startY: yPosition,
        head: [["Posto/Grad.", "Especialidade/Quadro", "Nome", "Qtd.", "Cursos Realizados"]],
        body: rows.map((m) => [
          m.posto || "—",
          m.especialidade || "—",
          m.nome,
          String(m.cursos.length),
          m.cursos.length ? m.cursos.join(" • ") : "Sem cursos registrados",
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3, valign: "top", overflow: "linebreak" },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
        bodyStyles: { fontStyle: "normal" },
        margin: { left: 14, right: 14 },
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
          doc.setFont("helvetica", "normal");
          doc.text(str, pageWidth - 14, pageHeight - 10, { align: "right" });
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
        <div className="px-6 py-4 flex items-center justify-between gap-3">
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

      <main className="px-6 py-6 space-y-6">
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {selectedNames.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedNames.size} selecionado(s)
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedNames(new Set())}>
                Limpar seleção
              </Button>
            </>
          )}
          <Button onClick={exportPDF} size="sm" disabled={exporting}>
            <FileDown size={16} className="mr-1" />{" "}
            {exporting
              ? "Gerando..."
              : selectedNames.size > 0
                ? `Exportar selecionados (${selectedNames.size})`
                : "Exportar PDF"}
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
          <CardHeader className="space-y-3">
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
            <div className="flex items-end gap-3 flex-wrap">
              <div className="w-64">
                <MultiSelectFilter
                  label="Posto/Grad."
                  options={postoOptions}
                  selectedValues={postoFilter}
                  onToggle={(v) =>
                    setPostoFilter((prev) =>
                      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
                    )
                  }
                />
              </div>
              {postoFilter.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setPostoFilter([])}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        filtered.length > 0 &&
                        filtered.every((m) => selectedNames.has(m.nome))
                      }
                      onCheckedChange={(checked) => {
                        setSelectedNames((prev) => {
                          const next = new Set(prev);
                          if (checked) filtered.forEach((m) => next.add(m.nome));
                          else filtered.forEach((m) => next.delete(m.nome));
                          return next;
                        });
                      }}
                      aria-label="Selecionar todos visíveis"
                    />
                  </TableHead>
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
                    <TableCell
                      className="align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedNames.has(m.nome)}
                        onCheckedChange={() => toggleName(m.nome)}
                        aria-label={`Selecionar ${m.nome}`}
                      />
                    </TableCell>
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

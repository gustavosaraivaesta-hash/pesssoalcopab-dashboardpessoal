import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRightLeft, ArrowRight, FileText, RefreshCw, RotateCcw, ShieldCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { openPdfPreview } from "@/lib/pdfPreview";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyAnalysisMoves, buildAnalysisBalances, suggestAnalysisMoves, type AnalysisCategory, type AnalysisMove, type AnalysisRecord } from "@/lib/realocationAnalysis";

interface SheetResponse { data: AnalysisRecord[]; lastUpdate?: string }
async function fetchAnalysisSheet(name: string): Promise<SheetResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const { data, error } = await supabase.functions.invoke<SheetResponse>(name, { signal: controller.signal });
    if (error || !data || !Array.isArray(data.data)) throw new Error("Não foi possível obter todos os dados para a análise.");
    return data;
  } finally { clearTimeout(timer); }
}

export default function AnaliseRealocacao() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [category, setCategory] = useState<AnalysisCategory>("PRAÇAS");
  const [specialty, setSpecialty] = useState("TODAS");
  const [om, setOm] = useState("TODAS");
  const [vinculo, setVinculo] = useState("TODOS");
  const [moves, setMoves] = useState<AnalysisMove[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const query = useQuery({
    queryKey: ["realocation-analysis", user?.id], enabled: isAuthenticated && Boolean(user?.id),
    queryFn: async () => {
      const [pracas, oficiais] = await Promise.all([fetchAnalysisSheet("fetch-pracas-data"), fetchAnalysisSheet("fetch-om-data")]);
      return buildAnalysisBalances([{ category: "PRAÇAS", records: pracas.data }, { category: "OFICIAIS", records: oficiais.data }]);
    },
    retry: false,
  });
  const balances = query.data || [];
  const simulated = useMemo(() => applyAnalysisMoves(balances, moves), [balances, moves]);
  const categoryBalances = balances.filter(item => item.category === category);
  const specialties = [...new Set(categoryBalances.map(item => item.specialty))].sort();
  const oms = [...new Set(categoryBalances.map(item => item.om))].sort();
  const filtered = simulated.filter(item => item.category === category && (specialty === "TODAS" || item.specialty === specialty) && (om === "TODAS" || item.om === om) && (vinculo === "TODOS" || item.vinculo === vinculo));
  const suggestions = suggestAnalysisMoves(filtered);
  const surplus = filtered.reduce((sum, item) => sum + Math.max(0, item.actual - item.planned), 0);
  const deficit = filtered.reduce((sum, item) => sum + Math.max(0, item.planned - item.actual), 0);
  const potential = suggestions.reduce((sum, item) => sum + item.quantity, 0);
  const proposed = moves.reduce((sum, item) => sum + item.quantity, 0);
  const originalById = new Map(balances.map(item => [item.id, item]));
  const refresh = async () => { setMoves([]); await query.refetch(); };
  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const { createRealocationPdf } = await import("@/lib/realocationPdf");
      const pdf = createRealocationPdf({ category, specialty, om, vinculo, updatedAt: query.dataUpdatedAt, balances, filtered, suggestions, moves });
      openPdfPreview(pdf, `Analise_Realocacao_${category}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF da análise. Tente novamente.");
    } finally { setIsExporting(false); }
  };

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/")} aria-label="Voltar ao painel"><ArrowLeft /></Button>
          <div><h1 className="font-display text-xl font-bold sm:text-2xl">Análise de realocação</h1><p className="text-sm text-muted-foreground">Especialidades · OMs com acesso autorizado</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="gap-1 border-success/30 text-success"><ShieldCheck size={14} />Somente análise</Badge><Button variant="outline" onClick={exportPdf} disabled={isExporting || query.isFetching || !query.isSuccess || !filtered.length}>{isExporting ? <RefreshCw className="animate-spin" /> : <FileText />}Gerar PDF</Button><ThemeToggle /><Button variant="outline" size="icon" aria-label="Atualizar dados" onClick={refresh} disabled={query.isFetching}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button></div>
      </div>
    </header>
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6">
      <div className="border-l-4 border-accent bg-accent/10 px-4 py-3 text-sm">Simulação sem alteração de efetivos, vagas ou planilhas. Compatibilidade: especialidade equivalente, posto/graduação, vínculo e corpo. Licenças e destaques não compõem o excedente disponível.</div>
      <section className="flex flex-wrap items-end gap-4 border-b border-border pb-5" aria-label="Filtros da análise">
        <Tabs value={category} onValueChange={value => { setCategory(value as AnalysisCategory); setSpecialty("TODAS"); setOm("TODAS"); }}><TabsList><TabsTrigger value="PRAÇAS">Praças</TabsTrigger><TabsTrigger value="OFICIAIS">Oficiais</TabsTrigger></TabsList></Tabs>
        <div className="w-full sm:w-52"><label className="mb-1 block text-xs font-semibold">Especialidade / Quadro</label><Select value={specialty} onValueChange={setSpecialty}><SelectTrigger aria-label="Especialidade"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODAS">Todas as especialidades</SelectItem>{specialties.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-full sm:w-52"><label className="mb-1 block text-xs font-semibold">OM</label><Select value={om} onValueChange={setOm}><SelectTrigger aria-label="OM"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODAS">Todas as OMs autorizadas</SelectItem>{oms.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-full sm:w-44"><label className="mb-1 block text-xs font-semibold">Vínculo</label><Select value={vinculo} onValueChange={setVinculo}><SelectTrigger aria-label="Vínculo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TODOS">Todos os vínculos</SelectItem>{[...new Set(categoryBalances.map(item => item.vinculo))].sort().map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
      </section>
      {query.isPending ? <div role="status" className="py-16 text-center text-muted-foreground">Carregando dados das OMs…</div> : query.isError ? <div role="alert" className="border-l-4 border-destructive bg-destructive/10 p-5"><p>Não foi possível carregar a análise completa. Nenhuma sugestão foi calculada.</p><Button variant="outline" className="mt-3" onClick={refresh}>Tentar novamente</Button></div> : <>
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Resumo da análise">
          {[{ label: "Excedentes por perfil", value: surplus, color: "text-warning" }, { label: "Necessidades por perfil", value: deficit, color: "text-destructive" }, { label: "Realocação possível", value: potential, color: "text-success" }, { label: "Realocados na simulação", value: proposed, color: "text-primary" }].map(item => <div key={item.label} className="rounded-lg border border-border bg-card p-4"><p className="text-xs font-semibold text-muted-foreground">{item.label}</p><p className={`mt-2 text-3xl font-bold tabular-nums ${item.color}`}>{item.value}</p></div>)}
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Sugestões de realocação</h2><p className="text-sm text-muted-foreground">Prioridade para as maiores necessidades compatíveis no recorte selecionado.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setMoves(previous => previous.slice(0, -1))} disabled={!moves.length}><Undo2 />Desfazer</Button><Button variant="outline" onClick={() => setMoves([])} disabled={!moves.length}><RotateCcw />Reiniciar</Button><Button onClick={() => setMoves(previous => [...previous, ...suggestions.map(({ sourceId, targetId, quantity }) => ({ sourceId, targetId, quantity }))])} disabled={!suggestions.length || query.isFetching}><ArrowRightLeft />Simular todas</Button></div></div>
          {!suggestions.length ? <div className="border-y border-border py-8 text-center text-muted-foreground">{om !== "TODAS" ? "Selecione todas as OMs para comparar origens e destinos." : "Nenhuma realocação compatível disponível neste recorte."}</div> : <div className="grid gap-3 lg:grid-cols-2">{suggestions.map(item => <article key={`${item.sourceId}-${item.targetId}`} className="rounded-lg border border-border bg-card p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><Badge variant="secondary">{item.source.specialty}</Badge><span className="text-sm text-muted-foreground">{item.source.rank} · {item.source.vinculo}{item.source.corpo ? ` · ${item.source.corpo}` : ""}</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><p className="font-bold">{item.source.om}</p><p className="text-xs text-muted-foreground">Excedente: {item.source.actual - item.source.planned}</p></div><ArrowRight className="text-accent" /><div><p className="font-bold">{item.target.om}</p><p className="text-xs text-muted-foreground">Necessidade: {item.target.planned - item.target.actual}</p></div></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3"><p className="text-sm font-semibold">{item.quantity} {item.quantity === 1 ? "militar" : "militares"}</p><Button size="sm" onClick={() => setMoves(previous => [...previous, { sourceId: item.sourceId, targetId: item.targetId, quantity: item.quantity }])} disabled={query.isFetching}><ArrowRightLeft />Simular</Button></div></article>)}</div>}
        </section>
        {moves.length > 0 && <section><h2 className="mb-3 text-lg font-bold">Sequência simulada · todas as categorias</h2><ol className="divide-y divide-border border-y border-border">{moves.map((move, index) => { const source = originalById.get(move.sourceId); const target = originalById.get(move.targetId); return <li key={index} className="flex flex-wrap items-center gap-2 py-3 text-sm"><Badge variant="outline">{index + 1}</Badge><span>{source?.category} · {source?.specialty} · {source?.rank} · {source?.vinculo}</span><span className="font-semibold">{source?.om} → {target?.om}</span><span className="text-accent">{move.quantity} {move.quantity === 1 ? "militar" : "militares"}</span></li>; })}</ol></section>}
        <section><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Balanço por OM e perfil</h2><span className="text-xs text-muted-foreground">{query.dataUpdatedAt ? `Consulta: ${new Date(query.dataUpdatedAt).toLocaleString("pt-BR")}` : ""}</span></div><Table><TableHeader><TableRow>{["OM", "Especialidade", "Posto/Grad.", "Corpo", "Vínculo", "TMFT", "Pessoal real¹", "Simulado", "Excedente", "Necessidade"].map(label => <TableHead key={label} className="whitespace-nowrap">{label}</TableHead>)}</TableRow></TableHeader><TableBody>{filtered.map(item => <TableRow key={item.id}><TableCell className="font-semibold">{item.om}</TableCell><TableCell>{item.specialty}</TableCell><TableCell>{item.rank}</TableCell><TableCell>{item.corpo || "—"}</TableCell><TableCell>{item.vinculo}</TableCell><TableCell>{item.planned}</TableCell><TableCell>{originalById.get(item.id)?.actual ?? 0}</TableCell><TableCell className={item.actual !== originalById.get(item.id)?.actual ? "font-bold text-accent" : ""}>{item.actual}</TableCell><TableCell className="text-warning">{Math.max(0, item.actual - item.planned)}</TableCell><TableCell className="text-destructive">{Math.max(0, item.planned - item.actual)}</TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">Nenhum perfil disponível para os filtros selecionados.</TableCell></TableRow>}</TableBody></Table><p className="mt-3 text-xs text-muted-foreground">¹ Ocupantes por perfil real, incluindo SEM NEO; não equivale à ocupação das vagas da NEO. A correspondência entre OMs usa apenas especialidade, vínculo e corpo — posto/graduação não separa perfis. Registros sem nome ou especialidade válidos não geram sugestões. Disponibilidade individual sujeita à avaliação da OM.</p></section>
      </>}
    </main>
  </div>;
}
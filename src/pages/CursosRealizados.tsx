import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Search, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const normalizeName = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const invokeFunction = async <T,>(name: string, ms = 25000) => {
  return await Promise.race([
    supabase.functions.invoke<T>(name),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${name}`)), ms),
    ),
  ]);
};

const CursosRealizados = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [postoMap, setPostoMap] = useState<Record<string, string>>({});
  const [espMap, setEspMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<EnrichedMilitar | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [omRes, pracasRes] = await Promise.all([
          invokeFunction<any>("fetch-om-data").catch(() => ({ data: null })),
          invokeFunction<any>("fetch-pracas-data").catch(() => ({ data: null })),
        ]);
        if (cancelled) return;

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

        const omData = (omRes as any)?.data?.data || [];
        omData.forEach((it: any) => {
          addPosto(it?.nome, it?.postoEfe || it?.postoTmft || it?.posto || it?.graduacao);
          addEsp(it?.nome, it?.quadroEfe || it?.quadroTmft || it?.quadro);
        });

        const pracasData = (pracasRes as any)?.data?.data || [];
        pracasData.forEach((it: any) => {
          addPosto(it?.nome, it?.postoEfe || it?.postoTmft || it?.posto || it?.graduacao);
          addEsp(it?.nome, it?.especialidadeEfe || it?.especialidadeTmft || it?.especialidade);
        });

        setPostoMap(pMap);
        setEspMap(eMap);
      } catch (e) {
        console.error("Erro ao carregar postos:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(
    () =>
      cursosRealizados.map((m) => ({
        ...m,
        posto: postoMap[normalizeName(m.nome)] || "",
        especialidade: espMap[normalizeName(m.nome)] || "",
      })),
    [postoMap, espMap],
  );

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
                placeholder="Buscar por nome, posto ou curso..."
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
                  <TableHead className="w-[10%]">Especialidade</TableHead>
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
    </div>
  );
};

export default CursosRealizados;

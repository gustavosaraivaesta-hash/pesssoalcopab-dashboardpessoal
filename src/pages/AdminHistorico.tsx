import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, ArrowLeft, RefreshCw, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type ActionType = "ALTERACAO" | "EXCLUSAO";

interface HistoryRecord {
  id: string;
  request_id?: string;
  action_type: ActionType;
  personnel_data: Record<string, any>;
  om: string;
  archived_at: string;
  archived_by: string;
}

const actionTypeLabels: Record<ActionType, { label: string; color: string }> = {
  ALTERACAO: { label: "Alteração", color: "bg-blue-500" },
  EXCLUSAO: { label: "Exclusão", color: "bg-red-500" },
};

export default function AdminHistorico() {
  const navigate = useNavigate();
  const { role, isAuthenticated, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ALL_OMS_VALUE = "__ALL__";
  const [filterOm, setFilterOm] = useState<string>(ALL_OMS_VALUE);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  const isCopab = role === "COPAB";

  const withTimeout = <T,>(promise: Promise<T>, ms = 25000) =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
    ]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("manage-personnel-requests", {
          body: {
            action: "history",
            om: filterOm === ALL_OMS_VALUE ? undefined : filterOm,
          },
        }),
        25000,
      );

      if (error) throw error;
      setHistory(data.history || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoading(false);
    }
  };

  // Fail-safe: evita ficar preso em loading infinito por qualquer razão
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => {
      setIsLoading(false);
      toast.error("Tempo excedido ao carregar histórico. Tente atualizar.");
    }, 30000);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    // Se ainda está carregando auth, não faz nada
    if (authLoading) return;
    
    // Se não está autenticado ou não tem role, para o loading
    if (!isAuthenticated || !role) {
      setIsLoading(false);
      return;
    }
    
    // Se é COpAb, busca os dados
    if (isCopab) {
      fetchHistory();
    } else {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, role, isCopab, filterOm]);

  // Filter by search term
  const filteredHistory = history.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const nome = (record.personnel_data?.nome || "").toLowerCase();
    const nip = (record.personnel_data?.nip || "").toLowerCase();
    return nome.includes(searchLower) || nip.includes(searchLower);
  });

  // Get unique OMs for filter
  const uniqueOms = Array.from(new Set(history.map(r => r.om))).sort();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCopab) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <XCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">Esta página é exclusiva para a COpAb.</p>
        <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Histórico de Alterações</h1>
              <p className="text-sm text-muted-foreground">Arquivo de registros alterados e excluídos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[250px]"
              />
            </div>
            <Select value={filterOm} onValueChange={setFilterOm}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por OM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OMS_VALUE}>Todas as OMs</SelectItem>
                {uniqueOms.map(om => (
                  <SelectItem key={om} value={om}>{om}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Archive className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{history.length}</div>
                  <p className="text-xs text-muted-foreground">Total de Registros</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {history.filter(r => r.action_type === "ALTERACAO").length}
              </div>
              <p className="text-xs text-muted-foreground">Alterações Arquivadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {history.filter(r => r.action_type === "EXCLUSAO").length}
              </div>
              <p className="text-xs text-muted-foreground">Exclusões Arquivadas</p>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registros Arquivados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado no histórico</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OM</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Militar</TableHead>
                    <TableHead>Posto/Esp.</TableHead>
                    <TableHead>Data do Arquivamento</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.om}</TableCell>
                      <TableCell>
                        <Badge className={`${actionTypeLabels[record.action_type].color} text-white`}>
                          {actionTypeLabels[record.action_type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.personnel_data?.nome || "-"}</div>
                          <div className="text-xs text-muted-foreground">
                            NIP: {record.personnel_data?.nip || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.personnel_data?.posto || "-"} / {record.personnel_data?.especialidade || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.archived_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRecord(record)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro Arquivado</DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">OM</Label>
                  <p className="font-medium">{selectedRecord.om}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Ação</Label>
                  <Badge className={`${actionTypeLabels[selectedRecord.action_type].color} text-white`}>
                    {actionTypeLabels[selectedRecord.action_type].label}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Data do Arquivamento</Label>
                  <p className="font-medium">{new Date(selectedRecord.archived_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <Label className="text-sm font-semibold mb-3 block">Dados Arquivados do Militar</Label>
                <div className="space-y-2 text-sm">
                  {Object.entries(selectedRecord.personnel_data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="font-medium">{String(value) || "-"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setSelectedRecord(null)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

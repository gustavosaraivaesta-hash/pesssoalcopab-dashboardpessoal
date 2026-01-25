import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Eye, Check, X, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RequestType = "INCLUSAO" | "ALTERACAO" | "EXCLUSAO";
type RequestStatus = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";

interface PersonnelRequest {
  id: string;
  request_type: RequestType;
  status: RequestStatus;
  personnel_data: Record<string, any>;
  original_data?: Record<string, any>;
  justification: string;
  requesting_om: string;
  target_om?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
}

const statusConfig: Record<RequestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: { label: "Pendente", color: "bg-yellow-500", icon: <Clock className="h-4 w-4" /> },
  EM_ANALISE: { label: "Em Análise", color: "bg-blue-500", icon: <FileText className="h-4 w-4" /> },
  APROVADO: { label: "Aprovado", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4" /> },
  REJEITADO: { label: "Rejeitado", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
};

const requestTypeConfig: Record<RequestType, { label: string; icon: React.ReactNode; color: string }> = {
  INCLUSAO: { label: "Inclusão", icon: <Plus className="h-4 w-4" />, color: "bg-green-100 text-green-800 border-green-300" },
  ALTERACAO: { label: "Alteração", icon: <Edit className="h-4 w-4" />, color: "bg-blue-100 text-blue-800 border-blue-300" },
  EXCLUSAO: { label: "Exclusão", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-100 text-red-800 border-red-300" },
};

export default function AdminSolicitacoes() {
  const navigate = useNavigate();
  const { role, isAuthenticated, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PersonnelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | RequestStatus>("PENDENTE");
  const [filterOm, setFilterOm] = useState<string>("");

  // Review dialog state
  const [selectedRequest, setSelectedRequest] = useState<PersonnelRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const isCopab = role === "COPAB";

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-personnel-requests", {
        body: { 
          action: "list",
          om: filterOm || undefined
        },
      });

      if (error) throw error;
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && isCopab) {
      fetchRequests();
    }
  }, [authLoading, isAuthenticated, isCopab, filterOm]);

  const handleReview = async (decision: "APROVADO" | "REJEITADO") => {
    if (!selectedRequest) return;

    if (decision === "REJEITADO" && !reviewNotes.trim()) {
      toast.error("Justificativa obrigatória para rejeição");
      return;
    }

    setIsReviewing(true);
    try {
      console.log("Submitting review:", {
        action: "review",
        id: selectedRequest.id,
        decision,
        review_notes: reviewNotes,
      });

      const { data, error } = await supabase.functions.invoke("manage-personnel-requests", {
        body: {
          action: "review",
          id: selectedRequest.id,
          decision,
          review_notes: reviewNotes,
        },
      });

      console.log("Review response:", data, error);

      if (error) throw error;

      toast.success(`Solicitação ${decision === "APROVADO" ? "aprovada" : "rejeitada"} com sucesso!`);
      setSelectedRequest(null);
      setReviewNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error reviewing request:", error);
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredRequests = activeTab === "all" 
    ? requests 
    : requests.filter(r => r.status === activeTab);

  const stats = {
    total: requests.length,
    pendentes: requests.filter(r => r.status === "PENDENTE").length,
    aprovados: requests.filter(r => r.status === "APROVADO").length,
    rejeitados: requests.filter(r => r.status === "REJEITADO").length,
  };

  // Get unique OMs for filter
  const uniqueOms = Array.from(new Set(requests.map(r => r.requesting_om))).sort();

  // Helper to compare fields and highlight changes
  const renderFieldComparison = (label: string, originalValue: any, newValue: any) => {
    const hasChanged = originalValue !== newValue && originalValue && newValue;
    return (
      <div className="grid grid-cols-3 gap-2 py-1 border-b border-border last:border-0">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={hasChanged ? "line-through text-muted-foreground" : ""}>
          {originalValue || "-"}
        </span>
        <span className={hasChanged ? "font-medium text-primary" : ""}>
          {newValue || "-"}
        </span>
      </div>
    );
  };

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
              <h1 className="text-xl font-bold text-foreground">Gestão de Solicitações</h1>
              <p className="text-sm text-muted-foreground">Analise e aprove solicitações das OMs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterOm} onValueChange={setFilterOm}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por OM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as OMs</SelectItem>
                {uniqueOms.map(om => (
                  <SelectItem key={om} value={om}>{om}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Solicitações</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
              <p className="text-xs text-muted-foreground">Aguardando Análise</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.aprovados}</div>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.rejeitados}</div>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações Recebidas</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="PENDENTE">
                  Pendentes
                  {stats.pendentes > 0 && (
                    <Badge variant="destructive" className="ml-2">{stats.pendentes}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="APROVADO">Aprovadas</TabsTrigger>
                <TabsTrigger value="REJEITADO">Rejeitadas</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OM</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Militar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id} className={request.status === "PENDENTE" ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}>
                          <TableCell className="font-medium">{request.requesting_om}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${requestTypeConfig[request.request_type].color} flex items-center gap-1 w-fit`}
                            >
                              {requestTypeConfig[request.request_type].icon}
                              {requestTypeConfig[request.request_type].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{request.personnel_data?.nome || "-"}</div>
                              <div className="text-xs text-muted-foreground">
                                {request.personnel_data?.posto} - {request.personnel_data?.especialidade}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig[request.status].color} text-white`}>
                              {statusConfig[request.status].icon}
                              <span className="ml-1">{statusConfig[request.status].label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setReviewNotes("");
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Analisar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Análise de Solicitação
              {selectedRequest && (
                <Badge 
                  variant="outline" 
                  className={`${requestTypeConfig[selectedRequest.request_type].color} ml-2`}
                >
                  {requestTypeConfig[selectedRequest.request_type].icon}
                  <span className="ml-1">{requestTypeConfig[selectedRequest.request_type].label}</span>
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">OM Solicitante</Label>
                  <p className="font-medium">{selectedRequest.requesting_om}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data da Solicitação</Label>
                  <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status Atual</Label>
                  <Badge className={`${statusConfig[selectedRequest.status].color} text-white`}>
                    {statusConfig[selectedRequest.status].label}
                  </Badge>
                </div>
              </div>

              {/* Personnel Data - Different views based on request type */}
              {selectedRequest.request_type === "INCLUSAO" && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    Dados do Militar a Incluir
                  </Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> {selectedRequest.personnel_data?.nome}</div>
                    <div><span className="text-muted-foreground">NIP:</span> {selectedRequest.personnel_data?.nip || "-"}</div>
                    <div><span className="text-muted-foreground">Posto:</span> {selectedRequest.personnel_data?.posto || "-"}</div>
                    <div><span className="text-muted-foreground">Especialidade:</span> {selectedRequest.personnel_data?.especialidade || "-"}</div>
                    <div><span className="text-muted-foreground">Setor:</span> {selectedRequest.personnel_data?.setor || "-"}</div>
                    <div><span className="text-muted-foreground">OM:</span> {selectedRequest.personnel_data?.om || selectedRequest.requesting_om}</div>
                  </div>
                </div>
              )}

              {selectedRequest.request_type === "ALTERACAO" && (
                <div className="p-4 border rounded-lg">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Edit className="h-4 w-4 text-blue-600" />
                    Comparação de Dados (NEO → Novos)
                  </Label>
                  <div className="text-sm">
                    <div className="grid grid-cols-3 gap-2 py-2 border-b font-medium text-muted-foreground">
                      <span>Campo</span>
                      <span>Dados Atuais (NEO)</span>
                      <span>Novos Dados</span>
                    </div>
                    {renderFieldComparison("Nome", selectedRequest.original_data?.nome, selectedRequest.personnel_data?.nome)}
                    {renderFieldComparison("NIP", selectedRequest.original_data?.nip, selectedRequest.personnel_data?.nip)}
                    {renderFieldComparison("Posto", selectedRequest.original_data?.posto, selectedRequest.personnel_data?.posto)}
                    {renderFieldComparison("Especialidade", selectedRequest.original_data?.especialidade, selectedRequest.personnel_data?.especialidade)}
                    {renderFieldComparison("Setor", selectedRequest.original_data?.setor, selectedRequest.personnel_data?.setor)}
                    {renderFieldComparison("OM", selectedRequest.original_data?.om, selectedRequest.personnel_data?.om)}
                  </div>
                </div>
              )}

              {selectedRequest.request_type === "EXCLUSAO" && (
                <div className="p-4 border rounded-lg border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2 text-red-700 dark:text-red-400">
                    <Trash2 className="h-4 w-4" />
                    Militar a Excluir
                  </Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> {selectedRequest.personnel_data?.nome}</div>
                    <div><span className="text-muted-foreground">NIP:</span> {selectedRequest.personnel_data?.nip || "-"}</div>
                    <div><span className="text-muted-foreground">Posto:</span> {selectedRequest.personnel_data?.posto || "-"}</div>
                    <div><span className="text-muted-foreground">Especialidade:</span> {selectedRequest.personnel_data?.especialidade || "-"}</div>
                    <div><span className="text-muted-foreground">Setor:</span> {selectedRequest.personnel_data?.setor || "-"}</div>
                    <div><span className="text-muted-foreground">OM:</span> {selectedRequest.personnel_data?.om || selectedRequest.requesting_om}</div>
                  </div>
                </div>
              )}

              {/* Justification */}
              <div className="p-4 border rounded-lg">
                <Label className="text-sm font-semibold mb-2 block">Justificativa da OM</Label>
                <p className="text-sm bg-muted p-3 rounded">{selectedRequest.justification}</p>
              </div>

              {/* Review Notes */}
              {selectedRequest.status === "PENDENTE" && (
                <div className="space-y-2">
                  <Label>Observações da Análise (obrigatório para rejeição)</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Adicione observações sobre a decisão..."
                    rows={3}
                  />
                </div>
              )}

              {/* Existing Review Notes */}
              {selectedRequest.review_notes && (
                <div className="p-4 border rounded-lg bg-muted">
                  <Label className="text-sm font-semibold mb-2 block">Observações da Análise</Label>
                  <p className="text-sm">{selectedRequest.review_notes}</p>
                  {selectedRequest.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Analisado em: {new Date(selectedRequest.reviewed_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === "PENDENTE" && (
              <div className="flex gap-2 w-full">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReview("REJEITADO")}
                  disabled={isReviewing}
                >
                  {isReviewing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Rejeitar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleReview("APROVADO")}
                  disabled={isReviewing}
                >
                  {isReviewing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Aprovar
                </Button>
              </div>
            )}
            {selectedRequest?.status !== "PENDENTE" && (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

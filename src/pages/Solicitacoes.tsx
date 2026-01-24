import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock, CheckCircle2, XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const requestTypeLabels: Record<RequestType, string> = {
  INCLUSAO: "Inclusão",
  ALTERACAO: "Alteração",
  EXCLUSAO: "Exclusão",
};

export default function Solicitacoes() {
  const navigate = useNavigate();
  const { role, isAuthenticated, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PersonnelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | RequestStatus>("all");

  // Form state
  const [formType, setFormType] = useState<RequestType>("INCLUSAO");
  const [formData, setFormData] = useState({
    nome: "",
    nip: "",
    posto: "",
    especialidade: "",
    om: "",
    justification: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-personnel-requests", {
        body: { action: "list" },
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
    if (!authLoading && isAuthenticated) {
      fetchRequests();
    }
  }, [authLoading, isAuthenticated]);

  const handleSubmit = async () => {
    if (!formData.nome || !formData.justification) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const personnelData = {
        nome: formData.nome,
        nip: formData.nip,
        posto: formData.posto,
        especialidade: formData.especialidade,
        om: formData.om || role,
      };

      const { data, error } = await supabase.functions.invoke("manage-personnel-requests", {
        body: {
          action: "create",
          request_type: formType,
          personnel_data: personnelData,
          justification: formData.justification,
        },
      });

      if (error) throw error;

      toast.success("Solicitação criada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ nome: "", nip: "", posto: "", especialidade: "", om: "", justification: "" });
      fetchRequests();
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Erro ao criar solicitação");
    } finally {
      setIsSubmitting(false);
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
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
              <h1 className="text-xl font-bold text-foreground">Solicitações de Pessoal</h1>
              <p className="text-sm text-muted-foreground">Gerencie suas solicitações de inclusão, alteração e exclusão</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchRequests}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Nova Solicitação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Solicitação</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as RequestType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCLUSAO">Inclusão</SelectItem>
                        <SelectItem value="ALTERACAO">Alteração</SelectItem>
                        <SelectItem value="EXCLUSAO">Exclusão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome *</Label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>NIP</Label>
                      <Input
                        value={formData.nip}
                        onChange={(e) => setFormData(prev => ({ ...prev, nip: e.target.value }))}
                        placeholder="Número de identificação"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Posto/Graduação</Label>
                      <Input
                        value={formData.posto}
                        onChange={(e) => setFormData(prev => ({ ...prev, posto: e.target.value }))}
                        placeholder="Ex: 3SG, CB, SD"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Especialidade</Label>
                      <Input
                        value={formData.especialidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, especialidade: e.target.value }))}
                        placeholder="Ex: MO, MQ, ET"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Justificativa *</Label>
                    <Textarea
                      value={formData.justification}
                      onChange={(e) => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                      placeholder="Descreva o motivo da solicitação..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Enviar Solicitação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total de Solicitações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.aprovados}</div>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.rejeitados}</div>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Minhas Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="PENDENTE">Pendentes</TabsTrigger>
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
                        <TableHead>Tipo</TableHead>
                        <TableHead>Militar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {requestTypeLabels[request.request_type]}
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
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                            {request.review_notes || request.justification}
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
    </div>
  );
}

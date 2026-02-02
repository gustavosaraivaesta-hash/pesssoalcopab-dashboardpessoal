import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Search, User, Edit, Trash2, ClipboardList } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RequestType = "INCLUSAO" | "ALTERACAO" | "EXCLUSAO";
type RequestStatus = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";

interface PersonnelRecord {
  id: string;
  neo: string;
  tipoSetor: string;
  setor: string;
  cargo: string;
  postoTmft: string;
  especialidadeTmft: string;
  opcaoTmft: string;
  nome: string;
  postoEfe: string;
  especialidadeEfe: string;
  opcaoEfe: string;
  om: string;
  isVago: boolean;
  isExtraLotacao: boolean;
  quadroTmft?: string;
  quadroEfe?: string;
}

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

  // Personnel data from NEO
  const [personnelData, setPersonnelData] = useState<PersonnelRecord[]>([]);
  const [isLoadingPersonnel, setIsLoadingPersonnel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelRecord | null>(null);
  const [showPersonnelSearch, setShowPersonnelSearch] = useState(false);

  // Form state
  const [formType, setFormType] = useState<RequestType>("INCLUSAO");
  const [formData, setFormData] = useState({
    neo: "",
    cargo: "",
    postoEfe: "",
    quadroEfe: "",
    especialidadeEfe: "",
    opcaoEfe: "",
    nome: "",
    setor: "",
    om: "",
    justification: "",
  });
  const [originalData, setOriginalData] = useState<Record<string, any> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch personnel data from NEO
  const fetchPersonnelData = async () => {
    setIsLoadingPersonnel(true);
    try {
      const withTimeout = <T,>(promise: Promise<T>, ms = 25000) =>
        Promise.race([
          promise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
        ]);

      const { data, error } = await withTimeout(
        supabase.functions.invoke("fetch-pracas-data", {
          body: {},
        }),
        25000,
      );

      if (error) throw error;
      
      // The edge function returns 'data' field with personnel records
      const personnelRecords = data.data || data.personnel || [];
      
      // Map to PersonnelRecord format
      const mappedRecords: PersonnelRecord[] = personnelRecords.map((item: any, index: number) => ({
        id: item.id || `personnel-${index}`,
        neo: item.neo || '',
        tipoSetor: item.tipoSetor || '',
        setor: item.setor || '',
        cargo: item.cargo || '',
        postoTmft: item.postoTmft || item.posto || '',
        especialidadeTmft: item.especialidadeTmft || item.especialidade || '',
        opcaoTmft: item.opcaoTmft || item.opcao || '',
        nome: item.nome || '',
        postoEfe: item.postoEfe || '',
        especialidadeEfe: item.especialidadeEfe || '',
        opcaoEfe: item.opcaoEfe || '',
        om: item.om || '',
        isVago: item.isVago || item.nome?.toUpperCase() === 'VAGO',
        isExtraLotacao: item.isExtraLotacao || false,
        quadroTmft: item.quadroTmft || item.quadro || '',
        quadroEfe: item.quadroEfe || '',
      }));
      
      setPersonnelData(mappedRecords);
      console.log(`Loaded ${mappedRecords.length} personnel records for search`);
    } catch (error) {
      console.error("Error fetching personnel data:", error);
      toast.error("Erro ao carregar dados do efetivo");
    } finally {
      setIsLoadingPersonnel(false);
    }
  };

  // When dialog opens for ALTERACAO/EXCLUSAO, fetch personnel data
  useEffect(() => {
    if (isDialogOpen && (formType === "ALTERACAO" || formType === "EXCLUSAO")) {
      if (personnelData.length === 0) {
        fetchPersonnelData();
      }
      setShowPersonnelSearch(true);
    } else {
      setShowPersonnelSearch(false);
    }
  }, [isDialogOpen, formType]);

  // Filter personnel based on search
  const filteredPersonnel = useMemo(() => {
    if (!searchQuery.trim()) return personnelData.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return personnelData
      .filter(p => 
        p.nome?.toLowerCase().includes(query) ||
        p.neo?.toLowerCase().includes(query) ||
        p.postoTmft?.toLowerCase().includes(query) ||
        p.especialidadeTmft?.toLowerCase().includes(query) ||
        p.cargo?.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [personnelData, searchQuery]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const withTimeout = <T,>(promise: Promise<T>, ms = 25000) =>
        Promise.race([
          promise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
        ]);

      const { data, error } = await withTimeout(
        supabase.functions.invoke("manage-personnel-requests", {
          body: { action: "list" },
        }),
        25000,
      );

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
    if (authLoading) return;
    
    if (!isAuthenticated) {
      setIsLoading(false);
      navigate("/login");
      return;
    }
    
    fetchRequests();
  }, [authLoading, isAuthenticated, navigate]);

  // Select a personnel from search results
  const handleSelectPersonnel = (personnel: PersonnelRecord) => {
    setSelectedPersonnel(personnel);
    // Armazena dados ORIGINAIS do efetivo (EFE) para comparação
    setOriginalData({
      neo: personnel.neo,
      cargo: personnel.cargo,
      postoEfe: personnel.postoEfe || "",
      quadroEfe: personnel.quadroEfe || "",
      especialidadeEfe: personnel.especialidadeEfe || "",
      opcaoEfe: personnel.opcaoEfe || "",
      nome: personnel.nome,
      setor: personnel.setor,
      om: personnel.om || role,
    });
    
    // Pre-fill form with EFETIVO data (dados reais do militar)
    setFormData({
      neo: personnel.neo || "",
      cargo: personnel.cargo || "",
      postoEfe: personnel.postoEfe || "",
      quadroEfe: personnel.quadroEfe || "",
      especialidadeEfe: personnel.especialidadeEfe || "",
      opcaoEfe: personnel.opcaoEfe || "",
      nome: personnel.nome || "",
      setor: personnel.setor || "",
      om: personnel.om || role || "",
      justification: formData.justification,
    });
    
    setShowPersonnelSearch(false);
    setSearchQuery("");
  };

  const resetForm = () => {
    setFormData({ 
      neo: "", cargo: "", postoEfe: "", quadroEfe: "", 
      especialidadeEfe: "", opcaoEfe: "", nome: "", 
      setor: "", om: "", justification: "" 
    });
    setSelectedPersonnel(null);
    setOriginalData(null);
    setSearchQuery("");
    setShowPersonnelSearch(false);
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.justification) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // For ALTERACAO/EXCLUSAO, require selecting a personnel first
    if ((formType === "ALTERACAO" || formType === "EXCLUSAO") && !originalData) {
      toast.error("Selecione um militar da NEO para continuar");
      return;
    }

    setIsSubmitting(true);
    try {
      const personnelDataPayload = {
        neo: formData.neo,
        cargo: formData.cargo,
        postoEfe: formData.postoEfe,
        quadroEfe: formData.quadroEfe,
        especialidadeEfe: formData.especialidadeEfe,
        opcaoEfe: formData.opcaoEfe,
        nome: formData.nome,
        setor: formData.setor,
        om: formData.om || role,
      };

      const { data, error } = await supabase.functions.invoke("manage-personnel-requests", {
        body: {
          action: "create",
          request_type: formType,
          personnel_data: personnelDataPayload,
          original_data: originalData,
          justification: formData.justification,
        },
      });

      if (error) throw error;

      toast.success("Solicitação criada com sucesso!");
      setIsDialogOpen(false);
      resetForm();
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

  if (authLoading || (!isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
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
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Solicitação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Solicitação</Label>
                    <Select value={formType} onValueChange={(v) => {
                      setFormType(v as RequestType);
                      resetForm();
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCLUSAO">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Inclusão - Adicionar novo militar
                          </div>
                        </SelectItem>
                        <SelectItem value="ALTERACAO">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Alteração - Modificar dados existentes
                          </div>
                        </SelectItem>
                        <SelectItem value="EXCLUSAO">
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Exclusão - Remover militar
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Personnel Search for ALTERACAO/EXCLUSAO */}
                  {(formType === "ALTERACAO" || formType === "EXCLUSAO") && (
                    <Card className="border-dashed border-2">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          {selectedPersonnel ? "Militar Selecionado" : "Buscar Militar na NEO"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedPersonnel ? (
                          <div className="space-y-2">
                            <div className="p-3 bg-muted rounded-lg">
                                <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{selectedPersonnel.nome}</p>
                                  <p className="text-sm text-muted-foreground">
                                    NEO: {selectedPersonnel.neo} | {selectedPersonnel.postoEfe || selectedPersonnel.postoTmft} - {selectedPersonnel.especialidadeEfe || selectedPersonnel.especialidadeTmft}
                                    {selectedPersonnel.cargo && ` | ${selectedPersonnel.cargo}`}
                                  </p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPersonnel(null);
                                    setOriginalData(null);
                                    setShowPersonnelSearch(true);
                                  }}
                                >
                                  Trocar
                                </Button>
                              </div>
                            </div>
                            {formType === "ALTERACAO" && (
                              <p className="text-xs text-muted-foreground">
                                Modifique os campos abaixo com os novos dados
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Digite nome, NEO, cargo ou especialidade..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                              />
                            </div>
                            {isLoadingPersonnel ? (
                              <div className="flex items-center justify-center py-4">
                                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <ScrollArea className="h-48">
                                <div className="space-y-1">
                                  {filteredPersonnel.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                      Nenhum militar encontrado
                                    </p>
                                  ) : (
                                    filteredPersonnel.map((person, idx) => (
                                      <button
                                        key={idx}
                                        className="w-full text-left p-2 rounded hover:bg-muted transition-colors flex items-center gap-3"
                                        onClick={() => handleSelectPersonnel(person)}
                                      >
                                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-medium truncate">{person.nome}</p>
                                          <p className="text-xs text-muted-foreground">
                                            NEO: {person.neo} | {person.postoEfe || person.postoTmft} - {person.especialidadeEfe || person.especialidadeTmft}
                                            {person.cargo && ` | ${person.cargo}`}
                                          </p>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Form Fields */}
                  {(formType === "INCLUSAO" || selectedPersonnel) && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>NEO *</Label>
                          <Input
                            value={formData.neo}
                            onChange={(e) => setFormData(prev => ({ ...prev, neo: e.target.value }))}
                            placeholder="Número da NEO"
                            disabled={formType === "EXCLUSAO" || formType === "ALTERACAO"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cargo/Incumbência</Label>
                          <Input
                            value={formData.cargo}
                            onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                            placeholder="Ex: Auxiliar de Enfermagem"
                            disabled={formType === "EXCLUSAO"}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Graduação (Efetivo)</Label>
                          <Input
                            value={formData.postoEfe}
                            onChange={(e) => setFormData(prev => ({ ...prev, postoEfe: e.target.value }))}
                            placeholder="Ex: 3SG, CB, SD"
                            disabled={formType === "EXCLUSAO"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Quadro (Efetivo)</Label>
                          <Input
                            value={formData.quadroEfe}
                            onChange={(e) => setFormData(prev => ({ ...prev, quadroEfe: e.target.value }))}
                            placeholder="Ex: QT, RM"
                            disabled={formType === "EXCLUSAO"}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Especialidade (Efetivo)</Label>
                          <Input
                            value={formData.especialidadeEfe}
                            onChange={(e) => setFormData(prev => ({ ...prev, especialidadeEfe: e.target.value }))}
                            placeholder="Ex: MO, MQ, ET"
                            disabled={formType === "EXCLUSAO"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Opção (Efetivo)</Label>
                          <Input
                            value={formData.opcaoEfe}
                            onChange={(e) => setFormData(prev => ({ ...prev, opcaoEfe: e.target.value }))}
                            placeholder="Ex: CARREIRA, TTC, RM2"
                            disabled={formType === "EXCLUSAO"}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={formData.nome}
                          onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                          placeholder="Nome completo"
                          disabled={formType === "EXCLUSAO"}
                        />
                      </div>

                      {/* Show original vs new data for ALTERACAO */}
                      {formType === "ALTERACAO" && originalData && (
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Comparação de Dados do Efetivo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Dados Atuais (Efetivo)</p>
                                <div className="space-y-1">
                                  <p><span className="text-muted-foreground">NEO:</span> {originalData.neo}</p>
                                  <p><span className="text-muted-foreground">Cargo:</span> {originalData.cargo || "-"}</p>
                                  <p><span className="text-muted-foreground">Graduação:</span> {originalData.postoEfe || "-"}</p>
                                  <p><span className="text-muted-foreground">Quadro:</span> {originalData.quadroEfe || "-"}</p>
                                  <p><span className="text-muted-foreground">Especialidade:</span> {originalData.especialidadeEfe || "-"}</p>
                                  <p><span className="text-muted-foreground">Opção:</span> {originalData.opcaoEfe || "-"}</p>
                                  <p><span className="text-muted-foreground">Nome:</span> {originalData.nome}</p>
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-primary mb-1">Novos Dados</p>
                                <div className="space-y-1">
                                  <p><span className="text-muted-foreground">NEO:</span> {formData.neo}</p>
                                  <p className={formData.cargo !== originalData.cargo ? "text-primary font-medium" : ""}>
                                    <span className="text-muted-foreground">Cargo:</span> {formData.cargo || "-"}
                                  </p>
                                  <p className={formData.postoEfe !== originalData.postoEfe ? "text-primary font-medium" : ""}>
                                    <span className="text-muted-foreground">Graduação:</span> {formData.postoEfe || "-"}
                                  </p>
                                  <p className={formData.quadroEfe !== originalData.quadroEfe ? "text-primary font-medium" : ""}>
                                    <span className="text-muted-foreground">Quadro:</span> {formData.quadroEfe || "-"}
                                  </p>
                                  <p className={formData.especialidadeEfe !== originalData.especialidadeEfe ? "text-primary font-medium" : ""}>
                                    <span className="text-muted-foreground">Especialidade:</span> {formData.especialidadeEfe || "-"}
                                  </p>
                                  <p className={formData.opcaoEfe !== originalData.opcaoEfe ? "text-primary font-medium" : ""}>
                                    <span className="text-muted-foreground">Opção:</span> {formData.opcaoEfe || "-"}
                                  </p>
                                  <p className={formData.nome !== originalData.nome ? "text-primary font-medium" : ""}>
                                    <span className="text-muted-foreground">Nome:</span> {formData.nome}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

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
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Card de Solicitações Pendentes - Apenas para COpAb */}
        {role === "COPAB" && stats.pendentes > 0 && (
          <Card 
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white cursor-pointer hover:shadow-lg transition-all"
            onClick={() => navigate("/admin/solicitacoes")}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 rounded-full p-3">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Solicitações Pendentes</h3>
                    <p className="text-sm opacity-90">
                      {stats.pendentes} {stats.pendentes === 1 ? 'solicitação aguarda' : 'solicitações aguardam'} análise
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="bg-white/90 hover:bg-white text-orange-600 font-semibold border-0 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/admin/solicitacoes");
                  }}
                >
                  Analisar Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="text-2xl font-bold text-amber-600">{stats.pendentes}</div>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{stats.aprovados}</div>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.rejeitados}</div>
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

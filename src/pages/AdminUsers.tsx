import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Loader2, CheckCircle, XCircle, AlertCircle, Key, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import backgroundImage from "@/assets/military-background.png";

interface ProvisionResult {
  om: string;
  status: string;
  error?: string;
}

interface OMUser {
  id: string;
  email: string;
  om: string;
  created_at: string;
  last_sign_in: string | null;
}

const AdminUsers = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProvisionResult[] | null>(null);
  const [omUsers, setOmUsers] = useState<OMUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [addOmDialogOpen, setAddOmDialogOpen] = useState(false);
  const [selectedOm, setSelectedOm] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newOmName, setNewOmName] = useState("");
  const [newOmPassword, setNewOmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [creatingOm, setCreatingOm] = useState(false);
  const [deletingOm, setDeletingOm] = useState<string | null>(null);
  const navigate = useNavigate();
  const { role } = useAuth();

  // Only COPAB can access this page
  if (role !== "COPAB") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
        <Card className="w-full max-w-md relative z-10 bg-red-600/90 backdrop-blur-sm text-white border-red-700">
          <CardHeader className="text-center">
            <AlertCircle size={48} className="mx-auto mb-4" />
            <CardTitle className="text-2xl">Acesso Negado</CardTitle>
            <CardDescription className="text-white/90">
              Apenas usuários COPAB podem acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full bg-white text-red-600 hover:bg-white/90">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchOmUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("manage-om", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "list", om: "all" },
      });

      if (error) {
        console.error("Error fetching OM users:", error);
        return;
      }

      setOmUsers(data.users || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchOmUsers();
  }, []);

  const handleProvisionUsers = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Você precisa estar logado para executar esta ação");
        return;
      }

      const { data, error } = await supabase.functions.invoke("provision-om-users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) {
        console.error("Error provisioning users:", error);
        toast.error("Erro ao provisionar usuários: " + error.message);
        return;
      }

      setResults(data.results);
      fetchOmUsers();

      const { created, updated, errors } = data.summary;
      toast.success(`Usuários provisionados: ${created} criados, ${updated} atualizados, ${errors} erros`);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erro ao provisionar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedOm || !newPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("update-om-password", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { om: selectedOm, newPassword },
      });

      if (error) {
        toast.error("Erro ao atualizar senha: " + error.message);
        return;
      }

      toast.success(`Senha da OM ${selectedOm} atualizada com sucesso!`);
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedOm("");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erro ao atualizar senha");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCreateOm = async () => {
    if (!newOmName) {
      toast.error("Informe o nome da OM");
      return;
    }

    const password = newOmPassword || `${newOmName.toUpperCase()}01`;
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setCreatingOm(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-om", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "create", om: newOmName, password },
      });

      if (error) {
        toast.error("Erro ao criar OM: " + error.message);
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`OM ${newOmName} criada com sucesso!`);
      setAddOmDialogOpen(false);
      setNewOmName("");
      setNewOmPassword("");
      fetchOmUsers();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erro ao criar OM");
    } finally {
      setCreatingOm(false);
    }
  };

  const handleDeleteOm = async (om: string) => {
    if (!confirm(`Tem certeza que deseja excluir a OM ${om}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingOm(om);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-om", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { action: "delete", om },
      });

      if (error) {
        toast.error("Erro ao excluir OM: " + error.message);
        return;
      }

      toast.success(`OM ${om} excluída com sucesso!`);
      fetchOmUsers();
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erro ao excluir OM");
    } finally {
      setDeletingOm(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "created":
        return (
          <Badge className="bg-green-500">
            <CheckCircle size={14} className="mr-1" /> Criado
          </Badge>
        );
      case "updated":
        return (
          <Badge className="bg-blue-500">
            <CheckCircle size={14} className="mr-1" /> Atualizado
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-500">
            <XCircle size={14} className="mr-1" /> Erro
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openPasswordDialog = (om: string) => {
    setSelectedOm(om);
    setNewPassword("");
    setShowPassword(false);
    setPasswordDialogOpen(true);
  };

  return (
    <div className="min-h-screen p-4 relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Administração de Usuários</h1>
        </div>

        {/* Provision Users Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={24} />
              Provisionar Usuários por OM
            </CardTitle>
            <CardDescription>
              Cria ou atualiza usuários para as OMs cadastradas com as credenciais padrão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleProvisionUsers} disabled={loading} className="mb-4">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Provisionando...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Provisionar Usuários
                </>
              )}
            </Button>

            {results && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.om}>
                      <TableCell className="font-medium">{result.om}</TableCell>
                      <TableCell>{getStatusBadge(result.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{result.error || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Manage OMs Card */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key size={24} />
                Gerenciar OMs
              </CardTitle>
              <CardDescription>
                Altere senhas, adicione ou remova OMs do sistema.
              </CardDescription>
            </div>
            <Dialog open={addOmDialogOpen} onOpenChange={setAddOmDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar OM
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova OM</DialogTitle>
                  <DialogDescription>
                    Crie um novo usuário para uma Organização Militar.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="om-name">Nome da OM</Label>
                    <Input
                      id="om-name"
                      placeholder="Ex: NOVA-OM"
                      value={newOmName}
                      onChange={(e) => setNewOmName(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="om-password">Senha (opcional)</Label>
                    <Input
                      id="om-password"
                      type="password"
                      placeholder={newOmName ? `Padrão: ${newOmName}01` : "Deixe vazio para usar padrão"}
                      value={newOmPassword}
                      onChange={(e) => setNewOmPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se não informada, será usada a senha padrão: NOME_OM + 01
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOmDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateOm} disabled={creatingOm}>
                    {creatingOm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Criar OM
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OM</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {omUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.om}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.last_sign_in 
                          ? new Date(user.last_sign_in).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPasswordDialog(user.om)}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            Alterar Senha
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteOm(user.om)}
                            disabled={deletingOm === user.om}
                          >
                            {deletingOm === user.om ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {omUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma OM cadastrada. Clique em "Provisionar Usuários" para criar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Senha - {selectedOm}</DialogTitle>
              <DialogDescription>
                Digite a nova senha para a OM {selectedOm}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdatePassword} disabled={updatingPassword}>
                {updatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Atualizar Senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informações de Acesso</CardTitle>
            <CardDescription>
              COPAB e CSUPAB possuem níveis de acesso diferenciados. As demais OMs acessam apenas seus próprios dados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">COPAB</Badge>
                <span className="text-muted-foreground">Acesso total - todas as OMs</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-600">CSUPAB</Badge>
                <span className="text-muted-foreground">Acesso às OMs subordinadas</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Demais OMs</Badge>
                <span className="text-muted-foreground">Acesso apenas aos próprios dados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;

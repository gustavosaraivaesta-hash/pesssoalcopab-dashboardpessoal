import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import backgroundImage from "@/assets/military-background.png";

interface ProvisionResult {
  om: string;
  status: string;
  error?: string;
}

const AdminUsers = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProvisionResult[] | null>(null);
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

  const handleProvisionUsers = async () => {
    setLoading(true);
    setResults(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Você precisa estar logado para executar esta ação");
        return;
      }

      const { data, error } = await supabase.functions.invoke("provision-om-users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error provisioning users:", error);
        toast.error("Erro ao provisionar usuários: " + error.message);
        return;
      }

      setResults(data.results);

      const { created, updated, errors } = data.summary;
      toast.success(`Usuários provisionados: ${created} criados, ${updated} atualizados, ${errors} erros`);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Erro ao provisionar usuários");
    } finally {
      setLoading(false);
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

  const omCredentials = [
    { om: "BAMRJ", login: "BAMRJ", senha: "BAMRJ01" },
    { om: "CMM", login: "CMM", senha: "CMM01" },
    { om: "DEPCMRJ", login: "DEPCMRJ", senha: "DEPCMRJ01" },
    { om: "CDAM", login: "CDAM", senha: "CDAM01" },
    { om: "DEPSMRJ", login: "DEPSMRJ", senha: "DEPSMRJ01" },
    { om: "DEPSIMRJ", login: "DEPSIMRJ", senha: "DEPSIMRJ01" },
    { om: "DEPMSMRJ", login: "DEPMSMRJ", senha: "DEPMSMRJ01" },
    { om: "DEPFMRJ", login: "DEPFMRJ", senha: "DEPFMRJ01" },
    { om: "CDU-BAMRJ", login: "CDU-BAMRJ", senha: "CDU-BAMRJ01" },
    { om: "CDU-1DN", login: "CDU-1DN", senha: "CDU-1DN01" },
  ];

  return (
    <div className="min-h-screen p-4 relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Administração de Usuários</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users size={24} />
              Provisionar Usuários por OM
            </CardTitle>
            <CardDescription>
              Cria ou atualiza usuários para cada Organização Militar com as credenciais padrão. Cada OM terá acesso
              apenas aos seus próprios dados.
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

        <Card>
          <CardHeader>
            <CardTitle>Credenciais das OMs</CardTitle>
            <CardDescription>
              Login e senha padrão para cada Organização Militar. Além destas, COPAB e CSUPAB possuem níveis de acesso
              diferenciados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização Militar</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-blue-50 dark:bg-blue-950">
                  <TableCell className="font-medium">COPAB</TableCell>
                  <TableCell>COPAB</TableCell>
                  <TableCell>****</TableCell>
                  <TableCell>
                    <Badge className="bg-green-600">Todas as OMs</Badge>
                  </TableCell>
                </TableRow>
                <TableRow className="bg-blue-50 dark:bg-blue-950">
                  <TableCell className="font-medium">CSUPAB</TableCell>
                  <TableCell>CSUPAB</TableCell>
                  <TableCell>CSUPAB01</TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-600">OMs Subordinadas</Badge>
                  </TableCell>
                </TableRow>
                {omCredentials.map((cred) => (
                  <TableRow key={cred.om}>
                    <TableCell className="font-medium">{cred.om}</TableCell>
                    <TableCell>{cred.login}</TableCell>
                    <TableCell className="font-mono">{cred.senha}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Apenas {cred.om}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;

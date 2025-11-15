import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EspecialidadeData {
  especialidade: string;
  graduacao: string;
  om: string;
  tmft_sum: number;
  tmft_ca: number;
  tmft_rm2: number;
  efe_sum: number;
  efe_ca: number;
  efe_rm2: number;
}

const Especialidades = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<EspecialidadeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOM, setSelectedOM] = useState<string>("");

  const fetchEspecialidadesData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-especialidades-data"
      );

      if (error) throw error;

      setData(result.data || []);
      toast.success("Dados carregados com sucesso!");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    fetchEspecialidadesData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // Filter data by selected OM
  const filteredData = selectedOM 
    ? data.filter(item => item.om === selectedOM)
    : data;

  // Get unique OMs for dropdown
  const uniqueOMs = Array.from(new Set(data.map(item => item.om))).filter(Boolean).sort();

  // Group data by especialidade
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.especialidade]) {
      acc[item.especialidade] = [];
    }
    acc[item.especialidade].push(item);
    return acc;
  }, {} as Record<string, EspecialidadeData[]>);

  // Calculate totals for each especialidade
  const calculateTotals = (items: EspecialidadeData[]) => {
    return items.reduce(
      (totals, item) => ({
        tmft_sum: totals.tmft_sum + item.tmft_sum,
        tmft_ca: totals.tmft_ca + item.tmft_ca,
        tmft_rm2: totals.tmft_rm2 + item.tmft_rm2,
        efe_sum: totals.efe_sum + item.efe_sum,
        efe_ca: totals.efe_ca + item.efe_ca,
        efe_rm2: totals.efe_rm2 + item.efe_rm2,
      }),
      { tmft_sum: 0, tmft_ca: 0, tmft_rm2: 0, efe_sum: 0, efe_ca: 0, efe_rm2: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Especialidades por Graduação
          </h1>
          <Button
            variant="outline"
            onClick={fetchEspecialidadesData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground">
              Filtrar por OM:
            </label>
            <select
              value={selectedOM}
              onChange={(e) => setSelectedOM(e.target.value)}
              className="px-4 py-2 rounded-md border border-border bg-background text-foreground"
            >
              <option value="">Todas as OMs</option>
              {uniqueOMs.map((om) => (
                <option key={om} value={om}>
                  {om}
                </option>
              ))}
            </select>
            {selectedOM && (
              <div className="text-sm text-muted-foreground">
                Mostrando <span className="font-bold text-foreground">{filteredData.length}</span> registros da OM <span className="font-bold text-foreground">{selectedOM}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {selectedOM ? (
            // Tabela consolidada quando OM está selecionada
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Quantidades por Especialidade e Graduação - {selectedOM}
              </h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Especialidade</TableHead>
                      <TableHead className="text-center">SO</TableHead>
                      <TableHead className="text-center">1SG</TableHead>
                      <TableHead className="text-center">2SG</TableHead>
                      <TableHead className="text-center">3SG</TableHead>
                      <TableHead className="text-center">CB</TableHead>
                      <TableHead className="text-center">MN</TableHead>
                      <TableHead className="text-center font-bold">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(groupedData).map(([especialidade, items]) => {
                      const graduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
                      const valores = graduacoes.map(grad => {
                        const item = items.find(i => i.graduacao === grad);
                        return item ? item.tmft_sum : 0;
                      });
                      const total = valores.reduce((sum, val) => sum + val, 0);
                      
                      return (
                        <TableRow key={especialidade}>
                          <TableCell className="font-medium">{especialidade}</TableCell>
                          {valores.map((val, idx) => (
                            <TableCell key={idx} className="text-center">
                              {val > 0 ? val : '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold bg-muted/50">
                            {total}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            // Visualização agrupada quando nenhuma OM está selecionada
            Object.entries(groupedData).map(([especialidade, items]) => {
              const totals = calculateTotals(items);
              return (
                <div key={especialidade} className="bg-card rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {especialidade}
                  </h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Graduação</TableHead>
                        <TableHead colSpan={3} className="text-center border-x">
                          TMFT
                        </TableHead>
                        <TableHead colSpan={3} className="text-center">
                          EFE
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead className="text-center">∑</TableHead>
                        <TableHead className="text-center">CA</TableHead>
                        <TableHead className="text-center border-r">RM2</TableHead>
                        <TableHead className="text-center">∑</TableHead>
                        <TableHead className="text-center">CA</TableHead>
                        <TableHead className="text-center">RM2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.graduacao}</TableCell>
                          <TableCell className="text-center">{item.tmft_sum}</TableCell>
                          <TableCell className="text-center">{item.tmft_ca}</TableCell>
                          <TableCell className="text-center border-r">{item.tmft_rm2}</TableCell>
                          <TableCell className="text-center">{item.efe_sum}</TableCell>
                          <TableCell className="text-center">{item.efe_ca}</TableCell>
                          <TableCell className="text-center">{item.efe_rm2}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-center">{totals.tmft_sum}</TableCell>
                        <TableCell className="text-center">{totals.tmft_ca}</TableCell>
                        <TableCell className="text-center border-r">{totals.tmft_rm2}</TableCell>
                        <TableCell className="text-center">{totals.efe_sum}</TableCell>
                        <TableCell className="text-center">{totals.efe_ca}</TableCell>
                        <TableCell className="text-center">{totals.efe_rm2}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </div>

        <Button
          onClick={handleLogout}
          variant="destructive"
          className="fixed bottom-6 left-6"
        >
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Especialidades;

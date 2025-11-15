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
      // Usar a função que já está funcionando para a dashboard
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-sheets-data"
      );

      if (error) throw error;

      console.log("Dados completos recebidos:", result);
      
      // Os dados já vêm no formato correto da função fetch-sheets-data
      const allData = result.data || [];
      
      console.log("Total de registros da dashboard:", allData.length);
      if (allData.length > 0) {
        console.log("Exemplo de registro:", allData[0]);
      }
      
      setData(allData);
      toast.success(`Dados carregados: ${allData.length} registros`);
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

  // OMs específicas para o dropdown
  const uniqueOMs = [
    'BAMRJ',
    'CDAM',
    'CDU-1DN',
    'CDU-BAMRJ',
    'CMM',
    'COMRJ',
    'COpAb',
    'CSupAb',
    'DepCMRJ',
    'DepFMRJ',
    'DepMSMRJ',
    'DepSIMRJ',
    'DepSMRJ'
  ];

  // Calcular contagem de registros por OM
  const omCounts = uniqueOMs.reduce((acc, om) => {
    acc[om] = data.filter(item => item.om === om).length;
    return acc;
  }, {} as Record<string, number>);

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

  // Group data by especialidade and graduacao for spreadsheet view
  const spreadsheetData = filteredData.reduce((acc, item) => {
    const key = item.especialidade;
    if (!acc[key]) {
      acc[key] = {
        SO: {} as Record<string, { tmft: number; efe: number }>,
        '1SG': {} as Record<string, { tmft: number; efe: number }>,
        '2SG': {} as Record<string, { tmft: number; efe: number }>,
        '3SG': {} as Record<string, { tmft: number; efe: number }>,
        'CB': {} as Record<string, { tmft: number; efe: number }>,
        'MN': {} as Record<string, { tmft: number; efe: number }>,
      };
    }
    
    const grad = item.graduacao;
    
    // Ensure graduacao exists in the structure
    if (!acc[key][grad]) {
      console.warn(`Graduação '${grad}' não esperada para especialidade '${key}'. Criando entrada...`);
      acc[key][grad] = {} as Record<string, { tmft: number; efe: number }>;
    }
    
    if (!acc[key][grad][item.om]) {
      acc[key][grad][item.om] = { tmft: 0, efe: 0 };
    }
    acc[key][grad][item.om].tmft += item.tmft_sum;
    acc[key][grad][item.om].efe += item.efe_sum;
    
    return acc;
  }, {} as Record<string, Record<string, Record<string, { tmft: number; efe: number }>>>);

  // Get all unique OMs in the filtered data
  const omsInData = Array.from(new Set(filteredData.map(item => item.om))).sort();
  
  console.log("Spreadsheet data agrupada:", spreadsheetData);
  console.log("OMs nos dados:", omsInData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              size="icon"
              className="hover:scale-105 transition-transform"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Especialidades por OM
            </h1>
          </div>
          <Button
            onClick={fetchEspecialidadesData}
            variant="outline"
            size="icon"
            className="hover:scale-105 transition-transform"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter */}
        <div className="bg-card rounded-lg p-4 shadow-md border border-border">
          <label className="block text-sm font-medium mb-2">Filtrar por OM:</label>
          <select
            value={selectedOM}
            onChange={(e) => setSelectedOM(e.target.value)}
            className="w-full md:w-auto px-4 py-2 rounded-md border border-border bg-background text-foreground"
          >
            <option value="">Todas as OMs</option>
            {uniqueOMs.map((om) => (
              <option key={om} value={om}>
                {om} ({omCounts[om] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Spreadsheet View */}
        <div className="bg-card rounded-lg shadow-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-20 min-w-[200px] border-r-2 border-border">
                  Especialidade
                </TableHead>
                <TableHead className="sticky left-[200px] bg-card z-20 min-w-[80px] border-r-2 border-border text-center">
                  Graduação
                </TableHead>
                {omsInData.map((om) => (
                  <TableHead key={om} colSpan={2} className="text-center border-r border-border bg-accent/20">
                    {om}
                  </TableHead>
                ))}
                <TableHead className="text-center bg-primary/10">TOTAL</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-20 border-r-2 border-border"></TableHead>
                <TableHead className="sticky left-[200px] bg-card z-20 border-r-2 border-border"></TableHead>
                {omsInData.map((om) => (
                  <>
                    <TableHead key={`${om}-tmft`} className="text-center text-xs bg-accent/10">
                      TMFT
                    </TableHead>
                    <TableHead key={`${om}-efe`} className="text-center text-xs border-r border-border bg-accent/10">
                      EFE
                    </TableHead>
                  </>
                ))}
                <TableHead className="text-center text-xs bg-primary/10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(spreadsheetData).map(([especialidade, graduacoes]) => {
                const graduacaoKeys = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
                
                // Calculate totals for each OM in this especialidade
                const especialidadeTotals: Record<string, { tmft: number; efe: number }> = {};
                omsInData.forEach(om => {
                  especialidadeTotals[om] = { tmft: 0, efe: 0 };
                  graduacaoKeys.forEach(grad => {
                    const omData = graduacoes[grad]?.[om];
                    if (omData) {
                      especialidadeTotals[om].tmft += omData.tmft;
                      especialidadeTotals[om].efe += omData.efe;
                    }
                  });
                });
                
                // Calculate grand total for this especialidade
                let grandTotal = 0;
                Object.values(especialidadeTotals).forEach(totals => {
                  grandTotal += totals.tmft;
                });
                
                const rows = graduacaoKeys.map((grad, idx) => {
                  const omData = graduacoes[grad] || {};
                  
                  // Calculate total for this row
                  let rowTotal = 0;
                  omsInData.forEach(om => {
                    rowTotal += (omData[om]?.tmft || 0);
                  });
                  
                  return (
                    <TableRow key={`${especialidade}-${grad}`} className="hover:bg-accent/5">
                      {idx === 0 && (
                        <TableCell
                          rowSpan={7}
                          className="sticky left-0 bg-card z-10 font-medium border-r-2 border-border align-top"
                        >
                          {especialidade}
                        </TableCell>
                      )}
                      <TableCell className="sticky left-[200px] bg-card z-10 text-center border-r-2 border-border font-medium">
                        {grad}
                      </TableCell>
                      {omsInData.map((om) => (
                        <>
                          <TableCell key={`${om}-tmft`} className="text-center">
                            {omData[om]?.tmft || 0}
                          </TableCell>
                          <TableCell key={`${om}-efe`} className="text-center border-r border-border">
                            {omData[om]?.efe || 0}
                          </TableCell>
                        </>
                      ))}
                      <TableCell className="text-center font-semibold bg-primary/5">
                        {rowTotal}
                      </TableCell>
                    </TableRow>
                  );
                });
                
                // Add total row
                rows.push(
                  <TableRow key={`${especialidade}-total`} className="bg-primary/10 font-bold border-t-2 border-primary">
                    <TableCell className="sticky left-[200px] bg-primary/10 z-10 text-center border-r-2 border-border">
                      TOTAL
                    </TableCell>
                    {omsInData.map((om) => (
                      <>
                        <TableCell key={`${om}-tmft-total`} className="text-center">
                          {especialidadeTotals[om]?.tmft || 0}
                        </TableCell>
                        <TableCell key={`${om}-efe-total`} className="text-center border-r border-border">
                          {especialidadeTotals[om]?.efe || 0}
                        </TableCell>
                      </>
                    ))}
                    <TableCell className="text-center bg-primary/20">
                      {grandTotal}
                    </TableCell>
                  </TableRow>
                );
                
                return rows;
              })}
            </TableBody>
          </Table>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="fixed bottom-6 right-6 shadow-lg hover:scale-105 transition-transform"
        >
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Especialidades;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
      console.log("🔄 Iniciando busca dos dados da Página 3...");
      
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-especialidades-data"
      );

      console.log("📦 Resposta completa da API:", result);
      console.log("❌ Erro da API:", error);

      if (error) {
        console.error("❌ Erro ao chamar função:", error);
        throw error;
      }

      const especialidadesData = result?.data || [];
      
      console.log("✅ Total de registros extraídos:", especialidadesData.length);
      console.log("📊 Todos os dados:", especialidadesData);
      
      if (especialidadesData.length > 0) {
        console.log("📝 Primeiro registro:", especialidadesData[0]);
        console.log("📝 Último registro:", especialidadesData[especialidadesData.length - 1]);
      } else {
        console.warn("⚠️ Nenhum dado encontrado no array!");
      }
      
      setData(especialidadesData);
      toast.success(`✅ ${especialidadesData.length} registros carregados da Página 3`);
    } catch (error) {
      console.error("💥 Erro fatal:", error);
      toast.error("Erro ao carregar dados da Página 3");
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

    // Busca inicial
    fetchEspecialidadesData();

    // Auto-refresh a cada 5 segundos
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh dos dados da Página 3...');
      fetchEspecialidadesData();
    }, 5000); // 5 segundos

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageTitle = selectedOM 
      ? `Especialidades - ${selectedOM}`
      : "Especialidades - Todas as OMs";
    
    doc.setFontSize(16);
    doc.text(pageTitle, 14, 15);
    doc.setFontSize(10);
    doc.text(`Total de registros: ${filteredData.length}`, 14, 22);

    const tableData: any[] = [];
    const graduacaoKeys = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];

    Object.entries(spreadsheetData).forEach(([especialidade, graduacoes]) => {
      graduacaoKeys.forEach(grad => {
        const omData = graduacoes[grad] || {};
        let rowTmft = 0;
        let rowEfe = 0;
        
        omsInData.forEach(om => {
          rowTmft += (omData[om]?.tmft || 0);
          rowEfe += (omData[om]?.efe || 0);
        });

        if (rowTmft > 0 || rowEfe > 0) {
          tableData.push([
            especialidade,
            grad,
            rowTmft,
            rowEfe,
            rowTmft
          ]);
        }
      });
    });

    autoTable(doc, {
      head: [['Especialidade', 'Graduação', 'TMFT', 'EFE', 'TOTAL']],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`especialidades_${selectedOM || 'todas'}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const exportToExcel = () => {
    const graduacaoKeys = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
    let csvContent = "Especialidade,Graduação,TMFT,EFE,TOTAL\n";

    Object.entries(spreadsheetData).forEach(([especialidade, graduacoes]) => {
      graduacaoKeys.forEach(grad => {
        const omData = graduacoes[grad] || {};
        let rowTmft = 0;
        let rowEfe = 0;
        
        omsInData.forEach(om => {
          rowTmft += (omData[om]?.tmft || 0);
          rowEfe += (omData[om]?.efe || 0);
        });

        if (rowTmft > 0 || rowEfe > 0) {
          csvContent += `"${especialidade}","${grad}",${rowTmft},${rowEfe},${rowTmft}\n`;
        }
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `especialidades_${selectedOM || 'todas'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel exportado com sucesso!");
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

  // Lista fixa de todas as OMs esperadas
  const allOMs = [
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
  ].sort();

  // Filter data by selected OM
  const filteredData = selectedOM 
    ? data.filter(item => item.om === selectedOM)
    : data;

  // Calcular contagem de registros por OM
  const omCounts = allOMs.reduce((acc, om) => {
    acc[om] = data.filter(item => item.om === om).length;
    return acc;
  }, {} as Record<string, number>);

  console.log("📊 OMs definidas:", allOMs);
  console.log("📊 Contagem por OM:", omCounts);
  console.log("📊 Total de registros filtrados:", filteredData.length);
  console.log("📊 OM selecionada:", selectedOM);

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
      acc[key][grad] = {} as Record<string, { tmft: number; efe: number }>;
    }
    
    if (!acc[key][grad][item.om]) {
      acc[key][grad][item.om] = { tmft: 0, efe: 0 };
    }
    acc[key][grad][item.om].tmft += item.tmft_sum;
    acc[key][grad][item.om].efe += item.efe_sum;
    
    return acc;
  }, {} as Record<string, Record<string, Record<string, { tmft: number; efe: number }>>>);

  // Get all unique OMs in the filtered data (or all if no filter)
  const omsInData = selectedOM 
    ? [selectedOM]
    : Array.from(new Set(filteredData.map(item => item.om).filter(Boolean))).sort();
  
  console.log("Spreadsheet data agrupada:", spreadsheetData);
  console.log("OMs nos dados:", omsInData);
  console.log("Dados filtrados:", filteredData);

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
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-primary">Auto-refresh 5s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hover:scale-105 transition-transform gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportToPDF}>
                  Exportar para PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  Exportar para Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={fetchEspecialidadesData}
              variant="outline"
              size="icon"
              className="hover:scale-105 transition-transform"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-card rounded-lg p-4 shadow-md border border-border">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-sm font-medium">Filtrar por OM:</label>
              <div className="text-sm font-semibold text-primary">
                {selectedOM 
                  ? `${filteredData.length} registros de ${selectedOM}`
                  : `Total: ${data.length} registros`
                }
              </div>
            </div>
            <select
              value={selectedOM}
              onChange={(e) => setSelectedOM(e.target.value)}
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground font-medium"
            >
              <option value="">📊 Todas as OMs - {data.length} registros</option>
              {allOMs.map((om) => (
                <option key={om} value={om}>
                  {om} - {omCounts[om] || 0} registros
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumo de Registros por OM */}
        <div className="bg-card rounded-lg p-6 shadow-md border border-border">
          <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Contabilização por OM
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allOMs.map((om) => {
              const count = omCounts[om] || 0;
              const isSelected = selectedOM === om;
              return (
                <div
                  key={om}
                  onClick={() => setSelectedOM(om === selectedOM ? "" : om)}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : count > 0
                      ? 'border-border bg-background hover:border-primary/50'
                      : 'border-border/50 bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {om}
                  </div>
                  <div className={`text-2xl font-bold ${
                    count > 0 ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {count === 1 ? 'registro' : 'registros'}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Geral:</span>
              <span className="text-xl font-bold text-primary">{data.length} registros</span>
            </div>
          </div>
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
                <TableHead className="text-center bg-accent/20">TMFT</TableHead>
                <TableHead className="text-center bg-accent/20">EFE</TableHead>
                <TableHead className="text-center bg-primary/10">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(spreadsheetData).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado para os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(spreadsheetData).map(([especialidade, graduacoes]) => {
                  const graduacaoKeys = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
                  
                  // Calculate totals for this especialidade
                  let especialidadeTotal = { tmft: 0, efe: 0 };
                  
                  const rows = graduacaoKeys.map((grad, idx) => {
                    const omData = graduacoes[grad] || {};
                    
                    // Calculate row totals
                    let rowTmft = 0;
                    let rowEfe = 0;
                    
                    omsInData.forEach(om => {
                      rowTmft += (omData[om]?.tmft || 0);
                      rowEfe += (omData[om]?.efe || 0);
                    });
                    
                    especialidadeTotal.tmft += rowTmft;
                    especialidadeTotal.efe += rowEfe;
                    
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
                        <TableCell className="text-center">
                          {rowTmft}
                        </TableCell>
                        <TableCell className="text-center">
                          {rowEfe}
                        </TableCell>
                        <TableCell className="text-center font-semibold bg-primary/5">
                          {rowTmft}
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
                      <TableCell className="text-center">
                        {especialidadeTotal.tmft}
                      </TableCell>
                      <TableCell className="text-center">
                        {especialidadeTotal.efe}
                      </TableCell>
                      <TableCell className="text-center bg-primary/20">
                        {especialidadeTotal.tmft}
                      </TableCell>
                    </TableRow>
                  );
                  
                  return rows;
                })
              )}
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

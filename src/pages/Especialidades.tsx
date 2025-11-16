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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import brasaoRepublica from "@/assets/brasao-republica.png";

// Função para detectar mudanças nos dados
const detectEspecialidadesChanges = (
  oldData: EspecialidadeData[], 
  newData: EspecialidadeData[]
): string[] => {
  const changes: string[] = [];
  
  // Criar mapa dos dados antigos
  const oldDataMap = new Map(
    oldData.map(item => [
      `${item.om}-${item.especialidade}-${item.graduacao}`,
      item
    ])
  );
  
  // Comparar com novos dados
  newData.forEach(newItem => {
    const key = `${newItem.om}-${newItem.especialidade}-${newItem.graduacao}`;
    const oldItem = oldDataMap.get(key);
    
    if (oldItem) {
      // Detectar mudanças em TMFT
      if (oldItem.tmft_sum !== newItem.tmft_sum) {
        changes.push(
          `🔄 TMFT alterado: ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao}): ${oldItem.tmft_sum} → ${newItem.tmft_sum}`
        );
      }
      
      // Detectar mudanças em EFE
      if (oldItem.efe_sum !== newItem.efe_sum) {
        changes.push(
          `✅ EFE alterado: ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao}): ${oldItem.efe_sum} → ${newItem.efe_sum}`
        );
      }
    } else if (newItem.tmft_sum > 0 || newItem.efe_sum > 0) {
      // Novo registro detectado
      changes.push(
        `🆕 Novo registro: ${newItem.om} - ${newItem.especialidade} (${newItem.graduacao}) - TMFT: ${newItem.tmft_sum}, EFE: ${newItem.efe_sum}`
      );
    }
  });
  
  return changes.slice(0, 5); // Limitar a 5 notificações
};

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
  const [previousData, setPreviousData] = useState<EspecialidadeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<string[]>([]);

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
      
      // Detectar alterações se já existem dados anteriores
      if (previousData.length > 0) {
        const changes = detectEspecialidadesChanges(previousData, especialidadesData);
        if (changes.length > 0) {
          changes.forEach(change => {
            toast.success(change, {
              duration: 6000,
            });
          });
        }
      }
      
      setPreviousData(data);
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

    // Auto-refresh a cada 2 minutos
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh dos dados da Página 3...');
      fetchEspecialidadesData();
    }, 120000); // 2 minutos

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let pageTitle = "Especialidades";
    if (selectedOMs.length > 0 || selectedEspecialidades.length > 0) {
      pageTitle += " - ";
      if (selectedOMs.length > 0) {
        pageTitle += selectedOMs.join(', ');
      }
      if (selectedEspecialidades.length > 0) {
        if (selectedOMs.length > 0) pageTitle += " - ";
        pageTitle += selectedEspecialidades.join(', ');
      }
    } else {
      pageTitle += " - Todas as OMs";
    }
    
    const graduacaoKeys = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
    const pageHeight = doc.internal.pageSize.height;
    const marginBottom = 15;

    // Adicionar brasão da República no topo centralizado
    const brasaoWidth = 32;
    const brasaoHeight = 32;
    const brasaoX = (doc.internal.pageSize.width - brasaoWidth) / 2;
    doc.addImage(brasaoRepublica, 'PNG', brasaoX, 10, brasaoWidth, brasaoHeight);
    
    // Adicionar textos centralizados abaixo do brasão
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MARINHA DO BRASIL', doc.internal.pageSize.width / 2, 45, { align: 'center' });
    doc.text('CENTRO DE OPERAÇÕES DO ABASTECIMENTO', doc.internal.pageSize.width / 2, 50, { align: 'center' });
    
    let currentY = 56; // Começar após o cabeçalho

    // Título do documento
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(pageTitle, 14, currentY);
    currentY += 6;

    // Se múltiplas OMs selecionadas OU especialidades filtradas, separar por OM
    if (selectedOMs.length > 1 || selectedEspecialidades.length > 0) {
      const omsToShow = selectedOMs.length > 0 ? selectedOMs : allOMs.filter(om => filteredData.some(item => item.om === om));
      
      omsToShow.forEach((om, omIndex) => {
        // Filtrar dados apenas para esta OM
        const omData = filteredData.filter(item => item.om === om);
        
        if (omData.length === 0) return;

        // Pular 4 linhas entre OMs (exceto a primeira)
        if (omIndex > 0) {
          currentY += 12; // ~4 linhas de espaçamento
        }

        // Título da OM
        doc.setFontSize(11);
        doc.setTextColor(59, 130, 246);
        doc.text(`${om}`, 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 5;

        // Agrupar dados por especialidade para esta OM
        const omSpreadsheetData = omData.reduce((acc, item) => {
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
          if (!acc[key][grad][item.om]) {
            acc[key][grad][item.om] = { tmft: 0, efe: 0 };
          }
          acc[key][grad][item.om].tmft += item.tmft_sum;
          acc[key][grad][item.om].efe += item.efe_sum;
          
          return acc;
        }, {} as Record<string, Record<string, Record<string, { tmft: number; efe: number }>>>);

        let isFirstSection = true;

        Object.entries(omSpreadsheetData).forEach(([especialidade, graduacoes]) => {
          const tableData: any[] = [];
          
          graduacaoKeys.forEach(grad => {
            const omGradData = graduacoes[grad] || {};
            let rowTmft = 0;
            let rowEfe = 0;
            
            rowTmft += (omGradData[om]?.tmft || 0);
            rowEfe += (omGradData[om]?.efe || 0);

            if (rowTmft > 0 || rowEfe > 0) {
              const diff = rowTmft - rowEfe;
              tableData.push([
                grad,
                rowTmft,
                rowEfe,
                { content: diff.toString(), styles: { textColor: diff < 0 ? [220, 38, 38] : [0, 0, 0] } }
              ]);
            }
          });

          if (tableData.length > 0) {
            const neededSpace = 15 + (tableData.length * 7) + 8;
            
            // Verificar se precisa adicionar nova página
            if (currentY + neededSpace > pageHeight - marginBottom) {
              doc.addPage();
              currentY = 10;
              
              // Repetir título da OM na nova página
              doc.setFontSize(11);
              doc.setTextColor(59, 130, 246);
              doc.text(`${om} (continuação)`, 14, currentY);
              doc.setTextColor(0, 0, 0);
              currentY += 5;
            }

            if (!isFirstSection) {
              currentY += 2;
            }
            isFirstSection = false;

            doc.setFontSize(11);
            doc.setTextColor(59, 130, 246);
            doc.text(`${especialidade}`, 14, currentY);
            doc.setTextColor(0, 0, 0);
            currentY += 1;

            autoTable(doc, {
              head: [['Grad', 'TMFT', 'EFE', 'DIF']],
              body: tableData,
              startY: currentY,
              styles: { fontSize: 10, cellPadding: 2 },
              headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
              margin: { left: 14 },
              didDrawPage: function(data) {
                currentY = data.cursor?.y || currentY;
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 1;
          }
        });
      });
    } else {
      // Lógica original quando apenas uma OM ou todas
      let isFirstSection = true;

      Object.entries(spreadsheetData).forEach(([especialidade, graduacoes]) => {
        const tableData: any[] = [];
        
        graduacaoKeys.forEach(grad => {
          const omData = graduacoes[grad] || {};
          let rowTmft = 0;
          let rowEfe = 0;
          
          omsInData.forEach(om => {
            rowTmft += (omData[om]?.tmft || 0);
            rowEfe += (omData[om]?.efe || 0);
          });

          if (rowTmft > 0 || rowEfe > 0) {
            const diff = rowTmft - rowEfe;
            tableData.push([
              grad,
              rowTmft,
              rowEfe,
              { content: diff.toString(), styles: { textColor: diff < 0 ? [220, 38, 38] : [0, 0, 0] } }
            ]);
          }
        });

        if (tableData.length > 0) {
          const neededSpace = 15 + (tableData.length * 7) + 8;
          
          if (currentY + neededSpace > pageHeight - marginBottom) {
            doc.addPage();
            currentY = 10;
          }

          if (!isFirstSection) {
            currentY += 2;
          }
          isFirstSection = false;

          doc.setFontSize(11);
          doc.setTextColor(59, 130, 246);
          doc.text(`${especialidade}`, 14, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 1;

          autoTable(doc, {
            head: [['Grad', 'TMFT', 'EFE', 'DIF']],
            body: tableData,
            startY: currentY,
            styles: { fontSize: 10, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
            margin: { left: 14 },
            didDrawPage: function(data) {
              currentY = data.cursor?.y || currentY;
            }
          });

          currentY = (doc as any).lastAutoTable.finalY + 1;
        }
      });
    }

    const fileName = `especialidades_${selectedOMs.length > 0 ? selectedOMs.join('_') : 'todas-oms'}_${selectedEspecialidades.length > 0 ? selectedEspecialidades.join('_').substring(0, 30) : 'todas-esp'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Adicionar numeração de páginas em todas as páginas
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `${i} - ${totalPages}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    doc.save(fileName);
    toast.success("PDF exportado com sucesso!");
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
    'CDU-1ºDN',
    'CDU-BAMRJ',
    'CMM',
    'COpAb',
    'CSupAb',
    'DepCMRJ',
    'DepFMRJ',
    'DepMSMRJ',
    'DepSIMRJ',
    'DepSMRJ'
  ].sort();

  // Lista de todas as graduações
  const allGraduacoes = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];

  // Get all unique especialidades from data
  const allEspecialidades = Array.from(new Set(data.map(item => item.especialidade))).sort();

  // Filter data by selected OMs and Especialidades
  const filteredData = data.filter(item => {
    const omMatch = selectedOMs.length === 0 || selectedOMs.includes(item.om);
    const espMatch = selectedEspecialidades.length === 0 || selectedEspecialidades.includes(item.especialidade);
    return omMatch && espMatch;
  });

  // Calcular contagem de registros por OM e por Especialidade
  const omCounts = allOMs.reduce((acc, om) => {
    acc[om] = data.filter(item => {
      const espMatch = selectedEspecialidades.length === 0 || selectedEspecialidades.includes(item.especialidade);
      return item.om === om && espMatch;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  const especialidadeCounts = allEspecialidades.reduce((acc, esp) => {
    acc[esp] = data.filter(item => {
      const omMatch = selectedOMs.length === 0 || selectedOMs.includes(item.om);
      return item.especialidade === esp && omMatch;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  console.log("📊 OMs definidas:", allOMs);
  console.log("📊 Contagem por OM:", omCounts);
  console.log("📊 Contagem por Especialidade:", especialidadeCounts);
  console.log("📊 Total de registros filtrados:", filteredData.length);
  console.log("📊 OMs selecionadas:", selectedOMs);
  console.log("📊 Especialidades selecionadas:", selectedEspecialidades);

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
  const omsInData = selectedOMs.length > 0
    ? selectedOMs
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
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="hover:scale-105 transition-transform gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
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
              <label className="block text-sm font-medium">Filtrar por OM (selecione uma ou mais):</label>
              <div className="text-sm font-semibold text-primary">
                {selectedOMs.length > 0
                  ? `${selectedOMs.length} OM(s) selecionada(s)`
                  : `Todas as OMs`
                }
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                onClick={() => setSelectedOMs(allOMs)}
                variant="outline"
                size="sm"
              >
                Selecionar Todas
              </Button>
              <Button
                onClick={() => setSelectedOMs([])}
                variant="outline"
                size="sm"
              >
                Limpar Seleção
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border border-border rounded-md">
              {allOMs.map((om) => (
                <label
                  key={om}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedOMs.includes(om) ? 'bg-primary/10 border border-primary' : 'border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOMs.includes(om)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOMs([...selectedOMs, om]);
                      } else {
                        setSelectedOMs(selectedOMs.filter(o => o !== om));
                      }
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium">
                    {om} ({omCounts[om] || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Filtro de Especialidades */}
        <div className="bg-card rounded-lg p-4 shadow-md border border-border">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-sm font-medium">Filtrar por Especialidade (selecione uma ou mais):</label>
              <div className="text-sm font-semibold text-primary">
                {selectedEspecialidades.length > 0
                  ? `${selectedEspecialidades.length} Especialidade(s) selecionada(s)`
                  : `Todas as Especialidades`
                }
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                onClick={() => setSelectedEspecialidades(allEspecialidades)}
                variant="outline"
                size="sm"
              >
                Selecionar Todas
              </Button>
              <Button
                onClick={() => setSelectedEspecialidades([])}
                variant="outline"
                size="sm"
              >
                Limpar Seleção
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-border rounded-md">
              {allEspecialidades.map((esp) => (
                <label
                  key={esp}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedEspecialidades.includes(esp) ? 'bg-primary/10 border border-primary' : 'border border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEspecialidades.includes(esp)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEspecialidades([...selectedEspecialidades, esp]);
                      } else {
                        setSelectedEspecialidades(selectedEspecialidades.filter(e => e !== esp));
                      }
                    }}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-medium">
                    {esp} ({especialidadeCounts[esp] || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo dos Filtros */}
        <div className="bg-card rounded-lg p-4 shadow-md border border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">OMs: </span>
                <span className="font-bold text-primary">
                  {selectedOMs.length > 0 ? `${selectedOMs.length} selecionada(s)` : 'Todas'}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Especialidades: </span>
                <span className="font-bold text-primary">
                  {selectedEspecialidades.length > 0 ? `${selectedEspecialidades.length} selecionada(s)` : 'Todas'}
                </span>
              </div>
            </div>
            <div className="text-lg font-bold text-primary">
              Total: {filteredData.length} registros
            </div>
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
              const isSelected = selectedOMs.includes(om);
              return (
                <div
                  key={om}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedOMs(selectedOMs.filter(o => o !== om));
                    } else {
                      setSelectedOMs([...selectedOMs, om]);
                    }
                  }}
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
                <TableHead className="text-center bg-primary/10">DIF</TableHead>
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
                        <TableCell className={`text-center font-semibold bg-primary/5 ${
                          rowTmft - rowEfe < 0 ? 'text-red-600 dark:text-red-400' : ''
                        }`}>
                          {rowTmft - rowEfe}
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
                      <TableCell className={`text-center bg-primary/20 ${
                        especialidadeTotal.tmft - especialidadeTotal.efe < 0 ? 'text-red-600 dark:text-red-400 font-bold' : ''
                      }`}>
                        {especialidadeTotal.tmft - especialidadeTotal.efe}
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

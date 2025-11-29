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
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import brasaoRepublica from "@/assets/brasao-republica.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface FormacaoData {
  formacao: string;
  pessoal: string;
  om: string;
  especialidade?: string;
  tmft: number;
  efe: number;
}

const FormacaoAcademia = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<FormacaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedPessoal, setSelectedPessoal] = useState<string[]>([]);
  const [selectedFormacoes, setSelectedFormacoes] = useState<string[]>([]);

  const fetchFormacaoData = async () => {
    setLoading(true);
    try {
      console.log("🔄 Iniciando busca dos dados de Formação Academia...");
      
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-formacao-academia-data"
      );

      console.log("📦 Resposta completa da API:", result);

      if (error) {
        console.error("❌ Erro ao chamar função:", error);
        throw error;
      }

      const formacaoData = result?.data || [];
      
      console.log("✅ Total de registros extraídos:", formacaoData.length);
      
      setData(formacaoData);
      toast.success(`✅ ${formacaoData.length} registros carregados`);
    } catch (error) {
      console.error("💥 Erro fatal:", error);
      toast.error("Erro ao carregar dados de Formação Academia");
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

    fetchFormacaoData();

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh dos dados...');
      fetchFormacaoData();
    }, 120000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let pageTitle = "Formação Acadêmica - OFI";
    if (selectedOMs.length > 0) {
      pageTitle += " - " + selectedOMs.join(', ');
    } else {
      pageTitle += " - Todas as OMs";
    }
    
    const pageHeight = doc.internal.pageSize.height;
    const marginBottom = 15;

    const brasaoWidth = 32;
    const brasaoHeight = 32;
    const brasaoX = (doc.internal.pageSize.width - brasaoWidth) / 2;
    doc.addImage(brasaoRepublica, 'PNG', brasaoX, 10, brasaoWidth, brasaoHeight);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MARINHA DO BRASIL', doc.internal.pageSize.width / 2, 45, { align: 'center' });
    doc.text('CENTRO DE OPERAÇÕES DO ABASTECIMENTO', doc.internal.pageSize.width / 2, 50, { align: 'center' });
    
    let currentY = 66;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(pageTitle, 14, currentY);
    currentY += 6;

    const visibleOMs = selectedOMs.length > 0 ? selectedOMs : allOMs;
    
    allFormacoes.forEach((formacao, formacaoIndex) => {
      const formacaoRows = tableData.filter(row => {
        // Find the formation for this row
        if (row.formacao) return row.formacao === formacao;
        // For rows without formacao, find the previous row with formacao
        const rowIndex = tableData.indexOf(row);
        for (let i = rowIndex - 1; i >= 0; i--) {
          if (tableData[i].formacao) {
            return tableData[i].formacao === formacao;
          }
        }
        return false;
      });
      
      if (formacaoRows.length === 0) return;

      if (formacaoIndex > 0) {
        currentY += 12;
      }

      doc.setFontSize(11);
      doc.setTextColor(59, 130, 246);
      doc.text(`${formacao}`, 14, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 5;

      const tableHeaders = ['Formação Acad', 'Pessoal'];
      visibleOMs.forEach(om => {
        tableHeaders.push(`${om} TMFT`);
        tableHeaders.push(`${om} EFE`);
        tableHeaders.push(`${om} DIF`);
      });

      const tableDataPDF: any[] = [];

      formacaoRows.forEach(row => {
        const rowData = [row.formacao || '', row.pessoal];
        visibleOMs.forEach(om => {
          const tmft = row[`${om}_tmft`] || 0;
          const efe = row[`${om}_efe`] || 0;
          rowData.push(tmft);
          rowData.push(efe);
          rowData.push(efe - tmft); // DIF = EFE - TMFT
        });
        tableDataPDF.push(rowData);
      });

      if (tableDataPDF.length > 0) {
        const neededSpace = 15 + (tableDataPDF.length * 7) + 8;
        
        if (currentY + neededSpace > pageHeight - marginBottom) {
          doc.addPage();
          currentY = 10;
          
          doc.setFontSize(11);
          doc.setTextColor(59, 130, 246);
          doc.text(`${formacao} (continuação)`, 14, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 5;
        }

        autoTable(doc, {
          head: [tableHeaders],
          body: tableDataPDF,
          startY: currentY,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
          margin: { left: 14 },
          didDrawPage: function(data) {
            currentY = data.cursor?.y || currentY;
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 2;
      }
    });

    const fileName = `formacao_academia_${selectedOMs.length > 0 ? selectedOMs.join('_') : 'todas-oms'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
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

  const allOMs = [
    'COpAb',
    'BAMRJ',
    'CMM',
    'DepCMRJ',
    'CDAM',
    'DepSMRJ',
    'CSupAb',
    'DepSIMRJ',
    'DepMSMRJ',
    'DepFMRJ',
    'CDU-BAMRJ',
    'CDU-1DN'
  ];

  const allPessoal = [
    '1TEN',
    '2TEN',
    'CC',
    'CF',
    'CMG',
    'CONTRA-ALMIRANTE',
    'CT',
    'GM',
    'OFICIAIS TTC',
    'SERVIDORES CIVIS (NA + NI)'
  ];

  const allFormacoes = ['ADMINISTRAÇÃO', 'CONTABILIDADE', 'ENGENHARIA', 'ESTATISTICA'];

  const filteredData = data.filter(item => {
    const omMatch = selectedOMs.length === 0 || selectedOMs.includes(item.om);
    const pessoalMatch = selectedPessoal.length === 0 || selectedPessoal.includes(item.pessoal);
    const formacaoMatch = selectedFormacoes.length === 0 || selectedFormacoes.includes(item.formacao);
    return omMatch && pessoalMatch && formacaoMatch;
  });

  // Build table data structure with formation in first column
  const tableData: any[] = [];
  const formacaoRowSpans: Record<string, number> = {};
  
  allFormacoes.forEach(formacao => {
    const formacaoData = filteredData.filter(item => item.formacao === formacao);
    const pessoalList = [...new Set(formacaoData.map(item => item.pessoal))];
    
    const validRows: any[] = [];
    
    pessoalList.forEach((pessoal) => {
      const row: any = { 
        formacao: formacao,
        pessoal,
        isFirstInFormacao: false
      };
      
      let hasValue = false;
      
      allOMs.forEach(om => {
        const record = formacaoData.find(item => item.pessoal === pessoal && item.om === om);
        const tmft = record?.tmft || 0;
        const efe = record?.efe || 0;
        row[`${om}_tmft`] = tmft;
        row[`${om}_efe`] = efe;
        row[`${om}_dif`] = efe - tmft; // DIF = EFE - TMFT
        
        if (tmft > 0 || efe > 0) {
          hasValue = true;
        }
      });
      
      // Only add row if it has at least one non-zero value
      if (hasValue) {
        validRows.push(row);
      }
    });
    
    // Mark first row of each formation
    if (validRows.length > 0) {
      validRows[0].isFirstInFormacao = true;
      formacaoRowSpans[formacao] = validRows.length;
      tableData.push(...validRows);
    }
  });
  
  // Calculate totals for each OM
  const totals: any = { formacao: '', pessoal: '' };
  const visibleOMs = selectedOMs.length > 0 ? selectedOMs : allOMs;
  visibleOMs.forEach(om => {
    const omData = filteredData.filter(item => item.om === om);
    const totalTmft = omData.reduce((sum, item) => sum + item.tmft, 0);
    const totalEfe = omData.reduce((sum, item) => sum + item.efe, 0);
    totals[`${om}_tmft`] = totalTmft;
    totals[`${om}_efe`] = totalEfe;
    totals[`${om}_dif`] = totalEfe - totalTmft; // DIF = EFE - TMFT
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Formação Acadêmica - OFI
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFormacaoData}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Filtro de OMs */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Filtrar por OM</h3>
            <div className="grid grid-cols-2 gap-3">
              {allOMs.map((om) => (
                <div key={om} className="flex items-center space-x-2">
                  <Checkbox
                    id={`om-${om}`}
                    checked={selectedOMs.includes(om)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedOMs([...selectedOMs, om]);
                      } else {
                        setSelectedOMs(selectedOMs.filter(o => o !== om));
                      }
                    }}
                  />
                  <label
                    htmlFor={`om-${om}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {om}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtro de Pessoal OFI */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Filtrar por Pessoal OFI</h3>
            <div className="grid grid-cols-2 gap-3">
              {allPessoal.map((pessoal) => (
                <div key={pessoal} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pessoal-${pessoal}`}
                    checked={selectedPessoal.includes(pessoal)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPessoal([...selectedPessoal, pessoal]);
                      } else {
                        setSelectedPessoal(selectedPessoal.filter(p => p !== pessoal));
                      }
                    }}
                  />
                  <label
                    htmlFor={`pessoal-${pessoal}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {pessoal}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtro de Formação Acadêmica */}
          <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Filtrar por Formação Acad</h3>
            <div className="grid grid-cols-1 gap-3">
              {allFormacoes.map((formacao) => (
                <div key={formacao} className="flex items-center space-x-2">
                  <Checkbox
                    id={`formacao-${formacao}`}
                    checked={selectedFormacoes.includes(formacao)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFormacoes([...selectedFormacoes, formacao]);
                      } else {
                        setSelectedFormacoes(selectedFormacoes.filter(f => f !== formacao));
                      }
                    }}
                  />
                  <label
                    htmlFor={`formacao-${formacao}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {formacao}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico de Distribuição por Formação Acadêmica */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Distribuição por Formação Acadêmica</h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allFormacoes.map(formacao => {
                const formacaoData = filteredData.filter(item => item.formacao === formacao);
                const totalEfe = formacaoData.reduce((sum, item) => sum + item.efe, 0);
                return {
                  name: formacao,
                  value: totalEfe
                };
              })}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]}>
                  <LabelList 
                    dataKey="value" 
                    position="top" 
                    style={{ fontWeight: 'bold', fontSize: '14px' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela com Formação na primeira coluna */}
        <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={3} className="font-semibold text-center align-middle border-r-2 border-border bg-muted/50">
                    Formação Acad
                  </TableHead>
                  <TableHead rowSpan={3} className="font-semibold text-center align-middle border-r-2 border-border bg-muted/50">
                    Pessoal
                  </TableHead>
                  {(selectedOMs.length > 0 ? selectedOMs : allOMs).map(om => (
                    <TableHead key={om} colSpan={3} className="font-semibold text-center border-l border-border bg-primary/10">
                      {om}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  {(selectedOMs.length > 0 ? selectedOMs : allOMs).map(om => (
                    <>
                      <TableHead key={`${om}-tmft`} className="text-center text-xs border-l border-border">TMFT</TableHead>
                      <TableHead key={`${om}-efe`} className="text-center text-xs">EFE</TableHead>
                      <TableHead key={`${om}-dif`} className="text-center text-xs">DIF</TableHead>
                    </>
                  ))}
                </TableRow>
                <TableRow>
                  {(selectedOMs.length > 0 ? selectedOMs : allOMs).map(om => (
                    <>
                      <TableHead key={`${om}-tmft-sum`} className="text-center text-xs border-l border-border bg-muted/30">∑</TableHead>
                      <TableHead key={`${om}-efe-sum`} className="text-center text-xs bg-muted/30">∑</TableHead>
                      <TableHead key={`${om}-dif-sum`} className="text-center text-xs bg-muted/30">∑</TableHead>
                    </>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow key={idx}>
                    {row.isFirstInFormacao && (
                      <TableCell 
                        rowSpan={formacaoRowSpans[row.formacao]}
                        className="font-bold text-center align-middle border-r-2 border-border bg-primary/5"
                      >
                        {row.formacao}
                      </TableCell>
                    )}
                    <TableCell className="font-medium border-r-2 border-border">{row.pessoal}</TableCell>
                    {(selectedOMs.length > 0 ? selectedOMs : allOMs).map(om => (
                      <>
                        <TableCell key={`${om}-tmft`} className="text-center border-l border-border">{row[`${om}_tmft`]}</TableCell>
                        <TableCell key={`${om}-efe`} className="text-center">{row[`${om}_efe`]}</TableCell>
                        <TableCell key={`${om}-dif`} className="text-center">{row[`${om}_dif`]}</TableCell>
                      </>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormacaoAcademia;

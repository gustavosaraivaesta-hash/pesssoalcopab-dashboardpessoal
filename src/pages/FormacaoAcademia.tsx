import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
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
import marinhaHeader from "@/assets/marinha-header.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TopDeficitChart from "@/components/dashboard/TopDeficitChart";

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
  
  // Refs para capturar os gráficos
  const topFormacoesChartRef = useRef<HTMLDivElement>(null);
  const topDeficitChartRef = useRef<HTMLDivElement>(null);

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

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const selectedOMsDisplay = selectedOMs.length > 0 ? selectedOMs : allOMs;
    let isFirstPage = true;
    
    // Capturar gráficos como imagens
    let topFormacoesImg: string | null = null;
    let topDeficitImg: string | null = null;
    
    try {
      if (topFormacoesChartRef.current) {
        const canvas = await html2canvas(topFormacoesChartRef.current, { scale: 2, backgroundColor: '#ffffff' });
        topFormacoesImg = canvas.toDataURL('image/png');
      }
      if (topDeficitChartRef.current) {
        const canvas = await html2canvas(topDeficitChartRef.current, { scale: 2, backgroundColor: '#ffffff' });
        topDeficitImg = canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.error('Erro ao capturar gráficos:', error);
      toast.error('Erro ao capturar gráficos para o PDF');
    }

    const addHeader = (isFirstPageParam: boolean) => {
      let yPosition = 10;
      
      if (isFirstPageParam) {
        // Adicionar brasão apenas na primeira página
        const brasaoImg = new Image();
        brasaoImg.src = brasaoRepublica;
        doc.addImage(brasaoImg, 'PNG', pageWidth / 2 - 10, yPosition, 20, 20);
        yPosition += 25;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MARINHA DO BRASIL', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
        doc.text('CENTRO DE OPERAÇÕES DO ABASTECIMENTO', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 12;
      }
      
      return yPosition;
    };

    selectedOMsDisplay.forEach((om, omIndex) => {
      if (omIndex > 0) {
        doc.addPage();
        isFirstPage = false;
      }

      let yPosition = addHeader(isFirstPage);
      if (omIndex === 0) isFirstPage = false;

      // OM Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(om, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Filters
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const filterText = [];
      if (selectedPessoal.length > 0 && selectedPessoal.length < allPessoal.length) {
        filterText.push(`Pessoal: ${selectedPessoal.join(', ')}`);
      }
      if (selectedFormacoes.length > 0 && selectedFormacoes.length < allFormacoes.length) {
        filterText.push(`Formações: ${selectedFormacoes.join(', ')}`);
      }

      if (filterText.length > 0) {
        doc.text(`Filtros: ${filterText.join(' | ')}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }

      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;
      
      // Adicionar gráficos apenas na primeira página da primeira OM
      if (omIndex === 0) {
        if (topFormacoesImg) {
          const imgWidth = 180;
          const imgHeight = 70;
          if (yPosition + imgHeight > pageHeight - 20) {
            doc.addPage();
            isFirstPage = false;
            yPosition = 10;
          }
          doc.addImage(topFormacoesImg, 'PNG', 15, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 8;
        }
        
        if (topDeficitImg) {
          const imgWidth = 180;
          const imgHeight = 70;
          if (yPosition + imgHeight > pageHeight - 20) {
            doc.addPage();
            isFirstPage = false;
            yPosition = 10;
          }
          doc.addImage(topDeficitImg, 'PNG', 15, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 8;
        }
      }

      // Create table data for this OM
      const headers = ['Formação', 'Pessoal', 'TMFT', 'EFE', 'DIF'];
      const rows: any[] = [];
      
      tableData.forEach(row => {
        const tmft = row[`${om}_tmft`] || 0;
        const efe = row[`${om}_efe`] || 0;
        const dif = row[`${om}_dif`] || 0;
        
        if (tmft === 0 && efe === 0) return;

        if (row.isFormacaoTotal) {
          rows.push([
            { content: row.formacao, styles: { fontStyle: 'bold', fillColor: [59, 130, 246], textColor: [255, 255, 255] } },
            { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [59, 130, 246], textColor: [255, 255, 255] } },
            { content: tmft.toString(), styles: { fontStyle: 'bold', fillColor: [59, 130, 246], textColor: [255, 255, 255] } },
            { content: efe.toString(), styles: { fontStyle: 'bold', fillColor: [59, 130, 246], textColor: [255, 255, 255] } },
            { content: dif.toString(), styles: { fontStyle: 'bold', fillColor: [59, 130, 246], textColor: [255, 255, 255] } }
          ]);
        } else {
          rows.push([
            row.isFirstInFormacao ? row.formacao : '',
            row.pessoal,
            tmft.toString(),
            efe.toString(),
            { content: dif.toString(), styles: { textColor: dif < 0 ? [220, 38, 38] : [0, 0, 0] } }
          ]);
        }
      });

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPosition,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didDrawPage: (data: any) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
          doc.setFontSize(10);
          doc.text(`${currentPage} - ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      });
    });

    doc.save('formacao_academia_por_om.pdf');
    toast.success('PDF exportado com sucesso!');
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

  // Dynamically get all unique formacoes from data
  const allFormacoes = [...new Set(data.map(item => item.formacao))].sort();

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
        isFirstInFormacao: false,
        isFormacaoTotal: false
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
    
    // Mark first row of each formation and add total row
    if (validRows.length > 0) {
      validRows[0].isFirstInFormacao = true;
      formacaoRowSpans[formacao] = validRows.length + 1; // +1 for total row
      tableData.push(...validRows);
      
      // Add total row for this formation
      const totalRow: any = {
        formacao: formacao,
        pessoal: 'TOTAL',
        isFirstInFormacao: false,
        isFormacaoTotal: true
      };
      
      allOMs.forEach(om => {
        const omFormacaoData = formacaoData.filter(item => item.om === om);
        const tmftTotal = omFormacaoData.reduce((sum, item) => sum + item.tmft, 0);
        const efeTotal = omFormacaoData.reduce((sum, item) => sum + item.efe, 0);
        totalRow[`${om}_tmft`] = tmftTotal;
        totalRow[`${om}_efe`] = efeTotal;
        totalRow[`${om}_dif`] = efeTotal - tmftTotal;
      });
      
      tableData.push(totalRow);
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
              Ver Formação Acadêmica - OFI
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

        {/* Gráfico de Top 5 Formações Acadêmicas */}
        <div ref={topFormacoesChartRef}>
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Formações Acadêmicas por EFE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allFormacoes.map(formacao => {
                    const formacaoData = filteredData.filter(item => item.formacao === formacao);
                    const totalEfe = formacaoData.reduce((sum, item) => sum + item.efe, 0);
                    return {
                      name: formacao,
                      value: totalEfe
                    };
                  }).sort((a, b) => b.value - a.value).slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value: number) => [value, 'EFE']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]}>
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        style={{ fontWeight: 'bold', fontSize: '14px', fill: '#000' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top 5 Deficit Chart */}
        <div ref={topDeficitChartRef}>
          <TopDeficitChart 
            data={(() => {
              const formacaoDeficit = new Map<string, number>();
              
              filteredData.forEach(item => {
                const current = formacaoDeficit.get(item.formacao) || 0;
                const dif = (item.efe || 0) - (item.tmft || 0); // DIF = EFE - TMFT
                formacaoDeficit.set(item.formacao, current + dif);
              });

              return Array.from(formacaoDeficit.entries()).map(([name, deficit]) => ({
                name,
                deficit
              }));
            })()}
            title="Top 5 Formações com Maior Deficit"
          />
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
                  <TableRow key={idx} className={row.isFormacaoTotal ? 'bg-blue-100 font-bold' : ''}>
                    {row.isFirstInFormacao && (
                      <TableCell 
                        rowSpan={formacaoRowSpans[row.formacao]}
                        className="font-bold text-center align-middle border-r-2 border-border bg-primary/5"
                      >
                        {row.formacao}
                      </TableCell>
                    )}
                    <TableCell className={`border-r-2 border-border ${row.isFormacaoTotal ? 'font-bold' : 'font-medium'}`}>
                      {row.pessoal}
                    </TableCell>
                    {(selectedOMs.length > 0 ? selectedOMs : allOMs).map(om => (
                      <>
                        <TableCell key={`${om}-tmft`} className="text-center border-l border-border">{row[`${om}_tmft`]}</TableCell>
                        <TableCell key={`${om}-efe`} className="text-center">{row[`${om}_efe`]}</TableCell>
                        <TableCell 
                          key={`${om}-dif`} 
                          className={`text-center font-semibold ${row[`${om}_dif`] < 0 ? 'text-red-600 bg-red-50' : ''}`}
                        >
                          {row[`${om}_dif`] > 0 ? `+${row[`${om}_dif`]}` : row[`${om}_dif`]}
                        </TableCell>
                      </>
                    ))}
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-primary font-bold text-primary-foreground">
                  <TableCell colSpan={2} className="text-center border-r-2 border-primary-foreground/20">TOTAL</TableCell>
                  {(selectedOMs.length > 0 ? selectedOMs : allOMs).map(om => {
                    const omData = filteredData.filter(item => item.om === om);
                    const totalTmft = omData.reduce((sum, item) => sum + item.tmft, 0);
                    const totalEfe = omData.reduce((sum, item) => sum + item.efe, 0);
                    const totalDif = totalEfe - totalTmft;
                    return (
                      <>
                        <TableCell key={`${om}-tmft-total`} className="text-center border-l border-primary-foreground/20">{totalTmft}</TableCell>
                        <TableCell key={`${om}-efe-total`} className="text-center">{totalEfe}</TableCell>
                        <TableCell 
                          key={`${om}-dif-total`} 
                          className={`text-center font-bold ${totalDif < 0 ? 'bg-red-600' : totalDif > 0 ? 'bg-green-600' : ''}`}
                        >
                          {totalDif > 0 ? `+${totalDif}` : totalDif}
                        </TableCell>
                      </>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormacaoAcademia;

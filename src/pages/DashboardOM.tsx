import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Home, Users2, UserCheck, UserX, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { OMData, OMMetrics } from "@/types/om";
import brasaoRepublica from "@/assets/brasao-republica.png";

const DashboardOM = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OMData[]>([]);
  const [availableOMs, setAvailableOMs] = useState<string[]>([]);
  const [availableQuadros, setAvailableQuadros] = useState<string[]>([]);
  const [availableOpcoes, setAvailableOpcoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOM, setSelectedOM] = useState<string>("Todos");
  const [selectedQuadro, setSelectedQuadro] = useState<string>("Todos");
  const [selectedOpcao, setSelectedOpcao] = useState<string>("Todos");
  
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching OM data...');

      const { data: result, error } = await supabase.functions.invoke('fetch-om-data');

      if (error) {
        console.error('Error fetching OM data:', error);
        toast.error('Erro ao carregar dados');
        return;
      }

      if (result?.data) {
        console.log('Received OM data:', result.data.length, 'records');
        setData(result.data);
        setAvailableOMs(result.oms || []);
        setAvailableQuadros(result.quadros || []);
        setAvailableOpcoes(result.opcoes || []);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      toast.error('Erro ao carregar dados');
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
    
    fetchData();
  }, [navigate]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (selectedOM !== "Todos") {
      filtered = filtered.filter(item => item.om === selectedOM);
    }

    if (selectedQuadro !== "Todos") {
      filtered = filtered.filter(item => item.quadro === selectedQuadro);
    }

    if (selectedOpcao !== "Todos") {
      filtered = filtered.filter(item => item.opcao === selectedOpcao);
    }

    return filtered;
  }, [data, selectedOM, selectedQuadro, selectedOpcao]);

  const metrics = useMemo<OMMetrics>(() => {
    const totalTMFT = filteredData.reduce((sum, item) => sum + item.tmft, 0);
    const totalEXI = filteredData.reduce((sum, item) => sum + item.exi, 0);
    const totalDIF = filteredData.reduce((sum, item) => sum + item.dif, 0);
    const percentualPreenchimento = totalTMFT > 0 ? (totalEXI / totalTMFT) * 100 : 0;

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      percentualPreenchimento,
    };
  }, [filteredData]);

  const chartDataByOM = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.om]) {
        acc[item.om] = { om: item.om, tmft: 0, exi: 0, dif: 0 };
      }
      acc[item.om].tmft += item.tmft;
      acc[item.om].exi += item.exi;
      acc[item.om].dif += item.dif;
      return acc;
    }, {} as Record<string, { om: string; tmft: number; exi: number; dif: number }>);

    return Object.values(grouped);
  }, [filteredData]);

  const chartDataByPessoal = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.pessoal]) {
        acc[item.pessoal] = { name: item.pessoal, value: 0 };
      }
      acc[item.pessoal].value += item.exi;
      return acc;
    }, {} as Record<string, { name: string; value: number }>);

    return Object.values(grouped).filter(item => item.value > 0);
  }, [filteredData]);

  const chartDataByOMHorizontal = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.om]) {
        acc[item.om] = { om: item.om, ocupados: 0, vagos: 0 };
      }
      acc[item.om].ocupados += item.exi;
      acc[item.om].vagos += Math.max(0, item.tmft - item.exi);
      return acc;
    }, {} as Record<string, { om: string; ocupados: number; vagos: number }>);

    return Object.values(grouped);
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      let yPosition = 20;

      // Add brasão only on first page
      const brasaoImg = new Image();
      brasaoImg.src = brasaoRepublica;
      await new Promise((resolve) => {
        brasaoImg.onload = resolve;
      });
      pdf.addImage(brasaoImg, 'PNG', 10, 10, 20, 25);

      pdf.setFontSize(16);
      pdf.text('CENTRO DE OPERAÇÕES DO ABASTECIMENTO', pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(14);
      pdf.text('Dashboard por Organização Militar', pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Filters
      if (selectedOM !== "Todos" || selectedQuadro !== "Todos" || selectedOpcao !== "Todos") {
        pdf.setFontSize(10);
        pdf.text('Filtros Aplicados:', 14, yPosition);
        yPosition += 6;

        if (selectedOM !== "Todos") {
          pdf.text(`OM: ${selectedOM}`, 20, yPosition);
          yPosition += 6;
        }

        if (selectedQuadro !== "Todos") {
          pdf.text(`Quadro: ${selectedQuadro}`, 20, yPosition);
          yPosition += 6;
        }

        if (selectedOpcao !== "Todos") {
          pdf.text(`Opção: ${selectedOpcao}`, 20, yPosition);
          yPosition += 6;
        }
        yPosition += 4;
      }

      // Metrics
      pdf.setFontSize(10);
      pdf.text(`TMFT Total: ${metrics.totalTMFT}`, 14, yPosition);
      pdf.text(`EXI Total: ${metrics.totalEXI}`, 80, yPosition);
      pdf.text(`DIF Total: ${metrics.totalDIF}`, 146, yPosition);
      pdf.text(`Preenchimento: ${metrics.percentualPreenchimento.toFixed(1)}%`, 212, yPosition);
      yPosition += 10;

      // Capture chart
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 260;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (yPosition + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(imgData, 'PNG', 14, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }

      // Table
      const tableData = chartDataByOM.map(item => [
        item.om,
        item.tmft.toString(),
        item.exi.toString(),
        item.dif.toString(),
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['OM', 'TMFT', 'EXI', 'DIF']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        didDrawPage: (data) => {
          const pageCount = pdf.getNumberOfPages();
          const currentPage = (pdf as any).internal.getCurrentPageInfo().pageNumber;
          pdf.setFontSize(10);
          pdf.text(
            `${currentPage} - ${pageCount}`,
            pdf.internal.pageSize.getWidth() / 2,
            pdf.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        },
      });

      pdf.save('dashboard-om.pdf');
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Dashboard por Organização Militar
            </h1>
            <p className="text-muted-foreground">Centro de Operações do Abastecimento</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
            >
              <Home className="mr-2 h-4 w-4" />
              Início
            </Button>
            <Button
              onClick={handleLogout}
              variant="destructive"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filters Bar */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quadro:</span>
              <Select value={selectedQuadro} onValueChange={setSelectedQuadro}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {availableQuadros.map(quadro => (
                    <SelectItem key={quadro} value={quadro}>{quadro}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Opção:</span>
              <Select value={selectedOpcao} onValueChange={setSelectedOpcao}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {availableOpcoes.map(opcao => (
                    <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={exportToPDF}
              variant="outline"
              className="ml-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    TMFT
                  </p>
                  <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                    {metrics.totalTMFT}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Tabela Mestra
                  </p>
                </div>
                <Users2 className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                    EFETIVO
                  </p>
                  <p className="text-4xl font-bold text-green-900 dark:text-green-100">
                    {metrics.totalEXI}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Cargos ocupados
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    VAGOS
                  </p>
                  <p className="text-4xl font-bold text-red-900 dark:text-red-100">
                    {Math.abs(metrics.totalDIF)}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Cargos sem ocupante
                  </p>
                </div>
                <UserX className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">
                    ATENDIMENTO
                  </p>
                  <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                    {metrics.percentualPreenchimento.toFixed(0)}%
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Situação: {metrics.totalDIF < 0 ? metrics.totalDIF : `+${metrics.totalDIF}`}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo da Situação */}
        <Card ref={chartRef}>
          <CardHeader className="border-l-4 border-l-blue-500">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumo da Situação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">TMFT</div>
                <div className="text-3xl font-bold">{metrics.totalTMFT}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">EFE</div>
                <div className="text-3xl font-bold text-green-600">{metrics.totalEXI}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">SIT</div>
                <div className={`text-3xl font-bold ${metrics.totalDIF < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.totalDIF}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">% Atendimento</div>
                <div className="text-3xl font-bold text-blue-600">{metrics.percentualPreenchimento.toFixed(0)}%</div>
              </div>
            </div>

            <div className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartDataByOM}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="om" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tmft" name="TMFT" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="exi" name="EXI" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="dif" name="DIF">
                    {chartDataByOM.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.dif >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-5))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Additional Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Posto */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Posto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartDataByPessoal}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {chartDataByPessoal.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ocupação por OM */}
          <Card>
            <CardHeader>
              <CardTitle>Ocupação por Organização Militar</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByOMHorizontal} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="om" type="category" className="text-xs" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ocupados" name="Ocupados" fill="#10b981" stackId="a" />
                  <Bar dataKey="vagos" name="Vagos" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Tabela Mestra de Força de Trabalho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">OM</th>
                    <th className="text-left p-3 font-semibold">Pessoal</th>
                    <th className="text-right p-3 font-semibold">TMFT</th>
                    <th className="text-right p-3 font-semibold">EXI</th>
                    <th className="text-right p-3 font-semibold">DIF</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 50).map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-3">{item.om}</td>
                      <td className="p-3">{item.pessoal}</td>
                      <td className="text-right p-3">{item.tmft}</td>
                      <td className="text-right p-3">{item.exi}</td>
                      <td className={`text-right p-3 font-semibold ${item.dif < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.dif}
                      </td>
                      <td className="text-center p-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          item.exi >= item.tmft ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.exi >= item.tmft ? 'Completo' : 'Deficitário'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length > 50 && (
                <div className="text-center text-sm text-muted-foreground mt-4">
                  Mostrando 50 de {filteredData.length} registros. Use os filtros para refinar a busca.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOM;

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Filter, Download, Home, Shield, Users, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { OMData, OMMetrics } from "@/types/om";
import brasaoRepublica from "@/assets/brasao-republica.png";

const DashboardOM = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OMData[]>([]);
  const [availableOMs, setAvailableOMs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedPessoal, setSelectedPessoal] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  
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

    if (selectedOMs.length > 0) {
      filtered = filtered.filter(item => selectedOMs.includes(item.om));
    }

    if (selectedPessoal.length > 0) {
      filtered = filtered.filter(item => selectedPessoal.includes(item.pessoal));
    }

    return filtered;
  }, [data, selectedOMs, selectedPessoal]);

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

  const availablePessoal = useMemo(() => {
    const pessoalSet = new Set<string>();
    data.forEach(item => pessoalSet.add(item.pessoal));
    return Array.from(pessoalSet).sort();
  }, [data]);

  const handleOMChange = (om: string, checked: boolean) => {
    setSelectedOMs(prev =>
      checked ? [...prev, om] : prev.filter(o => o !== om)
    );
  };

  const handlePessoalChange = (pessoal: string, checked: boolean) => {
    setSelectedPessoal(prev =>
      checked ? [...prev, pessoal] : prev.filter(p => p !== pessoal)
    );
  };

  const handleRemoveFilter = (type: 'om' | 'pessoal', value: string) => {
    if (type === 'om') {
      setSelectedOMs(prev => prev.filter(o => o !== value));
    } else {
      setSelectedPessoal(prev => prev.filter(p => p !== value));
    }
  };

  const handleClearFilters = () => {
    setSelectedOMs([]);
    setSelectedPessoal([]);
  };

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
      if (selectedOMs.length > 0 || selectedPessoal.length > 0) {
        pdf.setFontSize(10);
        pdf.text('Filtros Aplicados:', 14, yPosition);
        yPosition += 6;

        if (selectedOMs.length > 0) {
          pdf.text(`OMs: ${selectedOMs.join(', ')}`, 20, yPosition);
          yPosition += 6;
        }

        if (selectedPessoal.length > 0) {
          pdf.text(`Pessoal: ${selectedPessoal.join(', ')}`, 20, yPosition);
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
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900">
      {/* Header */}
      <div className="bg-navy-800/50 border-b border-navy-700 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Dashboard por Organização Militar
            </h1>
            <p className="text-navy-300">Centro de Operações do Abastecimento</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="bg-navy-700 hover:bg-navy-600 text-white border-navy-600"
            >
              <Home className="mr-2 h-4 w-4" />
              Início
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-red-600 hover:bg-red-700 text-white border-red-500"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="bg-navy-700 hover:bg-navy-600 text-white border-navy-600">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-navy-800 text-white border-navy-700 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white">Filtros</SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="om" className="mt-6">
                <TabsList className="grid w-full grid-cols-2 bg-navy-700">
                  <TabsTrigger value="om" className="data-[state=active]:bg-navy-600">OM</TabsTrigger>
                  <TabsTrigger value="pessoal" className="data-[state=active]:bg-navy-600">Pessoal</TabsTrigger>
                </TabsList>
                <TabsContent value="om" className="space-y-4 mt-4">
                  {availableOMs.map(om => (
                    <div key={om} className="flex items-center space-x-2">
                      <Checkbox
                        id={`om-${om}`}
                        checked={selectedOMs.includes(om)}
                        onCheckedChange={(checked) => handleOMChange(om, checked as boolean)}
                      />
                      <label htmlFor={`om-${om}`} className="text-sm cursor-pointer">
                        {om}
                      </label>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="pessoal" className="space-y-4 mt-4">
                  {availablePessoal.map(pessoal => (
                    <div key={pessoal} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pessoal-${pessoal}`}
                        checked={selectedPessoal.includes(pessoal)}
                        onCheckedChange={(checked) => handlePessoalChange(pessoal, checked as boolean)}
                      />
                      <label htmlFor={`pessoal-${pessoal}`} className="text-sm cursor-pointer">
                        {pessoal}
                      </label>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>

          {/* Active Filters */}
          {selectedOMs.map(om => (
            <Badge key={`badge-om-${om}`} variant="secondary" className="bg-navy-700 text-white">
              {om}
              <X
                className="ml-2 h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveFilter('om', om)}
              />
            </Badge>
          ))}
          {selectedPessoal.map(pessoal => (
            <Badge key={`badge-pessoal-${pessoal}`} variant="secondary" className="bg-navy-700 text-white">
              {pessoal}
              <X
                className="ml-2 h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveFilter('pessoal', pessoal)}
              />
            </Badge>
          ))}

          {(selectedOMs.length > 0 || selectedPessoal.length > 0) && (
            <Button
              onClick={handleClearFilters}
              variant="ghost"
              size="sm"
              className="text-navy-300 hover:text-white"
            >
              Limpar filtros
            </Button>
          )}

          <Button
            onClick={exportToPDF}
            variant="outline"
            className="ml-auto bg-green-600 hover:bg-green-700 text-white border-green-500"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricsCard
            title="TMFT Total"
            value={metrics.totalTMFT}
            icon={Shield}
            variant="default"
          />
          <MetricsCard
            title="EXI Total"
            value={metrics.totalEXI}
            icon={Users}
            variant="success"
          />
          <MetricsCard
            title="DIF Total"
            value={metrics.totalDIF}
            icon={metrics.totalDIF >= 0 ? TrendingUp : TrendingDown}
            variant={metrics.totalDIF >= 0 ? "success" : "destructive"}
          />
          <Card className="shadow-card bg-gradient-to-br from-blue-500/5 to-blue-600/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Preenchimento
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {metrics.percentualPreenchimento.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="bg-navy-800/50 border-navy-700 p-6" ref={chartRef}>
          <h3 className="text-xl font-semibold text-white mb-4">Distribuição por OM</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartDataByOM}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="om" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="tmft" name="TMFT" fill="#3b82f6" />
              <Bar dataKey="exi" name="EXI" fill="#10b981" />
              <Bar dataKey="dif" name="DIF">
                {chartDataByOM.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.dif >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOM;

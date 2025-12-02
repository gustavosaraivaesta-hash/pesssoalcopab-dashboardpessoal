import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Download, Home, Users2, UserCheck, UserX, TrendingUp, BarChart3, RefreshCw, Building2, Filter } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import brasaoRepublica from "@/assets/brasao-republica.png";

interface PersonnelRecord {
  id: string;
  neo: number;
  tipoSetor: string;
  setor: string;
  cargo: string;
  postoTmft: string;
  corpoTmft: string;
  quadroTmft: string;
  opcaoTmft: string;
  postoEfe: string;
  corpoEfe: string;
  quadroEfe: string;
  opcaoEfe: string;
  nome: string;
  ocupado: boolean;
  om: string;
}

interface DesembarqueRecord {
  posto: string;
  corpo: string;
  quadro: string;
  cargo: string;
  nome: string;
  destino: string;
  mesAno: string;
  documento: string;
  om: string;
}

const DashboardOM = () => {
  const navigate = useNavigate();
  const [personnelData, setPersonnelData] = useState<PersonnelRecord[]>([]);
  const [desembarqueData, setDesembarqueData] = useState<DesembarqueRecord[]>([]);
  const [availableOMs, setAvailableOMs] = useState<string[]>([]);
  const [availableQuadros, setAvailableQuadros] = useState<string[]>([]);
  const [availableOpcoes, setAvailableOpcoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);
  const [selectedQuadros, setSelectedQuadros] = useState<string[]>([]);
  const [selectedOpcoes, setSelectedOpcoes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("efetivo");
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  
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

      if (result) {
        console.log('Received OM data:', result);
        const data = result.data || [];
        setPersonnelData(data);
        setDesembarqueData(result.desembarque || []);
        
        // Extract unique OMs and Opcoes from data
        const oms = [...new Set(data.map((item: any) => item.om).filter(Boolean))];
        const opcoes = [...new Set(data.map((item: any) => item.opcaoTmft).filter(Boolean))];
        
        setAvailableOMs(oms as string[]);
        setAvailableQuadros(result.quadros || []);
        setAvailableOpcoes(opcoes as string[]);
        setLastUpdate(result.lastUpdate || new Date().toLocaleTimeString('pt-BR'));
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
    
    // Auto-sync every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [navigate]);

  const filteredData = useMemo(() => {
    let filtered = personnelData;

    if (selectedOMs.length > 0) {
      filtered = filtered.filter(item => selectedOMs.includes(item.om));
    }

    if (selectedQuadros.length > 0) {
      filtered = filtered.filter(item => selectedQuadros.includes(item.quadroTmft));
    }

    if (selectedOpcoes.length > 0) {
      filtered = filtered.filter(item => selectedOpcoes.includes(item.opcaoTmft));
    }

    return filtered;
  }, [personnelData, selectedOMs, selectedQuadros, selectedOpcoes]);

  const toggleOM = (om: string) => {
    setSelectedOMs(prev => 
      prev.includes(om) ? prev.filter(o => o !== om) : [...prev, om]
    );
  };

  const toggleQuadro = (quadro: string) => {
    setSelectedQuadros(prev => 
      prev.includes(quadro) ? prev.filter(q => q !== quadro) : [...prev, quadro]
    );
  };

  const toggleOpcao = (opcao: string) => {
    setSelectedOpcoes(prev => 
      prev.includes(opcao) ? prev.filter(o => o !== opcao) : [...prev, opcao]
    );
  };

  const clearFilters = () => {
    setSelectedOMs([]);
    setSelectedQuadros([]);
    setSelectedOpcoes([]);
  };

  const OPCOES_FIXAS = ['CARREIRA', 'RM-2', 'RM1', 'TTC'];

  const metrics = useMemo(() => {
    const totalTMFT = filteredData.length;
    const totalEXI = filteredData.filter(item => item.ocupado).length;
    const totalDIF = totalEXI - totalTMFT;
    const percentualPreenchimento = totalTMFT > 0 ? (totalEXI / totalTMFT) * 100 : 0;

    return {
      totalTMFT,
      totalEXI,
      totalDIF,
      percentualPreenchimento,
    };
  }, [filteredData]);

  // Group data by setor
  const groupedBySetor = useMemo(() => {
    const groups: Record<string, PersonnelRecord[]> = {};
    
    filteredData.forEach(item => {
      if (!groups[item.setor]) {
        groups[item.setor] = [];
      }
      groups[item.setor].push(item);
    });
    
    return groups;
  }, [filteredData]);

  const chartDataBySetor = useMemo(() => {
    return Object.entries(groupedBySetor).map(([setor, items]) => ({
      setor,
      ocupados: items.filter(i => i.ocupado).length,
      vagos: items.filter(i => !i.ocupado).length,
    }));
  }, [groupedBySetor]);

  const chartDataByPosto = useMemo(() => {
    const POSTO_ORDER = ['CONTRA-ALMIRANTE', 'CMG', 'CF', 'CC', 'CT', '1TEN', '2TEN', 'GM'];
    
    const grouped = filteredData.reduce((acc, item) => {
      const posto = item.ocupado ? item.postoEfe : item.postoTmft;
      if (posto && !acc[posto]) {
        acc[posto] = { name: posto, value: 0 };
      }
      if (posto) {
        acc[posto].value += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; value: number }>);

    const values = Object.values(grouped).filter(item => item.value > 0);
    
    // Sort by the defined order
    return values.sort((a, b) => {
      const indexA = POSTO_ORDER.indexOf(a.name);
      const indexB = POSTO_ORDER.indexOf(b.name);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      let yPosition = 20;

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
      pdf.text('Tabela Mestra de Força de Trabalho', pdf.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
      yPosition += 15;

      if (selectedOMs.length > 0 || selectedOpcoes.length > 0) {
        pdf.setFontSize(10);
        pdf.text('Filtros Aplicados:', 14, yPosition);
        yPosition += 6;
        if (selectedOMs.length > 0) pdf.text(`OM: ${selectedOMs.join(', ')}`, 20, yPosition);
        if (selectedOpcoes.length > 0) pdf.text(`Opção: ${selectedOpcoes.join(', ')}`, 80, yPosition);
        yPosition += 10;
      }

      pdf.setFontSize(10);
      pdf.text(`TMFT Total: ${metrics.totalTMFT}`, 14, yPosition);
      pdf.text(`Ocupados: ${metrics.totalEXI}`, 80, yPosition);
      pdf.text(`Vagos: ${Math.abs(metrics.totalDIF)}`, 146, yPosition);
      pdf.text(`Preenchimento: ${metrics.percentualPreenchimento.toFixed(1)}%`, 212, yPosition);
      yPosition += 10;

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

      const tableData = filteredData.map(item => [
        item.neo.toString(),
        item.setor,
        item.cargo,
        item.postoTmft,
        item.quadroTmft,
        item.nome || '-',
        item.ocupado ? 'Ocupado' : 'Vago',
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['NEO', 'SETOR', 'CARGO', 'POSTO', 'QUADRO', 'NOME', 'STATUS']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
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

      pdf.save('tabela-mestra-forca-trabalho.pdf');
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
        {/* Top Filters */}
        <Card className="p-4 bg-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </h3>
              <div className="flex items-center gap-4">
                {(selectedOMs.length > 0 || selectedQuadros.length > 0 || selectedOpcoes.length > 0) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span>Atualização: {lastUpdate}</span>
                </div>
                <Button onClick={exportToPDF} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* OM Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">OM</h4>
                  {selectedOMs.length > 0 && (
                    <Badge variant="outline" className="text-xs">{selectedOMs.length} selecionado(s)</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                  {availableOMs.map(om => (
                    <div key={om} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`om-${om}`} 
                        checked={selectedOMs.includes(om)}
                        onCheckedChange={() => toggleOM(om)}
                      />
                      <label htmlFor={`om-${om}`} className="text-xs cursor-pointer">{om}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quadro Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Quadro</h4>
                  {selectedQuadros.length > 0 && (
                    <Badge variant="outline" className="text-xs">{selectedQuadros.length} selecionado(s)</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 border rounded-lg bg-muted/30">
                  {availableQuadros.map(quadro => (
                    <div key={quadro} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`quadro-${quadro}`} 
                        checked={selectedQuadros.includes(quadro)}
                        onCheckedChange={() => toggleQuadro(quadro)}
                      />
                      <label htmlFor={`quadro-${quadro}`} className="text-xs cursor-pointer">{quadro}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opção Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Opção</h4>
                  {selectedOpcoes.length > 0 && (
                    <Badge variant="outline" className="text-xs">{selectedOpcoes.length} selecionado(s)</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2 border rounded-lg bg-muted/30">
                  {OPCOES_FIXAS.map(opcao => (
                    <div key={opcao} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`opcao-${opcao}`} 
                        checked={selectedOpcoes.includes(opcao)}
                        onCheckedChange={() => toggleOpcao(opcao)}
                      />
                      <label htmlFor={`opcao-${opcao}`} className="text-xs cursor-pointer">{opcao}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={chartRef}>
          <Card>
            <CardHeader>
              <CardTitle>Ocupação por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataBySetor}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="setor" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ocupados" name="Ocupados" fill="#10b981" />
                  <Bar dataKey="vagos" name="Vagos" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Posto</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByPosto}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" name="Quantidade" fill="#3b82f6">
                    {chartDataByPosto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Mestra com Tabs */}
        <Card>
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-muted/30">
                <TabsTrigger value="efetivo" className="data-[state=active]:bg-background">
                  Tabela de Efetivo
                </TabsTrigger>
                <TabsTrigger value="previsao" className="data-[state=active]:bg-background">
                  Previsão de Desembarque
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-6">Tabela Mestra de Força de Trabalho</h2>
            
            {activeTab === "efetivo" && (
              <div className="space-y-8">
                {Object.entries(groupedBySetor).map(([setor, items]) => (
                  <div key={setor}>
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">{setor}</h3>
                      <Badge variant="secondary" className="rounded-full">
                        {items.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div 
                          key={item.id} 
                          className="border-l-4 border-l-blue-500 bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-base font-bold text-foreground">
                                {item.nome || `NEO ${item.neo} - VAZIO`}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {item.cargo}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                NEO: {item.neo} - {item.cargo}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge 
                                variant={item.ocupado ? "default" : "destructive"}
                                className={item.ocupado 
                                  ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-100" 
                                  : "bg-red-100 text-red-700 border border-red-300 hover:bg-red-100"
                                }
                              >
                                {item.ocupado ? 'Ocupado' : 'Vago'}
                              </Badge>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="bg-background">
                                  {item.ocupado ? item.postoEfe : item.postoTmft}
                                </Badge>
                                <Badge variant="outline" className="bg-background">
                                  {item.ocupado ? item.quadroEfe : item.quadroTmft}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {filteredData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado com os filtros selecionados.
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "previsao" && (
              <div className="space-y-4">
                {desembarqueData.length > 0 ? (
                  desembarqueData.map((item, index) => (
                    <div 
                      key={index}
                      className="border-l-4 border-l-amber-500 bg-card rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-foreground">
                            {item.nome}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {item.cargo}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-amber-600">Destino: {item.destino}</span>
                            <span className="text-muted-foreground">{item.mesAno}</span>
                          </div>
                          {item.documento && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.documento}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{item.posto}</Badge>
                          <Badge variant="outline">{item.quadro}</Badge>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma previsão de desembarque encontrada.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOM;

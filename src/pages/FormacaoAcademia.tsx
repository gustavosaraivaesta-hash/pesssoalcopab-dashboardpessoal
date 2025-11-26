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

interface FormacaoData {
  pessoal: string;
  om: string;
  tmft: number;
  exi: number;
  dif: number;
}

const FormacaoAcademia = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<FormacaoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOMs, setSelectedOMs] = useState<string[]>([]);

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
    let pageTitle = "Formação Academia - OFI";
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

    const omsToShow = selectedOMs.length > 0 ? selectedOMs : allOMs;
    
    omsToShow.forEach((om, omIndex) => {
      const omData = filteredData.filter(item => item.om === om);
      
      if (omData.length === 0) return;

      if (omIndex > 0) {
        currentY += 12;
      }

      doc.setFontSize(11);
      doc.setTextColor(59, 130, 246);
      doc.text(`${om}`, 14, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 5;

      const tableData: any[] = [];
      let totalTmft = 0;
      let totalExi = 0;
      let totalDif = 0;

      omData.forEach(item => {
        totalTmft += item.tmft;
        totalExi += item.exi;
        totalDif += item.dif;

        if (item.tmft > 0 || item.exi > 0) {
          tableData.push([
            item.pessoal,
            item.tmft,
            item.exi,
            { content: item.dif.toString(), styles: { textColor: item.dif < 0 ? [220, 38, 38] : [0, 0, 0] } }
          ]);
        }
      });

      if (tableData.length > 0) {
        tableData.push([
          { content: 'TOTAL', styles: { fontStyle: 'bold' } },
          { content: totalTmft.toString(), styles: { fontStyle: 'bold' } },
          { content: totalExi.toString(), styles: { fontStyle: 'bold' } },
          { content: totalDif.toString(), styles: { fontStyle: 'bold', textColor: totalDif < 0 ? [220, 38, 38] : [0, 0, 0] } }
        ]);
      }

      if (tableData.length > 0) {
        const neededSpace = 15 + (tableData.length * 7) + 8;
        
        if (currentY + neededSpace > pageHeight - marginBottom) {
          doc.addPage();
          currentY = 10;
          
          doc.setFontSize(11);
          doc.setTextColor(59, 130, 246);
          doc.text(`${om} (continuação)`, 14, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 5;
        }

        autoTable(doc, {
          head: [['Pessoal', 'TMFT', 'EXI', 'DIF']],
          body: tableData,
          startY: currentY,
          styles: { fontSize: 10, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], fontSize: 10 },
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
    'BAMRJ',
    'CDAM',
    'CDU-1DN',
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

  const filteredData = data.filter(item => {
    const omMatch = selectedOMs.length === 0 || selectedOMs.includes(item.om);
    return omMatch;
  });

  const groupedByOM = allOMs.reduce((acc, om) => {
    acc[om] = filteredData.filter(item => item.om === om);
    return acc;
  }, {} as Record<string, FormacaoData[]>);

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
              Formação Academia - OFI
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

        {/* Filtro de OMs */}
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Filtrar por OM</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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

        {/* Tabelas por OM */}
        <div className="space-y-6">
          {allOMs.map(om => {
            const omData = groupedByOM[om] || [];
            if (omData.length === 0) return null;

            let totalTmft = 0;
            let totalExi = 0;
            let totalDif = 0;

            omData.forEach(item => {
              totalTmft += item.tmft;
              totalExi += item.exi;
              totalDif += item.dif;
            });

            return (
              <div key={om} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="bg-primary/10 px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-lg text-primary">{om}</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Pessoal</TableHead>
                        <TableHead className="font-semibold text-center">TMFT</TableHead>
                        <TableHead className="font-semibold text-center">EXI</TableHead>
                        <TableHead className="font-semibold text-center">DIF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {omData.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.pessoal}</TableCell>
                          <TableCell className="text-center">{item.tmft}</TableCell>
                          <TableCell className="text-center">{item.exi}</TableCell>
                          <TableCell className={`text-center font-semibold ${
                            item.dif < 0 ? 'text-destructive' : 'text-foreground'
                          }`}>
                            {item.dif}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-center">{totalTmft}</TableCell>
                        <TableCell className="text-center">{totalExi}</TableCell>
                        <TableCell className={`text-center ${
                          totalDif < 0 ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {totalDif}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FormacaoAcademia;

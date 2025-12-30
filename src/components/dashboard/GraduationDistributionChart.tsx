import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EspecialidadeData {
  especialidade: string;
  graduacao: string;
  om: string;
  tmft_sum: number;
  efe_sum: number;
}

interface GraduationDistributionChartProps {
  selectedOMs?: string[];
  selectedEspecialidades?: string[];
  selectedGraduacoes?: string[];
}

export const GraduationDistributionChart = ({ 
  selectedOMs = [], 
  selectedEspecialidades = [],
  selectedGraduacoes = []
}: GraduationDistributionChartProps) => {
  const [chartData, setChartData] = useState<{ graduacao: string; tmft: number; efe: number; dif: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGraduacao, setSelectedGraduacao] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: response, error } = await supabase.functions.invoke('fetch-especialidades-data');
        
        if (error) throw error;
        
        const especialidadesData = response?.data || [];
        
        // Filtrar por OMs, Especialidades e Graduações selecionadas
        const filteredData = especialidadesData.filter((item: EspecialidadeData) => {
          const omMatch = selectedOMs.length === 0 || selectedOMs.includes(item.om);
          const espMatch = selectedEspecialidades.length === 0 || selectedEspecialidades.includes(item.especialidade);
          const gradMatch = selectedGraduacoes.length === 0 || selectedGraduacoes.includes(item.graduacao);
          return omMatch && espMatch && gradMatch;
        });
        
        // Agrupar por graduação e somar tmft_sum e efe_sum
        const graduationData = new Map<string, { tmft: number; efe: number }>();
        
        filteredData.forEach((item: EspecialidadeData) => {
          const current = graduationData.get(item.graduacao) || { tmft: 0, efe: 0 };
          graduationData.set(item.graduacao, {
            tmft: current.tmft + item.tmft_sum,
            efe: current.efe + item.efe_sum
          });
        });
        
        // Ordenar por ordem de graduação (SO, 1SG, 2SG, 3SG, CB, MN)
        const ordenacao = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
        
        const data = Array.from(graduationData.entries())
          .map(([graduacao, values]) => ({
            graduacao,
            tmft: values.tmft,
            efe: values.efe,
            dif: values.efe - values.tmft
          }))
          .sort((a, b) => ordenacao.indexOf(a.graduacao) - ordenacao.indexOf(b.graduacao));
        
        setChartData(data);
      } catch (error) {
        console.error('Erro ao buscar dados de graduação:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedOMs, selectedEspecialidades, selectedGraduacoes]);

  const handleBarClick = (data: any, index: number) => {
    setSelectedGraduacao(data.graduacao);
    setDialogOpen(true);
  };

  const handleMouseEnter = (index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  const selectedData = chartData.find(d => d.graduacao === selectedGraduacao);

  if (loading) {
    return (
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Distribuição por Posto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Distribuição por Posto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular min/max para o eixo Y incluindo valores negativos de DIF
  const minDif = Math.min(...chartData.map(d => d.dif));
  const maxValue = Math.max(...chartData.map(d => Math.max(d.tmft, d.efe, d.dif)));
  const yAxisMin = Math.floor(Math.min(0, minDif) * 1.1);
  const yAxisMax = Math.ceil(maxValue * 1.1);

  return (
    <>
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Distribuição por Posto
            <span className="text-sm font-normal text-muted-foreground ml-2 block">
              Clique nas colunas para ver os detalhes
            </span>
            {(selectedOMs.length > 0 || selectedEspecialidades.length > 0 || selectedGraduacoes.length > 0) && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (
                {selectedOMs.length > 0 && `OMs: ${selectedOMs.join(', ')}`}
                {selectedOMs.length > 0 && (selectedEspecialidades.length > 0 || selectedGraduacoes.length > 0) && ' | '}
                {selectedEspecialidades.length > 0 && `Esp: ${selectedEspecialidades.slice(0, 3).join(', ')}${selectedEspecialidades.length > 3 ? '...' : ''}`}
                {selectedEspecialidades.length > 0 && selectedGraduacoes.length > 0 && ' | '}
                {selectedGraduacoes.length > 0 && `Pessoal: ${selectedGraduacoes.join(', ')}`}
                )
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="graduacao"
                style={{ fontSize: '14px', fontWeight: 'bold' }}
              />
              <YAxis 
                domain={[yAxisMin, yAxisMax]}
                label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value}`,
                  name === 'tmft' ? 'TMFT' : name === 'efe' ? 'Efetivo' : 'Diferença'
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                formatter={(value) => {
                  if (value === 'tmft') return 'TMFT';
                  if (value === 'efe') return 'Efetivo';
                  if (value === 'dif') return 'Diferença';
                  return value;
                }}
              />
              <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
              <Bar 
                dataKey="tmft" 
                name="tmft"
                fill="#d1d5db"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
                onMouseEnter={(_, index) => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-tmft-${index}`} 
                    fill={activeIndex === index ? '#9ca3af' : '#d1d5db'}
                    style={{ transition: 'fill 0.2s ease' }}
                  />
                ))}
                <LabelList 
                  dataKey="tmft" 
                  position="top" 
                  style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
                />
              </Bar>
              <Bar 
                dataKey="efe" 
                name="efe"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
                onMouseEnter={(_, index) => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-efe-${index}`} 
                    fill={activeIndex === index ? '#2563eb' : '#3b82f6'}
                    style={{ transition: 'fill 0.2s ease' }}
                  />
                ))}
                <LabelList 
                  dataKey="efe" 
                  position="top" 
                  style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
                />
              </Bar>
              <Bar 
                dataKey="dif" 
                name="dif"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={handleBarClick}
                onMouseEnter={(_, index) => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-dif-${index}`} 
                    fill={entry.dif >= 0 ? (activeIndex === index ? '#059669' : '#10b981') : (activeIndex === index ? '#dc2626' : '#ef4444')}
                    style={{ transition: 'fill 0.2s ease' }}
                  />
                ))}
                <LabelList 
                  dataKey="dif" 
                  position="top"
                  style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
                  content={({ x, y, width, value, height }) => {
                    const numValue = Number(value);
                    const numY = Number(y);
                    const numX = Number(x);
                    const numWidth = Number(width);
                    const numHeight = Number(height);
                    const yPos = numValue >= 0 ? numY - 5 : numY + numHeight + 15;
                    return (
                      <text 
                        x={numX + numWidth / 2} 
                        y={yPos} 
                        fill="hsl(var(--foreground))" 
                        fontWeight="bold" 
                        fontSize="11px"
                        textAnchor="middle"
                      >
                        {numValue >= 0 ? `+${numValue}` : numValue}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedGraduacao}
            </DialogTitle>
          </DialogHeader>
          {selectedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">TMFT</p>
                  <p className="text-2xl font-bold text-gray-600">{selectedData.tmft}</p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Efetivo</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedData.efe}</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${selectedData.dif >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <p className="text-sm text-muted-foreground">Diferença</p>
                  <p className={`text-2xl font-bold ${selectedData.dif >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedData.dif >= 0 ? `+${selectedData.dif}` : selectedData.dif}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-center">
                {selectedData.dif >= 0 
                  ? `Excedente de ${selectedData.dif} militar${selectedData.dif !== 1 ? 'es' : ''}`
                  : `Déficit de ${Math.abs(selectedData.dif)} militar${Math.abs(selectedData.dif) !== 1 ? 'es' : ''}`
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [chartData, setChartData] = useState<{ graduacao: string; quantidade: number; percentual: number }[]>([]);
  const [loading, setLoading] = useState(true);

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
        
        // Agrupar por graduação e somar o efe_sum
        const graduationCount = new Map<string, number>();
        
        filteredData.forEach((item: EspecialidadeData) => {
          const currentCount = graduationCount.get(item.graduacao) || 0;
          graduationCount.set(item.graduacao, currentCount + item.efe_sum);
        });
        
        // Calcular total para percentuais
        const total = Array.from(graduationCount.values()).reduce((sum, val) => sum + val, 0);
        
        // Ordenar por ordem de graduação (SO, 1SG, 2SG, 3SG, CB, MN)
        const ordenacao = ['SO', '1SG', '2SG', '3SG', 'CB', 'MN'];
        
        const data = Array.from(graduationCount.entries())
          .map(([graduacao, quantidade]) => ({
            graduacao,
            quantidade,
            percentual: total > 0 ? Number(((quantidade / total) * 100).toFixed(1)) : 0
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

  // Cores para cada graduação
  const colors = [
    "#1e40af", // SO - azul escuro
    "#3b82f6", // 1SG - azul médio
    "#60a5fa", // 2SG - azul claro
    "#93c5fd", // 3SG - azul mais claro
    "#bfdbfe", // CB - azul muito claro
    "#dbeafe", // MN - azul ultra claro
  ];

  if (loading) {
    return (
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Distribuição por Graduação (Pessoal)
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
            Distribuição por Graduação (Pessoal)
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

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Distribuição por Graduação (Pessoal)
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
              label={{ value: 'Quantidade de Militares', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} militares (${props.payload.percentual}%)`,
                'Quantidade'
              ]}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend 
              formatter={() => 'Graduação'}
            />
            <Bar 
              dataKey="quantidade" 
              name="Quantidade"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
              <LabelList 
                dataKey="percentual" 
                position="top" 
                formatter={(value: number) => `${value}%`}
                style={{ fill: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

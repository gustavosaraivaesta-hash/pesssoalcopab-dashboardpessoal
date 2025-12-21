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
  const [chartData, setChartData] = useState<{ graduacao: string; tmft: number; efe: number }[]>([]);
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
            efe: values.efe
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
              formatter={(value: number, name: string) => [
                `${value} militares`,
                name
              ]}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="tmft" 
              name="TMFT"
              fill="#93c5fd"
              radius={[8, 8, 0, 0]}
            >
              <LabelList 
                dataKey="tmft" 
                position="top" 
                style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
              />
            </Bar>
            <Bar 
              dataKey="efe" 
              name="EFE"
              fill="#ef4444"
              radius={[8, 8, 0, 0]}
            >
              <LabelList 
                dataKey="efe" 
                position="top" 
                style={{ fill: 'hsl(var(--foreground))', fontSize: '11px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

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

interface TopSpecialtiesChartProps {
  selectedOMs?: string[];
}

export const TopSpecialtiesChart = ({ selectedOMs = [] }: TopSpecialtiesChartProps) => {
  const [sortedData, setSortedData] = useState<{ especialidade: string; quantidade: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: response, error } = await supabase.functions.invoke('fetch-especialidades-data');
        
        if (error) throw error;
        
        // Extrair o array de dados da resposta
        const especialidadesData = response?.data || [];
        
        // Filtrar por OMs selecionadas (se houver)
        const filteredData = selectedOMs.length > 0
          ? especialidadesData.filter((item: EspecialidadeData) => selectedOMs.includes(item.om))
          : especialidadesData;
        
        // Agrupar por especialidade e somar o efe_sum
        const specialtyCount = new Map<string, number>();
        
        filteredData.forEach((item: EspecialidadeData) => {
          const currentCount = specialtyCount.get(item.especialidade) || 0;
          specialtyCount.set(item.especialidade, currentCount + item.efe_sum);
        });
        
        // Converter para array e ordenar por quantidade (decrescente)
        const sorted = Array.from(specialtyCount.entries())
          .map(([especialidade, quantidade]) => ({
            especialidade,
            quantidade
          }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5); // Top 5
        
        setSortedData(sorted);
      } catch (error) {
        console.error('Erro ao buscar dados da Página 3:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedOMs]);

  // Cores gradientes para as barras
  const colors = [
    "#1e40af", // azul escuro - 1º lugar
    "#3b82f6", // azul médio - 2º lugar
    "#60a5fa", // azul claro - 3º lugar
    "#93c5fd", // azul mais claro - 4º lugar
    "#bfdbfe", // azul muito claro - 5º lugar
  ];

  if (loading) {
    return (
      <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Top 5 Especialidades com Maior Número de Militares
          {selectedOMs.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({selectedOMs.join(', ')})
            </span>
          )}
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

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Top 5 Especialidades com Maior Número de Militares
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="especialidade"
              width={140}
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              formatter={(value: number) => [`${value} militares`, 'Quantidade']}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend 
              formatter={() => 'Quantidade de Militares'}
            />
            <Bar 
              dataKey="quantidade" 
              name="Quantidade"
              radius={[0, 8, 8, 0]}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
              <LabelList 
                dataKey="quantidade" 
                position="right" 
                style={{ fill: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

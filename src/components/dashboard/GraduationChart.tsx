import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { MilitaryData } from "@/types/military";
import { useMemo } from "react";

interface GraduationChartProps {
  data: MilitaryData[];
}

const GRADUATIONS = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

const COLORS = {
  "SO": "#1e40af",      // blue-800
  "1SG": "#2563eb",     // blue-600
  "2SG": "#3b82f6",     // blue-500
  "3SG": "#60a5fa",     // blue-400
  "CB": "#93c5fd",      // blue-300
  "MN": "#dbeafe",      // blue-100
};

export const GraduationChart = ({ data }: GraduationChartProps) => {
  const chartData = useMemo(() => {
    const graduationCounts: Record<string, number> = {};
    
    // Inicializar contadores
    GRADUATIONS.forEach(grad => {
      graduationCounts[grad] = 0;
    });
    
    // Contar quantas pessoas existem em cada graduação
    data.forEach(item => {
      const grad = item.graduacao;
      if (GRADUATIONS.includes(grad)) {
        graduationCounts[grad] += item.exi; // Usando EXI como quantidade
      }
    });
    
    // Converter para formato do gráfico
    return GRADUATIONS.map(grad => ({
      graduacao: grad,
      quantidade: graduationCounts[grad],
    }));
  }, [data]);

  const totalQuantidade = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.quantidade, 0);
  }, [chartData]);

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center justify-between">
          <span>Distribuição por Graduação</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total: {totalQuantidade}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="graduacao" 
              className="text-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar 
              dataKey="quantidade" 
              name="Quantidade"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry) => (
                <Cell 
                  key={`cell-${entry.graduacao}`} 
                  fill={COLORS[entry.graduacao as keyof typeof COLORS]} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

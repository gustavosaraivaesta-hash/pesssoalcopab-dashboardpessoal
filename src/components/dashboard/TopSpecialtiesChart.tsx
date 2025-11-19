import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { MilitaryData } from "@/types/military";

interface TopSpecialtiesChartProps {
  data: MilitaryData[];
}

export const TopSpecialtiesChart = ({ data }: TopSpecialtiesChartProps) => {
  // Agrupar dados por especialidade e contar o número de militares
  const specialtyCount = new Map<string, number>();
  
  data.forEach(item => {
    const currentCount = specialtyCount.get(item.especialidade) || 0;
    specialtyCount.set(item.especialidade, currentCount + 1);
  });
  
  // Converter para array e ordenar por quantidade (decrescente)
  const sortedData = Array.from(specialtyCount.entries())
    .map(([especialidade, quantidade]) => ({
      especialidade,
      quantidade
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5); // Top 5

  // Cores gradientes para as barras
  const colors = [
    "#1e40af", // azul escuro - 1º lugar
    "#3b82f6", // azul médio - 2º lugar
    "#60a5fa", // azul claro - 3º lugar
    "#93c5fd", // azul mais claro - 4º lugar
    "#bfdbfe", // azul muito claro - 5º lugar
  ];

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
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

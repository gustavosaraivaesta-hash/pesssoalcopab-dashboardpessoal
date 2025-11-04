import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MilitaryData } from "@/types/military";

interface DistributionChartProps {
  data: MilitaryData[];
  selectedSpecialties: string[];
}

export const DistributionChart = ({ data, selectedSpecialties }: DistributionChartProps) => {
  // Agrupar dados por OM e Especialidade
  const omGroups = new Map<string, Map<string, number>>();
  
  // Primeiro, agrupe todos os dados
  data.forEach(item => {
    if (!omGroups.has(item.om)) {
      omGroups.set(item.om, new Map());
    }
    
    const especialidadeMap = omGroups.get(item.om)!;
    if (selectedSpecialties.includes(item.especialidade)) {
      especialidadeMap.set(
        item.especialidade, 
        (especialidadeMap.get(item.especialidade) || 0) + 1
      );
    }
  });
  
  // Converter para array de objetos para o gráfico
  const chartData = Array.from(omGroups.entries()).map(([om, especialidades]) => {
    const entry: any = { om };
    selectedSpecialties.forEach(esp => {
      entry[esp] = especialidades.get(esp) || 0;
    });
    return entry;
  });

  // Cores para cada especialidade
  const colors = [
    "#3b82f6", // azul
    "#10b981", // verde
    "#f59e0b", // laranja
    "#ef4444", // vermelho
    "#8b5cf6", // roxo
    "#ec4899", // rosa
  ];

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Distribuição de Pessoal por OM
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="om" 
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
              style={{ fontSize: '12px' }}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedSpecialties.map((esp, index) => (
              <Bar 
                key={esp}
                dataKey={esp} 
                fill={colors[index % colors.length]}
                name={esp}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

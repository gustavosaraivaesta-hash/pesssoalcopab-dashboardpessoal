import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MilitaryData } from "@/types/military";

interface DistributionChartProps {
  data: MilitaryData[];
  selectedSpecialties: string[];
}

export const DistributionChart = ({ data, selectedSpecialties }: DistributionChartProps) => {
  // Agrupar dados por OM e Especialidade
  const chartData = data.reduce((acc, item) => {
    const omIndex = acc.findIndex(d => d.om === item.om);
    
    if (omIndex === -1) {
      const newEntry: any = { om: item.om };
      selectedSpecialties.forEach(esp => {
        newEntry[esp] = item.especialidade === esp ? 1 : 0;
      });
      acc.push(newEntry);
    } else {
      if (selectedSpecialties.includes(item.especialidade)) {
        acc[omIndex][item.especialidade] = (acc[omIndex][item.especialidade] || 0) + 1;
      }
    }
    
    return acc;
  }, [] as any[]);

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

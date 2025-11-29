import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { MilitaryData } from "@/types/military";

interface DifferenceByGraduationChartProps {
  data: MilitaryData[];
}

export const DifferenceByGraduationChart = ({ data }: DifferenceByGraduationChartProps) => {
  // Get unique graduations
  const allGraduations = Array.from(new Set(data.map(item => item.graduacao))).sort();
  
  // Calculate DIF for each graduation
  const chartData = allGraduations.map(graduacao => {
    const items = data.filter(item => item.graduacao === graduacao);
    const tmft = items.reduce((sum, item) => sum + item.tmft, 0);
    const exi = items.reduce((sum, item) => sum + item.exi, 0);
    const dif = exi - tmft; // DIF = EXI - TMFT
    
    return {
      name: graduacao,
      value: dif,
    };
  }).sort((a, b) => a.value - b.value); // Sort by value ascending
  
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Diferença por Graduação/Categoria
      </h3>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100}
            />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.value >= 0 ? '#10b981' : '#ef4444'} 
                />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px',
                  fill: '#000'
                }}
                formatter={(value: number) => value > 0 ? `+${value}` : value}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

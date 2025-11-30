import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface TopDeficitChartProps {
  data: Array<{
    name: string;
    deficit: number;
  }>;
  title: string;
}

const TopDeficitChart = ({ data, title }: TopDeficitChartProps) => {
  const [chartData, setChartData] = useState<Array<{ name: string; deficit: number }>>([]);

  useEffect(() => {
    // Filter only negative deficits and get top 5
    const deficitData = data
      .filter(item => item.deficit < 0)
      .sort((a, b) => a.deficit - b.deficit) // Sort ascending (most negative first)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        deficit: Math.abs(item.deficit) // Show as positive number for better visualization
      }));

    setChartData(deficitData);
  }, [data]);

  const colors = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'];

  if (chartData.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum deficit encontrado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={200}
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              formatter={(value: number) => [`-${value}`, 'Deficit']}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <Legend />
            <Bar dataKey="deficit" name="Deficit" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
              <LabelList 
                dataKey="deficit" 
                position="right" 
                style={{ fill: '#000', fontWeight: 'bold', fontSize: '14px' }}
                formatter={(value: number) => `-${value}`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TopDeficitChart;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from "recharts";

interface TotalsChartProps {
  totalTMFT: number;
  totalEXI: number;
  totalDIF: number;
}

export const TotalsChart = ({ totalTMFT, totalEXI, totalDIF }: TotalsChartProps) => {
  const data = [
    {
      name: "TMFT",
      valor: totalTMFT,
      color: "#3b82f6"
    },
    {
      name: "EXI",
      valor: totalEXI,
      color: "#10b981"
    },
    {
      name: "DIF",
      valor: Math.abs(totalDIF),
      color: "#ef4444"
    }
  ];

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Gráfico de Totais</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === "valor") {
                  const item = data.find(d => d.valor === Math.abs(value));
                  if (item?.name === "DIF") {
                    return totalDIF;
                  }
                  return value;
                }
                return value;
              }}
            />
            <Legend formatter={(value) => value === "valor" ? "Valor" : value} />
            <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList 
                dataKey="valor" 
                position="top" 
                formatter={(value: number, index: number) => {
                  if (index === 2) {
                    return totalDIF;
                  }
                  return value;
                }}
                style={{ fill: '#000', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

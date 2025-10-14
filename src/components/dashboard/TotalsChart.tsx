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
      valor: totalDIF,
      color: totalDIF >= 0 ? "#000000" : "#ef4444"
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
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend formatter={(value) => value === "valor" ? "Valor" : value} />
            <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList 
                dataKey="valor" 
                position="top"
                content={({ x, y, width, value, index }) => {
                  const numValue = Number(value);
                  const numY = Number(y);
                  const numX = Number(x);
                  const numWidth = Number(width);
                  const yPos = numValue >= 0 ? numY - 5 : numY + 20;
                  return (
                    <text x={numX + numWidth / 2} y={yPos} fill="#000" fontWeight="bold" textAnchor="middle">
                      {numValue}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

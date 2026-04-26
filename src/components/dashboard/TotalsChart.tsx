import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";

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
      color: totalDIF >= 0 ? "hsl(var(--foreground))" : "#ef4444"
    }
  ];

  const maxValue = Math.max(totalTMFT, totalEXI, Math.abs(totalDIF));
  const minValue = Math.min(0, totalDIF);
  const yAxisMax = Math.ceil(maxValue * 1.2);
  const yAxisMin = Math.floor(minValue * 1.2);

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Gráfico de Totais</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--foreground))" tick={{ fill: "hsl(var(--foreground))" }} />
            <YAxis domain={[yAxisMin, yAxisMax]} stroke="hsl(var(--foreground))" tick={{ fill: "hsl(var(--foreground))" }} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
            <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={2} />
            <Legend formatter={(value) => value === "valor" ? "Valor" : value} />
            <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList 
                dataKey="valor" 
                position="top"
                content={({ x, y, width, value, height }) => {
                  const numValue = Number(value);
                  const numY = Number(y);
                  const numX = Number(x);
                  const numWidth = Number(width);
                  const numHeight = Number(height);
                  const yPos = numValue >= 0 ? numY - 5 : numY + numHeight + 15;
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

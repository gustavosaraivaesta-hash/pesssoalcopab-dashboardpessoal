import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";

interface TotalsChartProps {
  totalTMFT: number;
  totalEXI: number;
  totalDIF: number;
}

const SERIES = [
  { key: "TMFT", from: "hsl(var(--accent))", to: "hsl(var(--accent) / 0.55)", chip: "bg-accent" },
  { key: "EXI", from: "hsl(var(--success))", to: "hsl(var(--success) / 0.55)", chip: "bg-success" },
  { key: "DIF", from: "hsl(var(--destructive))", to: "hsl(var(--destructive) / 0.55)", chip: "bg-destructive" },
];

export const TotalsChart = ({ totalTMFT, totalEXI, totalDIF }: TotalsChartProps) => {
  const data = [
    { name: "TMFT", valor: totalTMFT, fill: "url(#grad-tmft)" },
    { name: "EXI", valor: totalEXI, fill: "url(#grad-exi)" },
    { name: "DIF", valor: totalDIF, fill: totalDIF >= 0 ? "url(#grad-exi)" : "url(#grad-dif)" },
  ];

  const maxValue = Math.max(totalTMFT, totalEXI, Math.abs(totalDIF));
  const minValue = Math.min(0, totalDIF);
  const yAxisMax = Math.ceil(maxValue * 1.2);
  const yAxisMin = Math.floor(minValue * 1.2);

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/60 py-4">
        <CardTitle className="text-sm font-semibold">Gráfico de Totais</CardTitle>
        <div className="flex items-center gap-4">
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.chip}`} />
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {s.key}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-tmft" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="grad-exi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="grad-dif" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.95} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              axisLine={false}
              tickLine={false}
              width={48}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
            <Bar dataKey="valor" name="Valor" radius={[8, 8, 0, 0]} maxBarSize={96}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="valor"
                content={({ x, y, width, value, height }) => {
                  const numValue = Number(value);
                  const numY = Number(y);
                  const numX = Number(x);
                  const numWidth = Number(width);
                  const numHeight = Number(height);
                  const yPos = numValue >= 0 ? numY - 8 : numY + numHeight + 16;
                  return (
                    <text
                      x={numX + numWidth / 2}
                      y={yPos}
                      fill="hsl(var(--foreground))"
                      fontWeight="700"
                      fontSize={12}
                      textAnchor="middle"
                    >
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

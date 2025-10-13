import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MilitaryData } from "@/types/military";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

interface ChartsSectionProps {
  data: MilitaryData[];
}

export const ChartsSection = ({ data }: ChartsSectionProps) => {
  // Dados agrupados por SDP
  const dataBySDp = data.reduce((acc, item) => {
    const existing = acc.find(x => x.sdp === item.sdp);
    if (existing) {
      existing.tmft += item.tmft;
      existing.exi += item.exi;
      existing.dif += item.dif;
    } else {
      acc.push({
        sdp: item.sdp,
        tmft: item.tmft,
        exi: item.exi,
        dif: item.dif
      });
    }
    return acc;
  }, [] as { sdp: string; tmft: number; exi: number; dif: number }[]);

  // Dados por mês
  const dataByMonth = data.reduce((acc, item) => {
    const monthYear = new Date(item.previsaoEmbarque + "-01").toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric"
    });
    const existing = acc.find(x => x.mes === monthYear);
    if (existing) {
      existing.total += item.exi;
    } else {
      acc.push({
        mes: monthYear,
        total: item.exi
      });
    }
    return acc;
  }, [] as { mes: string; total: number }[]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">
            Comparativo por SDP DAbM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataBySDp}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="sdp" 
                tick={{ fill: 'hsl(var(--foreground))' }}
                fontSize={12}
              />
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="tmft" fill="hsl(var(--primary))" name="TMFT" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exi" fill="hsl(var(--accent))" name="EXI" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-card bg-gradient-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">
            Embarques por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataByMonth}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="mes" 
                tick={{ fill: 'hsl(var(--foreground))' }}
                fontSize={12}
              />
              <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(var(--success))" 
                strokeWidth={3}
                name="Total Militares"
                dot={{ fill: 'hsl(var(--success))', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

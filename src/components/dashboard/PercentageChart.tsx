import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { MilitaryData } from "@/types/military";

interface PercentageChartProps {
  data: MilitaryData[];
}

export const PercentageChart = ({ data }: PercentageChartProps) => {
  const chartData = useMemo(() => {
    const groupedByGraduacao = data.reduce((acc, item) => {
      if (!acc[item.graduacao]) {
        acc[item.graduacao] = {
          graduacao: item.graduacao,
          totalPracasAtiva: 0,
          totalForcaTrabalho: 0,
          count: 0
        };
      }
      acc[item.graduacao].totalPracasAtiva += item.percentualPracasAtiva;
      acc[item.graduacao].totalForcaTrabalho += item.percentualForcaTrabalho;
      acc[item.graduacao].count += 1;
      return acc;
    }, {} as Record<string, { graduacao: string; totalPracasAtiva: number; totalForcaTrabalho: number; count: number }>);

    const graduacaoOrder = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];
    
    return graduacaoOrder
      .filter(grad => groupedByGraduacao[grad])
      .map(grad => {
        const item = groupedByGraduacao[grad];
        return {
          graduacao: grad,
          "% N/A Praças Ativa": Math.round(item.totalPracasAtiva / item.count),
          "% N/A Força Trabalho": Math.round(item.totalForcaTrabalho / item.count)
        };
      });
  }, [data]);

  const chartConfig = {
    "% N/A Praças Ativa": {
      label: "% N/A Praças Ativa",
      color: "hsl(var(--chart-1))",
    },
    "% N/A Força Trabalho": {
      label: "% N/A Força Trabalho",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Percentuais por Graduação</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="graduacao" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="% N/A Praças Ativa" fill="var(--color-% N/A Praças Ativa)" />
              <Bar dataKey="% N/A Força Trabalho" fill="var(--color-% N/A Força Trabalho)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

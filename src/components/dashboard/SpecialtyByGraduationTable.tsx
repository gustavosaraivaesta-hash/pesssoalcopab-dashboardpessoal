import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MilitaryData } from "@/types/military";

interface SpecialtyByGraduationTableProps {
  data: MilitaryData[];
}

const GRADUACOES = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

export const SpecialtyByGraduationTable = ({ data }: SpecialtyByGraduationTableProps) => {
  const tableData = useMemo(() => {
    // Group data by especialidade and graduacao
    const grouped: Record<string, Record<string, number>> = {};

    data.forEach((item) => {
      if (!grouped[item.especialidade]) {
        grouped[item.especialidade] = {};
        GRADUACOES.forEach(grad => {
          grouped[item.especialidade][grad] = 0;
        });
      }
      if (GRADUACOES.includes(item.graduacao)) {
        grouped[item.especialidade][item.graduacao]++;
      }
    });

    // Convert to array and sort by especialidade
    return Object.entries(grouped)
      .map(([especialidade, graduacoes]) => {
        const total = GRADUACOES.reduce((sum, grad) => sum + (graduacoes[grad] || 0), 0);
        return {
          especialidade,
          ...graduacoes,
          total,
        };
      })
      .sort((a, b) => a.especialidade.localeCompare(b.especialidade));
  }, [data]);

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle>Quantitativo por Especialidade e Graduação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Especialidade</TableHead>
                {GRADUACOES.map((grad) => (
                  <TableHead key={grad} className="text-center font-bold">
                    {grad}
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.especialidade}>
                  <TableCell className="font-medium">{row.especialidade}</TableCell>
                  {GRADUACOES.map((grad) => (
                    <TableCell key={grad} className="text-center">
                      {row[grad] || 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

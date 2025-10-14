import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MilitaryData } from "@/types/military";
import { Badge } from "@/components/ui/badge";
import { getEspecialidadeName } from "@/data/mockData";

interface DataTableProps {
  data: MilitaryData[];
}

export const DataTable = ({ data }: DataTableProps) => {
  const getDifBadgeVariant = (dif: number) => {
    if (dif > 0) return "default";
    if (dif === 0) return "secondary";
    return "destructive";
  };

  return (
    <Card className="shadow-card bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">
          Dados Detalhados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Especialidade</TableHead>
                <TableHead className="font-semibold">Graduação</TableHead>
                <TableHead className="font-semibold">OM</TableHead>
                <TableHead className="font-semibold">SDP DAbM</TableHead>
                <TableHead className="font-semibold text-center">TMFT</TableHead>
                <TableHead className="font-semibold text-center">EXI</TableHead>
                <TableHead className="font-semibold text-center">DIF</TableHead>
                <TableHead className="font-semibold">Previsão Embarque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado com os filtros selecionados
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-sm">
                      {getEspecialidadeName(item.especialidade)}
                    </TableCell>
                    <TableCell className="font-semibold">{item.graduacao}</TableCell>
                    <TableCell>{item.om}</TableCell>
                    <TableCell>{item.sdp}</TableCell>
                    <TableCell className="text-center font-semibold">{item.tmft}</TableCell>
                    <TableCell className="text-center font-semibold">{item.exi}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getDifBadgeVariant(item.dif)}>
                        {item.dif > 0 ? `+${item.dif}` : item.dif}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.previsaoEmbarque + "-01").toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "numeric"
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

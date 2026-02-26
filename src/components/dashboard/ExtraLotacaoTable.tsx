import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ExtraLotacaoRow = {
  id: string;
  categoria: "PRAÇAS" | "OFICIAIS";
  om: string;
  posto: string;
  quadro: string;
  opcao: string;
  cargo: string;
  nome: string;
  ocupado: boolean;
};

interface ExtraLotacaoTableProps {
  rows: ExtraLotacaoRow[];
}

export const ExtraLotacaoTable = ({ rows }: ExtraLotacaoTableProps) => {
  if (rows.length === 0) return null;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>Sem NEO</span>
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>OM</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead>Quadro</TableHead>
                <TableHead>Opção</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.categoria}</TableCell>
                  <TableCell>{r.om || "-"}</TableCell>
                  <TableCell>{r.posto || "-"}</TableCell>
                  <TableCell>{r.quadro || "-"}</TableCell>
                  <TableCell>{r.opcao || "-"}</TableCell>
                  <TableCell>{r.cargo || "-"}</TableCell>
                  <TableCell>{r.nome || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.ocupado ? "default" : "outline"}>{r.ocupado ? "OCUPADO" : "VAGO"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

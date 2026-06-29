import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OfficerCard from "@/components/dashboard/OfficerCard";
import { formatMilitarNameWithOpcao } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: any | null;
  inspecao?: {
    posto: string;
    quadro: string;
    nome: string;
    validade: string;
    status: "vencida" | "atencao" | "ok";
  } | null;
}

const MilitarFullDetailDialog = ({ open, onOpenChange, record, inspecao }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Ficha completa do militar
          </DialogTitle>
        </DialogHeader>

        {!record ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Militar não encontrado nos dashboards de OM/Praças.
            {inspecao && (
              <p className="mt-2 text-foreground font-medium uppercase">
                {formatMilitarNameWithOpcao(inspecao.posto, inspecao.quadro, inspecao.nome, "")}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <OfficerCard item={record} index={0} keyPrefix="full-detail" />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identificação</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-xs">
                <Info label="NEO" value={String(record.neo ?? "—")} />
                <Info label="OM" value={record.om || "—"} />
                <Info label="Nome" value={record.nome || "—"} />
                <Info label="Cargo / Incumbência" value={record.cargo || "—"} />
                <Info label="Setor" value={record.setor || "—"} />
                <Info label="Tipo de Setor" value={record.tipoSetor || "—"} />
              </CardContent>
            </Card>


            {inspecao && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Inspeção de Saúde</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-muted-foreground">Validade</p>
                    <p className="font-semibold">{inspecao.validade}</p>
                  </div>
                  <div>
                    {inspecao.status === "vencida" && (
                      <Badge variant="destructive">Vencida</Badge>
                    )}
                    {inspecao.status === "atencao" && (
                      <Badge className="bg-amber-500 hover:bg-amber-600">Vence ≤ 6m</Badge>
                    )}
                    {inspecao.status === "ok" && (
                      <Badge className="bg-primary hover:bg-primary/90">Em dia</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-muted-foreground">{label}</p>
    <p className="font-medium uppercase break-words">{value}</p>
  </div>
);

export default MilitarFullDetailDialog;

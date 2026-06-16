import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TTCData } from "@/types/ttc";
import { calcularIdadeAtual, calcularTempoRestante, getTempoFaltanteStatus, formatMilitarName } from "@/lib/ttcUtils";
import { cn } from "@/lib/utils";
import { User, Building2, Calendar, Clock, FileText, AlertCircle, Briefcase, Hash } from "lucide-react";

interface TTCMilitarDetailDialogProps {
  militar: TTCData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Field = ({ label, value, icon: Icon, className }: { label: string; value: React.ReactNode; icon?: any; className?: string }) => (
  <div className={cn("space-y-1", className)}>
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
    <div className="text-sm font-medium text-foreground break-words">{value || "-"}</div>
  </div>
);

const TTCMilitarDetailDialog = ({ militar, open, onOpenChange }: TTCMilitarDetailDialogProps) => {
  if (!militar) return null;

  const tempoRestante = !militar.isVaga ? calcularTempoRestante(militar.termino) : null;
  const tempoFaltanteStatus = !militar.isVaga && militar.tempoFaltante
    ? getTempoFaltanteStatus(militar.tempoFaltante, militar.excedeu10Anos)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {militar.isVaga ? (
                  <span className="text-red-600">VAGA EM ABERTO</span>
                ) : (
                  formatMilitarName(militar.graduacao, militar.espQuadro, militar.nomeCompleto)
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{militar.om}</Badge>
                <Badge variant="secondary">{militar.area}</Badge>
                {militar.isVaga ? (
                  <Badge variant="destructive">Vaga em aberto</Badge>
                ) : (
                  <Badge className="bg-green-600 hover:bg-green-700">Contratado</Badge>
                )}
                {militar.excedeu10Anos && (
                  <Badge variant="destructive">Excedeu 10 anos</Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Identificação */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
              <User className="h-4 w-4 text-primary" /> Identificação
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Graduação" value={militar.graduacao} />
              <Field label="ESP / Quadro" value={militar.espQuadro} />
              <Field label="Idade" value={calcularIdadeAtual(militar.idade)} />
              <Field label="Nome Completo" value={militar.nomeCompleto || "VAGO"} className="col-span-2 md:col-span-3" />
            </div>
          </section>

          {/* Lotação */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
              <Building2 className="h-4 w-4 text-primary" /> Lotação
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="OM" value={militar.om} icon={Building2} />
              <Field label="Área" value={militar.area} icon={Briefcase} />
              <Field label="NEO" value={militar.neo} icon={Hash} />
              <Field label="Tarefa Designada" value={militar.tarefaDesignada} className="col-span-2 md:col-span-3" />
            </div>
          </section>

          {/* Contrato TTC */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
              <Calendar className="h-4 w-4 text-primary" /> Contrato TTC
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Início" value={militar.periodoInicio} icon={Calendar} />
              <Field label="Término" value={militar.termino} icon={Calendar} />
              <Field
                label="Tempo Restante"
                icon={Clock}
                value={tempoRestante ? (
                  <Badge
                    variant={tempoRestante.status === 'expired' || tempoRestante.status === 'danger' ? 'destructive' : tempoRestante.status === 'warning' ? 'default' : 'secondary'}
                    className={tempoRestante.status === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                  >
                    {tempoRestante.texto}
                  </Badge>
                ) : "-"}
              />
              <Field label="Qtd. Renovações" value={String(militar.qtdRenovacoes ?? "-")} />
              <Field label="Portaria Atual" value={militar.portariaAtual} icon={FileText} className="col-span-2" />
            </div>
          </section>

          {/* Tempo de Serviço */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
              <Clock className="h-4 w-4 text-primary" /> Tempo de Serviço
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field
                label="Tempo Total TTC"
                value={militar.tempoServido && militar.tempoServido !== '-' ? (
                  <Badge variant="secondary" className={cn(militar.excedeu10Anos && "bg-red-100 text-red-700 border-red-300 font-bold")}>
                    {militar.tempoServido}
                  </Badge>
                ) : "-"}
              />
              <Field
                label="Faltante (10a)"
                value={militar.tempoFaltante && militar.tempoFaltante !== '-' && tempoFaltanteStatus ? (
                  <Badge
                    variant={tempoFaltanteStatus === 'exceeded' || tempoFaltanteStatus === 'danger' ? 'destructive' : tempoFaltanteStatus === 'warning' ? 'default' : 'secondary'}
                    className={tempoFaltanteStatus === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                  >
                    {militar.tempoFaltante}
                  </Badge>
                ) : "-"}
              />
              <Field
                label="Data Limite"
                icon={AlertCircle}
                value={militar.dataLimite && militar.dataLimite !== '-' ? (
                  <Badge
                    variant={militar.dataLimiteTipo === '70a' ? 'destructive' : 'secondary'}
                    title={militar.dataLimiteTipo === '70a' ? 'Limite por idade (70 anos)' : 'Limite por tempo de serviço (10 anos)'}
                  >
                    {militar.dataLimite}
                    {militar.dataLimiteTipo === '70a' && ' (70a)'}
                  </Badge>
                ) : "-"}
              />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TTCMilitarDetailDialog;

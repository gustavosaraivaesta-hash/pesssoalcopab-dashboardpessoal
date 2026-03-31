import React from "react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TTCData } from "@/types/ttc";
import { calcularIdadeAtual, calcularTempoRestante, getTempoFaltanteStatus, formatMilitarName } from "@/lib/ttcUtils";

interface TTCTableRowProps {
  row: TTCData;
}

const TTCTableRow = React.memo(({ row }: TTCTableRowProps) => {
  const neoNormalized = row.neo?.trim().toUpperCase() || '';
  const efeNormalized = row.espQuadro?.trim().toUpperCase() || '';
  const isDifferentNeoEfe = !row.isVaga && neoNormalized && efeNormalized && neoNormalized !== efeNormalized;

  return (
    <TableRow
      className={`${row.isVaga ? "bg-red-100 dark:bg-red-950/40 border-l-4 border-l-red-500" : ""} ${isDifferentNeoEfe ? "bg-amber-50/80 dark:bg-amber-950/30" : ""}`}
    >
      <TableCell className={`font-medium ${row.isVaga ? "text-red-600 font-bold" : ""}`}>{row.numero}</TableCell>
      <TableCell>
        <Badge variant={row.isVaga ? "destructive" : "outline"} className={row.isVaga ? "bg-red-500" : ""}>
          {row.om}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        {row.isVaga ? (
          <span className="text-red-600 font-bold italic">VAGO</span>
        ) : (
          <span className={isDifferentNeoEfe ? "text-amber-700 dark:text-amber-400 font-semibold" : ""}>
            {formatMilitarName(row.graduacao, row.espQuadro, row.nomeCompleto)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-sm">
        <Badge variant={isDifferentNeoEfe ? "default" : "outline"} className={isDifferentNeoEfe ? "bg-blue-500" : ""}>
          {row.neo}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        <Badge variant={isDifferentNeoEfe ? "default" : "outline"}>
          {row.espQuadro || "-"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{calcularIdadeAtual(row.idade)}</TableCell>
      <TableCell>
        <Badge variant="secondary">{row.area}</Badge>
      </TableCell>
      <TableCell className="text-sm">{row.tarefaDesignada}</TableCell>
      <TableCell className="text-sm">{row.periodoInicio}</TableCell>
      <TableCell className="text-sm">{row.termino}</TableCell>
      <TableCell className="text-sm">
        {!row.isVaga && (() => {
          const { texto, status } = calcularTempoRestante(row.termino);
          return (
            <Badge
              variant={status === 'expired' || status === 'danger' ? 'destructive' : status === 'warning' ? 'default' : 'secondary'}
              className={status === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
            >
              {texto}
            </Badge>
          );
        })()}
      </TableCell>
      <TableCell className="text-sm">
        {!row.isVaga && row.tempoServido && row.tempoServido !== '-' && (
          <Badge
            variant="secondary"
            className={cn(row.excedeu10Anos && "bg-red-100 text-red-700 border-red-300 font-bold")}
          >
            {row.tempoServido}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {!row.isVaga && row.tempoFaltante && row.tempoFaltante !== '-' && (() => {
          const status = getTempoFaltanteStatus(row.tempoFaltante, row.excedeu10Anos);
          return (
            <Badge
              variant={status === 'exceeded' || status === 'danger' ? 'destructive' : status === 'warning' ? 'default' : 'secondary'}
              className={status === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
            >
              {row.tempoFaltante}
            </Badge>
          );
        })()}
      </TableCell>
      <TableCell className="text-sm">
        {!row.isVaga && row.dataLimite && row.dataLimite !== '-' && (
          <Badge
            variant={row.dataLimiteTipo === '70a' ? 'destructive' : 'secondary'}
            title={row.dataLimiteTipo === '70a' ? 'Limite por idade (70 anos)' : 'Limite por tempo de serviço (10 anos)'}
          >
            {row.dataLimite}
            {row.dataLimiteTipo === '70a' && ' (70a)'}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm">{row.portariaAtual || '-'}</TableCell>
    </TableRow>
  );
});

TTCTableRow.displayName = "TTCTableRow";

export default TTCTableRow;

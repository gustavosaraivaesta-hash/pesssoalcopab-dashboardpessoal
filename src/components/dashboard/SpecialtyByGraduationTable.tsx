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

const ESPECIALIDADES: Record<string, string> = {
  "MR": "MANOBRAS E REPAROS (MR)",
  "MA": "MÁQUINAS (MA)",
  "CA": "CALDEIRA (CA)",
  "CN": "COMUNICAÇÕES NAVAIS (CN)",
  "SI": "SINAIS (SI)",
  "EL": "ELETRICIDADE (EL)",
  "CE": "SISTEMAS DE CONTROLE E ELETRICIDADE (CE)",
  "AM": "ARMAMENTO (AM)",
  "MO": "MOTORES (MO)",
  "AR": "ARRUMADOR (AR)",
  "CO": "COZINHEIRO (CO)",
  "CI": "COMUNICAÇÕES INTERIORES (CI)",
  "CP": "CARPINTARIA (CP)",
  "MT": "ARTÍFICE DE METALURGIA (MT)",
  "ET": "ELETRÔNICA (ET)",
  "MC": "ARTÍFICE DE MECÂNICA (MC)",
  "AV": "AVIAÇÃO (AV)",
  "DT": "DIREÇÃO DE TIRO (DT)",
  "HN": "HIDROGRAFIA E NAVEGAÇÃO (HN)",
  "OR": "OPERADOR DE RADAR (OR)",
  "OS": "OPERADOR DE SONAR (OS)",
  "ES": "ESCRITA (ES)",
  "PL": "PAIOL (PL)",
  "CL": "CONTABILIDADE (CL)",
  "PD": "PROCESSAMENTO DE DADOS (PD)",
  "AD": "ADMINISTRAÇÃO (AD)",
  "CS": "COMUNICAÇÃO SOCIAL (CS)",
  "ND": "NUTRIÇÃO E DIETÉTICA (ND)",
  "PC": "PATOLOGIA CLÍNICA (PC)",
  "HD": "HIGIENE DENTAL (HD)",
  "QI": "QUÍMICA (QI)",
  "EF": "ENFERMAGEM (EF)",
  "EP": "EDUCAÇÃO FÍSICA (EP)",
  "BA": "BARBEIRO (BA)",
  "DA": "ARQUITETURA E URBANISMO (DA)",
  "SC": "SECRETARIADO (SC)",
  "TE": "ELETROTÉCNICA (TE)",
  "MI": "MECÂNICA (MI)",
  "NA": "MARCENARIA (NA)",
  "MS": "MOTORES (MS)",
  "EO": "ELETRÔNICA (EO)",
  "ML": "METALURGIA (ML)",
  "AE": "ESTATÍSTICA (AE)",
};

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
        const displayName = ESPECIALIDADES[especialidade] || especialidade;
        return {
          especialidade: displayName,
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

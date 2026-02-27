export interface TTCData {
  id: string;
  numero: number | string;
  graduacao: string;
  espQuadro: string;
  nomeCompleto: string;
  idade: string;
  area: string;
  neo: string;
  tarefaDesignada: string;
  periodoInicio: string;
  termino: string;
  qtdRenovacoes: number;
  portariaAtual: string;
  isVaga: boolean;
  ocupado: boolean;
  om: string;
  tempoServido?: string;
  tempoFaltante?: string;
  excedeu10Anos?: boolean;
}

export interface TTCSummary {
  total: number;
  contratados: number;
  vagasAbertas: number;
}

export interface MilitaryData {
  id: string;
  nome: string;
  especialidade: string;
  graduacao: string;
  om: string;
  sdp: string;
  tmft: number;
  exi: number;
  dif: number;
  previsaoEmbarque: string;
  pracasTTC: number;
  servidoresCivis: number;
  percentualPracasAtiva: number;
  percentualForcaTrabalho: number;
  categoria: "PRAÇAS" | "OFICIAIS";
}

export interface DashboardMetrics {
  totalTMFT: number;
  totalEXI: number;
  totalDIF: number;
  percentualPreenchimento: number;
}

export interface FilterOptions {
  especialidades: string[];
  graduacoes: string[];
  oms: string[];
  sdps: string[];
  meses: string[];
}

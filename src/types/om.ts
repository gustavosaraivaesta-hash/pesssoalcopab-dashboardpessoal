export interface OMData {
  id: string;
  tipoSetor: string;
  setor: string;
  cargo: string;
  posto: string;
  corpo: string;
  quadro: string;
  tmft: number;
  exi: number;
  dif: number;
}

export interface OMMetrics {
  totalTMFT: number;
  totalEXI: number;
  totalDIF: number;
  percentualPreenchimento: number;
}

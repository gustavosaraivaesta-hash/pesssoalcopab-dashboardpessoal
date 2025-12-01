export interface OMData {
  id: string;
  om: string;
  pessoal: string;
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

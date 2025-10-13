import { MilitaryData } from "@/types/military";

export const mockMilitaryData: MilitaryData[] = [
  {
    id: "1",
    nome: "JOÃO SILVA",
    especialidade: "INTENDÊNCIA",
    graduacao: "CAPITÃO",
    sdp: "SDP-1 DABM",
    tmft: 15,
    exi: 12,
    dif: -3,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "2",
    nome: "MARIA SANTOS",
    especialidade: "ADMINISTRAÇÃO",
    graduacao: "TENENTE",
    sdp: "SDP-2 DABM",
    tmft: 20,
    exi: 18,
    dif: -2,
    previsaoEmbarque: "2025-02"
  },
  {
    id: "3",
    nome: "PEDRO OLIVEIRA",
    especialidade: "LOGÍSTICA",
    graduacao: "MAJOR",
    sdp: "SDP-1 DABM",
    tmft: 10,
    exi: 11,
    dif: 1,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "4",
    nome: "ANA COSTA",
    especialidade: "INTENDÊNCIA",
    graduacao: "SARGENTO",
    sdp: "SDP-3 DABM",
    tmft: 25,
    exi: 20,
    dif: -5,
    previsaoEmbarque: "2025-03"
  },
  {
    id: "5",
    nome: "CARLOS FERREIRA",
    especialidade: "ADMINISTRAÇÃO",
    graduacao: "CAPITÃO",
    sdp: "SDP-2 DABM",
    tmft: 18,
    exi: 18,
    dif: 0,
    previsaoEmbarque: "2025-02"
  },
  {
    id: "6",
    nome: "JULIANA ROCHA",
    especialidade: "LOGÍSTICA",
    graduacao: "TENENTE",
    sdp: "SDP-1 DABM",
    tmft: 12,
    exi: 10,
    dif: -2,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "7",
    nome: "RICARDO ALMEIDA",
    especialidade: "INTENDÊNCIA",
    graduacao: "MAJOR",
    sdp: "SDP-3 DABM",
    tmft: 8,
    exi: 9,
    dif: 1,
    previsaoEmbarque: "2025-03"
  },
  {
    id: "8",
    nome: "FERNANDA LIMA",
    especialidade: "ADMINISTRAÇÃO",
    graduacao: "SARGENTO",
    sdp: "SDP-2 DABM",
    tmft: 30,
    exi: 28,
    dif: -2,
    previsaoEmbarque: "2025-02"
  },
];

export const getUniqueValues = (data: MilitaryData[]) => {
  return {
    especialidades: [...new Set(data.map(item => item.especialidade))].sort(),
    graduacoes: [...new Set(data.map(item => item.graduacao))].sort(),
    sdps: [...new Set(data.map(item => item.sdp))].sort(),
    meses: [...new Set(data.map(item => item.previsaoEmbarque))].sort(),
  };
};

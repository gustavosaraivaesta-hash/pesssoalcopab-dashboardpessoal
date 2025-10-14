import { MilitaryData } from "@/types/military";

export const GRADUACOES = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

export const OMS = [
  "COpAb",
  "BAMRJ",
  "CMM",
  "DepCMRJ",
  "CDAM",
  "DepSMRJ",
  "CSupAb",
  "DepSIMRJ",
  "DepMSMRJ",
  "DepFMRJ",
  "CDU-BAMRJ",
  "CDU-1DN"
];

export const ESPECIALIDADES = [
  { code: "MR", name: "MANOBRAS E REPAROS" },
  { code: "MA", name: "MÁQUINAS" },
  { code: "CA", name: "CALDEIRA" },
  { code: "CN", name: "COMUNICAÇÕES NAVAIS" },
  { code: "SI", name: "SINAIS" },
  { code: "EL", name: "ELETRICIDADE" },
  { code: "CE", name: "SISTEMAS DE CONTROLE E ELETRICIDADE" },
  { code: "AM", name: "ARMAMENTO" },
  { code: "MO", name: "MOTORES" },
  { code: "AR", name: "ARRUMADOR" },
  { code: "CO", name: "COZINHEIRO" },
  { code: "CI", name: "COMUNICAÇÕES INTERIORES" },
  { code: "CP", name: "CARPINTARIA" },
  { code: "MT", name: "ARTÍFICE DE METALURGIA" },
  { code: "ET", name: "ELETRÔNICA" },
  { code: "MC", name: "ARTÍFICE DE MECÂNICA" },
  { code: "AV", name: "AVIAÇÃO" },
  { code: "DT", name: "DIREÇÃO DE TIRO" },
  { code: "HN", name: "HIDROGRAFIA E NAVEGAÇÃO" },
  { code: "OR", name: "OPERADOR DE RADAR" },
  { code: "OS", name: "OPERADOR DE SONAR" },
  { code: "ES", name: "ESCRITA" },
  { code: "PL", name: "PAIOL" },
  { code: "CL", name: "CONTABILIDADE" },
  { code: "PD", name: "PROCESSAMENTO DE DADOS" },
  { code: "AD", name: "ADMINISTRAÇÃO" },
  { code: "CS", name: "COMUNICAÇÃO SOCIAL" },
  { code: "ND", name: "NUTRIÇÃO E DIETÉTICA" },
  { code: "PC", name: "PATOLOGIA CLÍNICA" },
  { code: "HD", name: "HIGIENE DENTAL" },
  { code: "QI", name: "QUÍMICA" },
  { code: "EF", name: "ENFERMAGEM" },
  { code: "EP", name: "EDUCAÇÃO FÍSICA" },
  { code: "BA", name: "BARBEIRO" },
  { code: "DA", name: "ARQUITETURA E URBANISMO" },
  { code: "SC", name: "SECRETARIADO" },
  { code: "TE", name: "ELETROTÉCNICA" },
  { code: "MI", name: "MECÂNICA" },
  { code: "NA", name: "MARCENARIA" },
  { code: "MS", name: "MOTORES (MS)" },
  { code: "EO", name: "ELETRÔNICA (EO)" },
  { code: "ML", name: "METALURGIA" },
  { code: "AE", name: "ESTATÍSTICA" }
];

export const mockMilitaryData: MilitaryData[] = [
  {
    id: "1",
    nome: "MILITAR 001",
    especialidade: "MR",
    graduacao: "SO",
    om: "BAMRJ",
    sdp: "SDP-1 DABM",
    tmft: 15,
    exi: 12,
    dif: -3,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "2",
    nome: "MILITAR 002",
    especialidade: "AD",
    graduacao: "1SG",
    om: "COpAb",
    sdp: "SDP-2 DABM",
    tmft: 20,
    exi: 18,
    dif: -2,
    previsaoEmbarque: "2025-02"
  },
  {
    id: "3",
    nome: "MILITAR 003",
    especialidade: "MA",
    graduacao: "2SG",
    om: "CMM",
    sdp: "SDP-1 DABM",
    tmft: 10,
    exi: 11,
    dif: 1,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "4",
    nome: "MILITAR 004",
    especialidade: "EL",
    graduacao: "3SG",
    om: "DepCMRJ",
    sdp: "SDP-3 DABM",
    tmft: 25,
    exi: 20,
    dif: -5,
    previsaoEmbarque: "2025-03"
  },
  {
    id: "5",
    nome: "MILITAR 005",
    especialidade: "AD",
    graduacao: "CB",
    om: "CDAM",
    sdp: "SDP-2 DABM",
    tmft: 18,
    exi: 18,
    dif: 0,
    previsaoEmbarque: "2025-02"
  },
  {
    id: "6",
    nome: "MILITAR 006",
    especialidade: "CN",
    graduacao: "MN",
    om: "DepSMRJ",
    sdp: "SDP-1 DABM",
    tmft: 12,
    exi: 10,
    dif: -2,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "7",
    nome: "MILITAR 007",
    especialidade: "ET",
    graduacao: "SO",
    om: "CSupAb",
    sdp: "SDP-3 DABM",
    tmft: 8,
    exi: 9,
    dif: 1,
    previsaoEmbarque: "2025-03"
  },
  {
    id: "8",
    nome: "MILITAR 008",
    especialidade: "CL",
    graduacao: "1SG",
    om: "DepSIMRJ",
    sdp: "SDP-2 DABM",
    tmft: 30,
    exi: 28,
    dif: -2,
    previsaoEmbarque: "2025-02"
  },
  {
    id: "9",
    nome: "MILITAR 009",
    especialidade: "MO",
    graduacao: "2SG",
    om: "DepMSMRJ",
    sdp: "SDP-1 DABM",
    tmft: 14,
    exi: 14,
    dif: 0,
    previsaoEmbarque: "2025-01"
  },
  {
    id: "10",
    nome: "MILITAR 010",
    especialidade: "AM",
    graduacao: "3SG",
    om: "DepFMRJ",
    sdp: "SDP-3 DABM",
    tmft: 22,
    exi: 19,
    dif: -3,
    previsaoEmbarque: "2025-03"
  },
  {
    id: "11",
    nome: "MILITAR 011",
    especialidade: "SI",
    graduacao: "CB",
    om: "CDU-BAMRJ",
    sdp: "SDP-2 DABM",
    tmft: 16,
    exi: 17,
    dif: 1,
    previsaoEmbarque: "2025-02"
  },
  {
    id: "12",
    nome: "MILITAR 012",
    especialidade: "OS",
    graduacao: "MN",
    om: "CDU-1DN",
    sdp: "SDP-1 DABM",
    tmft: 19,
    exi: 16,
    dif: -3,
    previsaoEmbarque: "2025-01"
  },
];

export const getUniqueValues = (data: MilitaryData[]) => {
  return {
    especialidades: [...new Set(data.map(item => item.especialidade))].sort(),
    graduacoes: [...new Set(data.map(item => item.graduacao))].sort((a, b) => {
      const order = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];
      return order.indexOf(a) - order.indexOf(b);
    }),
    oms: [...new Set(data.map(item => item.om))].sort(),
    sdps: [...new Set(data.map(item => item.sdp))].sort(),
    meses: [...new Set(data.map(item => item.previsaoEmbarque))].sort(),
  };
};

export const getEspecialidadeName = (code: string): string => {
  const esp = ESPECIALIDADES.find(e => e.code === code);
  return esp ? `${esp.code} - ${esp.name}` : code;
};

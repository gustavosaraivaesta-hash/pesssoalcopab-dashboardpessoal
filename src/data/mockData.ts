import { MilitaryData } from "@/types/military";

export const GRADUACOES = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

export const OMS = [
  "OM 1",
  "OM 2",
  "OM 3",
  "OM 4",
  "OM 5",
  "OM 6",
  "OM 7",
  "OM 8",
  "OM 9",
  "OM 10",
  "OM 11",
  "OM 12",
  "OM 13",
  "OM 14",
  "OM 15",
  "OM 16",
  "TOTAL"
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
  // OM 1 - Dados da planilha
  { id: "1", nome: "SO-OM1", especialidade: "MR", graduacao: "SO", om: "OM 1", sdp: "SDP-1", tmft: 24, exi: 30, dif: 6, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "2", nome: "1SG-OM1", especialidade: "AD", graduacao: "1SG", om: "OM 1", sdp: "SDP-1", tmft: 33, exi: 27, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "3", nome: "2SG-OM1", especialidade: "MA", graduacao: "2SG", om: "OM 1", sdp: "SDP-1", tmft: 26, exi: 46, dif: 20, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "4", nome: "3SG-OM1", especialidade: "EL", graduacao: "3SG", om: "OM 1", sdp: "SDP-1", tmft: 35, exi: 29, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "5", nome: "CB-OM1", especialidade: "CN", graduacao: "CB", om: "OM 1", sdp: "SDP-1", tmft: 34, exi: 12, dif: -22, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "6", nome: "MN-OM1", especialidade: "SI", graduacao: "MN", om: "OM 1", sdp: "SDP-1", tmft: 22, exi: 23, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  
  // OM 2
  { id: "7", nome: "SO-OM2", especialidade: "ET", graduacao: "SO", om: "OM 2", sdp: "SDP-2", tmft: 1, exi: 11, dif: 10, previsaoEmbarque: "2025-02", pracasTTC: 2, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "8", nome: "1SG-OM2", especialidade: "CL", graduacao: "1SG", om: "OM 2", sdp: "SDP-2", tmft: 13, exi: 6, dif: -7, previsaoEmbarque: "2025-02", pracasTTC: 2, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "9", nome: "2SG-OM2", especialidade: "MO", graduacao: "2SG", om: "OM 2", sdp: "SDP-2", tmft: 7, exi: 21, dif: 14, previsaoEmbarque: "2025-02", pracasTTC: 2, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "10", nome: "3SG-OM2", especialidade: "AM", graduacao: "3SG", om: "OM 2", sdp: "SDP-2", tmft: 32, exi: 11, dif: -21, previsaoEmbarque: "2025-02", pracasTTC: 2, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "11", nome: "CB-OM2", especialidade: "OS", graduacao: "CB", om: "OM 2", sdp: "SDP-2", tmft: 21, exi: 3, dif: -18, previsaoEmbarque: "2025-02", pracasTTC: 2, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "12", nome: "MN-OM2", especialidade: "ES", graduacao: "MN", om: "OM 2", sdp: "SDP-2", tmft: 5, exi: 7, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 2, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },

  // OM 3
  { id: "13", nome: "SO-OM3", especialidade: "MR", graduacao: "SO", om: "OM 3", sdp: "SDP-3", tmft: 7, exi: 9, dif: 2, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "14", nome: "1SG-OM3", especialidade: "AD", graduacao: "1SG", om: "OM 3", sdp: "SDP-3", tmft: 12, exi: 15, dif: 3, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "15", nome: "2SG-OM3", especialidade: "MA", graduacao: "2SG", om: "OM 3", sdp: "SDP-3", tmft: 7, exi: 2, dif: -5, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "16", nome: "3SG-OM3", especialidade: "EL", graduacao: "3SG", om: "OM 3", sdp: "SDP-3", tmft: 6, exi: 6, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "17", nome: "CB-OM3", especialidade: "CN", graduacao: "CB", om: "OM 3", sdp: "SDP-3", tmft: 4, exi: 0, dif: -4, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "18", nome: "MN-OM3", especialidade: "SI", graduacao: "MN", om: "OM 3", sdp: "SDP-3", tmft: 3, exi: 3, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },

  // OM 4
  { id: "19", nome: "SO-OM4", especialidade: "ET", graduacao: "SO", om: "OM 4", sdp: "SDP-4", tmft: 9, exi: 19, dif: 10, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 4, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "20", nome: "1SG-OM4", especialidade: "CL", graduacao: "1SG", om: "OM 4", sdp: "SDP-4", tmft: 11, exi: 24, dif: 13, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 4, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "21", nome: "2SG-OM4", especialidade: "MO", graduacao: "2SG", om: "OM 4", sdp: "SDP-4", tmft: 9, exi: 33, dif: 24, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 4, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "22", nome: "3SG-OM4", especialidade: "AM", graduacao: "3SG", om: "OM 4", sdp: "SDP-4", tmft: 33, exi: 18, dif: -15, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 4, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "23", nome: "CB-OM4", especialidade: "OS", graduacao: "CB", om: "OM 4", sdp: "SDP-4", tmft: 47, exi: 14, dif: -33, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 4, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "24", nome: "MN-OM4", especialidade: "ES", graduacao: "MN", om: "OM 4", sdp: "SDP-4", tmft: 30, exi: 21, dif: -9, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 4, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },

  // OM 5
  { id: "25", nome: "SO-OM5", especialidade: "MR", graduacao: "SO", om: "OM 5", sdp: "SDP-5", tmft: 11, exi: 10, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 1, servidoresCivis: 3, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "26", nome: "1SG-OM5", especialidade: "AD", graduacao: "1SG", om: "OM 5", sdp: "SDP-5", tmft: 16, exi: 12, dif: -4, previsaoEmbarque: "2025-02", pracasTTC: 1, servidoresCivis: 3, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "27", nome: "2SG-OM5", especialidade: "MA", graduacao: "2SG", om: "OM 5", sdp: "SDP-5", tmft: 17, exi: 28, dif: 11, previsaoEmbarque: "2025-02", pracasTTC: 1, servidoresCivis: 3, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "28", nome: "3SG-OM5", especialidade: "EL", graduacao: "3SG", om: "OM 5", sdp: "SDP-5", tmft: 55, exi: 58, dif: 3, previsaoEmbarque: "2025-02", pracasTTC: 1, servidoresCivis: 3, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "29", nome: "CB-OM5", especialidade: "CN", graduacao: "CB", om: "OM 5", sdp: "SDP-5", tmft: 107, exi: 49, dif: -58, previsaoEmbarque: "2025-02", pracasTTC: 1, servidoresCivis: 3, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "30", nome: "MN-OM5", especialidade: "SI", graduacao: "MN", om: "OM 5", sdp: "SDP-5", tmft: 25, exi: 42, dif: 17, previsaoEmbarque: "2025-02", pracasTTC: 1, servidoresCivis: 3, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },

  // OM 6  
  { id: "31", nome: "SO-OM6", especialidade: "ET", graduacao: "SO", om: "OM 6", sdp: "SDP-6", tmft: 1, exi: 7, dif: 6, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 1, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "32", nome: "1SG-OM6", especialidade: "CL", graduacao: "1SG", om: "OM 6", sdp: "SDP-6", tmft: 9, exi: 6, dif: -3, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 1, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "33", nome: "2SG-OM6", especialidade: "MO", graduacao: "2SG", om: "OM 6", sdp: "SDP-6", tmft: 12, exi: 21, dif: 9, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 1, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "34", nome: "3SG-OM6", especialidade: "AM", graduacao: "3SG", om: "OM 6", sdp: "SDP-6", tmft: 24, exi: 30, dif: 6, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 1, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "35", nome: "CB-OM6", especialidade: "OS", graduacao: "CB", om: "OM 6", sdp: "SDP-6", tmft: 61, exi: 27, dif: -34, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 1, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "36", nome: "MN-OM6", especialidade: "ES", graduacao: "MN", om: "OM 6", sdp: "SDP-6", tmft: 57, exi: 32, dif: -25, previsaoEmbarque: "2025-03", pracasTTC: 1, servidoresCivis: 1, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
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

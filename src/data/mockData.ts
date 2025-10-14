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
  // OM 1 - Coluna 1 da planilha (TMFT | EXI | DIF)
  { id: "1", nome: "SO-OM1", especialidade: "MR", graduacao: "SO", om: "OM 1", sdp: "SDP-1", tmft: 24, exi: 30, dif: 6, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "2", nome: "1SG-OM1", especialidade: "AD", graduacao: "1SG", om: "OM 1", sdp: "SDP-1", tmft: 33, exi: 27, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "3", nome: "2SG-OM1", especialidade: "MA", graduacao: "2SG", om: "OM 1", sdp: "SDP-1", tmft: 26, exi: 46, dif: 20, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "4", nome: "3SG-OM1", especialidade: "EL", graduacao: "3SG", om: "OM 1", sdp: "SDP-1", tmft: 35, exi: 29, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "5", nome: "CB-OM1", especialidade: "CN", graduacao: "CB", om: "OM 1", sdp: "SDP-1", tmft: 34, exi: 12, dif: -22, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "6", nome: "MN-OM1", especialidade: "SI", graduacao: "MN", om: "OM 1", sdp: "SDP-1", tmft: 22, exi: 23, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  
  // OM 2 - Coluna 2 da planilha
  { id: "7", nome: "SO-OM2", especialidade: "ET", graduacao: "SO", om: "OM 2", sdp: "SDP-2", tmft: 1, exi: 11, dif: 10, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "8", nome: "1SG-OM2", especialidade: "CL", graduacao: "1SG", om: "OM 2", sdp: "SDP-2", tmft: 13, exi: 6, dif: -7, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "9", nome: "2SG-OM2", especialidade: "MO", graduacao: "2SG", om: "OM 2", sdp: "SDP-2", tmft: 7, exi: 21, dif: 14, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "10", nome: "3SG-OM2", especialidade: "AM", graduacao: "3SG", om: "OM 2", sdp: "SDP-2", tmft: 32, exi: 11, dif: -21, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "11", nome: "CB-OM2", especialidade: "OS", graduacao: "CB", om: "OM 2", sdp: "SDP-2", tmft: 21, exi: 3, dif: -18, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "12", nome: "MN-OM2", especialidade: "ES", graduacao: "MN", om: "OM 2", sdp: "SDP-2", tmft: 5, exi: 7, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },

  // OM 3 - Coluna 3 da planilha
  { id: "13", nome: "SO-OM3", especialidade: "MR", graduacao: "SO", om: "OM 3", sdp: "SDP-3", tmft: 7, exi: 9, dif: 2, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "14", nome: "1SG-OM3", especialidade: "AD", graduacao: "1SG", om: "OM 3", sdp: "SDP-3", tmft: 12, exi: 15, dif: 3, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "15", nome: "2SG-OM3", especialidade: "MA", graduacao: "2SG", om: "OM 3", sdp: "SDP-3", tmft: 7, exi: 2, dif: -5, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "16", nome: "3SG-OM3", especialidade: "EL", graduacao: "3SG", om: "OM 3", sdp: "SDP-3", tmft: 6, exi: 6, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "17", nome: "CB-OM3", especialidade: "CN", graduacao: "CB", om: "OM 3", sdp: "SDP-3", tmft: 4, exi: 0, dif: -4, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "18", nome: "MN-OM3", especialidade: "SI", graduacao: "MN", om: "OM 3", sdp: "SDP-3", tmft: 3, exi: 3, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },

  // OM 4 - Coluna 4 da planilha
  { id: "19", nome: "SO-OM4", especialidade: "ET", graduacao: "SO", om: "OM 4", sdp: "SDP-4", tmft: 9, exi: 19, dif: 10, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "20", nome: "1SG-OM4", especialidade: "CL", graduacao: "1SG", om: "OM 4", sdp: "SDP-4", tmft: 11, exi: 24, dif: 13, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "21", nome: "2SG-OM4", especialidade: "MO", graduacao: "2SG", om: "OM 4", sdp: "SDP-4", tmft: 9, exi: 33, dif: 24, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "22", nome: "3SG-OM4", especialidade: "AM", graduacao: "3SG", om: "OM 4", sdp: "SDP-4", tmft: 33, exi: 18, dif: -15, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "23", nome: "CB-OM4", especialidade: "OS", graduacao: "CB", om: "OM 4", sdp: "SDP-4", tmft: 47, exi: 14, dif: -33, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "24", nome: "MN-OM4", especialidade: "ES", graduacao: "MN", om: "OM 4", sdp: "SDP-4", tmft: 30, exi: 21, dif: -9, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },

  // OM 5 - Coluna 5 da planilha
  { id: "25", nome: "SO-OM5", especialidade: "MR", graduacao: "SO", om: "OM 5", sdp: "SDP-5", tmft: 11, exi: 10, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "26", nome: "1SG-OM5", especialidade: "AD", graduacao: "1SG", om: "OM 5", sdp: "SDP-5", tmft: 16, exi: 12, dif: -4, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "27", nome: "2SG-OM5", especialidade: "MA", graduacao: "2SG", om: "OM 5", sdp: "SDP-5", tmft: 17, exi: 28, dif: 11, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "28", nome: "3SG-OM5", especialidade: "EL", graduacao: "3SG", om: "OM 5", sdp: "SDP-5", tmft: 55, exi: 58, dif: 3, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "29", nome: "CB-OM5", especialidade: "CN", graduacao: "CB", om: "OM 5", sdp: "SDP-5", tmft: 107, exi: 49, dif: -58, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "30", nome: "MN-OM5", especialidade: "SI", graduacao: "MN", om: "OM 5", sdp: "SDP-5", tmft: 25, exi: 42, dif: 17, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },

  // OM 6  - Coluna 6 da planilha
  { id: "31", nome: "SO-OM6", especialidade: "ET", graduacao: "SO", om: "OM 6", sdp: "SDP-6", tmft: 1, exi: 7, dif: 6, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "32", nome: "1SG-OM6", especialidade: "CL", graduacao: "1SG", om: "OM 6", sdp: "SDP-6", tmft: 9, exi: 6, dif: -3, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "33", nome: "2SG-OM6", especialidade: "MO", graduacao: "2SG", om: "OM 6", sdp: "SDP-6", tmft: 12, exi: 21, dif: 9, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "34", nome: "3SG-OM6", especialidade: "AM", graduacao: "3SG", om: "OM 6", sdp: "SDP-6", tmft: 24, exi: 30, dif: 6, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "35", nome: "CB-OM6", especialidade: "OS", graduacao: "CB", om: "OM 6", sdp: "SDP-6", tmft: 61, exi: 27, dif: -34, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "36", nome: "MN-OM6", especialidade: "ES", graduacao: "MN", om: "OM 6", sdp: "SDP-6", tmft: 57, exi: 32, dif: -25, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 0, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },

  // OM 7 - Coluna 7 da planilha
  { id: "37", nome: "SO-OM7", especialidade: "MR", graduacao: "SO", om: "OM 7", sdp: "SDP-7", tmft: 6, exi: 9, dif: 3, previsaoEmbarque: "2025-01", pracasTTC: 7, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "38", nome: "1SG-OM7", especialidade: "AD", graduacao: "1SG", om: "OM 7", sdp: "SDP-7", tmft: 11, exi: 10, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 7, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "39", nome: "2SG-OM7", especialidade: "MA", graduacao: "2SG", om: "OM 7", sdp: "SDP-7", tmft: 4, exi: 8, dif: 4, previsaoEmbarque: "2025-01", pracasTTC: 7, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "40", nome: "3SG-OM7", especialidade: "EL", graduacao: "3SG", om: "OM 7", sdp: "SDP-7", tmft: 21, exi: 9, dif: -12, previsaoEmbarque: "2025-01", pracasTTC: 7, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "41", nome: "CB-OM7", especialidade: "CN", graduacao: "CB", om: "OM 7", sdp: "SDP-7", tmft: 8, exi: 2, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 7, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "42", nome: "MN-OM7", especialidade: "SI", graduacao: "MN", om: "OM 7", sdp: "SDP-7", tmft: 6, exi: 5, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 7, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },

  // OM 8 - Coluna 8 da planilha  
  { id: "43", nome: "SO-OM8", especialidade: "ET", graduacao: "SO", om: "OM 8", sdp: "SDP-8", tmft: 2, exi: 13, dif: 11, previsaoEmbarque: "2025-02", pracasTTC: 19, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "44", nome: "1SG-OM8", especialidade: "CL", graduacao: "1SG", om: "OM 8", sdp: "SDP-8", tmft: 4, exi: 10, dif: 6, previsaoEmbarque: "2025-02", pracasTTC: 19, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "45", nome: "2SG-OM8", especialidade: "MO", graduacao: "2SG", om: "OM 8", sdp: "SDP-8", tmft: 6, exi: 9, dif: 3, previsaoEmbarque: "2025-02", pracasTTC: 19, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "46", nome: "3SG-OM8", especialidade: "AM", graduacao: "3SG", om: "OM 8", sdp: "SDP-8", tmft: 19, exi: 6, dif: -13, previsaoEmbarque: "2025-02", pracasTTC: 19, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "47", nome: "CB-OM8", especialidade: "OS", graduacao: "CB", om: "OM 8", sdp: "SDP-8", tmft: 27, exi: 5, dif: -22, previsaoEmbarque: "2025-02", pracasTTC: 19, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "48", nome: "MN-OM8", especialidade: "ES", graduacao: "MN", om: "OM 8", sdp: "SDP-8", tmft: 2, exi: 3, dif: 1, previsaoEmbarque: "2025-02", pracasTTC: 19, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },

  // OM 9 - Coluna 9 da planilha
  { id: "49", nome: "SO-OM9", especialidade: "MR", graduacao: "SO", om: "OM 9", sdp: "SDP-9", tmft: 29, exi: 58, dif: 29, previsaoEmbarque: "2025-03", pracasTTC: 62, servidoresCivis: 16, percentualPracasAtiva: 83, percentualForcaTrabalho: 91 },
  { id: "50", nome: "1SG-OM9", especialidade: "AD", graduacao: "1SG", om: "OM 9", sdp: "SDP-9", tmft: 51, exi: 62, dif: 11, previsaoEmbarque: "2025-03", pracasTTC: 62, servidoresCivis: 16, percentualPracasAtiva: 83, percentualForcaTrabalho: 91 },
  { id: "51", nome: "2SG-OM9", especialidade: "MA", graduacao: "2SG", om: "OM 9", sdp: "SDP-9", tmft: 48, exi: 99, dif: 51, previsaoEmbarque: "2025-03", pracasTTC: 62, servidoresCivis: 16, percentualPracasAtiva: 83, percentualForcaTrabalho: 91 },
  { id: "52", nome: "3SG-OM9", especialidade: "EL", graduacao: "3SG", om: "OM 9", sdp: "SDP-9", tmft: 152, exi: 121, dif: -31, previsaoEmbarque: "2025-03", pracasTTC: 62, servidoresCivis: 16, percentualPracasAtiva: 83, percentualForcaTrabalho: 91 },
  { id: "53", nome: "CB-OM9", especialidade: "CN", graduacao: "CB", om: "OM 9", sdp: "SDP-9", tmft: 250, exi: 97, dif: -153, previsaoEmbarque: "2025-03", pracasTTC: 62, servidoresCivis: 16, percentualPracasAtiva: 83, percentualForcaTrabalho: 91 },
  { id: "54", nome: "MN-OM9", especialidade: "SI", graduacao: "MN", om: "OM 9", sdp: "SDP-9", tmft: 120, exi: 103, dif: -17, previsaoEmbarque: "2025-03", pracasTTC: 62, servidoresCivis: 16, percentualPracasAtiva: 83, percentualForcaTrabalho: 91 },

  // OM 10 - Coluna 10 da planilha
  { id: "55", nome: "SO-OM10", especialidade: "ET", graduacao: "SO", om: "OM 10", sdp: "SDP-10", tmft: 8, exi: 4, dif: -4, previsaoEmbarque: "2025-01", pracasTTC: 9, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "56", nome: "1SG-OM10", especialidade: "CL", graduacao: "1SG", om: "OM 10", sdp: "SDP-10", tmft: 9, exi: 12, dif: 3, previsaoEmbarque: "2025-01", pracasTTC: 9, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "57", nome: "2SG-OM10", especialidade: "MO", graduacao: "2SG", om: "OM 10", sdp: "SDP-10", tmft: 9, exi: 10, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 9, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "58", nome: "3SG-OM10", especialidade: "AM", graduacao: "3SG", om: "OM 10", sdp: "SDP-10", tmft: 11, exi: 9, dif: -2, previsaoEmbarque: "2025-01", pracasTTC: 9, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "59", nome: "CB-OM10", especialidade: "OS", graduacao: "CB", om: "OM 10", sdp: "SDP-10", tmft: 8, exi: 3, dif: -5, previsaoEmbarque: "2025-01", pracasTTC: 9, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "60", nome: "MN-OM10", especialidade: "ES", graduacao: "MN", om: "OM 10", sdp: "SDP-10", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 9, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },

  // OM 11 - Coluna 11 da planilha
  { id: "61", nome: "SO-OM11", especialidade: "MR", graduacao: "SO", om: "OM 11", sdp: "SDP-11", tmft: 2, exi: 9, dif: 7, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "62", nome: "1SG-OM11", especialidade: "AD", graduacao: "1SG", om: "OM 11", sdp: "SDP-11", tmft: 4, exi: 4, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "63", nome: "2SG-OM11", especialidade: "MA", graduacao: "2SG", om: "OM 11", sdp: "SDP-11", tmft: 4, exi: 6, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "64", nome: "3SG-OM11", especialidade: "EL", graduacao: "3SG", om: "OM 11", sdp: "SDP-11", tmft: 12, exi: 8, dif: -4, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "65", nome: "CB-OM11", especialidade: "CN", graduacao: "CB", om: "OM 11", sdp: "SDP-11", tmft: 20, exi: 6, dif: -14, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "66", nome: "MN-OM11", especialidade: "SI", graduacao: "MN", om: "OM 11", sdp: "SDP-11", tmft: 6, exi: 6, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },

  // OM 12 - Coluna 12 da planilha
  { id: "67", nome: "SO-OM12", especialidade: "ET", graduacao: "SO", om: "OM 12", sdp: "SDP-12", tmft: 1, exi: 5, dif: 4, previsaoEmbarque: "2025-03", pracasTTC: 9, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "68", nome: "1SG-OM12", especialidade: "CL", graduacao: "1SG", om: "OM 12", sdp: "SDP-12", tmft: 4, exi: 5, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 9, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "69", nome: "2SG-OM12", especialidade: "MO", graduacao: "2SG", om: "OM 12", sdp: "SDP-12", tmft: 7, exi: 12, dif: 5, previsaoEmbarque: "2025-03", pracasTTC: 9, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "70", nome: "3SG-OM12", especialidade: "AM", graduacao: "3SG", om: "OM 12", sdp: "SDP-12", tmft: 8, exi: 7, dif: -1, previsaoEmbarque: "2025-03", pracasTTC: 9, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "71", nome: "CB-OM12", especialidade: "OS", graduacao: "CB", om: "OM 12", sdp: "SDP-12", tmft: 8, exi: 3, dif: -5, previsaoEmbarque: "2025-03", pracasTTC: 9, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "72", nome: "MN-OM12", especialidade: "ES", graduacao: "MN", om: "OM 12", sdp: "SDP-12", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 9, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },

  // OM 13 - Coluna 13 da planilha
  { id: "73", nome: "SO-OM13", especialidade: "MR", graduacao: "SO", om: "OM 13", sdp: "SDP-13", tmft: 3, exi: 5, dif: 2, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "74", nome: "1SG-OM13", especialidade: "AD", graduacao: "1SG", om: "OM 13", sdp: "SDP-13", tmft: 2, exi: 8, dif: 6, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "75", nome: "2SG-OM13", especialidade: "MA", graduacao: "2SG", om: "OM 13", sdp: "SDP-13", tmft: 8, exi: 7, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "76", nome: "3SG-OM13", especialidade: "EL", graduacao: "3SG", om: "OM 13", sdp: "SDP-13", tmft: 7, exi: 6, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "77", nome: "CB-OM13", especialidade: "CN", graduacao: "CB", om: "OM 13", sdp: "SDP-13", tmft: 31, exi: 2, dif: -29, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "78", nome: "MN-OM13", especialidade: "SI", graduacao: "MN", om: "OM 13", sdp: "SDP-13", tmft: 4, exi: 5, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },

  // OM 14 - Coluna 14 da planilha
  { id: "79", nome: "SO-OM14", especialidade: "ET", graduacao: "SO", om: "OM 14", sdp: "SDP-14", tmft: 2, exi: 1, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "80", nome: "1SG-OM14", especialidade: "CL", graduacao: "1SG", om: "OM 14", sdp: "SDP-14", tmft: 1, exi: 1, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "81", nome: "2SG-OM14", especialidade: "MO", graduacao: "2SG", om: "OM 14", sdp: "SDP-14", tmft: 1, exi: 3, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "82", nome: "3SG-OM14", especialidade: "AM", graduacao: "3SG", om: "OM 14", sdp: "SDP-14", tmft: 2, exi: 1, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "83", nome: "CB-OM14", especialidade: "OS", graduacao: "CB", om: "OM 14", sdp: "SDP-14", tmft: 3, exi: 3, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "84", nome: "MN-OM14", especialidade: "ES", graduacao: "MN", om: "OM 14", sdp: "SDP-14", tmft: 1, exi: 3, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },

  // OM 15 - Coluna 15 da planilha
  { id: "85", nome: "SO-OM15", especialidade: "MR", graduacao: "SO", om: "OM 15", sdp: "SDP-15", tmft: 1, exi: 2, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "86", nome: "1SG-OM15", especialidade: "AD", graduacao: "1SG", om: "OM 15", sdp: "SDP-15", tmft: 2, exi: 3, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "87", nome: "2SG-OM15", especialidade: "MA", graduacao: "2SG", om: "OM 15", sdp: "SDP-15", tmft: 0, exi: 0, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "88", nome: "3SG-OM15", especialidade: "EL", graduacao: "3SG", om: "OM 15", sdp: "SDP-15", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "89", nome: "CB-OM15", especialidade: "CN", graduacao: "CB", om: "OM 15", sdp: "SDP-15", tmft: 1, exi: 0, dif: -1, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "90", nome: "MN-OM15", especialidade: "SI", graduacao: "MN", om: "OM 15", sdp: "SDP-15", tmft: 2, exi: 3, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },

  // OM 16 - Coluna 16 da planilha
  { id: "91", nome: "SO-OM16", especialidade: "ET", graduacao: "SO", om: "OM 16", sdp: "SDP-16", tmft: 17, exi: 26, dif: 9, previsaoEmbarque: "2025-01", pracasTTC: 54, servidoresCivis: 10, percentualPracasAtiva: 85, percentualForcaTrabalho: 90 },
  { id: "92", nome: "1SG-OM16", especialidade: "CL", graduacao: "1SG", om: "OM 16", sdp: "SDP-16", tmft: 22, exi: 33, dif: 11, previsaoEmbarque: "2025-01", pracasTTC: 54, servidoresCivis: 10, percentualPracasAtiva: 85, percentualForcaTrabalho: 90 },
  { id: "93", nome: "2SG-OM16", especialidade: "MO", graduacao: "2SG", om: "OM 16", sdp: "SDP-16", tmft: 29, exi: 38, dif: 9, previsaoEmbarque: "2025-01", pracasTTC: 54, servidoresCivis: 10, percentualPracasAtiva: 85, percentualForcaTrabalho: 90 },
  { id: "94", nome: "3SG-OM16", especialidade: "AM", graduacao: "3SG", om: "OM 16", sdp: "SDP-16", tmft: 42, exi: 33, dif: -9, previsaoEmbarque: "2025-01", pracasTTC: 54, servidoresCivis: 10, percentualPracasAtiva: 85, percentualForcaTrabalho: 90 },
  { id: "95", nome: "CB-OM16", especialidade: "OS", graduacao: "CB", om: "OM 16", sdp: "SDP-16", tmft: 71, exi: 17, dif: -54, previsaoEmbarque: "2025-01", pracasTTC: 54, servidoresCivis: 10, percentualPracasAtiva: 85, percentualForcaTrabalho: 90 },
  { id: "96", nome: "MN-OM16", especialidade: "ES", graduacao: "MN", om: "OM 16", sdp: "SDP-16", tmft: 17, exi: 21, dif: 4, previsaoEmbarque: "2025-01", pracasTTC: 54, servidoresCivis: 10, percentualPracasAtiva: 85, percentualForcaTrabalho: 90 },
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

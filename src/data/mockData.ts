import { MilitaryData } from "@/types/military";

export const GRADUACOES = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];

export const OMS = [
  "DAbM",
  "COMRJ",
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
  // DAbM - Coluna 1 da planilha
  { id: "1", nome: "SO-DAbM", especialidade: "MR", graduacao: "SO", om: "DAbM", sdp: "SDP-1", tmft: 24, exi: 30, dif: 6, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "2", nome: "1SG-DAbM", especialidade: "AD", graduacao: "1SG", om: "DAbM", sdp: "SDP-1", tmft: 33, exi: 27, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 17, servidoresCivis: 13, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "3", nome: "2SG-DAbM", especialidade: "MA", graduacao: "2SG", om: "DAbM", sdp: "SDP-1", tmft: 26, exi: 46, dif: 20, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "4", nome: "3SG-DAbM", especialidade: "EL", graduacao: "3SG", om: "DAbM", sdp: "SDP-1", tmft: 35, exi: 29, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "5", nome: "CB-DAbM", especialidade: "CN", graduacao: "CB", om: "DAbM", sdp: "SDP-1", tmft: 34, exi: 12, dif: -22, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },
  { id: "6", nome: "MN-DAbM", especialidade: "SI", graduacao: "MN", om: "DAbM", sdp: "SDP-1", tmft: 22, exi: 23, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 22, servidoresCivis: 0, percentualPracasAtiva: 96, percentualForcaTrabalho: 101 },

  // COMRJ - Coluna 2 da planilha
  { id: "7", nome: "SO-COMRJ", especialidade: "MR", graduacao: "SO", om: "COMRJ", sdp: "SDP-2", tmft: 1, exi: 11, dif: 10, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 11, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "8", nome: "1SG-COMRJ", especialidade: "AD", graduacao: "1SG", om: "COMRJ", sdp: "SDP-2", tmft: 13, exi: 6, dif: -7, previsaoEmbarque: "2025-01", pracasTTC: 14, servidoresCivis: 6, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "9", nome: "2SG-COMRJ", especialidade: "MA", graduacao: "2SG", om: "COMRJ", sdp: "SDP-2", tmft: 7, exi: 21, dif: 14, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "10", nome: "3SG-COMRJ", especialidade: "EL", graduacao: "3SG", om: "COMRJ", sdp: "SDP-2", tmft: 32, exi: 11, dif: -21, previsaoEmbarque: "2025-01", pracasTTC: 14, servidoresCivis: 6, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "11", nome: "CB-COMRJ", especialidade: "CN", graduacao: "CB", om: "COMRJ", sdp: "SDP-2", tmft: 21, exi: 3, dif: -18, previsaoEmbarque: "2025-01", pracasTTC: 23, servidoresCivis: 30, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },
  { id: "12", nome: "MN-COMRJ", especialidade: "SI", graduacao: "MN", om: "COMRJ", sdp: "SDP-2", tmft: 5, exi: 7, dif: 2, previsaoEmbarque: "2025-01", pracasTTC: 4, servidoresCivis: 6, percentualPracasAtiva: 75, percentualForcaTrabalho: 75 },

  // COpAb - Coluna 3 da planilha
  { id: "13", nome: "SO-COpAb", especialidade: "MR", graduacao: "SO", om: "COpAb", sdp: "SDP-3", tmft: 7, exi: 9, dif: 2, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "14", nome: "1SG-COpAb", especialidade: "AD", graduacao: "1SG", om: "COpAb", sdp: "SDP-3", tmft: 12, exi: 15, dif: 3, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "15", nome: "2SG-COpAb", especialidade: "MA", graduacao: "2SG", om: "COpAb", sdp: "SDP-3", tmft: 7, exi: 2, dif: -5, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "16", nome: "3SG-COpAb", especialidade: "EL", graduacao: "3SG", om: "COpAb", sdp: "SDP-3", tmft: 6, exi: 6, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "17", nome: "CB-COpAb", especialidade: "CN", graduacao: "CB", om: "COpAb", sdp: "SDP-3", tmft: 4, exi: 0, dif: -4, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  { id: "18", nome: "MN-COpAb", especialidade: "SI", graduacao: "MN", om: "COpAb", sdp: "SDP-3", tmft: 3, exi: 3, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 90, percentualForcaTrabalho: 93 },
  
  // BAMRJ - Coluna 4 da planilha
  { id: "19", nome: "SO-BAMRJ", especialidade: "ET", graduacao: "SO", om: "BAMRJ", sdp: "SDP-4", tmft: 9, exi: 19, dif: 10, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "20", nome: "1SG-BAMRJ", especialidade: "CL", graduacao: "1SG", om: "BAMRJ", sdp: "SDP-4", tmft: 11, exi: 24, dif: 13, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "21", nome: "2SG-BAMRJ", especialidade: "MO", graduacao: "2SG", om: "BAMRJ", sdp: "SDP-4", tmft: 9, exi: 33, dif: 24, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "22", nome: "3SG-BAMRJ", especialidade: "AM", graduacao: "3SG", om: "BAMRJ", sdp: "SDP-4", tmft: 33, exi: 18, dif: -15, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "23", nome: "CB-BAMRJ", especialidade: "OS", graduacao: "CB", om: "BAMRJ", sdp: "SDP-4", tmft: 47, exi: 14, dif: -33, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },
  { id: "24", nome: "MN-BAMRJ", especialidade: "ES", graduacao: "MN", om: "BAMRJ", sdp: "SDP-4", tmft: 30, exi: 21, dif: -9, previsaoEmbarque: "2025-01", pracasTTC: 24, servidoresCivis: 10, percentualPracasAtiva: 93, percentualForcaTrabalho: 105 },

  // CMM - Coluna 5 da planilha
  { id: "25", nome: "SO-CMM", especialidade: "MR", graduacao: "SO", om: "CMM", sdp: "SDP-5", tmft: 11, exi: 10, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "26", nome: "1SG-CMM", especialidade: "AD", graduacao: "1SG", om: "CMM", sdp: "SDP-5", tmft: 16, exi: 12, dif: -4, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "27", nome: "2SG-CMM", especialidade: "MA", graduacao: "2SG", om: "CMM", sdp: "SDP-5", tmft: 17, exi: 28, dif: 11, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "28", nome: "3SG-CMM", especialidade: "EL", graduacao: "3SG", om: "CMM", sdp: "SDP-5", tmft: 55, exi: 58, dif: 3, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "29", nome: "CB-CMM", especialidade: "CN", graduacao: "CB", om: "CMM", sdp: "SDP-5", tmft: 107, exi: 49, dif: -58, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },
  { id: "30", nome: "MN-CMM", especialidade: "SI", graduacao: "MN", om: "CMM", sdp: "SDP-5", tmft: 25, exi: 42, dif: 17, previsaoEmbarque: "2025-02", pracasTTC: 5, servidoresCivis: 2, percentualPracasAtiva: 86, percentualForcaTrabalho: 96 },

  // DepCMRJ - Coluna 6 da planilha
  { id: "31", nome: "SO-DepCMRJ", especialidade: "ET", graduacao: "SO", om: "DepCMRJ", sdp: "SDP-6", tmft: 1, exi: 7, dif: 6, previsaoEmbarque: "2025-03", pracasTTC: 7, servidoresCivis: 5, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "32", nome: "1SG-DepCMRJ", especialidade: "CL", graduacao: "1SG", om: "DepCMRJ", sdp: "SDP-6", tmft: 9, exi: 6, dif: -3, previsaoEmbarque: "2025-03", pracasTTC: 3, servidoresCivis: 5, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "33", nome: "2SG-DepCMRJ", especialidade: "MO", graduacao: "2SG", om: "DepCMRJ", sdp: "SDP-6", tmft: 12, exi: 21, dif: 9, previsaoEmbarque: "2025-03", pracasTTC: 5, servidoresCivis: 5, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "34", nome: "3SG-DepCMRJ", especialidade: "AM", graduacao: "3SG", om: "DepCMRJ", sdp: "SDP-6", tmft: 24, exi: 30, dif: 6, previsaoEmbarque: "2025-03", pracasTTC: 23, servidoresCivis: 5, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "35", nome: "CB-DepCMRJ", especialidade: "OS", graduacao: "CB", om: "DepCMRJ", sdp: "SDP-6", tmft: 61, exi: 27, dif: -34, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 5, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },
  { id: "36", nome: "MN-DepCMRJ", especialidade: "ES", graduacao: "MN", om: "DepCMRJ", sdp: "SDP-6", tmft: 57, exi: 32, dif: -25, previsaoEmbarque: "2025-03", pracasTTC: 18, servidoresCivis: 5, percentualPracasAtiva: 75, percentualForcaTrabalho: 77 },

  // CDAM - Coluna 7 da planilha
  { id: "37", nome: "SO-CDAM", especialidade: "MR", graduacao: "SO", om: "CDAM", sdp: "SDP-7", tmft: 6, exi: 9, dif: 3, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "38", nome: "1SG-CDAM", especialidade: "AD", graduacao: "1SG", om: "CDAM", sdp: "SDP-7", tmft: 11, exi: 10, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "39", nome: "2SG-CDAM", especialidade: "MA", graduacao: "2SG", om: "CDAM", sdp: "SDP-7", tmft: 4, exi: 8, dif: 4, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "40", nome: "3SG-CDAM", especialidade: "EL", graduacao: "3SG", om: "CDAM", sdp: "SDP-7", tmft: 21, exi: 9, dif: -12, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "41", nome: "CB-CDAM", especialidade: "CN", graduacao: "CB", om: "CDAM", sdp: "SDP-7", tmft: 8, exi: 2, dif: -6, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },
  { id: "42", nome: "MN-CDAM", especialidade: "SI", graduacao: "MN", om: "CDAM", sdp: "SDP-7", tmft: 6, exi: 5, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 4, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 78 },

  // DepSMRJ - Coluna 8 da planilha
  { id: "43", nome: "SO-DepSMRJ", especialidade: "ET", graduacao: "SO", om: "DepSMRJ", sdp: "SDP-8", tmft: 2, exi: 13, dif: 11, previsaoEmbarque: "2025-02", pracasTTC: 18, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "44", nome: "1SG-DepSMRJ", especialidade: "CL", graduacao: "1SG", om: "DepSMRJ", sdp: "SDP-8", tmft: 4, exi: 10, dif: 6, previsaoEmbarque: "2025-02", pracasTTC: 18, servidoresCivis: 2, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "45", nome: "2SG-DepSMRJ", especialidade: "MO", graduacao: "2SG", om: "DepSMRJ", sdp: "SDP-8", tmft: 6, exi: 9, dif: 3, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 4, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "46", nome: "3SG-DepSMRJ", especialidade: "AM", graduacao: "3SG", om: "DepSMRJ", sdp: "SDP-8", tmft: 19, exi: 6, dif: -13, previsaoEmbarque: "2025-02", pracasTTC: 16, servidoresCivis: 6, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "47", nome: "CB-DepSMRJ", especialidade: "OS", graduacao: "CB", om: "DepSMRJ", sdp: "SDP-8", tmft: 27, exi: 5, dif: -22, previsaoEmbarque: "2025-02", pracasTTC: 6, servidoresCivis: 8, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },
  { id: "48", nome: "MN-DepSMRJ", especialidade: "ES", graduacao: "MN", om: "DepSMRJ", sdp: "SDP-8", tmft: 2, exi: 3, dif: 1, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 8, percentualPracasAtiva: 77, percentualForcaTrabalho: 86 },

  // CSupAb - Coluna 9 da planilha
  { id: "49", nome: "SO-CSupAb", especialidade: "MR", graduacao: "SO", om: "CSupAb", sdp: "SDP-9", tmft: 8, exi: 4, dif: -4, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 1, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "50", nome: "1SG-CSupAb", especialidade: "AD", graduacao: "1SG", om: "CSupAb", sdp: "SDP-9", tmft: 9, exi: 12, dif: 3, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 5, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "51", nome: "2SG-CSupAb", especialidade: "MA", graduacao: "2SG", om: "CSupAb", sdp: "SDP-9", tmft: 9, exi: 10, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 6, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "52", nome: "3SG-CSupAb", especialidade: "EL", graduacao: "3SG", om: "CSupAb", sdp: "SDP-9", tmft: 11, exi: 9, dif: -2, previsaoEmbarque: "2025-01", pracasTTC: 5, servidoresCivis: 9, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "53", nome: "CB-CSupAb", especialidade: "CN", graduacao: "CB", om: "CSupAb", sdp: "SDP-9", tmft: 8, exi: 3, dif: -5, previsaoEmbarque: "2025-01", pracasTTC: 4, servidoresCivis: 9, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },
  { id: "54", nome: "MN-CSupAb", especialidade: "SI", graduacao: "MN", om: "CSupAb", sdp: "SDP-9", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 85, percentualForcaTrabalho: 91 },

  // DepSIMRJ - Coluna 10 da planilha
  { id: "55", nome: "SO-DepSIMRJ", especialidade: "MR", graduacao: "SO", om: "DepSIMRJ", sdp: "SDP-10", tmft: 2, exi: 9, dif: 7, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "56", nome: "1SG-DepSIMRJ", especialidade: "AD", graduacao: "1SG", om: "DepSIMRJ", sdp: "SDP-10", tmft: 4, exi: 4, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "57", nome: "2SG-DepSIMRJ", especialidade: "MA", graduacao: "2SG", om: "DepSIMRJ", sdp: "SDP-10", tmft: 4, exi: 6, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "58", nome: "3SG-DepSIMRJ", especialidade: "EL", graduacao: "3SG", om: "DepSIMRJ", sdp: "SDP-10", tmft: 12, exi: 8, dif: -4, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "59", nome: "CB-DepSIMRJ", especialidade: "CN", graduacao: "CB", om: "DepSIMRJ", sdp: "SDP-10", tmft: 20, exi: 6, dif: -14, previsaoEmbarque: "2025-02", pracasTTC: 10, servidoresCivis: 9, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },
  { id: "60", nome: "MN-DepSIMRJ", especialidade: "SI", graduacao: "MN", om: "DepSIMRJ", sdp: "SDP-10", tmft: 6, exi: 6, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 81, percentualForcaTrabalho: 85 },

  // DepMSMRJ - Coluna 11 da planilha
  { id: "61", nome: "SO-DepMSMRJ", especialidade: "ET", graduacao: "SO", om: "DepMSMRJ", sdp: "SDP-11", tmft: 1, exi: 5, dif: 4, previsaoEmbarque: "2025-03", pracasTTC: 5, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "62", nome: "1SG-DepMSMRJ", especialidade: "CL", graduacao: "1SG", om: "DepMSMRJ", sdp: "SDP-11", tmft: 4, exi: 5, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 5, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "63", nome: "2SG-DepMSMRJ", especialidade: "MO", graduacao: "2SG", om: "DepMSMRJ", sdp: "SDP-11", tmft: 7, exi: 12, dif: 5, previsaoEmbarque: "2025-03", pracasTTC: 5, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "64", nome: "3SG-DepMSMRJ", especialidade: "AM", graduacao: "3SG", om: "DepMSMRJ", sdp: "SDP-11", tmft: 8, exi: 7, dif: -1, previsaoEmbarque: "2025-03", pracasTTC: 5, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "65", nome: "CB-DepMSMRJ", especialidade: "OS", graduacao: "CB", om: "DepMSMRJ", sdp: "SDP-11", tmft: 8, exi: 3, dif: -5, previsaoEmbarque: "2025-03", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },
  { id: "66", nome: "MN-DepMSMRJ", especialidade: "ES", graduacao: "MN", om: "DepMSMRJ", sdp: "SDP-11", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 113, percentualForcaTrabalho: 100 },

  // DepFMRJ - Coluna 12 da planilha
  { id: "67", nome: "SO-DepFMRJ", especialidade: "MR", graduacao: "SO", om: "DepFMRJ", sdp: "SDP-12", tmft: 3, exi: 5, dif: 2, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "68", nome: "1SG-DepFMRJ", especialidade: "AD", graduacao: "1SG", om: "DepFMRJ", sdp: "SDP-12", tmft: 2, exi: 8, dif: 6, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "69", nome: "2SG-DepFMRJ", especialidade: "MA", graduacao: "2SG", om: "DepFMRJ", sdp: "SDP-12", tmft: 8, exi: 7, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 9, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "70", nome: "3SG-DepFMRJ", especialidade: "EL", graduacao: "3SG", om: "DepFMRJ", sdp: "SDP-12", tmft: 7, exi: 6, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 9, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "71", nome: "CB-DepFMRJ", especialidade: "CN", graduacao: "CB", om: "DepFMRJ", sdp: "SDP-12", tmft: 31, exi: 2, dif: -29, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 9, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },
  { id: "72", nome: "MN-DepFMRJ", especialidade: "SI", graduacao: "MN", om: "DepFMRJ", sdp: "SDP-12", tmft: 4, exi: 5, dif: 1, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 9, percentualPracasAtiva: 60, percentualForcaTrabalho: 82 },

  // CDU-BAMRJ - Coluna 13 da planilha
  { id: "73", nome: "SO-CDU-BAMRJ", especialidade: "ET", graduacao: "SO", om: "CDU-BAMRJ", sdp: "SDP-13", tmft: 2, exi: 1, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 9, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "74", nome: "1SG-CDU-BAMRJ", especialidade: "CL", graduacao: "1SG", om: "CDU-BAMRJ", sdp: "SDP-13", tmft: 1, exi: 1, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 9, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "75", nome: "2SG-CDU-BAMRJ", especialidade: "MO", graduacao: "2SG", om: "CDU-BAMRJ", sdp: "SDP-13", tmft: 1, exi: 3, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 9, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "76", nome: "3SG-CDU-BAMRJ", especialidade: "AM", graduacao: "3SG", om: "CDU-BAMRJ", sdp: "SDP-13", tmft: 2, exi: 1, dif: -1, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 9, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "77", nome: "CB-CDU-BAMRJ", especialidade: "OS", graduacao: "CB", om: "CDU-BAMRJ", sdp: "SDP-13", tmft: 3, exi: 3, dif: 0, previsaoEmbarque: "2025-02", pracasTTC: 4, servidoresCivis: 9, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },
  { id: "78", nome: "MN-CDU-BAMRJ", especialidade: "ES", graduacao: "MN", om: "CDU-BAMRJ", sdp: "SDP-13", tmft: 1, exi: 3, dif: 2, previsaoEmbarque: "2025-02", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 120, percentualForcaTrabalho: 114 },

  // CDU-1DN - Coluna 14 da planilha
  { id: "79", nome: "SO-CDU-1DN", especialidade: "MR", graduacao: "SO", om: "CDU-1DN", sdp: "SDP-14", tmft: 1, exi: 2, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "80", nome: "1SG-CDU-1DN", especialidade: "AD", graduacao: "1SG", om: "CDU-1DN", sdp: "SDP-14", tmft: 2, exi: 3, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "81", nome: "2SG-CDU-1DN", especialidade: "MA", graduacao: "2SG", om: "CDU-1DN", sdp: "SDP-14", tmft: 0, exi: 0, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "82", nome: "3SG-CDU-1DN", especialidade: "EL", graduacao: "3SG", om: "CDU-1DN", sdp: "SDP-14", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-03", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "83", nome: "CB-CDU-1DN", especialidade: "CN", graduacao: "CB", om: "CDU-1DN", sdp: "SDP-14", tmft: 1, exi: 0, dif: -1, previsaoEmbarque: "2025-03", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },
  { id: "84", nome: "MN-CDU-1DN", especialidade: "SI", graduacao: "MN", om: "CDU-1DN", sdp: "SDP-14", tmft: 2, exi: 3, dif: 1, previsaoEmbarque: "2025-03", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 125, percentualForcaTrabalho: 100 },

  // PRAÇAS TTC - Linha especial da planilha
  { id: "85", nome: "PRACAS-TTC-DAbM", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "DAbM", sdp: "SDP-TTC", tmft: 22, exi: 17, dif: -5, previsaoEmbarque: "2025-01", pracasTTC: 17, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "86", nome: "PRACAS-TTC-COMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "COMRJ", sdp: "SDP-TTC", tmft: 16, exi: 14, dif: -2, previsaoEmbarque: "2025-01", pracasTTC: 14, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "87", nome: "PRACAS-TTC-COpAb", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "COpAb", sdp: "SDP-TTC", tmft: 7, exi: 6, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "88", nome: "PRACAS-TTC-BAMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "BAMRJ", sdp: "SDP-TTC", tmft: 24, exi: 23, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 23, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "89", nome: "PRACAS-TTC-CMM", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "CMM", sdp: "SDP-TTC", tmft: 5, exi: 5, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 5, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "90", nome: "PRACAS-TTC-DepCMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "DepCMRJ", sdp: "SDP-TTC", tmft: 7, exi: 3, dif: -4, previsaoEmbarque: "2025-01", pracasTTC: 3, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "91", nome: "PRACAS-TTC-CDAM", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "CDAM", sdp: "SDP-TTC", tmft: 7, exi: 6, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "92", nome: "PRACAS-TTC-DepSMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "DepSMRJ", sdp: "SDP-TTC", tmft: 19, exi: 18, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 18, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "93", nome: "PRACAS-TTC-CSupAb", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "CSupAb", sdp: "SDP-TTC", tmft: 9, exi: 6, dif: -3, previsaoEmbarque: "2025-01", pracasTTC: 6, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "94", nome: "PRACAS-TTC-DepSIMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "DepSIMRJ", sdp: "SDP-TTC", tmft: 10, exi: 10, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 10, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "95", nome: "PRACAS-TTC-DepMSMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "DepMSMRJ", sdp: "SDP-TTC", tmft: 9, exi: 5, dif: -4, previsaoEmbarque: "2025-01", pracasTTC: 5, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "96", nome: "PRACAS-TTC-DepFMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "DepFMRJ", sdp: "SDP-TTC", tmft: 16, exi: 16, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 16, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "97", nome: "PRACAS-TTC-CDU-BAMRJ", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "CDU-BAMRJ", sdp: "SDP-TTC", tmft: 4, exi: 4, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "98", nome: "PRACAS-TTC-CDU-1DN", especialidade: "TTC", graduacao: "PRAÇAS TTC", om: "CDU-1DN", sdp: "SDP-TTC", tmft: 6, exi: 4, dif: -2, previsaoEmbarque: "2025-01", pracasTTC: 4, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },

  // SERVIDORES CIVIS - Linha especial da planilha
  { id: "99", nome: "CIVIS-DAbM", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "DAbM", sdp: "SDP-CIV", tmft: 0, exi: 13, dif: 13, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 13, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "100", nome: "CIVIS-COMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "COMRJ", sdp: "SDP-CIV", tmft: 11, exi: 6, dif: -5, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 6, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "101", nome: "CIVIS-COpAb", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "COpAb", sdp: "SDP-CIV", tmft: 0, exi: 2, dif: 2, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 2, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "102", nome: "CIVIS-BAMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "BAMRJ", sdp: "SDP-CIV", tmft: 10, exi: 30, dif: 20, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 30, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "103", nome: "CIVIS-CMM", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "CMM", sdp: "SDP-CIV", tmft: 2, exi: 24, dif: 22, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 24, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "104", nome: "CIVIS-DepCMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "DepCMRJ", sdp: "SDP-CIV", tmft: 0, exi: 5, dif: 5, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 5, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "105", nome: "CIVIS-CDAM", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "CDAM", sdp: "SDP-CIV", tmft: 2, exi: 2, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 2, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "106", nome: "CIVIS-DepSMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "DepSMRJ", sdp: "SDP-CIV", tmft: 2, exi: 6, dif: 4, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 6, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "107", nome: "CIVIS-CSupAb", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "CSupAb", sdp: "SDP-CIV", tmft: 1, exi: 6, dif: 5, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 6, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "108", nome: "CIVIS-DepSIMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "DepSIMRJ", sdp: "SDP-CIV", tmft: 9, exi: 8, dif: -1, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 8, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "109", nome: "CIVIS-DepMSMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "DepMSMRJ", sdp: "SDP-CIV", tmft: 0, exi: 0, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "110", nome: "CIVIS-DepFMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "DepFMRJ", sdp: "SDP-CIV", tmft: 0, exi: 9, dif: 9, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 9, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "111", nome: "CIVIS-CDU-BAMRJ", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "CDU-BAMRJ", sdp: "SDP-CIV", tmft: 0, exi: 0, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 },
  { id: "112", nome: "CIVIS-CDU-1DN", especialidade: "CIV", graduacao: "SERVIDORES CIVIS", om: "CDU-1DN", sdp: "SDP-CIV", tmft: 0, exi: 0, dif: 0, previsaoEmbarque: "2025-01", pracasTTC: 0, servidoresCivis: 0, percentualPracasAtiva: 0, percentualForcaTrabalho: 0 }

];

export const getUniqueValues = (data: MilitaryData[]) => {
  const specialGraduations = ["PRAÇAS TTC", "SERVIDORES CIVIS (NA + NI)"];
  
  return {
    especialidades: [...new Set(data.map(item => item.especialidade))].sort(),
    graduacoes: [...new Set(data.map(item => item.graduacao))]
      .filter(grad => !specialGraduations.includes(grad))
      .sort((a, b) => {
        const order = ["SO", "1SG", "2SG", "3SG", "CB", "MN"];
        return order.indexOf(a) - order.indexOf(b);
      }),
    oms: [...new Set(data.map(item => item.om))].sort(),
    sdps: [...new Set(data.map(item => item.sdp))].sort(),
    meses: [...new Set(data.map(item => item.previsaoEmbarque))].sort(),
    pracasTTC: [...new Set(data.map(item => item.pracasTTC.toString()))].sort((a, b) => Number(a) - Number(b)),
    servidoresCivis: [...new Set(data.map(item => item.servidoresCivis.toString()))].sort((a, b) => Number(a) - Number(b)),
  };
};

export const getEspecialidadeName = (code: string): string => {
  const esp = ESPECIALIDADES.find(e => e.code === code);
  return esp ? `${esp.code} - ${esp.name}` : code;
};

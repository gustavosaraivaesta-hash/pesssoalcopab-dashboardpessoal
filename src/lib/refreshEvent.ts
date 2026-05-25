// Simple event system to trigger immediate data refresh across pages after changes

const REFRESH_KEY = "data_refresh_requested";
const CACHE_PREFIX = "dashboard_cache_";

// Limpa todos os caches offline dos dashboards para forçar fetch novo
const clearDashboardCaches = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.error("Error clearing dashboard caches:", error);
  }
};

const dispatch = () => {
  const timestamp = Date.now().toString();
  localStorage.setItem(REFRESH_KEY, timestamp);
  window.dispatchEvent(new CustomEvent("data-refresh"));
};

export const triggerDataRefresh = () => {
  // 1) Limpa cache imediatamente para próximas navegações
  clearDashboardCaches();
  // 2) Dispara evento imediato (tela atual recarrega)
  dispatch();
  // 3) Re-dispara após alguns segundos para capturar propagação do Google Sheets
  setTimeout(() => {
    clearDashboardCaches();
    dispatch();
  }, 6000);
  setTimeout(() => {
    clearDashboardCaches();
    dispatch();
  }, 15000);
};

export const useDataRefreshListener = (onRefresh: () => void) => {
  // Listen for cross-tab storage events and same-tab custom events
  const handler = () => onRefresh();

  const storageHandler = (e: StorageEvent) => {
    if (e.key === REFRESH_KEY) onRefresh();
  };

  return { handler, storageHandler };
};

// Retorna timestamp do último refresh solicitado (ms desde epoch) ou 0
export const getLastRefreshRequest = (): number => {
  try {
    const v = localStorage.getItem(REFRESH_KEY);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
};

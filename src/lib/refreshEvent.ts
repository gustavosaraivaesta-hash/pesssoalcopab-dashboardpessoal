// Simple event system to trigger immediate data refresh across pages after changes

const REFRESH_KEY = "data_refresh_requested";

export const triggerDataRefresh = () => {
  const timestamp = Date.now().toString();
  localStorage.setItem(REFRESH_KEY, timestamp);
  // Also dispatch a storage event for same-tab listeners
  window.dispatchEvent(new CustomEvent("data-refresh"));
};

export const useDataRefreshListener = (onRefresh: () => void) => {
  // Listen for cross-tab storage events and same-tab custom events
  const handler = () => onRefresh();
  
  const storageHandler = (e: StorageEvent) => {
    if (e.key === REFRESH_KEY) onRefresh();
  };

  return { handler, storageHandler };
};

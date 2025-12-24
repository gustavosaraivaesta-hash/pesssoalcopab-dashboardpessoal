import { useState, useEffect, useCallback } from 'react';

const CACHE_PREFIX = 'dashboard_cache_';

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export function useOfflineCache<T>(key: string, maxAge: number = 24 * 60 * 60 * 1000) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  
  const getFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsed: CacheData<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid (within maxAge)
      if (now - parsed.timestamp < maxAge) {
        return parsed.data;
      }
      
      return parsed.data; // Return even if expired for offline use
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }, [cacheKey, maxAge]);

  const saveToCache = useCallback((data: T) => {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, [cacheKey]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [cacheKey]);

  const getCacheTimestamp = useCallback((): Date | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsed: CacheData<T> = JSON.parse(cached);
      return new Date(parsed.timestamp);
    } catch (error) {
      return null;
    }
  }, [cacheKey]);

  return { getFromCache, saveToCache, clearCache, getCacheTimestamp };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

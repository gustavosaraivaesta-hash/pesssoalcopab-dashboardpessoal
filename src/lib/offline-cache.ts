import { supabase } from "@/integrations/supabase/client";

export type CachedInvokeSource = "network" | "cache";

type CacheEnvelope<T> = {
  cachedAt: string;
  data: T;
};

const DEFAULT_TIMEOUT_MS = 8000;

const makeCacheKey = (functionName: string, version: string) =>
  `lc:edge-cache:${functionName}:${version}`;

const readCache = <T,>(key: string): CacheEnvelope<T> | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.cachedAt !== "string") return null;
    if (parsed.data === undefined) return null;

    return parsed as CacheEnvelope<T>;
  } catch {
    return null;
  }
};

const writeCache = <T,>(key: string, data: T) => {
  const envelope: CacheEnvelope<T> = {
    cachedAt: new Date().toISOString(),
    data,
  };
  localStorage.setItem(key, JSON.stringify(envelope));
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("TIMEOUT")), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

export async function invokeFunctionWithCache<T>(
  functionName: string,
  opts?: {
    timeoutMs?: number;
    cacheVersion?: string;
  },
): Promise<{
  data: T | null;
  error: unknown | null;
  source: CachedInvokeSource;
  cachedAt?: string;
}> {
  const cacheVersion = opts?.cacheVersion ?? "v1";
  const key = makeCacheKey(functionName, cacheVersion);
  const cached = readCache<T>(key);

  // If offline, immediately return cached data (if any) instead of hanging.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (cached) {
      return { data: cached.data, error: null, source: "cache", cachedAt: cached.cachedAt };
    }
    return { data: null, error: new Error("OFFLINE_NO_CACHE"), source: "cache" };
  }

  try {
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const { data, error } = await withTimeout(
      supabase.functions.invoke(functionName) as Promise<{ data: T; error: unknown }>,
      timeoutMs,
    );

    if (!error && data != null) {
      writeCache(key, data);
      return { data, error: null, source: "network" };
    }

    if (cached) {
      return { data: cached.data, error: null, source: "cache", cachedAt: cached.cachedAt };
    }

    return { data: data ?? null, error: error ?? new Error("NO_DATA"), source: "network" };
  } catch (err) {
    if (cached) {
      return { data: cached.data, error: null, source: "cache", cachedAt: cached.cachedAt };
    }
    return { data: null, error: err, source: "network" };
  }
}

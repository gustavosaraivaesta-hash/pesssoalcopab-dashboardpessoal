import { useEffect, useRef, useState, useCallback } from "react";

// Hook genérico: busca dados de uma planilha e mantém sincronizado
// - refetch a cada `intervalMs` (padrão 30s)
// - refetch quando a aba volta a ficar visível
// Retorna fallback se o fetch falhar
export function useLiveSheet<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  intervalMs: number = 30_000,
) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetcher();
      if (!mounted.current) return;
      setData(res);
      setError(null);
      setLastUpdated(new Date());
    } catch (e: any) {
      if (!mounted.current) return;
      setError(e?.message ?? "Erro ao buscar dados");
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", load);
    return () => {
      mounted.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", load);
    };
  }, [load, intervalMs]);

  return { data, loading, error, lastUpdated, refetch: load };
}

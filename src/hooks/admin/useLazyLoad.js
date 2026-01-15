// src/hooks/admin/useLazyLoad.js
import React from "react";

/**
 * Custom hook to handle lazy loading of data with load‑on‑expand pattern.
 * Returns the data array, loading flag, a load function, and a refresh function.
 *
 * @param {Function} fetchFn - Firebase callable function that returns a promise resolving to { data: [] }.
 * @returns {{data: any[], loading: boolean, load: () => Promise<void>, refresh: () => void}}
 */
export const useLazyLoad = (fetchFn) => {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result?.data?.[Object.keys(result.data)[0]] || []);
      setLoaded(true);
    } catch (error) {
      console.error("Lazy load error:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, loaded, loading]);

  const refresh = React.useCallback(() => {
    setLoaded(false);
    load();
  }, [load]);

  return { data, loading, load, refresh, loaded };
};

const cache = new Map<string, Promise<unknown>>();

// Cache for static JSON data to avoid loading same data again
// On error the entry is delete to do a new call next time
export const cachedFetch = <T>(url: string): Promise<T> => {
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .catch((err: unknown) => {
        cache.delete(url);
        throw err;
      });
    cache.set(url, p);
  }
  return cache.get(url)! as Promise<T>;
};

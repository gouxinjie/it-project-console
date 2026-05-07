type CacheEntry<T> = {
  expiresAt: number;
  promise?: Promise<T>;
  value?: T;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        const nextValue = record[key];
        if (nextValue !== undefined) {
          accumulator[key] = normalizeValue(nextValue);
        }
        return accumulator;
      }, {});
  }

  return value;
}

export function createCacheKey(prefix: string, params?: unknown): string {
  return `${prefix}:${JSON.stringify(normalizeValue(params ?? null))}`;
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const now = Date.now();
  const existing = cacheStore.get(key) as CacheEntry<T> | undefined;

  if (existing?.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  if (existing?.promise) {
    return existing.promise;
  }

  const pendingPromise = fetcher()
    .then((value) => {
      cacheStore.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      cacheStore.delete(key);
      throw error;
    });

  cacheStore.set(key, {
    value: existing?.value,
    expiresAt: existing?.expiresAt ?? 0,
    promise: pendingPromise,
  });

  return pendingPromise;
}

export function prefetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): void {
  void fetchWithCache(key, fetcher, ttlMs).catch(() => undefined);
}

export function invalidateCacheByPrefix(prefix: string): void {
  const normalizedPrefix = `${prefix}:`;
  for (const key of cacheStore.keys()) {
    if (key === prefix || key.startsWith(normalizedPrefix)) {
      cacheStore.delete(key);
    }
  }
}

export function clearCacheStore(): void {
  cacheStore.clear();
}

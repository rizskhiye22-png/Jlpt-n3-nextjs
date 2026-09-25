import "server-only";

/**
 * Pembatas laju sliding-window di memori.
 * Cukup untuk satu server. Untuk multi-instance/serverless, ganti dengan
 * penyimpanan bersama (mis. Upstash Redis) — antarmukanya sama.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - arr[0])) / 1000) };
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 50_000) hits.clear();
  return { ok: true, retryAfter: 0 };
}

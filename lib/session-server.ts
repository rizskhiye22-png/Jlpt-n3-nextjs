import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { looksLikeBot, readSessionToken, SESSION_COOKIE } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export async function getSession() {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Dipakai di halaman: verifikasi ulang di server (jangan hanya mengandalkan proxy). */
export async function requireSession(next: string) {
  const s = await getSession();
  if (!s) redirect(`/aktivasi/?next=${encodeURIComponent(next)}`);
  return s;
}

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

/** Dipakai di API: sesi + anti-bot + batas laju. Mengembalikan sesi atau respons error. */
export async function guardApi(bucket: string, limit: number, windowMs = 60_000) {
  const h = await headers();
  if (looksLikeBot(h.get("user-agent"))) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE }) };
  }
  // Tolak permintaan lintas situs (skrip dari domain lain).
  const site = h.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE }) };
  }
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE }) };
  }
  const rl = rateLimit(`${bucket}:${session.lid}`, limit, windowMs);
  if (!rl.ok) {
    return {
      error: NextResponse.json(
        { error: "rate_limited", retryAfter: rl.retryAfter },
        { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfter) } },
      ),
    };
  }
  return { session };
}

export { NO_STORE };

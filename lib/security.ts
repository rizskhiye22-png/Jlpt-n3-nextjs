/**
 * Lisensi & sesi berbasis HMAC-SHA256 (Web Crypto), tanpa database.
 * Dipakai di proxy.ts dan di route handler, jadi hanya memakai API Web standar.
 *
 * Format kode lisensi: N3-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 *   12 karakter pertama = ID lisensi (acak)
 *   12 karakter terakhir = tanda tangan HMAC(LICENSE_SECRET, ID)
 * Kode tidak bisa dipalsukan tanpa LICENSE_SECRET, dan bisa dicabut lewat LICENSE_REVOKED.
 */

export const SESSION_COOKIE = "n3_session";
export const SESSION_DAYS = 30;
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I, O, 0, 1

const enc = new TextEncoder();

function secret(name: "LICENSE_SECRET" | "SESSION_SECRET"): string {
  const v = process.env[name];
  if (v && v.length >= 32) return v;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} wajib diisi (minimal 32 karakter) di environment produksi.`);
  }
  return `dev-only-${name}-ganti-di-produksi-0000000000`;
}

async function hmacBytes(key: string, data: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- Lisensi ---------- */

export async function licenseSignature(id: string) {
  const bytes = await hmacBytes(secret("LICENSE_SECRET"), `license:v1:${id}`);
  return Array.from(bytes.slice(0, 12), (b) => ALPHABET[b % 32]).join("");
}

export function formatLicense(id: string, sig: string) {
  const raw = id + sig;
  return "N3-" + raw.match(/.{4}/g)!.join("-");
}

export async function verifyLicense(input: string): Promise<{ id: string } | null> {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!clean.startsWith("N3") || clean.length !== 26) return null;
  const body = clean.slice(2);
  if ([...body].some((c) => !ALPHABET.includes(c))) return null;
  const id = body.slice(0, 12);
  const sig = body.slice(12);
  const expected = await licenseSignature(id);
  if (!safeEqual(sig, expected)) return null;
  const revoked = (process.env.LICENSE_REVOKED ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (revoked.includes(id)) return null;
  return { id };
}

/* ---------- Sesi ---------- */

export type Session = { lid: string; exp: number; v: 1 };

export async function createSessionToken(lid: string) {
  const payload: Session = { lid, exp: Date.now() + SESSION_DAYS * 86400_000, v: 1 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = b64url(await hmacBytes(secret("SESSION_SECRET"), body));
  return `${body}.${sig}`;
}

export async function readSessionToken(token: string | undefined | null): Promise<Session | null> {
  if (!token || token.length > 512) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(await hmacBytes(secret("SESSION_SECRET"), body));
  if (!safeEqual(sig, expected)) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (s.v !== 1 || typeof s.lid !== "string" || s.exp < Date.now()) return null;
    const revoked = (process.env.LICENSE_REVOKED ?? "").toUpperCase();
    if (revoked && revoked.split(",").map((x) => x.trim()).includes(s.lid)) return null;
    return s;
  } catch {
    return null;
  }
}

/* ---------- Deteksi bot sederhana ---------- */

const BOT_UA =
  /(bot|crawl|spider|slurp|scrap|curl|wget|python|httpx|aiohttp|go-http-client|java\/|okhttp|libwww|headless|phantomjs|puppeteer|playwright|selenium|scrapy|node-fetch|axios|undici|postman|insomnia)/i;

export function looksLikeBot(ua: string | null) {
  return !ua || ua.length < 20 || BOT_UA.test(ua);
}

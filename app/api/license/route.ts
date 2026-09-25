import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, looksLikeBot, SESSION_COOKIE, SESSION_DAYS, verifyLicense } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (looksLikeBot(req.headers.get("user-agent"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  // Cegah tebak-tebakan kode: 8 percobaan per 10 menit per IP.
  const rl = rateLimit(`license:${ip}`, 8, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(rl.retryAfter / 60)} menit.` },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.slice(0, 64) : "";
  const license = await verifyLicense(key);
  if (!license) {
    return NextResponse.json({ error: "Kode lisensi tidak valid atau sudah dicabut." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(license.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
}

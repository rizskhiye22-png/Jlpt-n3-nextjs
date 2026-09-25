import { NextResponse, type NextRequest } from "next/server";
import { looksLikeBot, readSessionToken, SESSION_COOKIE } from "@/lib/security";

/**
 * Lapis pertama: blokir bot & pengunjung tanpa lisensi sebelum halaman dirender.
 * Lapis kedua ada di setiap halaman/route (requireSession/guardApi), karena
 * proxy saja tidak boleh jadi satu-satunya pemeriksaan otorisasi.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (looksLikeBot(req.headers.get("user-agent"))) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const session = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/aktivasi/";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/exam/:path*", "/api/questions/:path*", "/api/check/:path*", "/api/img/:path*"],
};

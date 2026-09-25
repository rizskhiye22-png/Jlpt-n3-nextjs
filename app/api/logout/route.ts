import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/security";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/aktivasi/", req.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

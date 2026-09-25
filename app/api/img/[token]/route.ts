import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveImage } from "@/lib/exams";
import { guardApi, NO_STORE } from "@/lib/session-server";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const g = await guardApi("img", 120);
  if (g.error) return g.error;

  const { token } = await ctx.params;
  const file = resolveImage(token);
  if (!file || !/^[\w-]+\.webp$/.test(file)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  const buf = await readFile(path.join(process.cwd(), "private", "img", file));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      ...NO_STORE,
      "Content-Type": "image/webp",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}

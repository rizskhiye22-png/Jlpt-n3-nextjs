import { NextResponse, type NextRequest } from "next/server";
import { getPublicChapter } from "@/lib/exams";
import { guardApi, NO_STORE } from "@/lib/session-server";

export async function GET(req: NextRequest) {
  const g = await guardApi("questions", 20);
  if (g.error) return g.error;

  const exam = req.nextUrl.searchParams.get("exam") ?? "";
  const chapter = req.nextUrl.searchParams.get("chapter") ?? "";
  const data = getPublicChapter(exam, chapter);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  return NextResponse.json(
    { sections: data.sections, watermark: `${g.session.lid.slice(0, 4)}-${g.session.lid.slice(4, 8)}` },
    { headers: NO_STORE },
  );
}

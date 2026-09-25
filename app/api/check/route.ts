import { NextResponse, type NextRequest } from "next/server";
import { getAnswerKey } from "@/lib/exams";
import { guardApi, NO_STORE } from "@/lib/session-server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Kunci jawaban tidak pernah dikirim bersama soal.
 * Klien mengirim jawaban → server mengembalikan hasil + pembahasan untuk soal itu saja.
 * - 1 soal (mode latihan): maks 40 per menit per lisensi
 * - banyak soal (penilaian mode ujian): maks 12 per jam per lisensi
 * - total: maks 3000 permintaan per hari per lisensi
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    exam?: string;
    chapter?: string;
    answers?: Record<string, number>;
  } | null;
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : null;
  const entries = answers ? Object.entries(answers).slice(0, 60) : [];
  if (!entries.length) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });

  const batch = entries.length > 1;
  const g = await guardApi(batch ? "grade" : "check", batch ? 12 : 40, batch ? 3600_000 : 60_000);
  if (g.error) return g.error;
  if (!rateLimit(`day:${g.session.lid}`, 3000, 86400_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  }

  const key = getAnswerKey(String(body?.exam), String(body?.chapter));
  if (!key) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });

  const results: Record<string, { ans: number; explain: string; correct: boolean }> = {};
  for (const [i, choice] of entries) {
    const idx = Number(i);
    const k = key[idx];
    if (!Number.isInteger(idx) || !k || !Number.isInteger(choice)) continue;
    results[idx] = { ans: k.ans, explain: k.explain, correct: k.ans === choice };
  }
  return NextResponse.json({ results }, { headers: NO_STORE });
}

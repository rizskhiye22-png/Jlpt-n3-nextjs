import { notFound } from "next/navigation";
import { Practice } from "@/components/practice";
import { getChapter } from "@/lib/exams";
import { requireSession } from "@/lib/session-server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter } = await params;
  const c = getChapter(slug, chapter);
  return { title: c ? `${c.meta.jp} · ${c.summary.label} — Latihan N3` : "Tidak ditemukan", robots: { index: false } };
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter } = await params;
  await requireSession(`/exam/${slug}/${chapter}/`);
  const c = getChapter(slug, chapter);
  if (!c) notFound();
  // Hanya metadata yang dikirim di HTML; soal diambil lewat API ber-lisensi, kunci jawaban tidak pernah.
  const total = c.chapter.sections.reduce((n, s) => n + s.questions.length, 0);
  return <Practice exam={slug} examLabel={c.summary.label} meta={c.meta} total={total} />;
}

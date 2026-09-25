import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText, Clock, Headphones, Image as ImageIcon, Languages } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChapterStatus } from "@/components/progress-widgets";
import { CHAPTERS } from "@/lib/chapters";
import { getExam } from "@/lib/exams";
import { requireSession } from "@/lib/session-server";

const ICONS = { moji: Languages, bunpou: BookOpenText, choukai: Headphones };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exam = getExam(slug);
  return { title: exam ? `N3 ${exam.summary.label} — Latihan JLPT` : "Tidak ditemukan", robots: { index: false } };
}

export default async function ExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireSession(`/exam/${slug}/`);
  const exam = getExam(slug);
  if (!exam) notFound();
  const { summary, data } = exam;

  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Link href="/#periode" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" /> Semua periode
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <div>
            <p className="font-jp text-sm font-medium text-accent">日本語能力試験 N3</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{summary.label}</h1>
          </div>
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="text-muted">Total soal</dt>
              <dd className="text-2xl font-bold tabular-nums">{summary.total}</dd>
            </div>
            <div>
              <dt className="text-muted">Ilustrasi</dt>
              <dd className="text-2xl font-bold tabular-nums">{summary.images}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {CHAPTERS.map((meta, i) => {
            const ch = data.chapters[i];
            const count = summary.chapters[i].count;
            const Icon = ICONS[meta.slug];
            return (
              <section key={meta.slug} className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="size-5" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                    <Clock className="size-3.5" /> ±{meta.minutes} menit
                  </span>
                </div>
                <h2 className="mt-5 font-jp text-2xl font-bold">{meta.jp}</h2>
                <p className="text-sm font-medium text-muted">
                  {meta.label} · {count} soal
                </p>
                <ul className="mt-5 flex-1 divide-y divide-line border-y border-line text-sm">
                  {ch.sections.map((s) => (
                    <li key={s.section} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="font-jp font-medium">{s.section}</span>
                      <span className="flex items-center gap-2 text-muted">
                        {s.questions.some((q) => q.image) && <ImageIcon className="size-3.5" />}
                        <span className="tabular-nums">{s.questions.length} soal</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 text-sm">
                  <ChapterStatus slug={slug} chapter={meta.slug} count={count} />
                </div>
                <Link
                  href={`/exam/${slug}/${meta.slug}/`}
                  className="group mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-bg transition hover:-translate-y-0.5"
                >
                  Buka bagian ini
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </Link>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

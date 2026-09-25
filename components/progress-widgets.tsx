"use client";

import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { lastSession, useProgressStore } from "@/lib/progress";
import type { ChapterMeta, ChapterSlug } from "@/lib/exams";

const MONTHS: Record<string, string> = { "07": "Juli", "12": "Desember" };

export function ChapterRows({
  slug,
  chapters,
  metas,
}: {
  slug: string;
  chapters: { slug: ChapterSlug; count: number }[];
  metas: ChapterMeta[];
}) {
  const store = useProgressStore();
  return (
    <ul className="space-y-3">
      {chapters.map((c) => {
        const meta = metas.find((m) => m.slug === c.slug)!;
        const p = store[slug]?.[c.slug];
        const answered = p ? Object.keys(p.answers).length : 0;
        const pct = c.count ? Math.round((answered / c.count) * 100) : 0;
        return (
          <li key={c.slug}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="flex items-baseline gap-2">
                <span className="font-jp font-medium text-ink">{meta.jp}</span>
                <span className="text-muted">{meta.label}</span>
              </span>
              <span className="tabular-nums text-muted">
                {p?.finished ? (
                  <span className="font-semibold text-success">
                    {Math.round((p.correct / p.total) * 100)}%
                  </span>
                ) : answered ? (
                  `${answered}/${c.count}`
                ) : (
                  `${c.count} soal`
                )}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${
                  p?.finished ? "bg-success" : "bg-accent"
                }`}
                style={{ width: `${p?.finished ? 100 : pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ContinueCard({ metas }: { metas: ChapterMeta[] }) {
  const store = useProgressStore();
  const last = lastSession(store);
  if (!last || last.p.finished) return null;
  const meta = metas.find((m) => m.slug === last.chapter);
  const [year, month] = last.exam.split("-");
  const answered = Object.keys(last.p.answers).length;
  return (
    <Link
      href={`/exam/${last.exam}/${last.chapter}/`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <History className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted">
          Lanjutkan latihan
        </span>
        <span className="block truncate font-semibold">
          {MONTHS[month]} {year} · <span className="font-jp">{meta?.jp}</span>{" "}
          <span className="font-normal text-muted">
            — {answered}/{last.p.total} dijawab
          </span>
        </span>
      </span>
      <ArrowRight className="size-5 text-muted transition group-hover:translate-x-1 group-hover:text-accent" />
    </Link>
  );
}

export function ChapterStatus({ slug, chapter, count }: { slug: string; chapter: string; count: number }) {
  const store = useProgressStore();
  const p = store[slug]?.[chapter];
  if (!p) return <span className="text-muted">Belum dimulai</span>;
  if (p.finished)
    return (
      <span className="font-semibold text-success">
        Selesai · {p.correct}/{p.total} benar
      </span>
    );
  return (
    <span className="font-semibold text-accent">
      Sedang berjalan · {Object.keys(p.answers).length}/{count}
    </span>
  );
}

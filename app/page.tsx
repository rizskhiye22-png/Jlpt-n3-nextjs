import Link from "next/link";
import { ArrowRight, BookOpenText, Headphones, KeyRound, Languages, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChapterRows, ContinueCard } from "@/components/progress-widgets";
import { getExamList, getTotals } from "@/lib/exams";
import { CHAPTERS } from "@/lib/chapters";
import { getSession } from "@/lib/session-server";

const ICONS = { moji: Languages, bunpou: BookOpenText, choukai: Headphones };

export default async function Home() {
  const session = await getSession();
  const exams = getExamList();
  const totals = getTotals();
  const latest = exams[0];

  return (
    <div className="relative overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <nav className="flex items-center gap-2">
          <a
            href="#periode"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:text-ink sm:block"
          >
            Periode
          </a>
          <a
            href="#cara"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:text-ink sm:block"
          >
            Cara pakai
          </a>
          <Link
            href="/aktivasi/"
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              session
                ? "border border-line bg-surface text-success"
                : "bg-accent text-accent-ink shadow-card hover:-translate-y-0.5"
            }`}
          >
            {session ? <ShieldCheck className="size-4" /> : <KeyRound className="size-4" />}
            {session ? "Lisensi aktif" : "Aktivasi"}
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted shadow-card">
            <Sparkles className="size-3.5 text-accent" />
            {totals.exams} periode · Desember 2019 – Desember 2024
          </span>
          <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Latihan soal asli <span className="text-accent">JLPT N3</span>, tenang dan fokus.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted">
            Kerjakan per bagian, dapat umpan balik langsung beserta pembahasan berbahasa
            Indonesia, lalu lanjutkan kapan saja dari titik terakhir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/exam/${latest.slug}/`}
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-bg shadow-card transition hover:-translate-y-0.5"
            >
              Mulai dari {latest.label}
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#periode"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-semibold transition hover:border-ink/30"
            >
              Lihat semua periode
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {[
              [totals.questions.toLocaleString("id-ID"), "soal"],
              [totals.exams, "periode"],
              [totals.images, "ilustrasi"],
            ].map(([n, l]) => (
              <div key={String(l)}>
                <dt className="text-3xl font-bold tabular-nums tracking-tight">{n}</dt>
                <dd className="mt-1 text-sm text-muted">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Kartu contoh soal */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
          <div className="grain absolute -inset-6 rounded-[2rem] opacity-60" />
          <div className="absolute -right-2 -top-4 rotate-6 rounded-3xl border border-line bg-surface-2 p-6 opacity-70 shadow-card sm:-right-6">
            <div className="h-40 w-64" />
          </div>
          <div className="relative rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-accent-soft px-3 py-1 font-jp text-xs font-bold text-accent">
                問題1 · 文字・語彙
              </span>
              <span className="text-xs font-medium tabular-nums text-muted">1 / 35</span>
            </div>
            <p className="mt-6 font-jp text-2xl leading-relaxed">
              この国の人は<span className="u-target">自然</span>を大切にしている。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 font-jp">
              {["しぜん", "じぜん", "しせん", "じせん"].map((o, i) => (
                <div
                  key={o}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-[15px] ${
                    i === 0
                      ? "border-success bg-success-soft font-semibold text-success"
                      : "border-line text-muted"
                  }`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-md text-xs font-bold ${
                      i === 0 ? "bg-success text-white" : "bg-surface-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {o}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-surface-2 p-4 text-sm leading-relaxed text-muted">
              <span className="font-semibold text-ink">Pembahasan · </span>
              Kanji「自然」(alam) dibaca「しぜん」.
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 grid size-24 rotate-[-12deg] place-items-center rounded-full border-[3px] border-accent/80 font-serif-jp text-2xl font-semibold text-accent/90 sm:-left-8">
            合格
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mb-10 empty:hidden">
          <ContinueCard metas={CHAPTERS} />
        </div>

        <section id="periode" className="scroll-mt-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-jp text-sm font-medium text-accent">試験を選ぶ</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight">Pilih periode ujian</h2>
            </div>
            <p className="max-w-sm text-sm text-muted">
              Progres tersimpan otomatis di perangkat ini untuk setiap bagian.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((e, i) => (
              <Link
                key={e.slug}
                href={`/exam/${e.slug}/`}
                className="group relative flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:border-ink/20"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {e.monthLabel}
                    </p>
                    <p className="mt-1 text-5xl font-extrabold tabular-nums tracking-tight">
                      {e.year}
                    </p>
                  </div>
                  {i === 0 ? (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-ink">
                      Terbaru
                    </span>
                  ) : (
                    <span className="font-serif-jp text-2xl text-line transition group-hover:text-accent/40">
                      {e.month === "07" ? "夏" : "冬"}
                    </span>
                  )}
                </div>
                <div className="mt-6 flex-1">
                  <ChapterRows slug={e.slug} chapters={e.chapters} metas={CHAPTERS} />
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
                  <span className="tabular-nums">
                    {e.total} soal · {e.images} ilustrasi
                  </span>
                  <ArrowRight className="size-4 transition group-hover:translate-x-1 group-hover:text-accent" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="cara" className="mt-24 scroll-mt-8">
          <p className="font-jp text-sm font-medium text-accent">使い方</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight">Cara pakai</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CHAPTERS.map((c, i) => {
              const Icon = ICONS[c.slug];
              return (
                <div key={c.slug} className="rounded-3xl border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-muted">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-jp text-lg font-bold">{c.jp}</h3>
                  <p className="text-sm font-medium text-muted">
                    {c.label} · ±{c.minutes} menit
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{c.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid gap-5 rounded-3xl border border-line bg-surface-2 p-6 text-sm leading-relaxed text-muted md:grid-cols-3">
            <p>
              <span className="font-semibold text-ink">Mode Latihan</span> — jawaban langsung
              dicek, pembahasan muncul setelah memilih.
            </p>
            <p>
              <span className="font-semibold text-ink">Mode Ujian</span> — ada timer, nilai dan
              pembahasan dibuka di akhir.
            </p>
            <p>
              <span className="font-semibold text-ink">Pintasan</span> — tekan{" "}
              <kbd className="rounded border border-line bg-surface px-1.5 font-sans text-xs">1</kbd>–
              <kbd className="rounded border border-line bg-surface px-1.5 font-sans text-xs">4</kbd>{" "}
              untuk memilih, <kbd className="rounded border border-line bg-surface px-1.5 font-sans text-xs">←</kbd>{" "}
              <kbd className="rounded border border-line bg-surface px-1.5 font-sans text-xs">→</kbd> untuk
              berpindah soal.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:px-6">
          <Brand compact />
          <p>Konten dilindungi lisensi. Audio 聴解 tidak disertakan.</p>
        </div>
      </footer>
    </div>
  );
}

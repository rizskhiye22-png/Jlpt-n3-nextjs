"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  Flag,
  Grid3x3,
  Headphones,
  LoaderCircle,
  Maximize2,
  RotateCcw,
  Timer,
  X,
  Zap,
} from "lucide-react";
import type { ChapterMeta } from "@/lib/chapters";
import { clearProgress, getProgress, saveProgress, type ChapterProgress, type Mode } from "@/lib/progress";
import { RichText } from "@/components/rich-text";
import { ThemeToggle } from "@/components/theme-toggle";

type PQ = {
  num: string;
  id: string;
  q: string;
  opts: string[];
  cat: string;
  passage?: string[];
  image?: string;
};
type PSection = { section: string; instruction: string; passage?: string[]; questions: PQ[] };
type Result = { ans: number; explain: string; correct: boolean };
type Item = PQ & { sIdx: number; section: string; instruction: string; passageText?: string[] };
type Phase = "loading" | "intro" | "quiz" | "result";

const CAT_LABEL: Record<string, string> = {
  もじ: "文字・語彙",
  ぶんぽう: "文法",
  どっかい: "読解",
  ちょうかい: "聴解",
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function optionLabel(opt: string, hasImage: boolean) {
  const m = opt.match(/^(選択肢|イラスト|Ilustrasi)\s*(\d)$/);
  if (!m) return { text: opt, hint: null as string | null };
  return { text: `Pilihan ${m[2]}`, hint: hasImage ? "lihat gambar" : "dari audio" };
}

export function Practice({
  exam,
  examLabel,
  meta,
  total,
}: {
  exam: string;
  examLabel: string;
  meta: ChapterMeta;
  total: number;
}) {
  const [sections, setSections] = useState<PSection[] | null>(null);
  const [watermark, setWatermark] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<Mode>("practice");
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<number, Result>>({});
  const [elapsed, setElapsed] = useState(0);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [saved, setSaved] = useState<ChapterProgress | undefined>();
  const [onlyWrong, setOnlyWrong] = useState(false);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  /* ---------- Muat soal (lewat API ber-lisensi) ---------- */
  useEffect(() => {
    let alive = true;
    fetch(`/api/questions/?exam=${exam}&chapter=${meta.slug}`, { credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = `/aktivasi/?next=${encodeURIComponent(location.pathname)}`;
          return;
        }
        if (!r.ok) throw new Error(r.status === 429 ? "Terlalu banyak permintaan. Tunggu sebentar lalu muat ulang." : "Gagal memuat soal.");
        const d = await r.json();
        if (!alive) return;
        setSections(d.sections);
        setWatermark(d.watermark);
        const p = getProgress(exam, meta.slug);
        setSaved(p);
        setPhase("intro");
      })
      .catch((e) => alive && setLoadError(e.message));
    return () => {
      alive = false;
    };
  }, [exam, meta.slug]);

  const items: Item[] = useMemo(() => {
    if (!sections) return [];
    return sections.flatMap((s, sIdx) =>
      s.questions.map((q) => ({
        ...q,
        sIdx,
        section: s.section,
        instruction: s.instruction,
        passageText: q.passage ?? s.passage,
      })),
    );
  }, [sections]);

  const item = items[idx];
  const reviewing = phase === "quiz" && Object.keys(results).length === items.length && Boolean(saved?.finished);
  const revealed = (i: number) => Boolean(results[i]) && (mode === "practice" || phase === "result" || reviewing);
  const answeredCount = Object.keys(answers).length;

  /* ---------- Timer ---------- */
  useEffect(() => {
    if (phase !== "quiz" || reviewing) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase, reviewing]);

  /* ---------- Simpan progres ---------- */
  const persist = useCallback(
    (patch?: Partial<ChapterProgress>) => {
      const correct = Object.values(results).filter((r) => r.correct).length;
      const p: ChapterProgress & { results?: Record<number, Result> } = {
        mode,
        answers,
        index: idx,
        elapsed: elapsedRef.current,
        finished: false,
        correct,
        total: items.length || total,
        updatedAt: Date.now(),
        results,
        ...patch,
      };
      saveProgress(exam, meta.slug, p);
      setSaved(p);
    },
    [answers, exam, idx, items.length, meta.slug, mode, results, total],
  );

  useEffect(() => {
    if (phase === "quiz" && !reviewing) persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, results, idx]);

  /* ---------- Aksi ---------- */
  function start(m: Mode, resume: boolean) {
    setMode(m);
    if (resume && saved) {
      const s = saved as ChapterProgress & { results?: Record<number, Result> };
      setAnswers(s.answers ?? {});
      setResults(s.results ?? {});
      setIdx(Math.min(s.index ?? 0, items.length - 1));
      setElapsed(s.elapsed ?? 0);
      setMode(s.mode);
    } else {
      clearProgress(exam, meta.slug);
      setSaved(undefined);
      setAnswers({});
      setResults({});
      setIdx(0);
      setElapsed(0);
    }
    setOnlyWrong(false);
    setPhase("quiz");
  }

  async function check(payload: Record<number, number>) {
    const r = await fetch("/api/check/", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam, chapter: meta.slug, answers: payload }),
    });
    if (r.status === 429) throw new Error("Terlalu cepat — tunggu sebentar sebelum menjawab lagi.");
    if (r.status === 401) {
      window.location.href = "/aktivasi/";
      throw new Error("Sesi berakhir.");
    }
    if (!r.ok) throw new Error("Gagal memeriksa jawaban.");
    return (await r.json()).results as Record<number, Result>;
  }

  async function choose(choice: number) {
    if (!item || phase !== "quiz" || reviewing) return;
    if (mode === "practice") {
      if (results[idx] || checking) return;
      setAnswers((a) => ({ ...a, [idx]: choice }));
      setChecking(true);
      try {
        const res = await check({ [idx]: choice });
        setResults((r) => ({ ...r, ...res }));
      } catch (e) {
        setAnswers((a) => {
          const n = { ...a };
          delete n[idx];
          return n;
        });
        showToast((e as Error).message);
      } finally {
        setChecking(false);
      }
    } else {
      setAnswers((a) => ({ ...a, [idx]: choice }));
    }
  }

  async function finish() {
    const missing: Record<number, number> = {};
    items.forEach((_, i) => {
      if (!results[i]) missing[i] = answers[i] ?? 0;
    });
    let all = results;
    if (Object.keys(missing).length) {
      setChecking(true);
      try {
        all = { ...results, ...(await check(missing)) };
        setResults(all);
      } catch (e) {
        showToast((e as Error).message);
        setChecking(false);
        return;
      }
      setChecking(false);
    }
    const correct = Object.values(all).filter((r) => r.correct).length;
    const prevBest = saved?.best ?? 0;
    const p = {
      mode,
      answers,
      index: idx,
      elapsed: elapsedRef.current,
      finished: true,
      correct,
      total: items.length,
      best: Math.max(prevBest, correct),
      updatedAt: Date.now(),
      results: all,
    };
    saveProgress(exam, meta.slug, p);
    setSaved(p);
    setNavOpen(false);
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function go(to: number) {
    if (to < 0 || to >= items.length) return;
    setDir(to > idx ? 1 : -1);
    setIdx(to);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextWrong(from: number, step: 1 | -1) {
    for (let i = from + step; i >= 0 && i < items.length; i += step) if (!results[i]?.correct) return i;
    return -1;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  /* ---------- Pintasan keyboard ---------- */
  useEffect(() => {
    if (phase !== "quiz") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (zoom) {
        if (e.key === "Escape") setZoom(null);
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= (item?.opts.length ?? 0)) choose(n);
      else if (e.key === "ArrowRight" || e.key === "Enter") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function step(d: 1 | -1) {
    if (reviewing && onlyWrong) {
      const t = nextWrong(idx, d);
      if (t >= 0) go(t);
      return;
    }
    go(idx + d);
  }

  /* ---------- Render ---------- */
  if (loadError)
    return (
      <Shell exam={exam} examLabel={examLabel} meta={meta}>
        <div className="mx-auto mt-24 max-w-md rounded-3xl border border-line bg-surface p-8 text-center">
          <p className="font-semibold">{loadError}</p>
          <button onClick={() => location.reload()} className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">
            Muat ulang
          </button>
        </div>
      </Shell>
    );

  if (phase === "loading" || !sections)
    return (
      <Shell exam={exam} examLabel={examLabel} meta={meta}>
        <div className="mx-auto mt-10 max-w-3xl space-y-4 px-4">
          {[120, 60, 220].map((h, i) => (
            <div key={i} className="animate-pulse rounded-3xl bg-surface-2" style={{ height: h }} />
          ))}
        </div>
      </Shell>
    );

  if (phase === "intro")
    return (
      <Shell exam={exam} examLabel={examLabel} meta={meta}>
        <Intro meta={meta} examLabel={examLabel} total={items.length} sections={sections} saved={saved} onStart={start} onReview={() => {
          const s = saved as ChapterProgress & { results?: Record<number, Result> };
          setAnswers(s.answers ?? {});
          setResults(s.results ?? {});
          setMode(s.mode);
          setElapsed(s.elapsed);
          setPhase("result");
        }} />
      </Shell>
    );

  if (phase === "result")
    return (
      <Shell exam={exam} examLabel={examLabel} meta={meta}>
        <ResultView
          items={items}
          sections={sections}
          results={results}
          elapsed={elapsed}
          meta={meta}
          exam={exam}
          onReview={(wrong) => {
            setOnlyWrong(wrong);
            setSaved((s) => (s ? { ...s, finished: true } : s));
            const first = wrong ? nextWrong(-1, 1) : 0;
            setIdx(Math.max(0, first));
            setPhase("quiz");
          }}
          onRetry={(m) => start(m, false)}
        />
      </Shell>
    );

  /* ---------- Quiz ---------- */
  const isRevealed = revealed(idx);
  const res = results[idx];
  const chosen = answers[idx];
  const progress = reviewing ? 100 : (answeredCount / items.length) * 100;

  return (
    <Shell
      exam={exam}
      examLabel={examLabel}
      meta={meta}
      progress={progress}
      right={
        <>
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted sm:inline-flex">
            {reviewing ? (
              <>
                <Check className="size-3.5" /> Tinjauan
              </>
            ) : mode === "practice" ? (
              <>
                <Zap className="size-3.5 text-accent" /> Latihan
              </>
            ) : (
              <>
                <Timer className="size-3.5 text-accent" /> Ujian
              </>
            )}
          </span>
          {!reviewing && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold tabular-nums">
              <Clock className="size-3.5 text-muted" />
              {fmtTime(elapsed)}
              {mode === "exam" && <span className="text-muted">/ {meta.minutes}:00</span>}
            </span>
          )}
          <button
            onClick={() => setNavOpen(true)}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface lg:hidden"
            aria-label="Daftar soal"
          >
            <Grid3x3 className="size-4" />
          </button>
        </>
      }
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[1fr_280px]">
        <div
          className="protected min-w-0"
          onCopy={(e) => {
            e.preventDefault();
            showToast("Menyalin konten soal dinonaktifkan.");
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={item.passageText ? "grid gap-6 xl:grid-cols-2" : "mx-auto max-w-3xl"}
            >
              {item.passageText && (
                <aside className="scrollbar-thin relative rounded-3xl border border-line bg-surface p-6 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto sm:p-8">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Bacaan</p>
                  <div className="space-y-4 font-jp text-[16.5px] leading-[2.05]">
                    {item.passageText.map((para, i) => (
                      <p key={i} className={i === 0 && para.length < 40 ? "font-bold" : ""}>
                        <RichText text={para} highlight={item.num} />
                      </p>
                    ))}
                  </div>
                  <Watermark text={watermark} />
                </aside>
              )}

              <article className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
                <Watermark text={watermark} />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent-soft px-3 py-1 font-jp text-xs font-bold text-accent">{item.section}</span>
                    <span className="rounded-full bg-surface-2 px-3 py-1 font-jp text-xs font-medium text-muted">
                      {CAT_LABEL[item.cat] ?? item.cat}
                    </span>
                    <span className="ml-auto text-sm font-semibold tabular-nums text-muted">
                      {idx + 1}
                      <span className="font-normal"> / {items.length}</span>
                    </span>
                  </div>
                  <p className="mt-4 font-jp text-[13px] leading-relaxed text-muted">{item.instruction}</p>

                  {meta.slug === "choukai" && (
                    <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-line px-3.5 py-2.5 text-[13px] text-muted">
                      <Headphones className="mt-0.5 size-4 shrink-0 text-accent" />
                      Putar audio resmi soal nomor {item.num}, lalu pilih jawabannya di sini.
                    </p>
                  )}

                  {item.image && (
                    <button
                      onClick={() => setZoom(item.image!)}
                      className="group relative mt-5 block w-full overflow-hidden rounded-2xl border border-line bg-white"
                      aria-label="Perbesar gambar"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" draggable={false} className="mx-auto max-h-[380px] w-auto select-none object-contain p-3" />
                      <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-ink/70 text-bg opacity-0 transition group-hover:opacity-100">
                        <Maximize2 className="size-4" />
                      </span>
                    </button>
                  )}

                  <h2 className="mt-6 font-jp text-xl font-medium leading-[1.9] sm:text-2xl sm:leading-[1.8]">
                    <span className="mr-2 text-muted">{item.num}.</span>
                    {/^\d{1,2}$/.test(item.q.trim()) ? (
                      <span>
                        Isi rumpang{" "}
                        <span className="rounded-md bg-accent px-2 py-0.5 font-sans text-accent-ink">{item.q.trim()}</span>{" "}
                        pada bacaan
                      </span>
                    ) : (
                      <RichText text={item.q} />
                    )}
                  </h2>

                  <div className={`mt-6 grid gap-2.5 ${item.opts.every((o) => o.length <= 12) ? "sm:grid-cols-2" : ""}`}>
                    {item.opts.map((opt, i) => {
                      const n = i + 1;
                      const { text, hint } = optionLabel(opt, Boolean(item.image));
                      const isChosen = chosen === n;
                      const isCorrect = isRevealed && res?.ans === n;
                      const isWrong = isRevealed && isChosen && !res?.correct;
                      const dim = isRevealed && !isCorrect && !isWrong;
                      return (
                        <motion.button
                          key={i}
                          whileTap={!isRevealed ? { scale: 0.985 } : undefined}
                          onClick={() => choose(n)}
                          disabled={checking || (mode === "practice" && Boolean(results[idx])) || Boolean(reviewing)}
                          className={`group relative flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left font-jp text-[16px] transition ${
                            isCorrect
                              ? "border-success bg-success-soft text-success"
                              : isWrong
                                ? "border-danger bg-danger-soft text-danger"
                                : isChosen
                                  ? "border-accent bg-accent-soft"
                                  : "border-line hover:border-ink/25 hover:bg-surface-2"
                          } ${dim ? "opacity-55" : ""}`}
                        >
                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-lg font-sans text-sm font-bold transition ${
                              isCorrect
                                ? "bg-success text-white"
                                : isWrong
                                  ? "bg-danger text-white"
                                  : isChosen
                                    ? "bg-accent text-accent-ink"
                                    : "bg-surface-2 text-muted group-hover:text-ink"
                            }`}
                          >
                            {isCorrect ? <Check className="size-4" /> : isWrong ? <X className="size-4" /> : n}
                          </span>
                          <span className="min-w-0 flex-1">
                            <RichText text={text} />
                            {hint && <span className="ml-2 font-sans text-xs text-muted">({hint})</span>}
                          </span>
                          {checking && isChosen && <LoaderCircle className="size-4 animate-spin text-muted" />}
                        </motion.button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {isRevealed && res && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className={`rounded-2xl border p-5 ${res.correct ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft"}`}>
                          <p className={`flex items-center gap-2 text-sm font-bold ${res.correct ? "text-success" : "text-danger"}`}>
                            {res.correct ? <Check className="size-4" /> : <X className="size-4" />}
                            {res.correct ? "Benar!" : chosen ? `Kurang tepat — jawaban benar: ${res.ans}` : `Tidak dijawab — jawaban benar: ${res.ans}`}
                          </p>
                          {res.explain && <p className="mt-2 text-[15px] leading-relaxed text-ink/85">{res.explain}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigator (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Navigator items={items} idx={idx} answers={answers} results={results} revealed={revealed} onGo={go} />
            {!reviewing ? (
              <button
                onClick={finish}
                disabled={checking}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold transition hover:border-ink/30 disabled:opacity-50"
              >
                <Flag className="size-4" /> Selesai & lihat nilai
              </button>
            ) : (
              <button onClick={() => setPhase("result")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-3 text-sm font-semibold">
                <ChevronLeft className="size-4" /> Kembali ke hasil
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Bar bawah */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={() => step(-1)}
            disabled={idx === 0}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Sebelumnya</span>
          </button>
          <p className="hidden text-xs text-muted md:block">
            <kbd className="rounded border border-line bg-surface px-1.5">1</kbd>–<kbd className="rounded border border-line bg-surface px-1.5">4</kbd> pilih ·{" "}
            <kbd className="rounded border border-line bg-surface px-1.5">←</kbd> <kbd className="rounded border border-line bg-surface px-1.5">→</kbd> pindah
          </p>
          {idx === items.length - 1 && !reviewing ? (
            <button
              onClick={finish}
              disabled={checking}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink shadow-card transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              {checking ? <LoaderCircle className="size-4 animate-spin" /> : <Flag className="size-4" />} Selesai
            </button>
          ) : (
            <button
              onClick={() => step(1)}
              disabled={idx === items.length - 1}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg transition hover:-translate-y-0.5 disabled:opacity-40"
            >
              {reviewing && onlyWrong ? "Salah berikutnya" : "Berikutnya"} <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigator (mobile) */}
      <AnimatePresence>
        {navOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setNavOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="scrollbar-thin absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-bg p-5 pb-8"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
              <Navigator items={items} idx={idx} answers={answers} results={results} revealed={revealed} onGo={go} />
              {!reviewing && (
                <button onClick={finish} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink">
                  <Flag className="size-4" /> Selesai & lihat nilai
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom gambar */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={zoom}
              alt=""
              draggable={false}
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              className="max-h-[90dvh] max-w-full select-none rounded-2xl bg-white p-3"
            />
            <button className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Tutup">
              <X className="size-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg shadow-card"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

/* ================== Sub-komponen ================== */

function Shell({
  exam,
  examLabel,
  meta,
  progress,
  right,
  children,
}: {
  exam: string;
  examLabel: string;
  meta: ChapterMeta;
  progress?: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            href={`/exam/${exam}/`}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition hover:text-ink"
            aria-label="Kembali"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-jp text-[15px] font-bold">{meta.jp}</p>
            <p className="truncate text-xs text-muted">
              N3 · {examLabel} · {meta.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {right}
            <ThemeToggle />
          </div>
        </div>
        {progress !== undefined && (
          <div className="h-[3px] bg-surface-2">
            <motion.div className="h-full bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

function Watermark({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.035] dark:opacity-[0.05]">
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-14 font-mono text-sm font-bold">
        {Array.from({ length: 120 }, (_, i) => (
          <span key={i}>N3·{text}</span>
        ))}
      </div>
    </div>
  );
}

function Navigator({
  items,
  idx,
  answers,
  results,
  revealed,
  onGo,
}: {
  items: Item[];
  idx: number;
  answers: Record<number, number>;
  results: Record<number, Result>;
  revealed: (i: number) => boolean;
  onGo: (i: number) => void;
}) {
  const groups: { section: string; list: number[] }[] = [];
  items.forEach((it, i) => {
    const g = groups[groups.length - 1];
    if (g && g.section === it.section) g.list.push(i);
    else groups.push({ section: it.section, list: [i] });
  });
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <p className="text-sm font-bold">Daftar soal</p>
      <div className="mt-4 space-y-4">
        {groups.map((g) => (
          <div key={g.section}>
            <p className="mb-2 font-jp text-xs font-medium text-muted">{g.section}</p>
            <div className="grid grid-cols-6 gap-1.5">
              {g.list.map((i) => {
                const r = revealed(i) ? results[i] : undefined;
                const cls = r
                  ? r.correct
                    ? "border-success bg-success text-white"
                    : "border-danger bg-danger text-white"
                  : answers[i]
                    ? "border-ink/20 bg-surface-2 text-ink"
                    : "border-line text-muted hover:border-ink/30";
                return (
                  <button
                    key={i}
                    onClick={() => onGo(i)}
                    className={`aspect-square rounded-lg border text-xs font-semibold tabular-nums transition ${cls} ${
                      i === idx ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""
                    }`}
                  >
                    {items[i].num}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Intro({
  meta,
  examLabel,
  total,
  sections,
  saved,
  onStart,
  onReview,
}: {
  meta: ChapterMeta;
  examLabel: string;
  total: number;
  sections: PSection[];
  saved?: ChapterProgress;
  onStart: (m: Mode, resume: boolean) => void;
  onReview: () => void;
}) {
  const [mode, setMode] = useState<Mode>("practice");
  const inProgress = saved && !saved.finished && Object.keys(saved.answers).length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl px-4 py-12 sm:py-16"
    >
      <p className="text-sm font-semibold text-accent">{examLabel}</p>
      <h1 className="mt-2 font-jp text-4xl font-bold tracking-tight sm:text-5xl">{meta.jp}</h1>
      <p className="mt-2 text-lg text-muted">
        {meta.label} · {total} soal · ±{meta.minutes} menit
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {sections.map((s) => (
          <span key={s.section} className="rounded-full border border-line bg-surface px-3 py-1.5 font-jp text-xs text-muted">
            {s.section} <span className="font-sans font-semibold text-ink">· {s.questions.length}</span>
          </span>
        ))}
      </div>

      {saved?.finished && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-success/30 bg-success-soft p-5">
          <div>
            <p className="text-sm font-semibold text-success">Sudah selesai</p>
            <p className="text-2xl font-bold tabular-nums">
              {saved.correct}/{saved.total} benar
            </p>
          </div>
          <button onClick={onReview} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg">
            Lihat hasil
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["practice", Zap, "Mode Latihan", "Jawaban langsung dicek + pembahasan."],
            ["exam", Timer, "Mode Ujian", `Timer ${meta.minutes} menit, nilai di akhir.`],
          ] as const
        ).map(([m, Icon, title, desc]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === m ? "border-accent bg-accent-soft ring-4 ring-accent/10" : "border-line bg-surface hover:border-ink/25"
            }`}
          >
            <Icon className={`size-5 ${mode === m ? "text-accent" : "text-muted"}`} />
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {inProgress ? (
          <>
            <button
              onClick={() => onStart(saved!.mode, true)}
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink shadow-card transition hover:-translate-y-0.5"
            >
              Lanjutkan ({Object.keys(saved!.answers).length}/{total})
              <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => onStart(mode, false)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3.5 text-sm font-semibold"
            >
              <RotateCcw className="size-4" /> Mulai ulang
            </button>
          </>
        ) : (
          <button
            onClick={() => onStart(mode, false)}
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-ink shadow-card transition hover:-translate-y-0.5"
          >
            {saved?.finished ? "Kerjakan lagi" : "Mulai"}
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ResultView({
  items,
  sections,
  results,
  elapsed,
  meta,
  exam,
  onReview,
  onRetry,
}: {
  items: Item[];
  sections: PSection[];
  results: Record<number, Result>;
  elapsed: number;
  meta: ChapterMeta;
  exam: string;
  onReview: (onlyWrong: boolean) => void;
  onRetry: (m: Mode) => void;
}) {
  const correct = Object.values(results).filter((r) => r.correct).length;
  const pct = Math.round((correct / items.length) * 100);
  const R = 54;
  const C = 2 * Math.PI * R;
  const verdict = pct >= 80 ? "Luar biasa!" : pct >= 60 ? "Bagus, pertahankan." : pct >= 40 ? "Hampir sampai." : "Terus berlatih.";

  const bySection = sections.map((s, sIdx) => {
    const idxs = items.map((it, i) => (it.sIdx === sIdx ? i : -1)).filter((i) => i >= 0);
    const ok = idxs.filter((i) => results[i]?.correct).length;
    return { section: s.section, ok, total: idxs.length };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-card sm:p-10">
        <div className="flex flex-col items-center gap-8 sm:flex-row">
          <div className="relative size-40 shrink-0">
            <svg viewBox="0 0 128 128" className="size-full -rotate-90">
              <circle cx="64" cy="64" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
              <motion.circle
                cx="64"
                cy="64"
                r={R}
                fill="none"
                stroke={pct >= 60 ? "var(--success)" : "var(--accent)"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - pct / 100) }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-4xl font-extrabold tabular-nums">{pct}%</p>
                <p className="text-xs text-muted">
                  {correct}/{items.length} benar
                </p>
              </div>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <p className="font-jp text-sm font-medium text-accent">{meta.jp} · 結果</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{verdict}</h1>
            <p className="mt-2 text-muted">
              Waktu: <span className="font-semibold tabular-nums text-ink">{fmtTime(elapsed)}</span>
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          {bySection.map((s) => (
            <div key={s.section}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-jp font-medium">{s.section}</span>
                <span className="tabular-nums text-muted">
                  {s.ok}/{s.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  className="h-full rounded-full bg-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.ok / s.total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <button onClick={() => onReview(true)} disabled={correct === items.length} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-ink disabled:opacity-40">
            <X className="size-4" /> Tinjau yang salah
          </button>
          <button onClick={() => onReview(false)} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold">
            Tinjau semua
          </button>
          <button onClick={() => onRetry("practice")} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold">
            <RotateCcw className="size-4" /> Ulangi
          </button>
          <Link href={`/exam/${exam}/`} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-muted hover:text-ink">
            Bagian lain <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

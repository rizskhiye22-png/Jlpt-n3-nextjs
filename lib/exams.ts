import "server-only";
import { createHmac } from "node:crypto";
import { CHAPTERS, type ChapterSlug } from "@/lib/chapters";
import e2024_12 from "@/data/N3-12-2024.json";
import e2024_07 from "@/data/N3-07-2024.json";
import e2023_12 from "@/data/N3-12-2023.json";
import e2023_07 from "@/data/N3-07-2023.json";
import e2022_12 from "@/data/N3-12-2022.json";
import e2022_07 from "@/data/N3-07-2022.json";
import e2021_12 from "@/data/N3-12-2021.json";
import e2020_12 from "@/data/N3-12-2020.json";
import e2019_12 from "@/data/N3-12-2019.json";

export type { ChapterSlug, ChapterMeta } from "@/lib/chapters";

export type Question = {
  num: string;
  id: string;
  q: string;
  opts: string[];
  ans: number;
  cat: string;
  explain?: string;
  passage?: string[];
  image?: string;
};

export type Section = {
  section: string;
  instruction: string;
  questions: Question[];
  passage?: string[];
};

export type Chapter = { chapter: string; sections: Section[] };

export type ExamData = { period: string; title: string; chapters: Chapter[] };

const MONTHS: Record<string, string> = { "07": "Juli", "12": "Desember" };

type Raw = { slug: string; data: ExamData };

const RAW: Raw[] = [
  { slug: "2024-12", data: e2024_12 as ExamData },
  { slug: "2024-07", data: e2024_07 as ExamData },
  { slug: "2023-12", data: e2023_12 as ExamData },
  { slug: "2023-07", data: e2023_07 as ExamData },
  { slug: "2022-12", data: e2022_12 as ExamData },
  { slug: "2022-07", data: e2022_07 as ExamData },
  { slug: "2021-12", data: e2021_12 as ExamData },
  { slug: "2020-12", data: e2020_12 as ExamData },
  { slug: "2019-12", data: e2019_12 as ExamData },
];

export type ExamSummary = {
  slug: string;
  year: string;
  month: string;
  monthLabel: string;
  label: string;
  total: number;
  images: number;
  chapters: { slug: ChapterSlug; count: number }[];
};

function countQuestions(ch: Chapter) {
  return ch.sections.reduce((n, s) => n + s.questions.length, 0);
}

export function getExamList(): ExamSummary[] {
  return RAW.map(({ slug, data }) => {
    const [year, month] = slug.split("-");
    const chapters = CHAPTERS.map((meta, i) => ({
      slug: meta.slug,
      count: data.chapters[i] ? countQuestions(data.chapters[i]) : 0,
    }));
    const images = data.chapters
      .flatMap((c) => c.sections)
      .flatMap((s) => s.questions)
      .filter((q) => q.image).length;
    return {
      slug,
      year,
      month,
      monthLabel: MONTHS[month] ?? month,
      label: `${MONTHS[month] ?? month} ${year}`,
      total: chapters.reduce((n, c) => n + c.count, 0),
      images,
      chapters,
    };
  });
}

export function getExam(slug: string) {
  const raw = RAW.find((r) => r.slug === slug);
  if (!raw) return null;
  const summary = getExamList().find((e) => e.slug === slug)!;
  return { summary, data: raw.data };
}

export function getChapter(slug: string, chapter: string) {
  const exam = getExam(slug);
  const index = CHAPTERS.findIndex((c) => c.slug === chapter);
  if (!exam || index < 0) return null;
  return {
    summary: exam.summary,
    meta: CHAPTERS[index],
    chapter: exam.data.chapters[index],
  };
}

export function getTotals() {
  const list = getExamList();
  return {
    exams: list.length,
    questions: list.reduce((n, e) => n + e.total, 0),
    images: list.reduce((n, e) => n + e.images, 0),
  };
}

/** Versi soal untuk browser: TANPA kunci jawaban dan pembahasan. */
export type PublicQuestion = Omit<Question, "ans" | "explain" | "image"> & { image?: string };
export type PublicSection = { section: string; instruction: string; passage?: string[]; questions: PublicQuestion[] };

export function getPublicChapter(slug: string, chapter: string) {
  const c = getChapter(slug, chapter);
  if (!c) return null;
  const sections: PublicSection[] = c.chapter.sections.map((s) => ({
    section: s.section,
    instruction: s.instruction,
    passage: s.passage,
    questions: s.questions.map((q) => ({
      num: q.num,
      id: q.id,
      q: q.q,
      opts: q.opts,
      cat: q.cat,
      passage: q.passage,
      // Gambar hanya lewat route ber-otentikasi, nama file disamarkan.
      image: q.image ? `/api/img/${imageToken(q.image)}/` : undefined,
    })),
  }));
  return { summary: c.summary, meta: c.meta, sections };
}

/** Kunci jawaban per indeks datar (urut section → question). Hanya dipakai di server. */
export function getAnswerKey(slug: string, chapter: string) {
  const c = getChapter(slug, chapter);
  if (!c) return null;
  return c.chapter.sections.flatMap((s) => s.questions.map((q) => ({ ans: q.ans, explain: q.explain ?? "" })));
}

const IMAGE_MAP = new Map<string, string>();
function imageToken(path: string) {
  const file = path.split("/").pop()!;
  // Nama file asli disamarkan dengan HMAC agar URL gambar tidak bisa ditebak/diurutkan.
  const token = createHmac("sha256", process.env.SESSION_SECRET ?? "dev-secret")
    .update(file)
    .digest("base64url")
    .slice(0, 22);
  IMAGE_MAP.set(token, file);
  return token;
}

export function resolveImage(token: string) {
  if (IMAGE_MAP.size === 0) {
    for (const r of RAW)
      for (const ch of r.data.chapters)
        for (const s of ch.sections) for (const q of s.questions) if (q.image) imageToken(q.image);
  }
  return IMAGE_MAP.get(token) ?? null;
}

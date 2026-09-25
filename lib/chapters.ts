export type ChapterSlug = "moji" | "bunpou" | "choukai";

export type ChapterMeta = {
  slug: ChapterSlug;
  jp: string;
  label: string;
  romaji: string;
  desc: string;
  minutes: number;
};

export const CHAPTERS: ChapterMeta[] = [
  {
    slug: "moji",
    jp: "文字・語彙",
    label: "Kosakata",
    romaji: "Moji · Goi",
    desc: "Cara baca kanji, penulisan, dan makna kata.",
    minutes: 30,
  },
  {
    slug: "bunpou",
    jp: "文法・読解",
    label: "Tata Bahasa & Membaca",
    romaji: "Bunpō · Dokkai",
    desc: "Pola kalimat, susunan ★, dan pemahaman bacaan.",
    minutes: 70,
  },
  {
    slug: "choukai",
    jp: "聴解",
    label: "Mendengar",
    romaji: "Chōkai",
    desc: "Ilustrasi situasi, pilihan respons, dan tanggapan.",
    minutes: 40,
  },
];

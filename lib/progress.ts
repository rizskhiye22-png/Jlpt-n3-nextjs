"use client";

import { useSyncExternalStore } from "react";

export type Mode = "practice" | "exam";

export type ChapterProgress = {
  mode: Mode;
  answers: Record<number, number>;
  index: number;
  elapsed: number;
  finished: boolean;
  correct: number;
  total: number;
  best?: number;
  /** Hasil yang sudah dibuka server (hanya untuk soal yang sudah dijawab). */
  results?: Record<number, { ans: number; explain: string; correct: boolean }>;
  updatedAt: number;
};

type Store = Record<string, Record<string, ChapterProgress>>;

const KEY = "n3-progress-v1";
const listeners = new Set<() => void>();
let cache: Store | null = null;
let cacheRaw: string | null = null;

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cacheRaw && cache) return cache;
    cacheRaw = raw;
    cache = raw ? (JSON.parse(raw) as Store) : {};
    return cache;
  } catch {
    return cache ?? {};
  }
}

function write(store: Store) {
  cache = store;
  try {
    const raw = JSON.stringify(store);
    cacheRaw = raw;
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* penyimpanan tidak tersedia: tetap jalan di memori */
  }
  listeners.forEach((l) => l());
}

export function getProgress(exam: string, chapter: string): ChapterProgress | undefined {
  return read()[exam]?.[chapter];
}

export function saveProgress(exam: string, chapter: string, p: ChapterProgress) {
  const store = { ...read() };
  store[exam] = { ...(store[exam] ?? {}), [chapter]: p };
  write(store);
}

export function clearProgress(exam: string, chapter: string) {
  const store = { ...read() };
  if (store[exam]) {
    const rest = { ...store[exam] };
    delete rest[chapter];
    store[exam] = rest;
  }
  write(store);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: Store = {};

export function useProgressStore(): Store {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function lastSession(store: Store) {
  let best: { exam: string; chapter: string; p: ChapterProgress } | null = null;
  for (const [exam, chapters] of Object.entries(store)) {
    for (const [chapter, p] of Object.entries(chapters)) {
      if (!best || p.updatedAt > best.p.updatedAt) best = { exam, chapter, p };
    }
  }
  return best;
}

import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { LicenseForm } from "@/components/license-form";
import { getSession } from "@/lib/session-server";

export const metadata = { title: "Aktivasi Lisensi — Latihan JLPT N3", robots: { index: false } };

export default async function AktivasiPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="grid flex-1 place-items-center px-4 pb-20">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-line bg-surface p-7 shadow-card sm:p-9">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              {session ? <ShieldCheck className="size-6" /> : <KeyRound className="size-6" />}
            </span>
            {session ? (
              <>
                <h1 className="mt-6 text-2xl font-bold tracking-tight">Lisensi aktif</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Perangkat ini sudah terhubung dengan lisensi{" "}
                  <span className="font-mono font-semibold text-ink">
                    {session.lid.slice(0, 4)}-{session.lid.slice(4, 8)}-····
                  </span>
                  , berlaku sampai{" "}
                  {new Date(session.exp).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={safeNext}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-bg"
                  >
                    Lanjut belajar
                  </Link>
                  <form action="/api/logout/" method="post">
                    <button className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-muted transition hover:text-ink">
                      <LogOut className="size-4" /> Keluar
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-6 text-2xl font-bold tracking-tight">Masukkan kode lisensi</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Soal dan pembahasan hanya bisa dibuka dengan lisensi yang valid.
                </p>
                <LicenseForm next={safeNext} />
              </>
            )}
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            Lisensi bersifat pribadi. Setiap sesi ditandai dengan ID lisensi Anda.
          </p>
        </div>
      </main>
    </div>
  );
}

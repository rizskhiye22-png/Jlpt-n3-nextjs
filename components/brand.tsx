import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative grid size-10 place-items-center rounded-xl bg-accent font-serif-jp text-[15px] font-semibold text-accent-ink shadow-card transition group-hover:rotate-[-4deg]">
        N3
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight">Latihan JLPT</span>
          <span className="block font-jp text-xs text-muted">日本語能力試験 N3</span>
        </span>
      )}
    </Link>
  );
}

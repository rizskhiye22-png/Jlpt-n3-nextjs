"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";

function formatKey(v: string) {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 26);
  const body = raw.startsWith("N3") ? raw.slice(2) : raw;
  const groups = body.match(/.{1,4}/g) ?? [];
  return raw.length ? ["N3", ...groups].join("-") : "";
}

export function LicenseForm({ next }: { next: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/license/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Aktivasi gagal.");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktivasi gagal.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7">
      <label htmlFor="key" className="text-xs font-semibold uppercase tracking-wider text-muted">
        Kode lisensi
      </label>
      <input
        id="key"
        value={key}
        onChange={(e) => setKey(formatKey(e.target.value))}
        placeholder="N3-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
        autoComplete="off"
        spellCheck={false}
        className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3.5 font-mono text-[15px] tracking-wider outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/15"
      />
      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <button
        disabled={loading || key.replace(/-/g, "").length !== 26}
        className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink shadow-card transition enabled:hover:-translate-y-0.5 disabled:opacity-50"
      >
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Aktifkan
        {!loading && <ArrowRight className="size-4 transition group-hover:translate-x-1" />}
      </button>
    </form>
  );
}

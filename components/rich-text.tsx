import { Fragment, type ReactNode } from "react";

/** Mengubah `@@kata@@` menjadi kata bergaris bawah dan menjaga baris baru. */
export function RichText({ text, highlight }: { text: string; highlight?: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {renderLine(line, highlight)}
        </Fragment>
      ))}
    </>
  );
}

function renderLine(line: string, highlight?: string): ReactNode[] {
  const parts = line.split(/(@@[^@]+@@)/g);
  return parts.flatMap((part, i): ReactNode[] => {
    if (part.startsWith("@@") && part.endsWith("@@")) {
      return [
        <span key={i} className="u-target">
          {part.slice(2, -2)}
        </span>,
      ];
    }
    return markBlanks(part, i, highlight);
  });
}

/** Menandai nomor rumpang di bacaan, mis. （54） atau " 19 ". */
function markBlanks(text: string, key: number, highlight?: string): ReactNode[] {
  const re = /(（\d{1,2}）|\s\d{2}\s)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const n = m[0].replace(/[（）\s]/g, "");
    const active = highlight === n;
    out.push(
      <span
        key={`${key}-${m.index}`}
        className={`mx-0.5 inline-flex min-w-8 items-center justify-center rounded-md border px-1.5 text-[0.8em] font-semibold tabular-nums align-[0.1em] ${
          active
            ? "border-accent bg-accent text-accent-ink"
            : "border-line bg-surface-2 text-muted"
        }`}
      >
        {n}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

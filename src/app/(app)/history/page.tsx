import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "History",
};

export default function HistoryPage() {
  return (
    <section aria-labelledby="history-heading" className="mx-auto max-w-lg">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
        History
      </p>
      <h1 id="history-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        Brew History
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--muted)]">
        Brew sessions will appear here after the brewing flow is implemented.
      </p>
    </section>
  );
}

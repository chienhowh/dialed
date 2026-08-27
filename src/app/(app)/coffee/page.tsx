import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coffee",
};

export default function CoffeePage() {
  return (
    <section aria-labelledby="coffee-heading" className="mx-auto max-w-lg">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
        Coffee
      </p>
      <h1 id="coffee-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        My Coffee
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--muted)]">
        Coffee management is intentionally deferred to a later milestone.
      </p>
    </section>
  );
}

import Link from "next/link";

export default function BrewPlanNotFound() {
  return (
    <section className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Brew Plan not found</h1>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">It may not exist, or it may belong to another account.</p>
      <Link className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-[var(--accent)] px-5 font-semibold text-white" href="/coffee">Back to My Coffee</Link>
    </section>
  );
}

import Link from "next/link";

export default function CoffeeNotFound() {
  return (
    <section className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-2xl font-semibold">Coffee not found</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">This coffee does not exist or is not available to your account.</p>
      <Link className="mt-7 inline-flex min-h-11 items-center font-semibold text-[var(--accent)]" href="/coffee">Back to My Coffee</Link>
    </section>
  );
}

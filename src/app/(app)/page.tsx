export default function HomePage() {
  return (
    <section aria-labelledby="home-heading" className="mx-auto max-w-lg">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
        Home
      </p>
      <h1 id="home-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        What are you brewing today?
      </h1>
      <p className="mt-4 max-w-md text-base leading-7 text-[var(--muted)]">
        The application foundation is ready. Coffee and dial-in features will arrive in later milestones.
      </p>
    </section>
  );
}

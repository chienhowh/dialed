import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <section aria-labelledby="settings-heading" className="mx-auto max-w-lg">
      <p className="text-xs font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
        Settings
      </p>
      <h1 id="settings-heading" className="mt-3 text-3xl font-semibold tracking-tight">
        Settings
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--muted)]">
        Account and application preferences are not part of Milestone 1.
      </p>
    </section>
  );
}

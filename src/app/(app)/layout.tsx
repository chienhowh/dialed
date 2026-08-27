import { AppShell } from "@/components/ui/app-shell";

export const dynamic = "force-dynamic";

export default function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}

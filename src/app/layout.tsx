import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { getAppUrl } from "@/lib/env";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getAppUrl(),
  applicationName: "Dialed",
  title: {
    default: "Dialed",
    template: "%s · Dialed",
  },
  description: "A coffee brewing assistant for dialing in better cups.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dialed",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f3ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

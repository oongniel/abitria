import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/fraunces/full.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/elements/AppShell";
import { ToastProvider } from "@/components/ui/toast";
import { themeScript } from "@/components/ui/theme-toggle";
import { InventoryProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: { default: "Abitria", template: "%s · Abitria" },
  description: "Perfume stock and profit, batch by batch.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3F7" },
    { media: "(prefers-color-scheme: dark)", color: "#121015" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <InventoryProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </InventoryProvider>
      </body>
    </html>
  );
}

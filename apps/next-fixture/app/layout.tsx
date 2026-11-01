import "@boltronx/react-ui/styles.css";

import type { ReactNode } from "react";

import { ColorSchemeScript } from "@boltronx/react-ui";

export const metadata = { title: "react-ui Next.js fixture" };

// A Server Component. The script sets data-theme on <html> before React hydrates, hence
// suppressHydrationWarning.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}

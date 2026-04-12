import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.auth.url),
  title: "FunnelScout",
  description: "AI-powered sales pipeline intelligence for GHL agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-fs-bg text-fs-primary font-sans">
        {children}
      </body>
    </html>
  );
}

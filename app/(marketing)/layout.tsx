import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.auth.url),
  title: {
    default:
      "FunnelScout — weekly pipeline intelligence for GoHighLevel agencies",
    template: "%s · FunnelScout",
  },
  description:
    "Connect GHL once. Each week see per-client health, stalled deals, and prioritized revenue moves—built for lean agencies.",
  applicationName: "FunnelScout",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FunnelScout",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh flex-col bg-fs-bg">
      <header className="border-b border-fs-border px-6 py-4 sm:px-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="fs-text-subheading font-semibold text-fs-primary no-underline"
          >
            FunnelScout
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="fs-text-small text-fs-secondary no-underline hover:text-fs-muted"
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="fs-text-small text-fs-secondary no-underline hover:text-fs-muted"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="fs-btn-primary fs-text-caption px-4 py-2 no-underline"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}

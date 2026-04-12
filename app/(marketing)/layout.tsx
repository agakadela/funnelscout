import Link from "next/link";
import type { ReactNode } from "react";

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
            className="no-underline"
            style={{
              fontSize: "var(--font-size-subheading)",
              fontWeight: 600,
              color: "var(--color-fs-primary)",
            }}
          >
            FunnelScout
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-fs-secondary no-underline hover:text-fs-muted"
              style={{ fontSize: "var(--font-size-small)" }}
            >
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="text-fs-secondary no-underline hover:text-fs-muted"
              style={{ fontSize: "var(--font-size-small)" }}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="fs-btn-primary px-4 py-2 no-underline"
              style={{ fontSize: "var(--font-size-caption)" }}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-fs-border px-6 py-10 sm:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 text-fs-faded sm:flex-row sm:items-center sm:justify-between">
          <p style={{ fontSize: "var(--font-size-caption)" }}>
            © {new Date().getFullYear()} FunnelScout
          </p>
          <div
            className="flex gap-4"
            style={{ fontSize: "var(--font-size-caption)" }}
          >
            <Link href="/pricing" className="text-fs-faded hover:text-fs-amber">
              Pricing
            </Link>
            <Link href="/sign-in" className="text-fs-faded hover:text-fs-amber">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

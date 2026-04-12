import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-fs-border px-6 py-10 sm:px-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-fs-faded sm:flex-row sm:items-center sm:justify-between">
        <p className="fs-text-caption">
          © {new Date().getFullYear()} FunnelScout
        </p>
        <div className="fs-text-caption flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/pricing" className="hover:text-fs-amber">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-fs-amber">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-fs-amber">
            Terms
          </Link>
          <Link href="/sign-in" className="hover:text-fs-amber">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}

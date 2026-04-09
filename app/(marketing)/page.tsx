import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-24">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <p className="fs-label">FUNNELSCOUT</p>
        <h1 className="text-balance">
          Pipeline intelligence for{" "}
          <span className="fs-hero-highlight">GoHighLevel</span> agencies
        </h1>
        <p
          className="max-w-md text-fs-secondary"
          style={{ fontSize: "var(--font-size-body)" }}
        >
          Connect GHL, ingest opportunity events, and get weekly AI
          recommendations with logged cost per run.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

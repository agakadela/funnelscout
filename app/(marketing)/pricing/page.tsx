import Link from "next/link";

import { PricingTable } from "@/components/marketing/PricingTable";

export default function PricingPage() {
  return (
    <div className="flex min-h-full flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <p className="fs-label mb-4">PRICING</p>
        <h2 className="mb-10">Plans for small agencies</h2>
        <PricingTable />
        <p
          className="mt-10 text-center text-fs-faded"
          style={{ fontSize: "var(--font-size-caption)" }}
        >
          <Link href="/" className="text-fs-amber hover:text-fs-amber-hover">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

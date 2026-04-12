import Link from "next/link";

import { PricingTable } from "@/components/marketing/PricingTable";

export default function PricingPage() {
  return (
    <div className="flex min-h-full flex-col px-6 py-16 sm:px-12">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10 text-center">
          <p className="fs-label mb-2">PRICING</p>
          <h2 className="mx-auto max-w-2xl text-balance tracking-tight">
            Plans that fit small agencies
          </h2>
        </header>
        <PricingTable />
        <p className="fs-text-caption mt-10 text-center text-fs-faded">
          <Link href="/" className="text-fs-amber hover:text-fs-amber-hover">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

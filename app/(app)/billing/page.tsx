import Link from "next/link";

export default function BillingPage() {
  return (
    <div className="px-8 py-10">
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview /</p>
          <h1 className="fs-page-title text-fs-primary">Billing</h1>
          <p className="fs-breadcrumb">
            Manage your subscription and invoices.
          </p>
        </div>
      </header>
      <div className="fs-card mt-6 p-8">
        <p className="fs-text-body mb-4 text-fs-secondary">
          Subscription management UI is not wired yet. Start or change a plan
          from pricing.
        </p>
        <Link
          href="/pricing"
          className="fs-btn-primary inline-block px-5 py-2.5"
        >
          View pricing
        </Link>
      </div>
    </div>
  );
}

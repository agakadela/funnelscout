import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "Draft terms for using FunnelScout: subscription, acceptable use, integrations, and limitations.",
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="px-6 py-16 sm:px-12">
      <article className="mx-auto max-w-3xl">
        <p className="fs-label mb-2">LEGAL · DRAFT</p>
        <h1 className="mb-4">Terms of service</h1>
        <p className="fs-text-caption mb-10 text-fs-faded">
          This page is a non-binding draft for portfolio and early access. It is
          not legal advice. Replace with counsel-approved terms before charging
          customers or making binding commitments.
        </p>

        <section className="mb-10">
          <h2 className="mb-3">The service</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            FunnelScout provides software that connects to GoHighLevel, ingests
            opportunity-related events, and produces periodic analysis and
            recommendations for agencies you control. Features and availability
            may change as the product evolves.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">Accounts and billing</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            Paid plans are billed through Stripe. Subscription status and limits
            (such as how many sub-accounts you may connect) are enforced in the
            product. You are responsible for keeping billing and account details
            accurate.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">Acceptable use</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            You may use FunnelScout only where you have the right to access the
            underlying GHL data, and only for lawful business purposes. Do not
            attempt to probe, disrupt, or bypass security controls, or use the
            service to build a competing scraper of third-party systems.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">Third parties</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            Integrations (GHL, Stripe, Resend, Anthropic, Inngest, hosting,
            monitoring) are subject to those providers&apos; terms and outages.
            FunnelScout does not control GoHighLevel availability, webhook
            delivery semantics, or model output.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">Disclaimers</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            Analysis output is informational and may be incomplete or incorrect.
            It is not financial, legal, or professional advice. You remain
            responsible for decisions you make for your agency and your clients.
          </p>
        </section>

        <section>
          <h2 className="mb-3">Limitation of liability</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            To the maximum extent permitted by law, the service is provided as
            is. Final liability caps and remedy language belong in a
            lawyer-reviewed agreement for your jurisdiction and customer base.
          </p>
        </section>
      </article>
    </div>
  );
}

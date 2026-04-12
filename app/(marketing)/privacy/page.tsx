import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How FunnelScout handles agency data, subprocessors (GHL, Stripe, Resend, Anthropic), and your choices.",
  alternates: {
    canonical: "/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="px-6 py-16 sm:px-12">
      <article className="mx-auto max-w-3xl">
        <p className="fs-label mb-2">LEGAL · DRAFT</p>
        <h1 className="mb-4">Privacy policy</h1>
        <p className="fs-text-caption mb-10 text-fs-faded">
          This page is a non-binding draft for portfolio and early access. It is
          not legal advice. Before production launch, have qualified counsel
          review your privacy disclosures and data processing agreements.
        </p>

        <section className="mb-10">
          <h2 className="mb-3">What we collect</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            Account details you provide at sign-up (such as name, email, and
            organization name), billing metadata from Stripe, and pipeline data
            that flows from your connected GoHighLevel workspace (for example
            opportunity events and related identifiers needed to run analyses).
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">How we use it</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            We use this information to operate the product: authenticate you,
            run scheduled and on-demand analyses, send product emails (such as
            weekly digests) via Resend, and enforce plan limits. We do not sell
            personal data.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">Subprocessors and transfers</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            FunnelScout relies on third-party services you would expect in a
            SaaS stack: GoHighLevel for OAuth and webhook data from your agency,
            Stripe for payments, Resend for email delivery, Anthropic for model
            inference, Inngest for background jobs, your hosting provider for
            runtime and logs, and (when configured) Sentry for error monitoring.
            Data may be processed in regions where those vendors operate. High
            level descriptions here do not replace vendor DPAs or your own
            client-facing policies.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3">Retention and security</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            We store data only as long as needed to provide the service and meet
            legal obligations. GHL access tokens are encrypted at rest. Access
            to production systems should follow least privilege; details belong
            in your internal security documentation.
          </p>
        </section>

        <section>
          <h2 className="mb-3">Contact</h2>
          <p className="fs-text-body-relaxed text-fs-secondary">
            For privacy requests, use the support channel published on your
            deployment once available. This placeholder does not list personal
            contact details.
          </p>
        </section>
      </article>
    </div>
  );
}

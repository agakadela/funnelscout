import Link from "next/link";

import { Hero } from "@/components/marketing/Hero";
import { LandingReportPreview } from "@/components/marketing/LandingReportPreview";
import { PricingTable } from "@/components/marketing/PricingTable";

const STEPS = [
  {
    n: "01",
    title: "Connect once, see every client",
    body: "Link your GoHighLevel agency in a minute. Sub-accounts roll in automatically—no spreadsheets, no one-off setup for each brand you manage.",
  },
  {
    n: "02",
    title: "A weekly pulse on every pipeline",
    body: "As your team works deals, FunnelScout keeps a clean weekly picture of movement, stalls, and momentum—so you are never guessing from a static export.",
  },
  {
    n: "03",
    title: "Priorities you can act on Monday",
    body: "Each client gets a short brief: health at a glance, where revenue is leaking, and a handful of concrete moves—written for busy owners, not engineers.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "I finally see which accounts need love before Monday standup. That top-of-report snapshot paid for itself in week one.",
    author: "Jordan M.",
    meta: "Agency owner · 9 clients",
  },
  {
    quote:
      "The recommendations read like something I would send a client—specific, calm, and confident. The impact line keeps us honest about what we ship first.",
    author: "Sam K.",
    meta: "Agency owner · 6 clients",
  },
  {
    quote:
      "Plans line up with how we package GHL retainers. When we outgrew our tier, upgrading felt like flipping a switch—no drama for finance or clients.",
    author: "Riley T.",
    meta: "Agency owner · 12 clients",
  },
] as const;

export default function MarketingHomePage() {
  return (
    <main>
      <Hero />

      <section className="fs-section">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mx-auto max-w-3xl">
            <p className="fs-label mb-8">HOW IT WORKS</p>
            {STEPS.map((step, index) => (
              <div
                key={step.n}
                className={`flex gap-10 ${index < STEPS.length - 1 ? "border-b border-fs-border pb-12" : ""}`}
              >
                <p className="fs-step-number">{step.n}</p>
                <div className="min-w-0 pt-2">
                  <h3 className="mb-2">{step.title}</h3>
                  <p className="fs-text-body-relaxed text-fs-secondary">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-section">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10 text-center">
            <p className="fs-label mb-2">WHAT YOU GET</p>
            <h2 className="mx-auto max-w-2xl text-balance tracking-tight">
              A report that tells you what to do—not just what happened.
            </h2>
          </header>
          <LandingReportPreview />
        </div>
      </section>

      <section className="fs-section">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10 text-center">
            <p className="fs-label mb-2">FROM AGENCY OWNERS</p>
            <h2 className="mx-auto max-w-2xl text-balance tracking-tight">
              Trusted by lean GHL shops
            </h2>
          </header>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="fs-testimonial">
                <div className="fs-stars" aria-hidden>
                  ★★★★★
                </div>
                <p className="fs-text-small-relaxed text-fs-muted">
                  {t.quote}
                </p>
                <div className="mt-auto flex items-center gap-3">
                  <div className="fs-text-caption flex h-10 w-10 items-center justify-center rounded-full border border-fs-border bg-fs-surface-2 font-mono text-fs-primary">
                    {t.author
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="fs-text-small text-fs-primary">{t.author}</p>
                    <p className="fs-text-caption text-fs-faded">
                      {t.meta}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fs-section">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-10 text-center">
            <p className="fs-label mb-2">PRICING</p>
            <h2 className="mx-auto max-w-2xl text-balance tracking-tight">
              Simple plans. Cancel anytime.
            </h2>
          </header>
          <PricingTable />
        </div>
      </section>

      <section className="fs-section">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="fs-label mb-2">READY</p>
          <h2 className="mx-auto mb-6 max-w-2xl text-balance tracking-tight">
            Start your first week with clearer priorities
          </h2>
          <Link
            href="/sign-up"
            className="fs-btn-primary inline-block px-8 py-3 no-underline"
          >
            Create your workspace
          </Link>
          <p className="fs-text-caption-tight mx-auto mt-4 max-w-md text-fs-faded">
            Free to connect. No credit card required.
          </p>
        </div>
      </section>
    </main>
  );
}

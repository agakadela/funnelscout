import Link from "next/link";

export function Hero() {
  return (
    <section className="px-6 pb-20 pt-16 text-center sm:px-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <p className="fs-pill-amber mb-5 inline-flex">BUILT FOR GHL AGENCIES</p>
        <h1 className="fs-hero-title mx-auto max-w-160 text-balance">
          Know which clients need attention{" "}
          <span className="fs-hero-highlight">before</span> revenue slips away
        </h1>
        <p className="fs-text-body-relaxed mx-auto mt-6 max-w-xl text-fs-secondary">
          Connect GoHighLevel once. Each week you get a concise read per
          client—what moved, what stalled, and a short list of high-impact
          moves, with numbers next to the actions that matter.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="fs-btn-primary px-6 py-3 no-underline"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="fs-btn-outline px-6 py-3 no-underline"
            >
              View pricing
            </Link>
          </div>
          <p className="fs-text-caption-tight max-w-md text-center text-fs-faded">
            No credit card. 5-minute setup. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}

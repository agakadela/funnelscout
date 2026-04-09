export function PricingTable() {
  return (
    <div className="fs-pricing-card grid gap-6 md:grid-cols-3">
      {["Starter", "Agency", "Pro"].map((tier) => (
        <div key={tier} className="fs-pricing-card rounded-card p-7">
          <p className="fs-label mb-2">{tier}</p>
          <p
            className="text-fs-secondary"
            style={{ fontSize: "var(--font-size-small)" }}
          >
            Details TBD.
          </p>
        </div>
      ))}
    </div>
  );
}

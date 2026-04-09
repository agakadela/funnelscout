type AccountDrilldownProps = {
  locationId: string;
};

export function AccountDrilldown({ locationId }: AccountDrilldownProps) {
  return (
    <div className="fs-card p-8">
      <p className="fs-tag mb-4" style={{ color: "var(--color-fs-secondary)" }}>
        ACCOUNT
      </p>
      <p
        className="text-fs-secondary"
        style={{ fontSize: "var(--font-size-small)" }}
      >
        Location <span className="text-fs-primary font-mono">{locationId}</span>{" "}
        — drill-down UI ships in later tasks.
      </p>
    </div>
  );
}

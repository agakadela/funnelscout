type HealthTier = "green" | "yellow" | "red";

const badgeClass: Record<HealthTier, string> = {
  green: "fs-health-badge-green",
  yellow: "fs-health-badge-yellow",
  red: "fs-health-badge-red",
};

const dotClass: Record<HealthTier, string> = {
  green: "bg-fs-green",
  yellow: "bg-fs-yellow",
  red: "bg-fs-red",
};

export function HealthScoreBadge({
  score,
  tier,
}: {
  score: number;
  tier: HealthTier;
}) {
  return (
    <div className={`fs-health-badge ${badgeClass[tier]}`}>
      <span className={`fs-dot ${dotClass[tier]}`} />
      <span className="font-mono font-semibold">{score}</span>
      <span className="text-fs-secondary" style={{ fontSize: "10px" }}>
        health
      </span>
    </div>
  );
}

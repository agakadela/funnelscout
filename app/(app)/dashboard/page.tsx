import { AgencyOverview } from "@/components/dashboard/AgencyOverview";

export default function DashboardPage() {
  return (
    <div>
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview</p>
          <h3>Agency overview</h3>
        </div>
      </header>
      <div className="p-8">
        <AgencyOverview />
      </div>
    </div>
  );
}

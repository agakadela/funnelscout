import { AccountDrilldown } from "@/components/dashboard/AccountDrilldown";

type AccountPageProps = {
  params: Promise<{ locationId: string }>;
};

export default async function AccountPage({ params }: AccountPageProps) {
  const { locationId } = await params;

  return (
    <div>
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview / Accounts /</p>
          <h3>Account {locationId}</h3>
        </div>
      </header>
      <div className="p-8">
        <AccountDrilldown locationId={locationId} />
      </div>
    </div>
  );
}

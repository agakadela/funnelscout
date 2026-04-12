export default function SettingsPage() {
  return (
    <div className="px-8 py-10">
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview /</p>
          <h1
            className="text-fs-primary"
            style={{ fontSize: "var(--font-size-heading)", fontWeight: 700 }}
          >
            Settings
          </h1>
          <p className="fs-breadcrumb">Workspace preferences</p>
        </div>
      </header>
      <div className="fs-card mt-6 p-8">
        <p
          className="text-fs-secondary"
          style={{ fontSize: "var(--font-size-body)" }}
        >
          Organization settings will live here (notifications, digest schedule,
          team members).
        </p>
      </div>
    </div>
  );
}

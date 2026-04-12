export default function AnalysisHistoryPage() {
  return (
    <div className="px-8 py-10">
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview /</p>
          <h1 className="fs-page-title text-fs-primary">Analysis history</h1>
          <p className="fs-breadcrumb">
            Cross-account timeline is coming soon.
          </p>
        </div>
      </header>
      <div className="fs-card mt-6 p-8">
        <p className="fs-text-body text-fs-secondary">
          Per-client runs and history stay on each account page for now. This
          view will aggregate completed analyses across all sub-accounts.
        </p>
      </div>
    </div>
  );
}

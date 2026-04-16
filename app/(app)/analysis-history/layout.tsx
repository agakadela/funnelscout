import type { ReactNode } from "react";

export default function AnalysisHistoryLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="px-8 py-10">
      <header className="fs-page-header">
        <div>
          <p className="fs-breadcrumb">Overview /</p>
          <h1 className="fs-page-title text-fs-primary">Analysis history</h1>
          <p className="fs-breadcrumb">
            All analysis runs across your connected clients.
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

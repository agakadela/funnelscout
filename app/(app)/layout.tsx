import type { ReactNode } from "react";

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="fs-shell">
      <aside className="fs-sidebar">
        <div
          className="px-5 pb-4 text-fs-primary"
          style={{ fontSize: "var(--font-size-subheading)", fontWeight: 600 }}
        >
          FunnelScout
        </div>
        <p className="fs-sidebar-section">NAV</p>
        <nav className="flex flex-col gap-1 px-3">
          <span className="fs-nav-item-active">Overview</span>
        </nav>
      </aside>
      <div className="fs-main">{children}</div>
    </div>
  );
}

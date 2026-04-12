"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export type SidebarClient = {
  id: string;
  name: string;
  ghlLocationId: string;
  healthTier: "green" | "yellow" | "red";
  healthScore: number;
};

type AppSidebarProps = {
  ghlConnected: boolean;
  clients: SidebarClient[];
  agencyName: string;
  userInitials: string;
  clientCount: number;
};

function dotClass(tier: SidebarClient["healthTier"]): string {
  if (tier === "green") return "bg-fs-green";
  if (tier === "yellow") return "bg-fs-yellow";
  return "bg-fs-red";
}

function clientRowActiveClass(
  tier: SidebarClient["healthTier"],
  active: boolean,
): string {
  if (!active) return "";
  return tier === "green"
    ? "fs-client-row-active-green"
    : "fs-client-row-active";
}

function navClass(active: boolean): string {
  if (active) {
    return "block no-underline fs-nav-item-active";
  }
  return "block no-underline fs-nav-item";
}

export function AppSidebar({
  ghlConnected,
  clients,
  agencyName,
  userInitials,
  clientCount,
}: AppSidebarProps) {
  const pathname = usePathname();

  const overviewActive = pathname === "/dashboard";
  const accountsActive = pathname.startsWith("/accounts");
  const historyActive = pathname.startsWith("/analysis-history");
  const billingActive = pathname.startsWith("/billing");
  const settingsActive = pathname.startsWith("/settings");

  function lockWhenNoGhl(content: ReactNode) {
    if (ghlConnected) {
      return content;
    }
    return (
      <span
        className="fs-nav-item block cursor-not-allowed opacity-[0.35]"
        aria-disabled
      >
        {content}
      </span>
    );
  }

  return (
    <aside className="fs-sidebar">
      <div className="flex items-center gap-2 px-5 pb-4">
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none" aria-hidden>
          <path d="M3 5 L25 5 L18 15 L10 15 Z" fill="var(--color-fs-amber)" />
          <rect
            x="11"
            y="15"
            width="6"
            height="5"
            fill="var(--color-fs-amber)"
            opacity="0.7"
          />
          <circle cx="14" cy="24" r="3" fill="var(--color-fs-amber)" />
        </svg>
        <span
          className="text-fs-primary"
          style={{
            fontSize: "15px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          FunnelScout
        </span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        <Link href="/dashboard" className={navClass(overviewActive)}>
          Overview
        </Link>
        {ghlConnected ? (
          <Link
            href="/dashboard"
            className={navClass(accountsActive && !overviewActive)}
          >
            Accounts
          </Link>
        ) : (
          lockWhenNoGhl("Accounts")
        )}
        {ghlConnected ? (
          <Link href="/analysis-history" className={navClass(historyActive)}>
            Analysis history
          </Link>
        ) : (
          lockWhenNoGhl("Analysis history")
        )}
        {ghlConnected ? (
          <Link href="/billing" className={navClass(billingActive)}>
            Billing
          </Link>
        ) : (
          lockWhenNoGhl("Billing")
        )}
        {ghlConnected ? (
          <Link href="/settings" className={navClass(settingsActive)}>
            Settings
          </Link>
        ) : (
          lockWhenNoGhl("Settings")
        )}
      </nav>

      <hr className="mx-3 my-4 border-fs-border" />

      <p className="fs-sidebar-section">Clients</p>
      <div className="flex max-h-[min(52vh,520px)] flex-col gap-px overflow-y-auto px-3 pb-4">
        {!ghlConnected ? (
          <p
            className="px-3 leading-relaxed text-fs-faded"
            style={{ fontSize: "var(--font-size-caption)" }}
          >
            No clients yet. Connect GHL to import your accounts.
          </p>
        ) : clients.length === 0 ? (
          <p
            className="px-3 text-fs-faded"
            style={{ fontSize: "var(--font-size-caption)" }}
          >
            No clients yet
          </p>
        ) : (
          clients.map((c) => {
            const href = `/accounts/${c.ghlLocationId}`;
            const active = pathname === href;
            const rowClass = `fs-client-row ${clientRowActiveClass(c.healthTier, active)}`;
            return (
              <Link
                key={c.id}
                href={href}
                className={rowClass}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`min-w-0 truncate ${c.healthTier === "red" ? "font-medium text-fs-red" : "text-fs-primary"}`}
                  style={{ fontSize: "var(--font-size-caption)" }}
                >
                  {c.name}
                </span>
                <span className={`fs-dot shrink-0 ${dotClass(c.healthTier)}`} />
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-auto flex gap-3 border-t border-fs-border px-5 pt-4">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-fs-primary"
          style={{
            backgroundColor: "var(--color-fs-surface-2)",
            border: "1px solid var(--color-fs-border)",
            fontSize: "11px",
            fontWeight: 600,
          }}
        >
          {userInitials}
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-fs-primary"
            style={{ fontSize: "11px", fontWeight: 500 }}
          >
            {agencyName}
          </p>
          <p
            className="font-mono text-fs-faded"
            style={{ fontSize: "10px", margin: 0 }}
          >
            Workspace · {clientCount} clients
          </p>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";

export function BillingSuccessBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="mb-6 flex items-start justify-between gap-4 rounded-md border border-fs-border bg-fs-green-bg px-4 py-3"
      role="status"
    >
      <p className="fs-text-small text-fs-primary">
        Your subscription is now active!
      </p>
      <button
        type="button"
        className="fs-text-caption shrink-0 text-fs-secondary underline-offset-2 hover:text-fs-primary hover:underline"
        onClick={() => setVisible(false)}
      >
        Dismiss
      </button>
    </div>
  );
}

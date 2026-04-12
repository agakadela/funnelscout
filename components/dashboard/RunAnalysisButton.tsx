"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type RunState = "idle" | "loading" | "success" | "error";

function Spinner() {
  return (
    <svg
      className="inline-block size-3.5 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      className="size-3 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 8l3.5 3.5L13 5"
        stroke="var(--color-fs-green)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      className="size-3 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 5l6 6M11 5l-6 6"
        stroke="var(--color-fs-red)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

type RunAnalysisButtonProps = {
  subAccountId: string | null;
  disabled?: boolean;
  idleLabel?: string;
};

export function RunAnalysisButton({
  subAccountId,
  disabled = false,
  idleLabel = "Run analysis",
}: RunAnalysisButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<RunState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    };
  }, []);

  async function handleRun() {
    if (!subAccountId || disabled) {
      return;
    }
    setMessage(null);
    setState("loading");
    try {
      const res = await fetch("/api/analysis/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subAccountId }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const errText =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Request failed";
        setMessage(errText);
        setState("error");
        return;
      }
      setState("success");
      router.refresh();
      successTimer.current = setTimeout(() => {
        setState("idle");
        setMessage(null);
      }, 2000);
    } catch {
      setMessage("Network error");
      setState("error");
    }
  }

  const isDisabled = disabled || !subAccountId || state === "loading";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        className="fs-run-btn inline-flex items-center gap-2"
        data-state={state}
        disabled={isDisabled}
        onClick={handleRun}
      >
        {state === "idle" && idleLabel}
        {state === "loading" && (
          <>
            <Spinner />
            Analyzing…
          </>
        )}
        {state === "success" && (
          <>
            <IconCheck />
            Done
          </>
        )}
        {state === "error" && (
          <>
            <IconX />
            Failed — retry
          </>
        )}
      </button>
      {message && state === "error" ? (
        <p
          className="max-w-xs text-right text-fs-red"
          style={{ fontSize: "var(--font-size-caption)" }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

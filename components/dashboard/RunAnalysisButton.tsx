"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

type RunState = "idle" | "loading" | "success" | "error";

type LoadingPhase = "queued" | "polling";

const StatusBodySchema = z.object({
  status: z.enum(["pending", "running", "completed", "failed"]),
  errorMessage: z.string().optional(),
});

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
        strokeLinejoin="round"
      />
    </svg>
  );
}

type RunAnalysisButtonProps = {
  subAccountId: string | null;
  disabled?: boolean;
  idleLabel?: string;
};

const POLL_MS = 5000;
const POLL_DEADLINE_MS = 3 * 60 * 1000;

export function RunAnalysisButton({
  subAccountId,
  disabled = false,
  idleLabel = "Run analysis",
}: RunAnalysisButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<RunState>("idle");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("queued");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "muted">("error");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignorePollResultsRef = useRef(false);

  function clearSuccessTimer() {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollDeadlineRef.current) {
      clearTimeout(pollDeadlineRef.current);
      pollDeadlineRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearSuccessTimer();
      stopPolling();
    };
  }, []);

  async function pollOnce(analysisId: string): Promise<boolean> {
    const res = await fetch(
      `/api/analysis/status?id=${encodeURIComponent(analysisId)}`,
      { method: "GET" },
    );
    if (ignorePollResultsRef.current) {
      return false;
    }
    const body: unknown = await res.json().catch(() => null);

    if (ignorePollResultsRef.current) {
      return false;
    }

    if (!res.ok) {
      if (ignorePollResultsRef.current) {
        return false;
      }
      const errText =
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Request failed";
      stopPolling();
      setMessage(errText);
      setMessageTone("error");
      setState("error");
      return true;
    }

    const parsed = StatusBodySchema.safeParse(body);
    if (!parsed.success) {
      if (ignorePollResultsRef.current) {
        return false;
      }
      stopPolling();
      setMessage("Invalid status response");
      setMessageTone("error");
      setState("error");
      return true;
    }

    const { status, errorMessage } = parsed.data;

    if (status === "completed") {
      if (ignorePollResultsRef.current) {
        return false;
      }
      stopPolling();
      setState("success");
      setMessage(null);
      setMessageTone("error");
      router.refresh();
      clearSuccessTimer();
      successTimer.current = setTimeout(() => {
        setState("idle");
      }, 2000);
      return true;
    }

    if (status === "failed") {
      if (ignorePollResultsRef.current) {
        return false;
      }
      stopPolling();
      const detail =
        errorMessage && errorMessage.length > 0
          ? errorMessage
          : "Unknown error";
      setMessage(`Analysis failed: ${detail}`);
      setMessageTone("error");
      setState("error");
      return true;
    }

    return false;
  }

  function startPolling(analysisId: string) {
    stopPolling();
    ignorePollResultsRef.current = false;
    setLoadingPhase("polling");

    void pollOnce(analysisId);

    pollIntervalRef.current = setInterval(() => {
      void pollOnce(analysisId);
    }, POLL_MS);

    pollDeadlineRef.current = setTimeout(() => {
      ignorePollResultsRef.current = true;
      stopPolling();
      setState("idle");
      setLoadingPhase("queued");
      setMessage(
        "Analysis is taking longer than expected. Check back in a few minutes.",
      );
      setMessageTone("muted");
    }, POLL_DEADLINE_MS);
  }

  async function handleRun() {
    if (!subAccountId || disabled) {
      return;
    }
    ignorePollResultsRef.current = true;
    stopPolling();
    clearSuccessTimer();
    setMessage(null);
    setMessageTone("error");
    setState("loading");
    setLoadingPhase("queued");

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
        setMessageTone("error");
        setState("error");
        return;
      }

      const analysisIdParsed = z
        .object({ analysisId: z.string().min(1) })
        .safeParse(body);

      if (!analysisIdParsed.success) {
        setMessage("Invalid trigger response");
        setMessageTone("error");
        setState("error");
        return;
      }

      const { analysisId } = analysisIdParsed.data;
      startPolling(analysisId);
    } catch {
      setMessage("Network error");
      setMessageTone("error");
      setState("error");
    }
  }

  const isDisabled = disabled || !subAccountId || state === "loading";

  const loadingLabel =
    loadingPhase === "queued"
      ? "Analysis queued..."
      : "Analysis in progress...";

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
            {loadingLabel}
          </>
        )}
        {state === "success" && (
          <>
            <IconCheck />
            Analysis ready, refresh to see results
          </>
        )}
        {state === "error" && (
          <>
            <IconX />
            Failed — retry
          </>
        )}
      </button>
      {message ? (
        <p
          className={`fs-text-caption max-w-xs text-right ${
            messageTone === "error" ? "text-fs-red" : "text-fs-secondary"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

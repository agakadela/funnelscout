"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

const SUCCESS_COPY =
  "If an account with that email exists, you'll receive a reset link shortly.";

type ForgotPhase = "idle" | "submitted" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<ForgotPhase>("idle");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("idle");
    setPending(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const res = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });
      if (res.error) {
        setPhase("error");
        setPending(false);
        return;
      }
      setPhase("submitted");
      setPending(false);
    } catch {
      setPhase("error");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">
          Forgot password
        </h1>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {phase === "submitted" ? (
        <p
          className="fs-text-caption mb-6 rounded-md border border-fs-border bg-fs-surface-2 px-3 py-2 text-fs-secondary"
          role="status"
        >
          {SUCCESS_COPY}
        </p>
      ) : null}

      {phase === "error" ? (
        <p
          className="fs-text-caption mb-6 rounded-md border border-fs-red bg-fs-red-bg px-3 py-2 text-fs-red"
          role="alert"
        >
          Something went wrong. Please try again.
        </p>
      ) : null}

      {phase === "submitted" ? (
        <button
          type="button"
          className="fs-btn-outline w-full py-2.5"
          onClick={() => {
            setPhase("idle");
          }}
        >
          Use a different email
        </button>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="fs-input-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="fs-input"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            className="fs-btn-primary w-full py-2.5"
            disabled={pending}
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="fs-text-caption mt-8 text-center text-fs-faded">
        <Link
          href="/sign-in"
          className="text-fs-amber hover:text-fs-amber-hover"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

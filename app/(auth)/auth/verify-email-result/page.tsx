"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { isVerificationLinkError } from "@/lib/auth-errors";
import { useResendVerificationEmail } from "@/hooks/use-resend-verification-email";

function VerifyEmailResultInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  const [resendEmail, setResendEmail] = useState("");

  const resendVerification = useResendVerificationEmail({
    getEmail: () => resendEmail,
    emptyEmailMessage: "Enter the email you used to sign up.",
    successMessage:
      "If an account exists for that address, we sent a new verification link.",
  });

  useEffect(() => {
    if (isVerificationLinkError(errorCode)) {
      return;
    }
    let cancelled = false;
    void (async (): Promise<void> => {
      const sessionRes = await authClient.getSession();
      if (cancelled) {
        return;
      }
      if (sessionRes.error || !sessionRes.data?.session) {
        router.replace("/sign-in");
        return;
      }
      const activeId = sessionRes.data.session.activeOrganizationId ?? null;
      if (!activeId) {
        router.replace("/create-workspace");
        return;
      }
      router.replace("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [errorCode, router]);

  async function onResend(e: React.FormEvent) {
    e.preventDefault();
    await resendVerification.resend();
  }

  if (!isVerificationLinkError(errorCode)) {
    return (
      <div className="w-full max-w-[360px] text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">
          Signing you in…
        </h1>
        <p className="fs-text-small mt-4 text-fs-secondary">
          If nothing happens,{" "}
          <Link
            href="/sign-in"
            className="text-fs-amber hover:text-fs-amber-hover"
          >
            go to sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">
          Verification link expired
        </h1>
        <p className="fs-text-small mt-2 text-fs-secondary">
          This link is no longer valid. Request a new verification email below.
        </p>
      </div>

      <form onSubmit={onResend} className="flex flex-col gap-5">
        <div>
          <label htmlFor="resendEmail" className="fs-input-label">
            Email
          </label>
          <input
            id="resendEmail"
            name="resendEmail"
            type="email"
            autoComplete="email"
            required
            className="fs-input"
            value={resendEmail}
            onChange={(ev) => setResendEmail(ev.target.value)}
          />
        </div>
        {resendVerification.error ? (
          <p className="fs-text-caption text-fs-red" role="alert">
            {resendVerification.error}
          </p>
        ) : null}
        {resendVerification.message ? (
          <p className="fs-text-caption text-fs-secondary" role="status">
            {resendVerification.message}
          </p>
        ) : null}
        <button
          type="submit"
          className="fs-btn-primary w-full py-2.5"
          disabled={resendVerification.pending}
        >
          {resendVerification.pending
            ? "Sending…"
            : "Resend verification email"}
        </button>
      </form>

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

function VerifyEmailResultFallback() {
  return (
    <div className="w-full max-w-[360px] text-center">
      <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
        FunnelScout
      </p>
      <h1 className="fs-auth-screen-title text-fs-primary">Loading…</h1>
    </div>
  );
}

export default function VerifyEmailResultPage() {
  return (
    <Suspense fallback={<VerifyEmailResultFallback />}>
      <VerifyEmailResultInner />
    </Suspense>
  );
}

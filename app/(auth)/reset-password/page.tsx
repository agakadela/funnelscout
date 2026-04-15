"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { resolveResetPasswordPhase } from "@/lib/password-reset-view";

const MIN_PASSWORD_LEN = 8;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorParam = searchParams.get("error");

  const phase = useMemo(
    () =>
      resolveResetPasswordPhase({
        token,
        error: errorParam,
      }),
    [token, errorParam],
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordTooShort, setPasswordTooShort] = useState(false);
  const [passwordsMismatch, setPasswordsMismatch] = useState(false);
  const [linkUnusable, setLinkUnusable] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (phase.type === "missing_token_redirect") {
      router.replace("/forgot-password");
    }
  }, [phase.type, router]);

  const activeToken = phase.type === "ready" ? phase.token : "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setPasswordTooShort(false);
    setPasswordsMismatch(false);

    if (newPassword.length < MIN_PASSWORD_LEN) {
      setPasswordTooShort(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordsMismatch(true);
      return;
    }

    if (!activeToken) {
      setLinkUnusable(true);
      return;
    }

    setPending(true);
    try {
      const res = await authClient.resetPassword({
        token: activeToken,
        newPassword,
      });
      if (res.error) {
        setLinkUnusable(true);
        setPending(false);
        return;
      }
      router.push("/sign-in?notice=password_reset");
      router.refresh();
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  if (phase.type === "missing_token_redirect") {
    return (
      <div className="w-full max-w-[360px]">
        <p className="fs-text-caption text-fs-secondary">Redirecting…</p>
      </div>
    );
  }

  if (phase.type === "link_unusable" || linkUnusable) {
    return (
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
            FunnelScout
          </p>
          <h1 className="fs-auth-screen-title text-fs-primary">Link expired</h1>
          <p className="fs-text-small mt-2 text-fs-secondary">
            This reset link is no longer valid. It may have expired or already
            been used.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="fs-btn-primary block w-full py-2.5 text-center"
        >
          Request new link
        </Link>
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

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">Reset password</h1>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Choose a new password for your account.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="newPassword" className="fs-input-label">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            className="fs-input"
            value={newPassword}
            onChange={(ev) => {
              setNewPassword(ev.target.value);
              setPasswordTooShort(false);
            }}
            disabled={pending}
          />
          {passwordTooShort ? (
            <p className="fs-text-caption mt-1.5 text-fs-red" role="alert">
              Password must be at least {MIN_PASSWORD_LEN} characters.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="fs-input-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className="fs-input"
            value={confirmPassword}
            onChange={(ev) => {
              setConfirmPassword(ev.target.value);
              setPasswordsMismatch(false);
            }}
            disabled={pending}
          />
          {passwordsMismatch ? (
            <p className="fs-text-caption mt-1.5 text-fs-red" role="alert">
              Passwords do not match.
            </p>
          ) : null}
        </div>
        {submitError ? (
          <p className="fs-text-caption text-fs-red" role="alert">
            {submitError}
          </p>
        ) : null}
        <button
          type="submit"
          className="fs-btn-primary w-full py-2.5"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save password"}
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

function ResetPasswordFallback() {
  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">Reset password</h1>
      </div>
      <p className="fs-text-caption text-fs-secondary">Loading…</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

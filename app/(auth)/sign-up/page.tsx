"use client";

import Link from "next/link";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  PENDING_WORKSPACE_SESSION_KEY,
  VERIFICATION_EMAIL_CALLBACK_PATH,
} from "@/lib/auth-ui-constants";
import { useResendVerificationEmail } from "@/hooks/use-resend-verification-email";

const MIN_PASSWORD_LEN = 8;

type Phase = "form" | "check_email";

export default function SignUpPage() {
  const [phase, setPhase] = useState<Phase>("form");
  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTooShort, setPasswordTooShort] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const resendVerification = useResendVerificationEmail({
    getEmail: () => email,
    successMessage: "We sent another verification link to your inbox.",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordTooShort(false);
    if (password.length < MIN_PASSWORD_LEN) {
      setPasswordTooShort(true);
      return;
    }
    setPending(true);
    try {
      const signUp = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split("@")[0] || "Owner",
        callbackURL: VERIFICATION_EMAIL_CALLBACK_PATH,
      });
      if (signUp.error) {
        setError(signUp.error.message ?? "Sign-up failed");
        setPending(false);
        return;
      }

      try {
        const payload = JSON.stringify({
          agencyName: agencyName.trim(),
        });
        window.sessionStorage.setItem(PENDING_WORKSPACE_SESSION_KEY, payload);
      } catch {
        // sessionStorage may be unavailable; create-workspace still works
      }

      setPhase("check_email");
      setPending(false);
    } catch {
      setError("Sign-up failed");
      setPending(false);
    }
  }

  async function onResendVerification(e: React.FormEvent) {
    e.preventDefault();
    await resendVerification.resend();
  }

  if (phase === "check_email") {
    return (
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
            FunnelScout
          </p>
          <h1 className="fs-auth-screen-title text-fs-primary">
            Verify your email
          </h1>
          <p className="fs-text-small mt-2 text-fs-secondary">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-fs-primary">{email}</span>. Click
            the link to activate your account, then you can finish setting up
            your workspace.
          </p>
        </div>

        <form onSubmit={onResendVerification} className="flex flex-col gap-4">
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
            className="fs-btn-outline w-full py-2.5"
            disabled={resendVerification.pending}
          >
            {resendVerification.pending
              ? "Sending…"
              : "Resend verification email"}
          </button>
        </form>

        <p className="fs-text-caption mt-8 text-center text-fs-faded">
          Wrong email?{" "}
          <button
            type="button"
            className="text-fs-amber hover:text-fs-amber-hover"
            onClick={() => {
              setPhase("form");
              resendVerification.clearFeedback();
            }}
          >
            Sign up again
          </button>
        </p>

        <p className="fs-text-caption mt-4 text-center text-fs-faded">
          Already verified?{" "}
          <Link
            href="/sign-in"
            className="text-fs-amber hover:text-fs-amber-hover"
          >
            Sign in
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
        <h1 className="fs-auth-screen-title text-fs-primary">
          Create your workspace
        </h1>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Connect GHL after you verify your email
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="agencyName" className="fs-input-label">
            Agency name
          </label>
          <input
            id="agencyName"
            name="agencyName"
            type="text"
            required
            className="fs-input"
            value={agencyName}
            onChange={(ev) => setAgencyName(ev.target.value)}
          />
        </div>
        <div>
          <label htmlFor="name" className="fs-input-label">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="fs-input"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />
        </div>
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
          />
        </div>
        <div>
          <label htmlFor="password" className="fs-input-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="fs-input"
            value={password}
            onChange={(ev) => {
              setPassword(ev.target.value);
              setPasswordTooShort(false);
            }}
          />
          {passwordTooShort ? (
            <p className="fs-text-caption mt-1.5 text-fs-red" role="alert">
              Password must be at least {MIN_PASSWORD_LEN} characters.
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="fs-text-caption text-fs-red" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="fs-btn-primary w-full py-2.5"
          disabled={pending}
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="fs-text-caption mt-8 text-center text-fs-faded">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-fs-amber hover:text-fs-amber-hover"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

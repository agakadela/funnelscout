"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { authClient } from "@/lib/auth-client";

const GHL_ERROR_MESSAGES: Record<string, string> = {
  session_required:
    "Your session expired before GoHighLevel could finish connecting. Sign in, then connect GHL again from the dashboard.",
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ghlErrorKey = searchParams.get("ghl_error");
  const ghlNotice =
    ghlErrorKey != null && ghlErrorKey !== ""
      ? (GHL_ERROR_MESSAGES[ghlErrorKey] ?? null)
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });
      if (res.error) {
        setError(res.error.message ?? "Sign-in failed");
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Sign-in failed");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">Sign in</h1>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Pipeline intelligence for your GHL clients
        </p>
      </div>

      {ghlNotice ? (
        <p
          className="fs-text-caption mb-6 rounded-md border border-fs-border bg-fs-surface-2 px-3 py-2 text-fs-secondary"
          role="status"
        >
          {ghlNotice}
        </p>
      ) : null}

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
            autoComplete="current-password"
            required
            className="fs-input"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="my-8 flex items-center gap-3 text-fs-faded">
        <div className="h-px flex-1 bg-fs-border" />
        <span className="fs-text-label font-mono">or</span>
        <div className="h-px flex-1 bg-fs-border" />
      </div>

      <button type="button" className="fs-btn-outline w-full py-2.5" disabled>
        Continue with Google
      </button>

      <p className="fs-text-caption mt-8 text-center text-fs-faded">
        Need an account?{" "}
        <Link
          href="/sign-up"
          className="text-fs-amber hover:text-fs-amber-hover"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

function SignInFallback() {
  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">Sign in</h1>
      </div>
      <p className="fs-text-caption text-fs-secondary">Loading…</p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInForm />
    </Suspense>
  );
}

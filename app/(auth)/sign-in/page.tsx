"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        <p
          className="mb-3 text-fs-primary"
          style={{
            fontSize: "var(--font-size-subheading)",
            fontWeight: 600,
          }}
        >
          FunnelScout
        </p>
        <h1
          className="text-fs-primary"
          style={{
            fontSize: "var(--font-size-heading)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          Sign in
        </h1>
        <p
          className="mt-2 text-fs-secondary"
          style={{ fontSize: "var(--font-size-small)" }}
        >
          Pipeline intelligence for your GHL clients
        </p>
      </div>

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
          <p
            className="text-fs-red"
            style={{ fontSize: "var(--font-size-caption)" }}
            role="alert"
          >
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

      <div
        className="my-8 flex items-center gap-3"
        style={{ color: "var(--color-fs-faded)" }}
      >
        <div className="h-px flex-1 bg-fs-border" />
        <span
          className="font-mono"
          style={{ fontSize: "var(--font-size-label)" }}
        >
          or
        </span>
        <div className="h-px flex-1 bg-fs-border" />
      </div>

      <button type="button" className="fs-btn-outline w-full py-2.5" disabled>
        Continue with Google
      </button>

      <p
        className="mt-8 text-center text-fs-faded"
        style={{ fontSize: "var(--font-size-caption)" }}
      >
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

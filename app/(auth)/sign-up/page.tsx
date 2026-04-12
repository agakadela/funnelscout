"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

function slugify(value: string): string {
  const s = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "agency";
}

export default function SignUpPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const signUp = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split("@")[0] || "Owner",
      });
      if (signUp.error) {
        setError(signUp.error.message ?? "Sign-up failed");
        setPending(false);
        return;
      }

      const slug = `${slugify(agencyName)}-${crypto.randomUUID().slice(0, 8)}`;
      const orgRes = await authClient.organization.create({
        name: agencyName.trim(),
        slug,
      });
      if (orgRes.error) {
        setError(orgRes.error.message ?? "Could not create organization");
        setPending(false);
        return;
      }

      if (orgRes.data?.id) {
        const activeRes = await authClient.organization.setActive({
          organizationId: orgRes.data.id,
        });
        if (activeRes.error) {
          setError(
            activeRes.error.message ?? "Could not activate organization",
          );
          setPending(false);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Sign-up failed");
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
          Create your workspace
        </h1>
        <p
          className="mt-2 text-fs-secondary"
          style={{ fontSize: "var(--font-size-small)" }}
        >
          Connect GHL after sign-up to sync clients
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
          {pending ? "Creating workspace…" : "Create workspace"}
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

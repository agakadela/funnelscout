"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { PENDING_WORKSPACE_SESSION_KEY } from "@/lib/auth-ui-constants";

function slugify(value: string): string {
  const s = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "agency";
}

type PendingWorkspace = { agencyName: string };

function readPendingWorkspace(): PendingWorkspace | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(PENDING_WORKSPACE_SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "agencyName" in parsed &&
      typeof (parsed as { agencyName: unknown }).agencyName === "string"
    ) {
      return { agencyName: (parsed as PendingWorkspace).agencyName };
    }
  } catch {
    return null;
  }
  return null;
}

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [switchAccountPending, setSwitchAccountPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      const sessionRes = await authClient.getSession();
      if (cancelled) {
        return;
      }
      if (sessionRes.data?.session?.activeOrganizationId) {
        router.replace("/dashboard");
        return;
      }
      const pendingWs = readPendingWorkspace();
      if (pendingWs?.agencyName) {
        setAgencyName(pendingWs.agencyName);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const sessionRes = await authClient.getSession();
      if (sessionRes.error || !sessionRes.data?.session) {
        router.push("/sign-in");
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

      try {
        window.sessionStorage.removeItem(PENDING_WORKSPACE_SESSION_KEY);
      } catch {
        // ignore
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  async function onUseDifferentAccount(): Promise<void> {
    setError(null);
    setSwitchAccountPending(true);
    try {
      const out = await authClient.signOut();
      if (out.error) {
        setError(out.error.message ?? "Could not sign out");
        setSwitchAccountPending(false);
        return;
      }
      router.push("/sign-in");
    } catch {
      setError("Could not sign out. Please try again.");
      setSwitchAccountPending(false);
    }
  }

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 text-center">
        <p className="fs-text-subheading mb-3 font-semibold text-fs-primary">
          FunnelScout
        </p>
        <h1 className="fs-auth-screen-title text-fs-primary">
          Name your workspace
        </h1>
        <p className="fs-text-small mt-2 text-fs-secondary">
          Your email is verified. Create your agency workspace to continue.
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
          {pending ? "Creating workspace…" : "Continue to dashboard"}
        </button>
      </form>

      <p className="fs-text-caption mt-8 text-center text-fs-faded">
        Wrong account?{" "}
        <button
          type="button"
          className="text-fs-amber hover:text-fs-amber-hover disabled:opacity-50"
          disabled={switchAccountPending || pending}
          onClick={() => void onUseDifferentAccount()}
        >
          {switchAccountPending ? "Signing out…" : "Use a different account"}
        </button>
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

import { authClient } from "@/lib/auth-client";
import { VERIFICATION_EMAIL_CALLBACK_PATH } from "@/lib/auth-ui-constants";

const GENERIC_RESEND_ERROR =
  "Couldn’t send email. Please try again in a few minutes.";

export type UseResendVerificationEmailOptions = {
  getEmail: () => string;
  successMessage: string;
  emptyEmailMessage?: string;
};

export function useResendVerificationEmail(
  options: UseResendVerificationEmailOptions,
) {
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setError(null);
    setMessage(null);
  }, []);

  const resend = useCallback(async (): Promise<void> => {
    const { getEmail, successMessage, emptyEmailMessage } = optsRef.current;
    setError(null);
    setMessage(null);
    const trimmed = getEmail().trim();
    if (emptyEmailMessage !== undefined && trimmed === "") {
      setError(emptyEmailMessage);
      return;
    }
    setPending(true);
    try {
      const res = await authClient.sendVerificationEmail({
        email: trimmed,
        callbackURL: VERIFICATION_EMAIL_CALLBACK_PATH,
      });
      if (res.error) {
        Sentry.captureException(
          res.error.message != null
            ? new Error(res.error.message)
            : new Error("sendVerificationEmail failed"),
        );
        setError(GENERIC_RESEND_ERROR);
        setPending(false);
        return;
      }
      setMessage(successMessage);
    } catch (err) {
      Sentry.captureException(
        err instanceof Error ? err : new Error("sendVerificationEmail threw"),
      );
      setError(GENERIC_RESEND_ERROR);
    }
    setPending(false);
  }, []);

  return { pending, error, message, resend, clearFeedback };
}

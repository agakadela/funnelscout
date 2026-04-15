import * as React from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
import ResetPasswordEmail from "@/emails/reset-password";
import VerifyEmail from "@/emails/verify-email";
import WeeklyDigestEmail from "@/emails/WeeklyDigest";
import { env } from "@/lib/env";

const resend = new Resend(env.resend.apiKey);

const TRANSACTIONAL_FROM = "FunnelScout <onboarding@resend.dev>";

function appOrigin(): string {
  return env.auth.url.replace(/\/$/, "");
}

export async function sendWeeklyDigestEmail(params: {
  to: string;
  agencyName: string;
  subAccountName: string;
  accountPathSegment: string;
  recommendations: { title: string; body: string; impact: string }[];
}): Promise<void> {
  const dashboardUrl = `${appOrigin()}/accounts/${encodeURIComponent(params.accountPathSegment)}`;
  const html = await render(
    React.createElement(WeeklyDigestEmail, {
      agencyName: params.agencyName,
      subAccountName: params.subAccountName,
      dashboardUrl,
      recommendations: params.recommendations,
    }),
  );
  const { error } = await resend.emails.send({
    from: TRANSACTIONAL_FROM,
    to: params.to,
    subject: `Weekly pipeline digest — ${params.subAccountName}`,
    html,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
}): Promise<void> {
  const html = await render(
    React.createElement(VerifyEmail, {
      verifyUrl: params.verifyUrl,
    }),
  );
  const { error } = await resend.emails.send({
    from: TRANSACTIONAL_FROM,
    to: params.to,
    subject: "Verify your FunnelScout email",
    html,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  const html = await render(
    React.createElement(ResetPasswordEmail, {
      resetUrl: params.resetUrl,
    }),
  );
  const { error } = await resend.emails.send({
    from: TRANSACTIONAL_FROM,
    to: params.to,
    subject: "Reset your FunnelScout password",
    html,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendGhlTokenRefreshFailedEmail(params: {
  to: string;
  organizationName: string;
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: TRANSACTIONAL_FROM,
    to: params.to,
    subject: "Reconnect your GoHighLevel account",
    text: `We could not refresh your GoHighLevel connection for ${params.organizationName}. Please sign in to FunnelScout and connect GoHighLevel again.`,
  });
  if (error) {
    throw new Error(error.message);
  }
}

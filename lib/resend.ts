import * as React from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";
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

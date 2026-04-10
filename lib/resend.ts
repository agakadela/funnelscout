import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = new Resend(env.resend.apiKey);

const TRANSACTIONAL_FROM = "FunnelScout <onboarding@resend.dev>";

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

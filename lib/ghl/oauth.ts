import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/lib/env";
import {
  GhlOAuthTokenResponseSchema,
  type GhlOAuthTokenResponse,
} from "@/lib/ghl/types";

const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

export const GHL_OAUTH_AUTHORIZE_URL =
  "https://marketplace.gohighlevel.com/oauth/chooselocation";
export const GHL_OAUTH_TOKEN_URL =
  "https://services.leadconnectorhq.com/oauth/token";

export const GHL_OAUTH_SCOPES = [
  "locations.readonly",
  "opportunities.readonly",
].join(" ");

function computeWebhookHmacHex(rawBody: string, webhookSecret: string): string {
  return createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");
}

function normalizeSignatureHeader(signatureHeader: string): string | null {
  const trimmed = signatureHeader.trim().toLowerCase();
  if (!trimmed) return null;
  const withoutPrefix = trimmed.startsWith("sha256=")
    ? trimmed.slice(7)
    : trimmed;
  if (withoutPrefix.length === 64 && /^[0-9a-f]+$/.test(withoutPrefix)) {
    return withoutPrefix;
  }
  return null;
}

export function verifyGhlWebhookHmacSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): boolean {
  const candidate = normalizeSignatureHeader(signatureHeader);
  if (!candidate) return false;
  const expectedHex = computeWebhookHmacHex(rawBody, webhookSecret);
  try {
    const a = Buffer.from(candidate, "hex");
    const b = Buffer.from(expectedHex, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyGHLSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  return verifyGhlWebhookHmacSignature(
    rawBody,
    signatureHeader,
    env.ghl.webhookSecret,
  );
}

function getEncryptionKeyBytes(): Buffer {
  return Buffer.from(env.ghl.tokenEncryptKey, "hex");
}

export function encryptGhlToken(plaintext: string): string {
  const key = getEncryptionKeyBytes();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptGhlToken(payload: string): string {
  const key = getEncryptionKeyBytes();
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token payload");
  }
  const [ivB64, tagB64, dataB64] = parts;
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const ciphertext = Buffer.from(dataB64, "base64url");
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted token IV or auth tag");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function buildGhlAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: env.ghl.redirectUri,
    client_id: env.ghl.clientId,
    scope: GHL_OAUTH_SCOPES,
    state,
  });
  return `${GHL_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

type OAuthStatePayload = {
  o: string;
  t: number;
};

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

export function createSignedOAuthState(
  betterAuthOrganizationId: string,
): string {
  const payload: OAuthStatePayload = {
    o: betterAuthOrganizationId,
    t: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson, "utf8").toString("base64url");
  const sig = createHmac("sha256", env.auth.secret)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function parseSignedOAuthState(state: string): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;
  const expectedSig = createHmac("sha256", env.auth.secret)
    .update(payloadB64)
    .digest("base64url");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("o" in parsed) ||
    !("t" in parsed)
  ) {
    return null;
  }
  const o = (parsed as { o: unknown }).o;
  const t = (parsed as { t: unknown }).t;
  if (typeof o !== "string" || typeof t !== "number") return null;
  if (Date.now() - t > STATE_MAX_AGE_MS) return null;
  return { o, t };
}

export async function exchangeAuthorizationCode(
  code: string,
): Promise<GhlOAuthTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.ghl.clientId,
    client_secret: env.ghl.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.ghl.redirectUri,
  });
  const res = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GHL token exchange failed: ${res.status}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("GHL token exchange returned non-JSON body");
  }
  const parsed = GhlOAuthTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("GHL token exchange response failed validation");
  }
  return parsed.data;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GhlOAuthTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.ghl.clientId,
    client_secret: env.ghl.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(GHL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GHL token refresh failed: ${res.status}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("GHL token refresh returned non-JSON body");
  }
  const parsed = GhlOAuthTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("GHL token refresh response failed validation");
  }
  return parsed.data;
}

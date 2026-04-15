export type ResetPasswordPhase =
  | { type: "missing_token_redirect" }
  | { type: "link_unusable" }
  | { type: "ready"; token: string };

export function resolveResetPasswordPhase(params: {
  token: string | null | undefined;
  error: string | null | undefined;
}): ResetPasswordPhase {
  const error = params.error ?? "";
  if (error === "INVALID_TOKEN") {
    return { type: "link_unusable" };
  }
  const token = params.token?.trim() ?? "";
  if (!token) {
    return { type: "missing_token_redirect" };
  }
  return { type: "ready", token };
}

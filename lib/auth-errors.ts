/** Better Auth returns `EMAIL_NOT_VERIFIED` for unverified sign-in attempts. */
export function isEmailNotVerifiedError(error: { code?: string }): boolean {
  if (error.code === "EMAIL_NOT_VERIFIED") {
    return true;
  }
  if (error.code === "email_not_verified") {
    return true;
  }
  return false;
}

export function isVerificationLinkError(code: string | null): boolean {
  return code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN";
}

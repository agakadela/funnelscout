function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** In-place scrub; generic preserves Sentry `beforeSend` event typing without a direct `@sentry/core` import. */
export function scrubSentryEvent<T extends object>(event: T): T {
  if (!isRecord(event)) {
    return event;
  }
  const request = event.request;
  if (isRecord(request)) {
    delete request.cookies;
    delete request.headers;
    delete request.data;
  }
  const user = event.user;
  if (isRecord(user)) {
    delete user.email;
    delete user.username;
    delete user.ip_address;
  }
  return event;
}

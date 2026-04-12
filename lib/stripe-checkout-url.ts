export function isStripeHostedCheckoutUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  return parsed.hostname.toLowerCase() === "checkout.stripe.com";
}

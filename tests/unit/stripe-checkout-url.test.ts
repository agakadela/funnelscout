import { describe, expect, it } from "vitest";

import { isStripeHostedCheckoutUrl } from "@/lib/stripe-checkout-url";

describe("isStripeHostedCheckoutUrl", () => {
  it("accepts Stripe Checkout HTTPS URLs", () => {
    expect(
      isStripeHostedCheckoutUrl(
        "https://checkout.stripe.com/c/pay/cs_test_abc",
      ),
    ).toBe(true);
  });

  it("rejects non-HTTPS", () => {
    expect(
      isStripeHostedCheckoutUrl("http://checkout.stripe.com/c/pay/cs_test_abc"),
    ).toBe(false);
  });

  it("rejects other hosts", () => {
    expect(isStripeHostedCheckoutUrl("https://evil.example/pay")).toBe(false);
    expect(isStripeHostedCheckoutUrl("https://stripe.com/checkout")).toBe(
      false,
    );
  });

  it("rejects malformed URLs", () => {
    expect(isStripeHostedCheckoutUrl("not a url")).toBe(false);
  });
});

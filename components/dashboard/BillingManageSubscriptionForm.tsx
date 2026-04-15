export function BillingManageSubscriptionForm() {
  return (
    <form action="/api/billing/portal" method="post">
      <button
        type="submit"
        className="fs-btn-primary inline-flex items-center gap-2 px-5 py-2.5"
      >
        Manage subscription
        <span className="fs-text-caption font-sans" aria-hidden>
          ↗
        </span>
      </button>
    </form>
  );
}

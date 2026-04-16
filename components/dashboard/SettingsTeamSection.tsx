export function SettingsTeamSection() {
  return (
    <section
      id="team"
      className="fs-card mt-6 p-8"
      aria-labelledby="settings-team-heading"
    >
      <h2
        id="settings-team-heading"
        className="fs-text-body font-semibold text-fs-primary"
      >
        Team
      </h2>
      <p className="fs-text-small mt-2 text-fs-secondary">
        Member invites, roles, and pending invitations ship with the dedicated
        Team update. This section is reserved so deep links and navigation stay
        stable.
      </p>
      <p className="fs-text-caption mt-4 text-fs-faded">
        Member management is not available here yet; it will ship in a future
        update.
      </p>
    </section>
  );
}

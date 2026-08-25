// Scopes the dark cyberpunk redesign to /mafia/settings/* only — the rest
// of the admin panel (orders/listings/messages) keeps the existing
// .admin-light theme from the parent dashboard layout. See .admin-settings-
// dark in globals.css for how the re-theming actually works.
export default function SettingsLayout({ children }) {
  return <div className="admin-settings-dark">{children}</div>;
}

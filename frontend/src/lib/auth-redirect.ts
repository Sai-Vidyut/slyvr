/**
 * Post–email-confirmation landing URL.
 * Lands on the authenticated app route so AppEntry can admit the user after
 * Supabase parses the session from the URL (same global AuthProvider init as `/`).
 */
export function getEmailConfirmationRedirectUrl(): string {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${basePath}/app`;
}

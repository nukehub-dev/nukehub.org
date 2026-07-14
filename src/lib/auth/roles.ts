// NukeAuth (Keycloak) client role names for the admin areas. These mirror
// the role constants in api-server/internal/auth — keep both sides in sync.
// Access checks are always enforced server-side; the client only uses them
// to show or hide admin UI.
export const SURVEY_ADMIN_ROLE = "survey-admin";
export const SURVEY_VIEWER_ROLE = "survey-viewer";
export const NEWSLETTER_ADMIN_ROLE = "newsletter-admin";
export const NEWSLETTER_STAFF_ROLE = "newsletter-staff";

// Roles that grant access to each admin area (read-only roles included).
export const SURVEY_ACCESS_ROLES: readonly string[] = [
  SURVEY_ADMIN_ROLE,
  SURVEY_VIEWER_ROLE,
];
export const NEWSLETTER_ACCESS_ROLES: readonly string[] = [
  NEWSLETTER_ADMIN_ROLE,
  NEWSLETTER_STAFF_ROLE,
];

export function hasAnyRole(
  hasRole: (role: string) => boolean,
  roles: readonly string[],
): boolean {
  return roles.some((role) => hasRole(role));
}

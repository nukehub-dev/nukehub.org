export interface ProjectLinkable {
  id: string;
  data: {
    customPage?: boolean;
    permalink?: string;
    url?: string;
  };
}

/**
 * Resolve the primary URL for a project entry.
 *
 * Priority:
 * 1. External `url` when `customPage` is true and no `permalink` is set.
 * 2. Internal `permalink` if provided.
 * 3. Fall back to `/{entry.id}`.
 */
export function resolveProjectUrl(entry: ProjectLinkable): string {
  return (
    (entry.data.customPage && !entry.data.permalink && entry.data.url) ||
    entry.data.permalink ||
    `/${entry.id}`
  );
}

/**
 * NukeBlog (blog.nukehub.org) RSS helpers for client-side "latest posts"
 * fetching. The feed is cross-origin, so blog.nukehub.org must send
 * `Access-Control-Allow-Origin` covering nukehub.org for this to succeed —
 * any failure resolves to an empty list and the UI hides the section.
 */

export interface BlogPost {
  title: string;
  href: string;
  excerpt: string;
  /** Preformatted display date, e.g. "Jul 15, 2026" ("" if unparseable). */
  date: string;
  /** First RSS category ("" if none). */
  category: string;
}

export const BLOG_URL =
  import.meta.env.PUBLIC_BLOG_URL || "https://blog.nukehub.org";

const FETCH_TIMEOUT_MS = 10_000;
const EXCERPT_MAX = 160;

/** Decode HTML entities and strip markup from an RSS description. */
function toPlainText(html: string): string {
  const scratch = document.createElement("div");
  scratch.innerHTML = html;
  return (scratch.textContent ?? "").replace(/\s+/g, " ").trim();
}

function clampExcerpt(text: string): string {
  if (text.length <= EXCERPT_MAX) return text;
  const cut = text.slice(0, EXCERPT_MAX);
  return `${cut.slice(0, cut.lastIndexOf(" ") || EXCERPT_MAX)}…`;
}

function formatDate(pubDate: string): string {
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function text(item: Element, tag: string): string {
  return item.querySelector(tag)?.textContent?.trim() ?? "";
}

/**
 * Fetch the latest posts from the NukeBlog RSS feed. Returns `[]` on any
 * failure (offline, CORS rejection, malformed feed) and during SSR.
 */
export async function fetchLatestBlogPosts(limit = 3): Promise<BlogPost[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch(`${BLOG_URL}/rss.xml`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];

    const doc = new DOMParser().parseFromString(await res.text(), "text/xml");
    if (doc.querySelector("parsererror")) return [];

    return [...doc.querySelectorAll("item")].slice(0, limit).map((item) => ({
      title: text(item, "title"),
      href: text(item, "link"),
      excerpt: clampExcerpt(toPlainText(text(item, "description"))),
      date: formatDate(text(item, "pubDate")),
      category: text(item, "category"),
    }));
  } catch {
    return [];
  }
}

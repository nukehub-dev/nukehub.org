import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import TurndownService from "turndown";

/** Build artifacts to skip entirely (by exact filename in dist/). */
const EXACT_SKIP = new Set(["404.html", "silent-check-sso.html", "rss.xml"]);

/** HTML tags that have no semantic content value — remove before conversion. */
const REMOVE_TAGS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "form",
  "input",
  "button",
  "dialog",
  "template",
];

/**
 * UI-chrome class substrings — any element whose `class` contains one of these
 * is overlay/interaction chrome with no semantic content. Removed entirely.
 */
const CHROME_CLASS_SUBSTRINGS = [
  "grain-overlay",
  "scroll-progress",
  "custom-cursor",
  "page-loader",
  "command-palette",
  "cookie-consent",
  "error-boundary",
  "scroll-top",
  "context-menu",
  "performance-monitor",
];

/**
 * Block-level tags within an `<a>`, whose presence means the anchor wraps a
 * whole "card" (image + title + body). Such anchors are flattened — the inner
 * content is emitted as block markdown and a trailing reference link is added.
 */
const BLOCK_TAGS_IN_ANCHOR = new Set([
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "ul",
  "ol",
  "table",
  "figure",
  "blockquote",
  "section",
]);

/**
 * Extract `<title>` and `<meta name="description">` from the raw HTML, so the
 * generated markdown starts with a useful frontmatter header. The site title
 * suffix `| NukeHub` is stripped, since the brand context lives in the URL.
 */
function extractMeta(html: string): {
  title: string | null;
  description: string | null;
} {
  let title: string | null = null;
  let description: string | null = null;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title =
      titleMatch[1]
        .trim()
        .replace(/\s*\|\s*NukeHub\s*$/i, "")
        .trim() || null;
  }

  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
  );
  if (descMatch) description = descMatch[1].trim() || null;

  return { title, description };
}

/** Pick the most meaningful content subtree: <main> → <article> → body. */
function selectBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  return (body.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    body.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
    body) as string;
}

/** Collapse 3+ consecutive newlines to a single blank line; tidy trailing ws. */
function collapseBlankLines(md: string): string {
  return (
    md
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim() + "\n"
  );
}

/** Turndown operates on a DOM. The class attribute can be either a string or a DOMTokenList. */
function classString(node: any): string {
  const cls = (node as any).className;
  if (typeof cls === "string") return cls;
  if (cls && typeof (cls as any).toString === "function") return String(cls);
  return "";
}

export default function markdownNegotiation(): AstroIntegration {
  return {
    name: "markdown-negotiation",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const turndown = new TurndownService({
          headingStyle: "atx",
          codeBlockStyle: "fenced",
          bulletListMarker: "-",
          emDelimiter: "*",
          linkStyle: "inlined",
        });
        turndown.remove(REMOVE_TAGS as any);

        // ---- Rule: drop UI chrome, aria-hidden decorations, stat placeholders ----
        turndown.addRule("dropChrome", {
          filter(node) {
            if (node.nodeType !== 1) return false;
            const el = node as HTMLElement;
            if (el.getAttribute && el.getAttribute("aria-hidden") === "true") {
              return true;
            }
            const id = el.id || "";
            if (typeof id === "string" && id.startsWith("stat-")) return true;
            const cls = classString(el);
            if (cls && CHROME_CLASS_SUBSTRINGS.some((s) => cls.includes(s)))
              return true;
            return false;
          },
          replacement() {
            return "";
          },
        });

        // ---- Rule: flatten "card anchors" — <a> wrapping block content ----
        // A whole project card sits inside <a href="/nuke-lab">...<h3>, <img>,
        // tags, description...</a>. Turndown's inline-link rule would emit a
        // multi-line `[ ... ](/nuke-lab)` span — illegible. Instead emit the
        // inner content as-is, and append a standalone reference link.
        turndown.addRule("unwrapCardAnchor", {
          filter(node) {
            if (node.nodeType !== 1) return false;
            if ((node as HTMLElement).tagName?.toLowerCase() !== "a")
              return false;
            const href = (node as HTMLElement).getAttribute("href");
            if (!href || href.startsWith("#")) return false;
            for (const child of Array.from(node.childNodes)) {
              if (child.nodeType === 1) {
                const tag = (child as HTMLElement).tagName?.toLowerCase();
                if (tag && BLOCK_TAGS_IN_ANCHOR.has(tag)) return true;
              }
            }
            return false;
          },
          replacement(content, node) {
            const el = node as HTMLElement;
            const href = el.getAttribute("href") || "";
            const title = el.getAttribute("title");
            const titlePart = title ? ` "${title}"` : "";
            const ref = `[→ ${href}](${href}${titlePart})`;
            return `${content}\n\n${ref}`;
          },
        });

        // ---- Rule: icon-only anchor (text empty after svg removal) ----
        // The whole point of these icon-only buttons is captured by their
        // `aria-label` ("NukeLab source code", "Documentation", etc.), so
        // emit a labeled reference link instead of an empty `[](url)` span.
        turndown.addRule("iconOnlyAnchor", {
          filter(node) {
            if (node.nodeType !== 1) return false;
            if ((node as HTMLElement).tagName?.toLowerCase() !== "a")
              return false;
            const text = (node.textContent || "").trim();
            if (text.length > 0) return false;
            const imgs = node.querySelectorAll
              ? node.querySelectorAll("img")
              : [];
            return imgs.length === 0;
          },
          replacement(_content, node) {
            const el = node as HTMLElement;
            const href = el.getAttribute("href") || "";
            if (!href) return "";
            const label = el.getAttribute("aria-label") || href;
            return `[${label}](${href})`;
          },
        });

        const root = fileURLToPath(dir as URL);
        await walk(root, root, turndown);
        console.log(
          "[markdown-negotiation] generated .md siblings for all pages",
        );
      },
    },
  };
}

async function walk(
  dir: string,
  root: string,
  turndown: typeof TurndownService.prototype,
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, root, turndown);
        return;
      }
      if (!entry.name.endsWith(".html")) return;
      if (EXACT_SKIP.has(entry.name)) return;

      try {
        const html = await fs.readFile(full, "utf8");
        const { title, description } = extractMeta(html);
        let bodyHtml = selectBody(html);

        // Replace inline SVG icons with a single space (not empty string) so
        // adjacent text doesn't concatenate after Turndown strips the svg.
        // e.g. "View Details<svg/>Cloud Simulation" → "View Details Cloud
        // Simulation" rather than "View DetailsCloud Simulation".
        bodyHtml = bodyHtml.replace(/<svg[\s\S]*?<\/svg>/gi, " ");

        bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, "\n\n");
        let markdown = turndown.turndown(bodyHtml);

        // Turndown escapes underscores in text content (`cad\_to\_dagmc`) to
        // protect them from being read as emphasis. Since we use `*` for
        // emphasis (not `_`), underscores inside identifiers are safe bare.
        markdown = markdown.replace(/\\_/g, "_");

        // Insert a separator between adjacent inline links/images that
        // Turndown would otherwise smash together:
        //   `[A](u)[B](v)`     → `[A](u) [B](v)`
        //   `[A](u)<url>`      → `[A](u) <url>`
        //   `![](u)![](v)`     → `![](u)\n\n![](v)`
        markdown = markdown.replace(/(\]\([^)\s]*\))([<[])/g, "$1 $2");
        markdown = markdown.replace(
          /(!\[[^\]]*\]\([^)\s]*\))(!\[)/g,
          "$1\n\n$2",
        );

        markdown = collapseBlankLines(markdown);
        if (!markdown.trim()) return;

        const frontmatter: string[] = [];
        if (title) frontmatter.push(`title: ${JSON.stringify(title)}`);
        if (description)
          frontmatter.push(`description: ${JSON.stringify(description)}`);
        const output = frontmatter.length
          ? `---\n${frontmatter.join("\n")}\n---\n\n${markdown}`
          : markdown;

        await fs.writeFile(full.replace(/\.html$/, ".md"), output, "utf8");
      } catch (err) {
        console.warn(
          `[markdown-negotiation] failed on ${path.relative(root, full)}:`,
          err,
        );
      }
    }),
  );
}

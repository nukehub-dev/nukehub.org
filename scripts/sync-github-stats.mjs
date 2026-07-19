#!/usr/bin/env node
/**
 * Sync GitHub repository statistics into src/data/github-stats.json.
 *
 * Reads project definitions from src/content/projects/*.mdx, fetches live
 * metadata from the GitHub REST API, and writes a JSON cache that Astro
 * consumes at build time.
 *
 * Run locally:
 *   GH_STATS_TOKEN=ghp_xxx node scripts/sync-github-stats.mjs
 *
 * In CI this is executed by .github/workflows/sync-github-stats.yml.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { load as loadYaml, dump as dumpYaml } from "js-yaml";

const PROJECTS_DIR = "src/content/projects";
const CHANGELOG_DIR = "src/content/changelog";
const OUTPUT_PATH = "src/data/github-stats.json";
const MAX_STALE_HOURS = 24;

const token = process.env.GH_STATS_TOKEN || "";
const authHeaders = token
  ? { Authorization: `Bearer ${token}` }
  : {};

/**
 * @param {string} message
 * @param {unknown} [detail]
 */
function log(message, detail) {
  const timestamp = new Date().toISOString();
  if (detail !== undefined) {
    console.log(`[${timestamp}] ${message}`, detail);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * @param {string} repo - "owner/name"
 * @param {string} endpoint - API path after /repos/{repo}
 */
async function fetchRepo(repo, endpoint = "") {
  const url = `https://api.github.com/repos/${repo}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...authHeaders,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} for ${url}: ${body}`);
  }

  return res.json();
}

/**
 * Count contributors using the Link header for pagination.
 * Falls back to the length of the first page if no Link header is present.
 *
 * @param {string} repo
 */
async function fetchContributorCount(repo) {
  const url = `https://api.github.com/repos/${repo}/contributors?per_page=1`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...authHeaders,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} for ${url}: ${body}`);
  }

  const linkHeader = res.headers.get("Link") || "";
  const lastMatch = linkHeader.match(/page=(\d+)[^>]*>;\s*rel="last"/);
  if (lastMatch) {
    return parseInt(lastMatch[1], 10);
  }

  // No pagination info; read the single returned page.
  const data = await res.json();
  return Array.isArray(data) ? data.length : 0;
}

/**
 * @param {string} repo
 */
async function fetchLastCommitAt(repo) {
  const commits = await fetchRepo(repo, "/commits?per_page=1");
  if (Array.isArray(commits) && commits[0]?.commit?.committer?.date) {
    return commits[0].commit.committer.date;
  }
  if (Array.isArray(commits) && commits[0]?.commit?.author?.date) {
    return commits[0].commit.author.date;
  }
  return null;
}

/**
 * @param {string} repo
 */
async function fetchLatestRelease(repo) {
  try {
    const release = await fetchRepo(repo, "/releases/latest");
    return {
      tag: release.tag_name,
      name: release.name,
      publishedAt: release.published_at,
      url: release.html_url,
      body: release.body || "",
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      return null;
    }
    throw err;
  }
}

/**
 * Discover project slugs mapped to their githubRepo values.
 *
 * @returns {Promise<Record<string, string>>} slug -> repo
 */
async function discoverProjectRepoMap() {
  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  /** @type {Record<string, string>} */
  const map = {};

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;

    const slug = entry.name.replace(/\.mdx$/, "");
    const content = await fs.readFile(
      path.join(PROJECTS_DIR, entry.name),
      "utf-8",
    );
    const frontmatter = parseFrontmatter(content);
    const repo = frontmatter.githubRepo;

    if (repo && /^[\w.-]+\/[\w.-]+$/.test(repo)) {
      map[repo] = slug;
    }
  }

  return map;
}

/**
 * Convert a GitHub release body to a markdown summary.
 *
 * @param {string} body
 */
function releaseBodyToSummary(body) {
  if (!body) return "";
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("##") &&
        !line.startsWith("#") &&
        !line.startsWith("!") &&
        !line.startsWith("<!--"),
    )
    .slice(0, 3)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract bullet highlights from a release body.
 *
 * @param {string} body
 */
function extractHighlights(body) {
  if (!body) return [];
  const lines = body.split("\n");
  const highlights = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      /^\d+\.\s/.test(trimmed)
    ) {
      const text = trimmed.replace(/^[-*\d.\s]+/, "").trim();
      if (text && !text.toLowerCase().includes("breaking")) {
        highlights.push(text);
      }
    }
  }

  return highlights.slice(0, 6);
}

/**
 * Write draft changelog entries for new GitHub releases. Drafts are prefixed
 * with an underscore so the content loader skips them until a human reviews
 * and renames the file.
 *
 * @param {Record<string, any>} repoStats
 */
async function writeChangelogDrafts(repoStats) {
  const projectRepoMap = await discoverProjectRepoMap();

  // Read existing changelog files to avoid duplicates.
  let existingFiles = [];
  try {
    existingFiles = await fs.readdir(CHANGELOG_DIR);
  } catch {
    // Directory may not exist yet.
    await fs.mkdir(CHANGELOG_DIR, { recursive: true });
  }

  const existingVersionSet = new Set(
    (
      await Promise.all(
        existingFiles
          .filter((name) => name.endsWith(".mdx") || name.endsWith(".md"))
          .map(async (name) => {
            try {
              const content = await fs.readFile(
                path.join(CHANGELOG_DIR, name),
                "utf-8",
              );
              const fm = parseFrontmatter(content);
              return `${fm.project || ""}@${fm.version || ""}`;
            } catch {
              return "";
            }
          }),
      )
    ).filter(Boolean),
  );

  let created = 0;

  for (const [repo, stats] of Object.entries(repoStats)) {
    const release = stats.lastRelease;
    if (!release || !release.tag) continue;

    const projectSlug = projectRepoMap[repo];
    if (!projectSlug) continue;

    const key = `${projectSlug}@${release.tag}`;
    if (existingVersionSet.has(key)) continue;

    const date = release.publishedAt
      ? release.publishedAt.split("T")[0]
      : new Date().toISOString().split("T")[0];
    const version = release.tag.replace(/^v/, "");
    const highlights = extractHighlights(release.body);
    const summary =
      release.name || releaseBodyToSummary(release.body) || `Release ${release.tag}`;

    const safeTag = release.tag.replace(/[^\w.-]/g, "_");
    const fileName = `_draft-${projectSlug}-${safeTag}.mdx`;
    const filePath = path.join(CHANGELOG_DIR, fileName);

    const frontmatter = {
      version,
      date,
      summary,
      highlights,
      breaking: [],
      project: projectSlug,
      githubReleaseUrl: release.url,
    };

    const fileContent = `---\n${dumpYaml(frontmatter).trim()}\n---\n\n${release.body || `Release ${release.tag} for ${projectSlug}.`}\n`;

    await fs.writeFile(filePath, fileContent);
    log(`Created changelog draft: ${filePath}`);
    created++;
  }

  if (created === 0) {
    log("No new changelog drafts needed.");
  } else {
    log(`Created ${created} changelog draft(s).`);
  }
}

/**
 * Extract frontmatter from an MDX file.
 *
 * @param {string} content
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return {};
  return loadYaml(match[1]) || {};
}

/**
 * @returns {Promise<string[]>}
 */
async function discoverRepos() {
  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const repos = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;

    const filePath = path.join(PROJECTS_DIR, entry.name);
    const content = await fs.readFile(filePath, "utf-8");
    const frontmatter = parseFrontmatter(content);

    // Only sync repos that are explicitly declared in frontmatter.
    // This avoids 404s for projects whose source URL points to a private
    // or not-yet-public repository.
    const repo = frontmatter.githubRepo;
    if (repo && /^[\w.-]+\/[\w.-]+$/.test(repo) && !repos.includes(repo)) {
      repos.push(repo);
    }
  }

  return repos.sort();
}

/**
 * @param {string} repo
 */
async function syncRepo(repo) {
  log(`Syncing ${repo}...`);

  const [meta, contributors, lastCommitAt, lastRelease] = await Promise.all([
    fetchRepo(repo),
    fetchContributorCount(repo),
    fetchLastCommitAt(repo),
    fetchLatestRelease(repo),
  ]);

  return {
    stars: meta.stargazers_count ?? 0,
    forks: meta.forks_count ?? 0,
    openIssues: meta.open_issues_count ?? 0,
    watchers: meta.watchers_count ?? 0,
    contributors,
    lastCommitAt,
    lastRelease,
    defaultBranch: meta.default_branch ?? "main",
  };
}

async function main() {
  const startTime = Date.now();
  log("Discovering projects...");

  const repos = await discoverRepos();
  if (repos.length === 0) {
    log("No GitHub repos discovered. Exiting.");
    return;
  }

  log(`Discovered ${repos.length} repo(s): ${repos.join(", ")}`);

  /** @type {Record<string, any>} */
  const repoStats = {};
  let failed = 0;

  for (const repo of repos) {
    try {
      repoStats[repo] = await syncRepo(repo);
    } catch (err) {
      failed++;
      log(`FAILED ${repo}:`, err instanceof Error ? err.message : err);
    }
  }

  const totals = Object.values(repoStats).reduce(
    (acc, stats) => ({
      totalStars: acc.totalStars + (stats.stars || 0),
      totalForks: acc.totalForks + (stats.forks || 0),
      totalContributors: acc.totalContributors + (stats.contributors || 0),
      totalOpenIssues: acc.totalOpenIssues + (stats.openIssues || 0),
    }),
    {
      totalStars: 0,
      totalForks: 0,
      totalContributors: 0,
      totalOpenIssues: 0,
    },
  );

  const output = {
    lastUpdated: new Date().toISOString(),
    maxStaleHours: MAX_STALE_HOURS,
    repos: repoStats,
    aggregate: {
      totalRepos: repos.length,
      syncedRepos: Object.keys(repoStats).length,
      failedRepos: failed,
      ...totals,
    },
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  // Preserve existing data for repos that failed this run so the site
  // never shows empty stats because of a transient API error.
  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf-8"));
  } catch {
    // File does not exist or is invalid; that's fine.
  }

  if (existing && existing.repos) {
    for (const repo of repos) {
      if (!repoStats[repo] && existing.repos[repo]) {
        const ageHours =
          (Date.now() - new Date(existing.lastUpdated).getTime()) /
          (1000 * 60 * 60);
        if (ageHours <= MAX_STALE_HOURS) {
          repoStats[repo] = existing.repos[repo];
          log(`Kept stale-but-valid data for ${repo} (${ageHours.toFixed(1)}h old)`);
        }
      }
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

  await writeChangelogDrafts(repoStats);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  log(
    `Wrote ${OUTPUT_PATH} in ${elapsed}s. Synced ${output.aggregate.syncedRepos}/${repos.length} repos.`,
  );

  if (failed > 0) {
    log(`${failed} repo(s) failed to sync.`, repoStats);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

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
import yaml from "js-yaml";

const PROJECTS_DIR = "src/content/projects";
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
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      return null;
    }
    throw err;
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
  return yaml.load(match[1]) || {};
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

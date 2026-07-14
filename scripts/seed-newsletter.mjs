#!/usr/bin/env node
/**
 * Seed the NukeHub API server SQLite database with demo newsletter data:
 * subscribers plus campaigns in every state (draft, sent, auto blog-rss),
 * for local testing of the /admin/newsletter/ dashboard.
 *
 * Usage:
 *   node scripts/seed-newsletter.mjs
 *   node scripts/seed-newsletter.mjs --count 500
 *   node scripts/seed-newsletter.mjs --db /tmp/test.db
 *   node scripts/seed-newsletter.mjs --clean
 *
 * --clean wipes ALL newsletter tables (subscribers, campaigns, deliveries)
 * before seeding. Subscribers are inserted with INSERT OR IGNORE, so
 * re-running without --clean tops up to --count new addresses.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const countArg = args.find((_, i) => args[i - 1] === "--count");
const dbArg = args.find((_, i) => args[i - 1] === "--db");
const cleanFlag = args.includes("--clean");

const COUNT = Math.max(1, parseInt(countArg || "150", 10));
const DB_PATH = dbArg || path.join(repoRoot, "api-server", "data", "nukehub.db");

const DOMAINS = [
  "gmail.com",
  "outlook.com",
  "proton.me",
  "university.edu",
  "ornl.gov",
  "iaea.org",
  "mit.edu",
  "anl.gov",
  "lanl.gov",
  "inl.gov",
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery",
  "Sam", "Jamie", "Dakota", "Reese", "Skyler", "Rowan", "Emerson", "Finley",
  "Maria", "Wei", "Priya", "Omar", "Elena", "Hiroshi", "Ingrid", "Lars",
  "Sofia", "Diego", "Yuki", "Amara", "Kai", "Nina",
];

const LAST_NAMES = [
  "Chen", "Patel", "Rodriguez", "Kim", "Singh", "Müller", "Ivanov", "Silva",
  "Smith", "Johnson", "Brown", "Garcia", "Lee", "Wang", "Gupta", "Sato",
  "Cohen", "Ali", "Kowalski", "Andersen", "Okafor", "Tanaka", "Nielsen",
];

const SOURCES = ["footer", "blog", "homepage", "newsletter"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isoDaysAgo(days, jitterHours = 0) {
  const d = new Date(Date.now() - days * 86400000 + randInt(0, Math.max(1, jitterHours)) * 3600000);
  return d.toISOString();
}

function seed() {
  console.log(`Opening database: ${DB_PATH}`);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_hash TEXT,
      source TEXT DEFAULT 'newsletter'
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      from_email TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      source TEXT NOT NULL DEFAULT 'manual',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      sent_at DATETIME,
      UNIQUE (campaign_id, email),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  if (cleanFlag) {
    const counts = {
      subscribers: db.prepare("SELECT COUNT(*) AS c FROM subscribers").get().c,
      campaigns: db.prepare("SELECT COUNT(*) AS c FROM campaigns").get().c,
      deliveries: db.prepare("SELECT COUNT(*) AS c FROM deliveries").get().c,
    };
    db.exec("DELETE FROM deliveries; DELETE FROM campaigns; DELETE FROM subscribers;");
    console.log(
      `Cleaned ${counts.subscribers} subscribers, ${counts.campaigns} campaigns, ${counts.deliveries} deliveries.`,
    );
  }

  // --- Subscribers ---
  const insertSubscriber = db.prepare(
    "INSERT OR IGNORE INTO subscribers (email, subscribed_at, ip_hash, source) VALUES (?, ?, ?, ?)",
  );
  const seedSubscribers = db.transaction((count) => {
    for (let i = 0; i < count; i++) {
      const first = pick(FIRST_NAMES).toLowerCase();
      const last = pick(LAST_NAMES).toLowerCase().replace(/[^a-z]/g, "");
      const email = `${first}.${last}${randInt(1, 99)}-${i}@${pick(DOMAINS)}`;
      const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 90);
      insertSubscriber.run(email, isoDaysAgo(daysAgo, 20), `seed-${i.toString(36)}`, pick(SOURCES));
    }
  });
  seedSubscribers(COUNT);
  const subscribers = db.prepare("SELECT email FROM subscribers").all();
  console.log(`Seeded ${COUNT} subscribers (${subscribers.length} total in table).`);

  // --- Campaigns ---
  const insertCampaign = db.prepare(
    "INSERT INTO campaigns (title, subject, from_email, body_markdown, status, source, created_at, updated_at, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertDelivery = db.prepare(
    "INSERT OR IGNORE INTO deliveries (campaign_id, email, status, error, sent_at) VALUES (?, ?, ?, ?, ?)",
  );

  // One editable draft (manual).
  insertCampaign.run(
    "July community update (draft)",
    "NukeHub in July: new integrations and roadmap",
    "news@nukehub.org",
    [
      "Hello!",
      "",
      "A lot happened at NukeHub this month:",
      "",
      "- **NukeLab 2.0 beta** opened to early testers",
      "- New **OpenMC integration** shipped",
      "- Community survey results are in — thank you!",
      "",
      "Read the full notes on the [changelog](https://nukehub.org/changelog/).",
    ].join("\n"),
    "draft",
    "manual",
    isoDaysAgo(1),
    isoDaysAgo(1),
    null,
    null,
  );

  // Two fully-sent manual campaigns with realistic delivery outcomes.
  const sentCampaigns = [
    {
      title: "June community update",
      subject: "NukeHub in June: surveys, stats, and a new look",
      from: "news@nukehub.org",
      daysAgo: 30,
    },
    {
      title: "May community update",
      subject: "NukeHub in May: introducing the newsletter",
      from: "news@nukehub.org",
      daysAgo: 61,
    },
  ];
  for (const c of sentCampaigns) {
    const created = isoDaysAgo(c.daysAgo);
    const finished = isoDaysAgo(c.daysAgo, -2);
    const id = insertCampaign.run(
      c.title,
      c.subject,
      c.from,
      `Hello!\n\nHighlights from ${c.title.split(" ")[0]}:\n\n- Community milestones\n- Project updates\n\nThanks for reading.`,
      "sent",
      "manual",
      created,
      finished,
      created,
      finished,
    ).lastInsertRowid;
    for (const { email } of subscribers) {
      const failed = Math.random() < 0.03;
      insertDelivery.run(
        id,
        email,
        failed ? "failed" : "sent",
        failed ? "SMTP rcpt failed: 550 5.1.1 user unknown" : null,
        failed ? null : isoDaysAgo(c.daysAgo, -2),
      );
    }
  }

  // One sent auto campaign from the blog watcher.
  const blogCreated = isoDaysAgo(6);
  const blogId = insertCampaign.run(
    "Getting started with OpenMC on NukeHub",
    "New on the blog: Getting started with OpenMC on NukeHub",
    "blog@nukehub.org",
    "A new post is up on the [NukeHub blog](https://blog.nukehub.org):\n\n## Getting started with OpenMC on NukeHub\n\nA walkthrough of installing OpenMC, building your first pincell model, and visualizing tallies.\n\n[Read the full post](https://blog.nukehub.org/posts/getting-started-with-openmc)",
    "sent",
    "blog-rss",
    blogCreated,
    blogCreated,
    blogCreated,
    blogCreated,
  ).lastInsertRowid;
  for (const { email } of subscribers) {
    insertDelivery.run(blogId, email, "sent", null, blogCreated);
  }

  console.log(
    "Seeded campaigns: 1 draft, 2 sent (manual), 1 sent (blog-rss), with deliveries for all subscribers.",
  );
  db.close();
  console.log("Database closed.");
}

seed();

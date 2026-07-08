#!/usr/bin/env node
/**
 * Seed the NukeHub API server SQLite database with demo survey submissions.
 *
 * Usage:
 *   node scripts/seed-surveys.mjs
 *   node scripts/seed-surveys.mjs --count 1000 --survey nukehub-experience
 *   node scripts/seed-surveys.mjs --clean
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const countArg = args.find((_, i) => args[i - 1] === "--count");
const surveyArg = args.find((_, i) => args[i - 1] === "--survey");
const dbArg = args.find((_, i) => args[i - 1] === "--db");
const cleanFlag = args.includes("--clean");

const COUNT = Math.max(1, parseInt(countArg || "200", 10));
const DB_PATH = dbArg || path.join(repoRoot, "api-server", "data", "nukehub.db");
const SURVEY_DIR = path.join(repoRoot, "src", "content", "surveys");

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

const INSTITUTIONS = [
  "MIT",
  "Oak Ridge National Laboratory",
  "IAEA",
  "Argonne National Laboratory",
  "Los Alamos National Laboratory",
  "Idaho National Laboratory",
  "Stanford University",
  "University of Michigan",
  "Texas A&M University",
  "EPFL",
  "University of Tokyo",
  "CERN",
  "Westinghouse",
  "Framatome",
  "Rolls-Royce SMR",
  "Kairos Power",
  "NuScale Power",
  "Commonwealth Fusion Systems",
  "TerraPower",
  "General Atomics",
  "Independent consultant",
  "National Nuclear Laboratory",
];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Germany",
  "France",
  "Japan",
  "South Korea",
  "India",
  "China",
  "Australia",
  "Brazil",
  "Sweden",
  "Switzerland",
  "Italy",
  "Spain",
  "Netherlands",
  "Russia",
  "Poland",
  "South Africa",
  "United Arab Emirates",
];

const TEXT_ANSWERS = {
  missing_feature: [
    "A built-in cross-section visualizer with export to common formats.",
    "Better support for multi-physics coupling between neutronics and thermal-hydraulics.",
    "An open benchmark library with verified models and reference solutions.",
    "Native Python scripting API so I can automate workflows.",
    "Cloud-based parallel execution without manual cluster setup.",
    "Integration with OpenMC's Python API for advanced tallies.",
    "A material compendium with certified nuclear data libraries.",
    "Real-time collaboration features for team projects.",
    "Version control for simulation decks, similar to Git for code.",
    "Mobile-friendly status dashboards for long-running simulations.",
  ],
  liked_most: [
    "The clean, modern interface makes it easy to get started.",
    "The community is responsive and the documentation is improving quickly.",
    "I love that it is open-source and not locked behind expensive licenses.",
    "The visualization tools help me communicate results to stakeholders.",
    "The active Discord and GitHub discussions make onboarding easier.",
    "Being able to run standard benchmarks out of the box saves time.",
    "The modular architecture lets me pick only the tools I need.",
    "Performance is surprisingly good for a browser-based interface.",
  ],
  workflow_description: [
    "I usually start with geometry in CAD, convert to MCAD, then run transport in OpenMC, and post-process with Python.",
    "Model creation in SCALE, followed by criticality safety analysis, then documentation in LaTeX.",
    "Pre-processing in Serpent, running burnup calculations, and comparing against experimental data.",
    "I write Python scripts to generate inputs, submit to a cluster, and plot results with matplotlib.",
    "Use MCNP for shielding, then move to a thermal-hydraulic code for feedback.",
    "Mostly teaching: I build simple models to demonstrate concepts to students.",
  ],
  tools_used: [
    "OpenMC, Python, Jupyter, and Paraview for visualization.",
    "MCNP6, SCALE, and ORIGEN for burnup and criticality safety.",
    "SERPENT, MATLAB, and in-house Fortran tools.",
    "Geant4 for detector simulations and ROOT for analysis.",
    "RELAP5, TRACE, and sub-channel codes for thermal-hydraulics.",
    "MOOSE-based applications for multiphysics reactor simulation.",
    "Mostly spreadsheets and Python for policy and education work.",
  ],
  nukelab_feedback: [
    "Add more tutorial notebooks for first-time users.",
    "Provide predefined reactor templates like PWR, BWR, and fast reactors.",
    "Improve mesh generation for complex geometries.",
    "Add uncertainty quantification workflows directly in the UI.",
    "Allow coupling to thermal-hydraulic solvers for feedback.",
    "Better error messages when simulations fail to converge.",
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(first, last) {
  const local = `${first.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}`;
  return `${local}@${pick(DOMAINS)}`;
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join("\n");
  return String(value ?? "");
}

function flattenQuestions(survey) {
  const questions = [];
  if (survey.questions) questions.push(...survey.questions);
  if (survey.pages) {
    survey.pages.forEach((page) => questions.push(...page.questions));
  }
  return questions;
}

function generateResponseForQuestion(q) {
  const options = (q.options || []).map((o) =>
    typeof o === "string" ? o : o.value || o.label,
  );

  switch (q.type) {
    case "select":
    case "radio":
      return options.length ? pick(options) : pick(["Yes", "No", "Maybe"]);

    case "checkbox": {
      if (!options.length) return "Yes";
      const max = q.maxSelections || options.length;
      const min = q.required ? 1 : 0;
      const count = randInt(min, Math.min(max, options.length));
      return pickMany(options, count);
    }

    case "rating":
      return String(randInt(q.min || 1, q.max || 5));

    case "number":
      return String(randInt(q.min ?? 0, q.max ?? 100));

    case "email": {
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      return generateEmail(first, last);
    }

    case "url":
      return `https://example.com/${q.id}-${randInt(1000, 9999)}`;

    case "text": {
      if (q.id === "institution") return pick(INSTITUTIONS);
      if (q.id === "country") return pick(COUNTRIES);
      return `${pick(["Sample", "Example", "Test"])} ${q.id} ${randInt(100, 999)}`;
    }

    case "textarea":
      return pick(TEXT_ANSWERS[q.id] || TEXT_ANSWERS.missing_feature);

    default:
      return "";
  }
}

function generateSubmission(survey, index) {
  const questions = flattenQuestions(survey);
  const responses = {};

  questions.forEach((q) => {
    if (!q.required && Math.random() < 0.15) return; // 15% skip optional questions
    const value = generateResponseForQuestion(q);
    if (value !== "" && value !== undefined) {
      responses[q.id] = formatValue(value);
    }
  });

  // Normalize respondent email from the response if present
  let email = "";
  if (responses.email) {
    email = responses.email;
  } else if (Math.random() < 0.7) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    email = generateEmail(first, last);
  }

  // Spread submissions over the last 45 days
  const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 45);
  const submittedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  submittedAt.setMinutes(randInt(0, 59), randInt(0, 59));

  return {
    surveySlug: survey.slug,
    surveyTitle: survey.title,
    submittedAt: submittedAt.toISOString(),
    ipHash: `seed-${index.toString(36)}`,
    email,
    responses,
  };
}

function loadSurveys() {
  const files = fs
    .readdirSync(SURVEY_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(SURVEY_DIR, file), "utf8");
    const survey = loadYaml(raw);
    survey.slug = survey.slug || path.basename(file, path.extname(file));
    return survey;
  });
}

function seed() {
  console.log(`Opening database: ${DB_PATH}`);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_slug TEXT NOT NULL,
      survey_title TEXT NOT NULL,
      submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_hash TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      value TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_slug ON submissions(survey_slug);
    CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
  `);

  const surveys = loadSurveys();
  const targets = surveyArg
    ? surveys.filter((s) => s.slug === surveyArg)
    : surveys;

  if (targets.length === 0) {
    console.error(`No surveys matched "${surveyArg}"`);
    process.exit(1);
  }

  const insertSubmission = db.prepare(
    "INSERT INTO submissions (survey_slug, survey_title, submitted_at, ip_hash, email) VALUES (?, ?, ?, ?, ?)",
  );
  const insertResponse = db.prepare(
    "INSERT INTO responses (submission_id, question_id, value) VALUES (?, ?, ?)",
  );

  const insertAll = db.transaction((items) => {
    for (const item of items) {
      const res = insertSubmission.run(
        item.surveySlug,
        item.surveyTitle,
        item.submittedAt,
        item.ipHash,
        item.email,
      );
      for (const [questionId, value] of Object.entries(item.responses)) {
        insertResponse.run(res.lastInsertRowid, questionId, value);
      }
    }
  });

  for (const survey of targets) {
    if (cleanFlag) {
      const countBefore = db
        .prepare("SELECT COUNT(*) AS c FROM submissions WHERE survey_slug = ?")
        .get(survey.slug);
      db.prepare("DELETE FROM submissions WHERE survey_slug = ?").run(survey.slug);
      console.log(
        `Cleaned ${countBefore?.c || 0} existing submissions for "${survey.slug}"`,
      );
    }

    console.log(`Seeding ${COUNT} submissions for "${survey.slug}"...`);
    const items = Array.from({ length: COUNT }, (_, i) =>
      generateSubmission(survey, i),
    );
    insertAll(items);
    console.log(`Done: ${COUNT} submissions inserted.`);
  }

  db.close();
  console.log("Database closed.");
}

seed();

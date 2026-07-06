import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const templatePath = path.join(publicDir, "sw.js.tpl");
const outputPath = path.join(publicDir, "sw.js");

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const cacheName = `nukehub-${pkg.version}-${timestamp}`;

const template = fs.readFileSync(templatePath, "utf8");
const generated = template.replace(/__CACHE_NAME__/g, cacheName);

fs.writeFileSync(outputPath, generated, "utf8");
console.log(`Generated ${outputPath} with CACHE_NAME=${cacheName}`);

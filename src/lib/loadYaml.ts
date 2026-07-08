import fs from "node:fs";
import path from "node:path";
import { load } from "js-yaml";

export function loadYaml<T>(relativePath: string): T {
  const fullPath = path.resolve(process.cwd(), "src/modules", relativePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return load(content) as T;
}

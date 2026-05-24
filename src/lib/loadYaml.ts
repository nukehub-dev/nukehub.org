import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export function loadYaml<T>(relativePath: string): T {
  const fullPath = path.resolve(process.cwd(), 'src/data', relativePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return yaml.load(content) as T;
}

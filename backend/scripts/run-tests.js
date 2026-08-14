import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const testRoot = fileURLToPath(new URL('../test/', import.meta.url));

async function discover(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await discover(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.test.js')) files.push(fullPath);
  }
  return files.sort();
}

const testFiles = await discover(testRoot);
if (!testFiles.length) throw new Error(`No automated test files found under ${testRoot}`);

console.log(`Running ${testFiles.length} automated test files.`);
const result = spawnSync(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;

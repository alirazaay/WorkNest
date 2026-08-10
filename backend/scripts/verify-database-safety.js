import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const unsafePatterns = [/sequelize\.sync\s*\(/i, /alter\s*:\s*true/i, /force\s*:\s*true/i];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(target);
    else if (entry.name.endsWith('.js')) files.push(target);
  }
}

await collect(sourceRoot);
const violations = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (unsafePatterns.some(pattern => pattern.test(content))) violations.push(path.relative(process.cwd(), file));
}
if (violations.length) { console.error(JSON.stringify({ ok: false, unsafeFiles: violations }, null, 2)); process.exitCode = 1; }
else console.log(JSON.stringify({ ok: true, filesScanned: files.length, migrationOnlySchemaChanges: true, destructiveSyncDisabled: true }, null, 2));

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
if (process.env.ALLOW_ROLLBACK_TEST !== 'true') throw new Error('Refusing rollback test. Set ALLOW_ROLLBACK_TEST=true explicitly.');
await run(process.execPath, ['scripts/migrate.js', 'down'], { stdio: 'inherit' });
await run(process.execPath, ['scripts/migrate.js', 'up'], { stdio: 'inherit' });
console.log('Latest migration rollback and re-apply completed.');

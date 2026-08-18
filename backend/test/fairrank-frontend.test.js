import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('FairRank action result state belongs to the component that renders and updates it', async () => {
  const source = await readFile(new URL('../../src/pages/app/FairRankPage.jsx', import.meta.url), 'utf8');
  const componentStart = source.indexOf('function FairRankGroups');
  assert.notEqual(componentStart, -1);
  const componentSource = source.slice(componentStart);
  assert.match(componentSource, /const \[actionResult, setActionResult\] = useState\(null\)/);
  assert.match(componentSource, /setActionResult\(nextResult\)/);
  assert.match(componentSource, /actionResult\?\.type === 'calculation'/);
});

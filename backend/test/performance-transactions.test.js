import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = name => readFile(new URL(`../src/modules/performance/${name}`, import.meta.url), 'utf8');

test('critical FairRank mutations keep domain writes and audit writes transactional', async () => {
  const files = await Promise.all([
    source('performance.service.js'),
    source('reviews.service.js'),
    source('evidence.service.js'),
    source('promotion.service.js')
  ]);

  for (const file of files) {
    assert.match(file, /sequelize\.transaction\(/, 'critical mutation must use a Sequelize transaction');
    assert.match(file, /recordAudit\(/, 'critical mutation must retain audit logging');
  }
});

test('evidence verification imports the shared Sequelize connection', async () => {
  const file = await source('evidence.service.js');
  assert.match(file, /import \{ sequelize \} from ['"]\.\.\/\.\.\/config\/database\.js['"]/);
});

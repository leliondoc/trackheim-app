import console from 'node:console';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspect } from './check-public-output.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'public-output-guard-'));
try {
  fs.writeFileSync(path.join(dir, 'index.html'), '<h1>Public site</h1>');
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'assets/app.js'), 'console.log("public")');
  inspect(dir);
  for (const name of [
    '.env',
    '.env.production',
    '.npmrc',
    'id_rsa',
    'client.p12',
    'private.key',
  ]) {
    const file = path.join(dir, 'assets', name);
    fs.writeFileSync(file, 'fixture');
    assert.throws(() => inspect(dir), /Private files blocked/);
    fs.unlinkSync(file);
  }
  const disguised = path.join(dir, 'assets', 'public.txt');
  fs.writeFileSync(
    disguised,
    ['-----BEGIN', 'PRIVATE KEY-----'].join(' ') + '\nfixture',
  );
  assert.throws(() => inspect(dir), /Private files blocked/);
  fs.unlinkSync(disguised);
  inspect(dir);
  console.log('Public output guard regression checks passed');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

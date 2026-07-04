import { expect } from 'chai';
import { execFileSync } from 'child_process';
import { join } from 'path';

// NOTE: __dirname is unavailable here because mocha's loader resolves this
// .ts file via dynamic import() first; on Node versions with native
// TypeScript stripping (e.g. 22.19+) that path executes under ESM semantics
// even though the project otherwise runs as CommonJS via ts-node/register.
// Anchor on process.cwd() instead, which is stable because `pnpm test` /
// `mocha` are always invoked from the repo root (see .mocharc.json spec
// glob "test/**/*.test.ts").
const CLI = join(process.cwd(), 'bin', 'dev.js');

describe('piped stdin reaches input resolution (regression for oclif tryStdin race)', function () {
  this.timeout(60000);

  it('crypto encrypt reads piped stdin when no positional arg is given', () => {
    const seed = execFileSync(
      'node',
      [CLI, 'crypto', 'seed', '--output-mode', 'raw'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ).trim();
    const enc = execFileSync(
      'node',
      [CLI, 'crypto', 'encrypt', '--seed', seed, '--output-mode', 'raw'],
      {
        encoding: 'utf8',
        input: 'piped secret content',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    expect(enc.length).to.be.greaterThan(10);
    expect(enc).to.not.contain('piped secret content');
    const dec = execFileSync(
      'node',
      [CLI, 'crypto', 'decrypt', '--seed', seed, '--output-mode', 'raw'],
      {
        encoding: 'utf8',
        input: enc,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    expect(dec).to.equal('piped secret content');
  });
});

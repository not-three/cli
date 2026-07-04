import { expect } from 'chai';
import { execFileSync } from 'child_process';
import { join } from 'path';

// __dirname is unavailable here (mocha loads this file under ESM semantics on
// Node with native TS stripping) — anchor on the repo-root cwd like
// stdin-pipe.test.ts does.
const CLI = join(process.cwd(), 'bin', 'dev.js');

describe('root help', function () {
  this.timeout(60000);

  it('lists the license command last', () => {
    const out = execFileSync('node', [CLI, '--help'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const commandLines = out
      .slice(out.indexOf('COMMANDS'))
      .split('\n')
      .slice(1)
      .filter((l) => /^ {2}\S/.test(l));
    expect(commandLines.length).to.be.greaterThan(1);
    expect(commandLines[commandLines.length - 1]).to.match(/^ {2}license\b/);
  });
});

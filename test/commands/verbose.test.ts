import { expect } from 'chai';
import { execFileSync } from 'child_process';
import { join } from 'path';

// Use the shipped binary (bin/run.js), not bin/dev.js: oclif's "development"
// mode (used by dev.js) flips on settings.debug, which makes the default
// error handler print full stack traces unconditionally — masking the very
// bug this test guards against. bin/run.js reflects what actually ships,
// requiring `pnpm build` to have produced an up-to-date dist/.
// See test/commands/stdin-pipe.test.ts for why __dirname is unavailable here.
const CLI = join(process.cwd(), 'bin', 'run.js');

describe('--verbose stack traces (regression: oclif default handler swallows stacks)', function () {
  this.timeout(60000);

  it('prints a stack trace on stderr when --verbose is passed and exits non-zero', () => {
    let stderr = '';
    let failed = false;
    try {
      execFileSync(
        'node',
        [
          CLI,
          'crypto',
          'encrypt',
          'hi',
          '--seed',
          'bogus',
          '--output-mode',
          'simple',
          '--verbose',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (err) {
      failed = true;
      stderr = (err as { stderr: string }).stderr;
    }
    expect(failed, 'command should have failed').to.equal(true);
    expect(stderr).to.contain('at ');
  });

  it('does not print a stack trace on stderr without --verbose', () => {
    let stderr = '';
    let failed = false;
    try {
      execFileSync(
        'node',
        [
          CLI,
          'crypto',
          'encrypt',
          'hi',
          '--seed',
          'bogus',
          '--output-mode',
          'simple',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (err) {
      failed = true;
      stderr = (err as { stderr: string }).stderr;
    }
    expect(failed, 'command should have failed').to.equal(true);
    expect(stderr).to.not.contain('at ');
  });
});

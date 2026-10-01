import { expect } from 'chai';
import { createHash, randomBytes } from 'crypto';
import { ChildProcess, execFile, spawn } from 'child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import not3Sdk from '@not3/sdk';

const { Crypto, FragmentData, ShareGenerator } = not3Sdk;

const SMOKE = process.env.NOT3_SMOKE_SERVER;
const CLI = join(process.cwd(), 'bin', 'dev.js');
const execFileAsync = promisify(execFile);

function waitForShare(sender: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    let errors = '';
    const timeout = setTimeout(
      () => reject(new Error(`Sender did not share a link: ${errors}`)),
      30000,
    );
    sender.stdout?.on('data', (part: Buffer) => {
      output += part.toString();
      const url = output.match(/https?:\/\/\S+/)?.[0];
      if (url) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
    sender.stderr?.on('data', (part: Buffer) => {
      errors += part.toString();
    });
    sender.once('exit', (code) => {
      clearTimeout(timeout);
      reject(
        new Error(`Sender exited before sharing a link (${code}): ${errors}`),
      );
    });
  });
}

(SMOKE ? describe : describe.skip)('p2p smoke (real transfer)', function () {
  this.timeout(120000);

  it('sends and receives 3 MiB byte-identically', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-p2p-smoke-'));
    const input = join(dir, 'in.bin');
    const output = join(dir, 'out.bin');
    writeFileSync(input, randomBytes(3 * 1024 * 1024));
    const sender = spawn(
      process.execPath,
      [CLI, 'p2p', 'send', input, '-s', SMOKE!, '--output-mode', 'stdout'],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    try {
      const url = await waitForShare(sender);
      await execFileAsync(
        process.execPath,
        [
          CLI,
          'p2p',
          'receive',
          url,
          output,
          '-s',
          SMOKE!,
          '--output-mode',
          'raw',
        ],
        {
          cwd: process.cwd(),
          timeout: 90000,
        },
      );
      const senderExit = await new Promise<number | null>((resolve, reject) => {
        if (sender.exitCode !== null) return resolve(sender.exitCode);
        sender.once('error', reject);
        sender.once('exit', resolve);
      });
      expect(senderExit).to.equal(0);
      const inputHash = createHash('sha256')
        .update(readFileSync(input))
        .digest('hex');
      const outputHash = createHash('sha256')
        .update(readFileSync(output))
        .digest('hex');
      expect(outputHash).to.equal(inputHash);
      process.stdout.write(
        `P2P smoke SHA256 input=${inputHash} output=${outputHash}\n`,
      );
    } finally {
      if (sender.exitCode === null) sender.kill('SIGTERM');
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

(SMOKE ? describe : describe.skip)(
  'p2p restart and resume (real transfer)',
  function () {
    this.timeout(120000);

    it('resumes with a reused seed after rejecting a wrong seed', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'not3-p2p-resume-'));
      const input = join(dir, 'in.bin');
      const output = join(dir, 'out.bin');
      writeFileSync(input, randomBytes(1024 * 1024));
      const spawnSender = (seed?: string) =>
        spawn(
          process.execPath,
          [
            CLI,
            'p2p',
            'send',
            input,
            '-s',
            SMOKE!,
            '--output-mode',
            'stdout',
            ...(seed ? ['--seed', seed] : []),
          ],
          { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
        );
      let sender = spawnSender();
      try {
        const firstLink = await waitForShare(sender);
        const seed = FragmentData.fromURL(firstLink).seed;
        await execFileAsync(
          process.execPath,
          [CLI, 'p2p', 'receive', firstLink, output, '--output-mode', 'raw'],
          {
            cwd: process.cwd(),
            timeout: 90000,
          },
        );
        if (sender.exitCode === null) {
          sender.kill('SIGTERM');
          await new Promise<void>((resolve) =>
            sender.once('exit', () => resolve()),
          );
        }
        truncateSync(output, 32 * 1024 + 17);
        sender = spawnSender(seed);
        const restartLink = await waitForShare(sender);
        expect(FragmentData.fromURL(restartLink).seed).to.equal(seed);
        expect(new URL(restartLink).pathname).to.not.equal(
          new URL(firstLink).pathname,
        );

        const wrongLink = new ShareGenerator({
          uiUrl: 'https://not-th.re/',
          apiUrl: SMOKE! + '/',
          storeServer: true,
        }).p2pUi(
          new URL(restartLink).pathname.split('/').pop()!,
          Crypto.generateSeed(),
        );
        let wrongSucceeded = false;
        try {
          await execFileAsync(
            process.execPath,
            [
              CLI,
              'p2p',
              'receive',
              wrongLink,
              join(dir, 'wrong.bin'),
              '--output-mode',
              'raw',
            ],
            {
              cwd: process.cwd(),
              timeout: 20000,
            },
          );
          wrongSucceeded = true;
        } catch (error) {
          expect((error as Error).message).to.match(/seed|auth|handshake/i);
        }
        expect(wrongSucceeded).to.equal(false);

        await execFileAsync(
          process.execPath,
          [
            CLI,
            'p2p',
            'receive',
            restartLink,
            output,
            '--resume',
            '--output-mode',
            'raw',
          ],
          {
            cwd: process.cwd(),
            timeout: 90000,
          },
        );
        const inputHash = createHash('sha256')
          .update(readFileSync(input))
          .digest('hex');
        const outputHash = createHash('sha256')
          .update(readFileSync(output))
          .digest('hex');
        expect(outputHash).to.equal(inputHash);
        process.stdout.write(
          `P2P resume SHA256 input=${inputHash} output=${outputHash}\n`,
        );
      } finally {
        if (sender.exitCode === null) sender.kill('SIGTERM');
        rmSync(dir, { recursive: true, force: true });
      }
    });
  },
);

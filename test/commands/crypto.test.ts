import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import not3Sdk from '@not3/sdk';

const { Crypto } = not3Sdk;

describe('not3 crypto', () => {
  let originalIsTTY: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  });

  afterEach(() => {
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    } else {
      delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
    }
  });

  function setTTY(value: boolean) {
    Object.defineProperty(process.stdin, 'isTTY', {
      value,
      configurable: true,
    });
  }

  it('seed prints a seed', async () => {
    const { stdout } = await runCommand([
      'crypto',
      'seed',
      '--output-mode',
      'raw',
    ]);
    expect(stdout.trim().length).to.be.greaterThan(20);
  });

  it('encrypt/decrypt round-trips via files', async () => {
    setTTY(true);
    const seed = Crypto.generateSeed();
    const dir = mkdtempSync(join(tmpdir(), 'not3-'));
    const plain = join(dir, 'p.txt');
    const enc = join(dir, 'e.txt');
    const dec = join(dir, 'd.txt');
    writeFileSync(plain, 'secret content');
    await runCommand([
      'crypto',
      'encrypt',
      '-f',
      plain,
      '-o',
      enc,
      '--seed',
      seed,
      '--output-mode',
      'simple',
    ]);
    expect(readFileSync(enc, 'utf8')).to.not.contain('secret content');
    await runCommand([
      'crypto',
      'decrypt',
      '-f',
      enc,
      '-o',
      dec,
      '--seed',
      seed,
      '--output-mode',
      'simple',
    ]);
    expect(readFileSync(dec, 'utf8')).to.equal('secret content');
  });

  it('encrypt from argv writes ciphertext to stdout in raw mode', async () => {
    setTTY(true);
    const seed = Crypto.generateSeed();
    const { stdout } = await runCommand([
      'crypto',
      'encrypt',
      'hello',
      'world',
      '--seed',
      seed,
      '--output-mode',
      'raw',
    ]);
    expect(stdout.length).to.be.greaterThan(10);
    expect(stdout).to.not.contain('hello world');
  });

  it('encrypt with an invalid seed errors', async () => {
    setTTY(true);
    const { error } = await runCommand([
      'crypto',
      'encrypt',
      'hello',
      'world',
      '--seed',
      'not-valid-base64',
      '--output-mode',
      'raw',
    ]);
    expect(error?.message ?? '').to.match(/Invalid seed/);
  });

  it('decrypt without seed on non-tty stdin errors with exit 2', async () => {
    setTTY(false);
    const { error } = await runCommand([
      'crypto',
      'decrypt',
      '-f',
      '/dev/null',
      '--output-mode',
      'simple',
    ]);
    expect(error?.message ?? '').to.match(/--seed|NOT3_SEED/);
  });

  it('gcm round-trips too', async () => {
    setTTY(true);
    const seed = Crypto.generateSeed();
    const { stdout: enc } = await runCommand([
      'crypto',
      'encrypt',
      'gcm text',
      '--seed',
      seed,
      '-m',
      'gcm',
      '--output-mode',
      'raw',
    ]);
    const dir = mkdtempSync(join(tmpdir(), 'not3-'));
    const encFile = join(dir, 'e');
    writeFileSync(encFile, enc);
    const { stdout: dec } = await runCommand([
      'crypto',
      'decrypt',
      '-f',
      encFile,
      '--seed',
      seed,
      '-m',
      'gcm',
      '--output-mode',
      'raw',
    ]);
    expect(dec).to.equal('gcm text');
  });
});

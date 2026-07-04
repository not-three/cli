import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import not3Sdk from '@not3/sdk';

const { Crypto } = not3Sdk;

describe('not3 crypto edit', () => {
  let originalIsTTY: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalIsTTY) {
      Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
    } else {
      delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
    }
  });

  it('round-trips a file through a fake editor', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-edit-'));
    const encFile = join(dir, 'note.enc');
    const editor = join(dir, 'editor.sh');
    writeFileSync(editor, '#!/bin/sh\nprintf "edited content" > "$1"\n');
    chmodSync(editor, 0o755);

    const seed = Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, 'cbc');
    writeFileSync(encFile, await Crypto.encrypt('original', key, 'cbc'));

    const { error } = await runCommand([
      'crypto',
      'edit',
      encFile,
      '--seed',
      seed,
      '-e',
      editor,
      '--output-mode',
      'simple',
    ]);
    expect(error).to.equal(undefined);

    const dec = await Crypto.decrypt(readFileSync(encFile, 'utf8'), key, 'cbc');
    expect(dec).to.equal('edited content');
  });

  it('errors when no editor can be found', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-edit-'));
    const encFile = join(dir, 'note.enc');
    const seed = Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, 'cbc');
    writeFileSync(encFile, await Crypto.encrypt('original', key, 'cbc'));
    const oldPath = process.env.PATH;
    const oldEditor = process.env.EDITOR;
    process.env.PATH = dir;
    delete process.env.EDITOR;
    try {
      const { error } = await runCommand([
        'crypto',
        'edit',
        encFile,
        '--seed',
        seed,
        '--output-mode',
        'simple',
      ]);
      expect(error?.message ?? '').to.match(/editor/i);
    } finally {
      process.env.PATH = oldPath;
      if (oldEditor) process.env.EDITOR = oldEditor;
    }
  });

  it('fails cleanly and removes the temp file when the editor cannot be spawned', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-edit-'));
    const encFile = join(dir, 'note.enc');
    const seed = Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, 'cbc');
    writeFileSync(encFile, await Crypto.encrypt('original', key, 'cbc'));

    const before = readdirSync(tmpdir()).filter((f) =>
      f.startsWith('not3-edit-'),
    );

    const { error } = await runCommand([
      'crypto',
      'edit',
      encFile,
      '--seed',
      seed,
      '-e',
      '/nonexistent/editor-binary',
      '--output-mode',
      'simple',
    ]);
    expect(error?.message ?? '').to.match(/Failed to start editor/);

    const after = readdirSync(tmpdir()).filter((f) =>
      f.startsWith('not3-edit-'),
    );
    expect(after).to.deep.equal(before);

    const dec = await Crypto.decrypt(readFileSync(encFile, 'utf8'), key, 'cbc');
    expect(dec).to.equal('original');
  });
});

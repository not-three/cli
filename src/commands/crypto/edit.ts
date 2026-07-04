import { Args } from '@oclif/core';
import { Crypto } from '@not3/sdk';
import { spawn, spawnSync } from 'child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BaseCommand } from '../../base.command';
import { UsageError } from '../../lib/errors';
import { editorFlag, modeFlag, outputFlag, seedFlag } from '../../lib/flags';
import { resolveSeed } from '../../lib/input';

function onPath(cmd: string): boolean {
  return spawnSync('which', [cmd]).status === 0;
}

function findEditor(preferred?: string): string {
  if (preferred) return preferred;
  if (process.env.EDITOR && onPath(process.env.EDITOR))
    return process.env.EDITOR;
  for (const candidate of ['nano', 'vim', 'vi']) {
    if (onPath(candidate)) return candidate;
  }
  throw new UsageError(
    'No terminal editor found; pass one with -e/--editor or set NOT3_EDITOR',
  );
}

export default class CryptoEdit extends BaseCommand {
  static description = 'Edit a locally stored encrypted file in your editor';
  static args = {
    file: Args.string({
      required: true,
      description: 'Encrypted file to edit',
    }),
  };
  static flags = {
    ...BaseCommand.baseFlags,
    seed: seedFlag,
    mode: modeFlag,
    output: outputFlag,
    editor: editorFlag,
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CryptoEdit);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);
    const seed = await resolveSeed(flags.seed);
    const key = await Crypto.generateKey(seed, s.mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const dec = await Crypto.decrypt(
      readFileSync(args.file, 'utf8'),
      key,
      s.mode,
    ).catch(() => {
      throw new Error('Decryption failed (wrong seed or crypto mode?)');
    });

    const editor = findEditor(s.editor);
    const tempFile = join(
      tmpdir(),
      `not3-edit-${process.pid}-${Math.random().toString(36).slice(2)}.txt`,
    );
    writeFileSync(tempFile, dec, { mode: 0o600 });
    try {
      const code = await new Promise<number>((resolve, reject) => {
        const child = spawn(editor, [tempFile], { stdio: 'inherit' });
        child.on('error', (err) =>
          reject(
            new UsageError(
              `Failed to start editor "${editor}": ${err.message}`,
            ),
          ),
        );
        child.on('exit', (c) => resolve(c ?? 1));
      });
      if (code !== 0)
        throw new Error(
          `Editor exited with code ${code}, aborting (file unchanged)`,
        );
      const edited = readFileSync(tempFile, 'utf8');
      const enc = await Crypto.encrypt(edited, key, s.mode);
      const target = flags.output ?? args.file;
      writeFileSync(target, enc);
      reporter.info(`Encrypted and saved to ${target}`);
    } finally {
      try {
        unlinkSync(tempFile);
      } catch {
        /* already gone */
      }
    }
  }
}

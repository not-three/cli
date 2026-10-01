import { Args } from '@oclif/core';
import { Crypto } from '@not3/sdk';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BaseCommand } from '../../base.command';
import { findEditor, openEditor } from '../../lib/editor';
import { editorFlag, modeFlag, outputFlag, seedFlag } from '../../lib/flags';
import { resolveSeed } from '../../lib/input';

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
      await openEditor(editor, tempFile);
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

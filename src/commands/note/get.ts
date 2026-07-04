import { Args } from '@oclif/core';
import { Crypto } from '@not3/sdk';
import { writeFileSync } from 'fs';
import { BaseCommand } from '../../base.command';
import { modeFlag, outputFlag, seedFlag, serverFlags } from '../../lib/flags';
import { resolveSeed } from '../../lib/input';

export default class NoteGet extends BaseCommand {
  static description = 'Fetch and decrypt a note from the server';
  static aliases = ['g'];
  static hiddenAliases = ['q'];
  static args = { id: Args.string({ required: true, description: 'Note ID' }) };
  static flags = {
    ...BaseCommand.baseFlags,
    ...serverFlags,
    seed: seedFlag,
    mode: modeFlag,
    output: outputFlag,
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(NoteGet);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);
    const seed = await resolveSeed(flags.seed);
    const api = await this.makeApi(s);
    const note = await api.notes().get(args.id);
    const key = await Crypto.generateKey(seed, s.mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const content = await Crypto.decrypt(note.content, key, s.mode).catch(
      () => {
        throw new Error('Decryption failed (wrong seed or crypto mode?)');
      },
    );
    if (flags.output) {
      writeFileSync(flags.output, content);
      reporter.info(`Saved to ${flags.output}`);
    } else {
      reporter.result(content);
    }
  }
}

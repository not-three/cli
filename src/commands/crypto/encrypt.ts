import { Args } from '@oclif/core';
import { Crypto } from '@not3/sdk';
import { writeFileSync } from 'fs';
import { BaseCommand } from '../../base.command';
import { fileFlag, modeFlag, outputFlag, seedFlag } from '../../lib/flags';
import { resolveTextInput } from '../../lib/input';

export default class CryptoEncrypt extends BaseCommand {
  static description = 'Encrypt text locally (arguments, --file, or stdin)';
  static strict = false;
  static args = {
    input: Args.string({
      description: 'Text to encrypt',
      ignoreStdin: true,
    }),
  };
  static flags = {
    ...BaseCommand.baseFlags,
    seed: seedFlag,
    mode: modeFlag,
    file: fileFlag,
    output: outputFlag,
  };

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(CryptoEncrypt);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);
    const content = await resolveTextInput({
      file: flags.file,
      argv: argv as string[],
    });
    const seed = flags.seed ?? Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, s.mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const enc = await Crypto.encrypt(content, key, s.mode);
    if (!flags.seed) reporter.info(`seed: ${seed}`);
    if (flags.output) {
      writeFileSync(flags.output, enc);
      reporter.info(`Encrypted to ${flags.output}`);
    } else {
      reporter.result(enc);
    }
  }
}

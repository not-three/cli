import { Crypto } from '@not3/sdk';
import { writeFileSync } from 'fs';
import { BaseCommand } from '../../base.command';
import { fileFlag, modeFlag, outputFlag, seedFlag } from '../../lib/flags';
import { resolveSeed, resolveTextInput } from '../../lib/input';

export default class CryptoDecrypt extends BaseCommand {
  static description = 'Decrypt text locally (--file or stdin)';
  static flags = {
    ...BaseCommand.baseFlags,
    seed: seedFlag,
    mode: modeFlag,
    file: fileFlag,
    output: outputFlag,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(CryptoDecrypt);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);
    const seed = await resolveSeed(flags.seed);
    const content = await resolveTextInput({ file: flags.file, argv: [] });
    const key = await Crypto.generateKey(seed, s.mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const dec = await Crypto.decrypt(content, key, s.mode).catch(() => {
      throw new Error('Decryption failed (wrong seed or crypto mode?)');
    });
    if (flags.output) {
      writeFileSync(flags.output, dec);
      reporter.info(`Decrypted to ${flags.output}`);
    } else {
      reporter.result(dec);
    }
  }
}

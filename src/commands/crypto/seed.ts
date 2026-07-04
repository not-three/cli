import { Crypto } from '@not3/sdk';
import { BaseCommand } from '../../base.command';

export default class CryptoSeed extends BaseCommand {
  static description = 'Generate a new encryption seed';
  static flags = BaseCommand.baseFlags;

  async run(): Promise<void> {
    const { flags } = await this.parse(CryptoSeed);
    const s = this.resolveFrom(flags);
    this.makeReporter(s).result(Crypto.generateSeed());
  }
}

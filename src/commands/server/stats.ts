import { BaseCommand } from '../../base.command';
import { serverFlags, statsPasswordFlag } from '../../lib/flags';

export default class ServerStats extends BaseCommand {
  static description = 'Show usage statistics of the API server';
  static flags = {
    ...BaseCommand.baseFlags,
    ...serverFlags,
    'stats-password': statsPasswordFlag,
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ServerStats);
    const s = this.resolveFrom(flags);
    const api = await this.makeApi(s);
    this.makeReporter(s).json(await api.system().stats(s.statsPassword));
  }
}

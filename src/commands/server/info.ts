import { BaseCommand } from '../../base.command';
import { serverFlags } from '../../lib/flags';

export default class ServerInfo extends BaseCommand {
  static description = 'Show meta information about the API server';
  static flags = { ...BaseCommand.baseFlags, ...serverFlags };

  async run(): Promise<void> {
    const { flags } = await this.parse(ServerInfo);
    const s = this.resolveFrom(flags);
    const api = await this.makeApi(s);
    this.makeReporter(s).json(await api.system().info());
  }
}

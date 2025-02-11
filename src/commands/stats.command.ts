import { Command } from 'nest-commander';
import { BaseCommandRunner } from 'src/base.command';

@Command({
  name: 'stats',
  description: 'Show usage statistics of the server',
})
export class StatsCommand extends BaseCommandRunner {
  async run(params: string[], options: Record<string, any>) {
    const api = await this.getApi(options);
    const stats = await api.system().stats(options.password);
    console.log(JSON.stringify(stats, null, 2));
  }
}

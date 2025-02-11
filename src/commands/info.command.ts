import { Command } from 'nest-commander';
import { BaseCommandRunner } from 'src/base.command';

@Command({
  name: 'info',
  description: 'Show meta information about the api',
})
export class InfoCommand extends BaseCommandRunner {
  async run(params: string[], options: Record<string, any>) {
    const api = await this.getApi(options);
    const info = await api.system().info();
    console.log(JSON.stringify(info, null, 2));
  }
}

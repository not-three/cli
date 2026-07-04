import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base.command';
import { loadConfig, Not3Config } from '../../lib/config';

export default class ConfigList extends BaseCommand {
  static description = 'Show the stored config file contents';
  static flags = {
    ...BaseCommand.baseFlags,
    'show-secrets': Flags.boolean({
      description: 'Do not mask stored passwords',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigList);
    const cfg = loadConfig(this.config.configDir);
    const shown: Not3Config = JSON.parse(JSON.stringify(cfg));
    if (!flags['show-secrets'] && shown.servers) {
      for (const entry of Object.values(shown.servers)) {
        if (entry.password) entry.password = '••••';
      }
    }
    this.log(JSON.stringify(shown, null, 2));
  }
}

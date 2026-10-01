import { Args } from '@oclif/core';
import { BaseCommand } from '../../base.command';
import { CONFIG_KEYS, ConfigKey } from '../../lib/config';
import { serverFlags } from '../../lib/flags';

export default class ConfigGet extends BaseCommand {
  static description = 'Print the resolved value of a config key';
  static args = {
    key: Args.string({
      required: true,
      description: `One of: ${CONFIG_KEYS.join(', ')}`,
    }),
  };
  static flags = { ...BaseCommand.baseFlags, server: serverFlags.server };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigGet);
    const key = args.key as ConfigKey;
    if (!CONFIG_KEYS.includes(key)) {
      this.error(
        `Unknown key "${args.key}". Valid keys: ${CONFIG_KEYS.join(', ')}`,
        { exit: 2 },
      );
    }
    const s = this.resolveFrom(flags);
    if (key === 'password' || key === 'statsPassword') {
      this.log(s[key] ? '••••' : '(not set)');
      return;
    }
    const value = s[key as Exclude<ConfigKey, 'password' | 'statsPassword'>];
    this.log(value === undefined ? '(not set)' : String(value));
  }
}

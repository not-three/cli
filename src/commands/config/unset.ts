import { Args } from '@oclif/core';
import { BaseCommand } from '../../base.command';
import {
  CONFIG_KEYS,
  ConfigKey,
  DEFAULTS,
  loadConfig,
  normalizeServerUrl,
  saveConfig,
} from '../../lib/config';
import { serverFlags } from '../../lib/flags';

export default class ConfigUnset extends BaseCommand {
  static description = 'Remove a key from the global config file';
  static args = {
    key: Args.string({
      required: true,
      description: `One of: ${CONFIG_KEYS.join(', ')}`,
    }),
  };
  static flags = { ...BaseCommand.baseFlags, server: serverFlags.server };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigUnset);
    const key = args.key as ConfigKey;
    if (!CONFIG_KEYS.includes(key)) {
      this.error(
        `Unknown key "${args.key}". Valid keys: ${CONFIG_KEYS.join(', ')}`,
        { exit: 2 },
      );
    }
    const cfg = loadConfig(this.config.configDir);
    if (key === 'password' || key === 'statsPassword') {
      const server = normalizeServerUrl(
        flags.server ?? cfg.server ?? DEFAULTS.server,
      );
      if (cfg.servers?.[server]) {
        delete cfg.servers[server][key];
        if (Object.keys(cfg.servers[server]).length === 0)
          delete cfg.servers[server];
      }
    } else {
      delete cfg[key];
    }
    saveConfig(this.config.configDir, cfg);
    this.log(`Unset ${key}`);
  }
}

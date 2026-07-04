import { Args } from '@oclif/core';
import { BaseCommand } from '../../base.command';
import {
  CONFIG_KEYS,
  ConfigKey,
  CryptoMode,
  DEFAULTS,
  loadConfig,
  normalizeServerUrl,
  OutputModeSetting,
  saveConfig,
} from '../../lib/config';
import { serverFlags } from '../../lib/flags';

const OUTPUT_MODES = ['auto', 'pretty', 'simple', 'stdout', 'raw'];

export default class ConfigSet extends BaseCommand {
  static description = 'Set a value in the global config file';
  static args = {
    key: Args.string({
      required: true,
      description: `One of: ${CONFIG_KEYS.join(', ')}`,
    }),
    value: Args.string({ required: true }),
  };
  static flags = { ...BaseCommand.baseFlags, server: serverFlags.server };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigSet);
    const key = args.key as ConfigKey;
    if (!CONFIG_KEYS.includes(key)) {
      this.error(
        `Unknown key "${args.key}". Valid keys: ${CONFIG_KEYS.join(', ')}`,
        { exit: 2 },
      );
    }
    const cfg = loadConfig(this.config.configDir);
    switch (key) {
      case 'password': {
        const server = normalizeServerUrl(
          flags.server ?? cfg.server ?? DEFAULTS.server,
        );
        cfg.servers = { ...cfg.servers, [server]: { password: args.value } };
        break;
      }
      case 'server':
        cfg.server = normalizeServerUrl(args.value);
        break;
      case 'mode':
        if (!['cbc', 'gcm'].includes(args.value))
          this.error('mode must be cbc or gcm', { exit: 2 });
        cfg.mode = args.value as CryptoMode;
        break;
      case 'versionCheck':
        if (!['true', 'false'].includes(args.value))
          this.error('versionCheck must be true or false', { exit: 2 });
        cfg.versionCheck = args.value === 'true';
        break;
      case 'outputMode':
        if (!OUTPUT_MODES.includes(args.value))
          this.error(`outputMode must be one of: ${OUTPUT_MODES.join(', ')}`, {
            exit: 2,
          });
        cfg.outputMode = args.value as OutputModeSetting;
        break;
      case 'editor':
        cfg.editor = args.value;
        break;
      case 'uiUrl':
        cfg.uiUrl = args.value;
        break;
    }
    saveConfig(this.config.configDir, cfg);
    this.log(`Set ${key}${key === 'password' ? ' (bound to its server)' : ''}`);
  }
}

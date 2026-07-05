import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'fs';
import { join } from 'path';
import { UsageError } from './errors';

export type CryptoMode = 'cbc' | 'gcm';
export type OutputModeSetting = 'auto' | 'pretty' | 'simple' | 'stdout' | 'raw';

export interface Not3Config {
  server?: string;
  servers?: Record<string, { password?: string }>;
  mode?: CryptoMode;
  editor?: string;
  versionCheck?: boolean;
  uiUrl?: string;
  outputMode?: OutputModeSetting;
}

export const DEFAULTS = {
  server: 'https://api.not-th.re',
  mode: 'cbc' as CryptoMode,
  versionCheck: true,
  uiUrl: 'https://not-th.re/',
  outputMode: 'auto' as OutputModeSetting,
};

export const CONFIG_KEYS = [
  'server',
  'password',
  'mode',
  'editor',
  'versionCheck',
  'uiUrl',
  'outputMode',
] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

export function normalizeServerUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UsageError(`Invalid server URL: ${raw}`);
  }
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.host}${path}`;
}

export function configFile(configDir: string): string {
  return join(configDir, 'config.json');
}

export function loadConfig(configDir: string): Not3Config {
  const file = configFile(configDir);
  if (!existsSync(file)) return {};
  const text = readFileSync(file, 'utf8');
  try {
    return JSON.parse(text) as Not3Config;
  } catch {
    throw new Error(`Config file ${file} is not valid JSON, fix or delete it`);
  }
}

export function saveConfig(configDir: string, cfg: Not3Config): void {
  mkdirSync(configDir, { recursive: true, mode: 0o700 });
  chmodSync(configDir, 0o700);
  const file = configFile(configDir);
  writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
  chmodSync(file, 0o600);
}

export interface FlagSettings {
  server?: string;
  password?: string;
  mode?: CryptoMode;
  editor?: string;
  outputMode?: OutputModeSetting;
  noVersionCheck?: boolean;
}

export interface ResolvedSettings {
  server: string;
  password?: string;
  mode: CryptoMode;
  editor?: string;
  versionCheck: boolean;
  uiUrl: string;
  outputMode: OutputModeSetting;
}

export function resolveSettings(
  cfg: Not3Config,
  flags: FlagSettings,
): ResolvedSettings {
  const server = normalizeServerUrl(
    flags.server ?? cfg.server ?? DEFAULTS.server,
  );
  const stored = cfg.servers?.[server]?.password;
  return {
    server,
    password: flags.password ?? stored,
    mode: flags.mode ?? cfg.mode ?? DEFAULTS.mode,
    editor: flags.editor ?? cfg.editor,
    versionCheck: flags.noVersionCheck
      ? false
      : (cfg.versionCheck ?? DEFAULTS.versionCheck),
    uiUrl: cfg.uiUrl ?? DEFAULTS.uiUrl,
    outputMode: flags.outputMode ?? cfg.outputMode ?? DEFAULTS.outputMode,
  };
}

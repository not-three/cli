import { Command, Flags } from '@oclif/core';
import { Not3Client } from '@not3/sdk';
import { createApi } from './lib/api';
import {
  CryptoMode,
  loadConfig,
  Not3Config,
  OutputModeSetting,
  ResolvedSettings,
  resolveSettings,
} from './lib/config';
import { IncompatibleServerError, UsageError } from './lib/errors';
import { Reporter, resolveOutputMode } from './lib/reporter';

export abstract class BaseCommand extends Command {
  static baseFlags = {
    'output-mode': Flags.string({
      description: 'Output style',
      options: ['auto', 'pretty', 'simple', 'stdout', 'raw'],
      env: 'NOT3_OUTPUT_MODE',
    }),
    verbose: Flags.boolean({
      description: 'Show full stack traces on errors',
      env: 'NOT3_VERBOSE',
    }),
  };

  private verbose = false;

  protected userConfig(): Not3Config {
    return loadConfig(this.config.configDir);
  }

  protected resolveFrom(flags: Record<string, unknown>): ResolvedSettings {
    this.verbose = Boolean(flags.verbose);
    return resolveSettings(this.userConfig(), {
      server: flags.server as string | undefined,
      password: flags.password as string | undefined,
      mode: flags.mode as CryptoMode | undefined,
      editor: flags.editor as string | undefined,
      outputMode: flags['output-mode'] as OutputModeSetting | undefined,
      noVersionCheck: Boolean(flags['no-version-check']),
    });
  }

  protected makeReporter(s: ResolvedSettings): Reporter {
    return new Reporter(
      resolveOutputMode(s.outputMode, Boolean(process.stdout.isTTY)),
    );
  }

  protected makeApi(s: ResolvedSettings): Promise<Not3Client> {
    return createApi({
      server: s.server,
      password: s.password,
      versionCheck: s.versionCheck,
    });
  }

  protected async catch(
    err: Error & { exitCode?: number; isAxiosError?: boolean },
  ): Promise<never> {
    const verbose =
      this.verbose ||
      process.argv.includes('--verbose') ||
      Boolean(process.env.NOT3_VERBOSE);
    if (verbose) {
      process.stderr.write((err.stack ?? String(err)) + '\n');
      this.exit(1);
    }
    if (err instanceof UsageError) this.error(err.message, { exit: 2 });
    if (err instanceof IncompatibleServerError)
      this.error(err.message, { exit: 1 });
    if (err.isAxiosError) {
      const res = (
        err as unknown as {
          response?: { status: number; data?: { message?: string } };
        }
      ).response;
      const detail = res
        ? `${res.status}${res.data?.message ? ` ${res.data.message}` : ''}`
        : err.message;
      this.error(`Request failed: ${detail}`, { exit: 1 });
    }
    throw err;
  }
}

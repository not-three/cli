import { Not3Client } from '@not3/sdk';
import { CommandRunner, Option } from 'nest-commander';
import { CommonService } from './common.service';

export class BaseCommandRunner extends CommandRunner {
  constructor(protected readonly common: CommonService) {
    super();
  }

  @Option({
    flags: '-s, --server <url>',
    description: 'Server URL',
    name: 'server',
    defaultValue: 'https://api.not-th.re',
  })
  parseServer(url: string) {
    return url;
  }

  @Option({
    flags: '-p, --password <password>',
    name: 'password',
    description: 'Password for the server',
  })
  parsePassword(password: string) {
    return password;
  }

  @Option({
    flags: '--no-version-check',
    name: 'noVersionCheck',
    description: 'Disable version check',
  })
  parseNoVersionCheck() {
    return true;
  }

  protected async getApi(options: Record<string, any>) {
    const api = new Not3Client({
      baseUrl: options.server,
      password: options.password,
    });
    const sysApi = api.system();
    if (!options.noVersionCheck && !(await api.isCompatible(sysApi))) {
      console.error('Server is not compatible with this client');
      console.error('Server version:', (await sysApi.info()).version);
      console.error('Compatible version:', api.getVersionRange());
      process.exit(1);
    }
    return api;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(params: string[], options: Record<string, any>): Promise<void> {
    throw new Error('Method not implemented');
  }
}

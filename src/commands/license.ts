import { Command } from '@oclif/core';
import license from '../license.json';

export default class License extends Command {
  static description =
    'Show the license of this tool and all bundled dependencies';

  async run(): Promise<void> {
    process.stdout.write(license.value);
  }
}

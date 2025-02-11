import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'license',
  description: 'Show information about the license of the software',
})
export class LicenseCommand extends CommandRunner {
  async run() {}
}

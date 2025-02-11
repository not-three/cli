import { Command, CommandRunner } from 'nest-commander';
import { Crypto } from '@not3/sdk';

@Command({
  name: 'seed',
  description: 'Generate a new encryption seed',
})
export class SeedCommand extends CommandRunner {
  async run() {
    process.stdout.write(Crypto.generateSeed());
  }
}

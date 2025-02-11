import { Crypto } from '@not3/sdk';
import { Command, Option } from 'nest-commander';
import { BaseCommandRunner } from 'src/base.command';

@Command({
  name: 'query',
  aliases: ['q'],
  description: 'Decrypt and show a note from the server',
  arguments: '<id> <seed>',
})
export class QueryCommand extends BaseCommandRunner {
  @Option({
    flags: '-m, --crypto-mode <mode>',
    description: 'Crypto mode',
    name: 'mode',
    choices: ['cbc', 'gcm'],
    defaultValue: 'cbc',
  })
  parseMode(mode: string) {
    return mode;
  }

  async run(params: string[], options: Record<string, any>) {
    const api = await this.getApi(options);
    const note = await api.notes().get(params[0]);
    const key = await Crypto.generateKey(params[1], options.mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const content = await Crypto.decrypt(note.content, key, options.mode);
    process.stdout.write(content);
  }
}

import { Crypto } from '@not3/sdk';
import { readFileSync } from 'fs';
import { Command, Option } from 'nest-commander';
import { BaseCommandRunner } from 'src/base.command';

@Command({
  name: 'save',
  aliases: ['s'],
  description: 'Encrypt and save a note on the server',
  arguments: '[content...]',
})
export class SaveCommand extends BaseCommandRunner {
  @Option({
    flags: '-m, --crypto-mode <mode>',
    description: 'Crypto mode',
    choices: ['cbc', 'gcm'],
    defaultValue: 'cbc',
  })
  parseMode(mode: string) {
    return mode;
  }

  @Option({
    flags: '--seed <seed>',
    description: 'Seed for encryption',
  })
  parseSeed(seed: string) {
    return seed;
  }

  @Option({
    flags: '-f, --read-from-file <file>',
    name: 'file',
    description: 'Read the input from a file',
  })
  parseFile(file: string) {
    return file;
  }

  async run(params: string[], options: Record<string, any>) {
    const api = await this.getApi(options);
    const seed = options.seed || Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, options.mode).catch(() => {
      throw new Error('Invalid seed');
    });

    let content: string;
    if (options.file) {
      content = readFileSync(options.file).toString();
    } else if (!process.stdin.isTTY) {
      content = await new Promise<string>((resolve) => {
        let data = '';
        process.stdin.on('data', (chunk) => {
          data += chunk;
        });
        process.stdin.on('end', () => {
          resolve(data);
        });
      });
    } else if (params.length) {
      content = params.join(' ');
    } else {
      throw new Error('No input provided');
    }

    const enc = await Crypto.encrypt(content, key, options.mode);
    const note = await api.notes().create({
      content: enc,
      expiresIn:
        (await api.system().info()).maxStorageTimeDays * 24 * 60 * 60 - 60,
      selfDestruct: false,
      mime: 'text/plain',
    });

    if (!options.seed) process.stderr.write(seed);
    process.stdout.write(note.id);
  }
}

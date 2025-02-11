import { Command, CommandRunner, Option } from 'nest-commander';
import { Crypto } from '@not3/sdk';
import { readFileSync, writeFileSync } from 'fs';

@Command({
  name: 'encrypt',
  description:
    'Encrypt something, if no input is provided, will read from stdin',
  arguments: '[input...]',
})
export class EncryptCommand extends CommandRunner {
  @Option({
    flags: '-m, --crypto-mode <mode>',
    name: 'crypto',
    description: 'Crypto mode',
    choices: ['cbc', 'gcm'],
    defaultValue: 'cbc',
  })
  parseMode(mode: string) {
    return mode;
  }

  @Option({
    flags: '-o, --output <output>',
    description: 'Output file, if not provided, will output to stdout',
  })
  parseOutput(output: string) {
    return output;
  }

  @Option({
    flags: '-f, --read-from-file <file>',
    name: 'file',
    description: 'Read the input from a file',
  })
  parseFile(file: string) {
    return file;
  }

  @Option({
    flags: '--seed <seed>',
    description: [
      'Seed for encryption, if not provided, will',
      'generate a new seed and print it to stderr',
    ].join(' '),
  })
  parseSeed(seed: string) {
    return seed;
  }

  async run(params: string[], options: Record<string, any>) {
    const seed = options.seed || Crypto.generateSeed();
    const mode = options.crypto || 'cbc';
    if (!['cbc', 'gcm'].includes(mode)) throw new Error('Invalid crypto mode');
    const key = await Crypto.generateKey(seed, mode).catch(() => {
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

    const enc = await Crypto.encrypt(content, key, mode);
    if (!options.seed) process.stderr.write(seed);
    if (options.output) writeFileSync(options.output, enc);
    else process.stdout.write(enc);
  }
}

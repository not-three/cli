import { Command, CommandRunner, Option } from 'nest-commander';
import { Crypto } from '@not3/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { CommonService } from 'src/common.service';

@Command({
  name: 'decrypt',
  description: 'Decrypt something',
  arguments: '<seed>',
})
export class DecryptCommand extends CommandRunner {
  constructor(private readonly common: CommonService) {
    super();
  }

  @Option({
    flags: '-m, --crypto-mode <mode>',
    description: 'Crypto mode',
    name: 'crypto',
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

  async run(params: string[], options: Record<string, any>) {
    const mode = options.crypto || 'cbc';
    if (!['cbc', 'gcm'].includes(mode)) throw new Error('Invalid crypto mode');
    const key = await Crypto.generateKey(params[0], mode).catch(() => {
      throw new Error('Invalid seed');
    });

    let content: string;
    if (options.file) {
      content = readFileSync(options.file, 'utf-8');
    } else if (!process.stdin.isTTY) {
      content = await new Promise((resolve) => {
        let data = '';
        process.stdin.on('data', (chunk) => {
          data += chunk;
        });
        process.stdin.on('end', () => {
          resolve(data);
        });
      });
    } else {
      throw new Error('No input provided');
    }

    const dec = await Crypto.decrypt(content, key, mode).catch((e) => {
      console.error(e);
      throw new Error('Decryption failed');
    });
    if (options.output) writeFileSync(options.output, dec);
    else process.stdout.write(dec);
  }
}

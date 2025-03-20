import { Command, CommandRunner, Option } from 'nest-commander';
import { Crypto } from '@not3/sdk';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn, spawnSync } from 'child_process';
import { CommonService } from 'src/common.service';
import { prompt } from 'enquirer';

@Command({
  name: 'edit',
  description: 'Edit an encrypted file',
  arguments: '<file>',
})
export class EditCommand extends CommandRunner {
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
    description: 'Output file, if not provided, will overwrite the input file',
  })
  parseOutput(output: string) {
    return output;
  }

  @Option({
    flags: '-e, --editor <editor>',
    description: 'Editor to use',
  })
  parseEditor(editor: string) {
    return editor;
  }

  @Option({
    flags: '-s, --seed <seed>',
    description: 'Seed for encryption/decryption',
  })
  parseSeed(seed: string) {
    return seed;
  }

  async run(params: string[], options: Record<string, any>) {
    if (!options.seed)
      options.seed = (
        (await prompt({
          type: 'password',
          name: 'seed',
          message: 'Seed for encryption/decryption',
        })) as any
      ).seed;
    const mode = options.crypto || 'cbc';
    if (!['cbc', 'gcm'].includes(mode)) throw new Error('Invalid crypto mode');
    const key = await Crypto.generateKey(options.seed, mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const content = readFileSync(params[0], 'utf-8');
    const dec = await Crypto.decrypt(content, key, mode).catch((e) => {
      console.error(e);
      throw new Error('Decryption failed');
    });
    const tempFile = join(tmpdir(), 'edit-' + Date.now() + '.txt');
    writeFileSync(tempFile, dec);

    let editorProcess;
    let tuiEditor = '';
    if (options.editor) tuiEditor = options.editor;
    else if (process.env.EDITOR) {
      const check = spawnSync('which', [process.env.EDITOR]);
      if (check.status === 0) tuiEditor = process.env.EDITOR;
    }
    if (!tuiEditor) {
      const candidates = ['nano', 'vim', 'vi'];
      for (const candidate of candidates) {
        const check = spawnSync('which', [candidate]);
        if (check.status === 0) {
          tuiEditor = candidate;
          break;
        }
      }
    }

    if (tuiEditor) {
      editorProcess = spawn(tuiEditor, [tempFile], { stdio: 'inherit' });
      await new Promise((resolve) => {
        editorProcess.on('exit', () => resolve(null));
      });
    } else {
      if (process.platform === 'win32')
        editorProcess = spawn('cmd', ['/c', 'start', tempFile], {
          stdio: 'inherit',
        });
      else if (process.platform === 'darwin')
        editorProcess = spawn('open', ['-W', tempFile], { stdio: 'inherit' });
      else editorProcess = spawn('xdg-open', [tempFile], { stdio: 'inherit' });
      process.stdout.write('Press enter when done editing...\n');
      const exitPromise = new Promise((resolve) => {
        editorProcess.on('exit', () => resolve(null));
      });
      const keyPromise = new Promise((resolve) => {
        process.stdin.resume();
        process.stdin.once('data', () => {
          if (editorProcess && !editorProcess.killed) editorProcess.kill();
          resolve(null);
        });
      });
      await Promise.race([exitPromise, keyPromise]);
      process.stdin.pause();
    }

    const edited = readFileSync(tempFile, 'utf-8');
    unlinkSync(tempFile);
    const encrypted = await Crypto.encrypt(edited, key, mode);
    writeFileSync(options.output || params[0], encrypted);
  }
}

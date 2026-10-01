import { Args, Flags } from '@oclif/core';
import { Crypto, FileUpload } from '@not3/sdk';
import { existsSync, mkdtempSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join, resolve } from 'path';
import { BaseCommand } from '../../base.command';
import { UsageError } from '../../lib/errors';
import { seedFlag, serverFlags } from '../../lib/flags';
import { readFileChunk } from '../../lib/io';
import { fileShare } from '../../lib/share';
import { zipDirectory } from '../../lib/zip';

export default class FileUploadCommand extends BaseCommand {
  static description = 'Encrypt and upload a file';
  static aliases = ['u'];
  static args = {
    input: Args.string({
      required: true,
      description: 'File (or, with --dir, directory) to upload',
    }),
  };
  static flags = {
    ...BaseCommand.baseFlags,
    ...serverFlags,
    seed: seedFlag,
    dir: Flags.boolean({
      description: 'Zip the input directory and upload it as <dirname>.zip',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(FileUploadCommand);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);

    if (!existsSync(args.input))
      throw new UsageError(
        `${flags.dir ? 'Directory' : 'File'} does not exist: ${args.input}`,
      );
    const isDirectory = statSync(args.input).isDirectory();
    if (flags.dir && !isDirectory)
      throw new UsageError(`Not a directory: ${args.input}`);
    if (!flags.dir && isDirectory)
      throw new UsageError(
        'Cannot upload a directory (pass --dir to upload it as a zip archive)',
      );

    let tmpDir: string | undefined;
    try {
      let input = args.input;
      if (flags.dir) {
        tmpDir = mkdtempSync(join(tmpdir(), 'not3-zip-'));
        input = join(tmpDir, sanitize(basename(resolve(args.input)) + '.zip'));
        reporter.info(`Zipping ${args.input}...`);
        await zipDirectory(args.input, input);
      }
      const stat = statSync(input);

      const seedGenerated = !flags.seed;
      const seed = flags.seed ?? Crypto.generateSeed();
      const fileName = sanitize(basename(input));

      const api = await this.makeApi(s);
      const upload = new FileUpload(
        api.files(),
        fileName,
        stat.size,
        4,
        true,
        seed,
      );
      const total = upload.getChunkCount();
      const bar = reporter.progress('Uploading', total);
      let done = 0;
      upload.onProgress((p) => {
        const d = Object.values(p).filter((v) => v.state === 'done').length;
        if (d > done) {
          done = d;
          bar.update(d);
        }
      });
      await upload.start((start, end) => readFileChunk(input, start, end));
      bar.finish();

      const share = fileShare({
        uiUrl: s.uiUrl,
        apiServer: s.server,
        id: upload.getID(),
        seed,
        fileName,
      });
      reporter.share({
        kind: 'file',
        id: upload.getID(),
        seed,
        seedGenerated,
        url: share.url,
        curl: share.curl,
      });
    } finally {
      if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

function sanitize(name: string): string {
  return name.replaceAll(/[^a-zA-Z0-9.-]/g, '_');
}

import { Args } from '@oclif/core';
import { Crypto, FileUpload } from '@not3/sdk';
import { existsSync, statSync } from 'fs';
import { basename } from 'path';
import { BaseCommand } from '../../base.command';
import { UsageError } from '../../lib/errors';
import { seedFlag, serverFlags } from '../../lib/flags';
import { readFileChunk } from '../../lib/io';
import { fileShare } from '../../lib/share';

export default class FileUploadCommand extends BaseCommand {
  static description = 'Encrypt and upload a file';
  static aliases = ['u'];
  static args = {
    input: Args.string({ required: true, description: 'File to upload' }),
  };
  static flags = { ...BaseCommand.baseFlags, ...serverFlags, seed: seedFlag };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(FileUploadCommand);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);

    if (!existsSync(args.input))
      throw new UsageError(`File does not exist: ${args.input}`);
    const stat = statSync(args.input);
    if (stat.isDirectory()) throw new UsageError('Cannot upload a directory');

    const seedGenerated = !flags.seed;
    const seed = flags.seed ?? Crypto.generateSeed();
    const fileName = basename(args.input).replaceAll(/[^a-zA-Z0-9.-]/g, '_');

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
    await upload.start((start, end) => readFileChunk(args.input, start, end));
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
  }
}

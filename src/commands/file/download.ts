import { Args } from '@oclif/core';
import { FileDownload } from '@not3/sdk';
import { createWriteStream } from 'fs';
import { BaseCommand } from '../../base.command';
import { seedFlag, serverFlags } from '../../lib/flags';
import { resolveSeed } from '../../lib/input';
import { makeFileSink } from '../../lib/io';

export default class FileDownloadCommand extends BaseCommand {
  static description = 'Download and decrypt a file';
  static aliases = ['d'];
  static args = {
    id: Args.string({ required: true, description: 'File ID' }),
    out: Args.string({ required: true, description: 'Output path' }),
  };
  static flags = { ...BaseCommand.baseFlags, ...serverFlags, seed: seedFlag };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(FileDownloadCommand);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);
    const seed = await resolveSeed(flags.seed);

    const api = await this.makeApi(s);
    const download = new FileDownload(api.files(), args.id, seed);
    await download.prepare();
    const total = download.getTotalChunks();

    const stream = createWriteStream(args.out);
    const streamFailure = new Promise<never>((_, reject) => {
      stream.on('error', reject);
    });
    const sink = makeFileSink(stream);
    const bar = reporter.progress('Downloading', total);
    await Promise.race([
      download.start(async (buf, index) => {
        await sink(buf, index);
        bar.update(index + 1);
      }),
      streamFailure,
    ]);
    bar.finish();
    await new Promise<void>((resolve, reject) =>
      stream.end((err?: Error | null) => (err ? reject(err) : resolve())),
    );
    reporter.info(`Saved to ${args.out}`);
  }
}

import { Args, Flags } from '@oclif/core';
import { P2PReceiver } from '@not3/sdk';
import { existsSync, promises as fs, statSync } from 'fs';
import { BaseCommand } from '../../base.command';
import { UsageError } from '../../lib/errors';
import { serverFlags } from '../../lib/flags';
import {
  makePositionalSink,
  parseP2PLink,
  safeP2PFileName,
} from '../../lib/p2p';
import { Progress } from '../../lib/reporter';
import { rtcCleanup, rtcFactory } from '../../lib/rtc';

const MIB = 1024 * 1024;

export default class P2PReceiveCommand extends BaseCommand {
  static description =
    'Receive a live P2P file transfer; use --resume with an explicit partial output';
  static examples = [
    'not3 p2p receive <link> ./video.mp4',
    'not3 p2p receive <new-link> ./video.mp4 --resume',
  ];
  static args = {
    link: Args.string({ required: true, description: 'P2P share link' }),
    out: Args.string({
      description: 'Output path (defaults to shared file name)',
    }),
  };
  static flags = {
    ...BaseCommand.baseFlags,
    ...serverFlags,
    resume: Flags.boolean({
      description: 'Continue into an existing partial file',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(P2PReceiveCommand);
    const { sessionId, seed, server } = parseP2PLink(args.link);
    if (flags.resume && !args.out)
      throw new UsageError('--resume requires an explicit output path');
    if (args.out && existsSync(args.out) && !flags.resume)
      throw new UsageError(
        'Output file exists (use --resume to continue a partial transfer)',
      );
    if (args.out && existsSync(args.out) && !statSync(args.out).isFile())
      throw new UsageError('Output path is not a file');

    const settings = this.resolveFrom({
      ...flags,
      server: server ?? flags.server,
    });
    const reporter = this.makeReporter(settings);
    const resumeOffset =
      flags.resume && args.out && existsSync(args.out)
        ? statSync(args.out).size
        : 0;
    const api = await this.makeApi(settings);
    api.updateOptions({ rtc: rtcFactory() });
    const receiver = new P2PReceiver(api.p2p(), sessionId, seed);
    let outputPath = args.out;
    let sink: ReturnType<typeof makePositionalSink> | undefined;
    let bar: Progress | undefined;
    receiver.onProgress((p) => {
      if (p.state !== 'transfer' && p.state !== 'done') return;
      bar ??= reporter.progress('Receiving', Math.ceil(p.totalBytes / MIB));
      bar.update(
        Math.min(
          Math.ceil(p.totalBytes / MIB),
          Math.floor(p.bytesTransferred / MIB),
        ),
      );
    });

    try {
      await receiver.start(async (buf, index) => {
        if (!sink) {
          const meta = await receiver.getMeta();
          outputPath ??= safeP2PFileName(meta.name);
          if (existsSync(outputPath) && !flags.resume)
            throw new UsageError(
              'Output file exists (use --resume to continue a partial transfer)',
            );
          sink = makePositionalSink(outputPath, meta.chunkPayloadSize);
        }
        await sink(buf, index);
      }, resumeOffset);
      if (!outputPath) {
        const meta = await receiver.getMeta();
        outputPath = safeP2PFileName(meta.name);
      }
      if (!existsSync(outputPath)) {
        const empty = await fs.open(outputPath, 'wx');
        await empty.close();
      }
      bar?.finish();
      reporter.info(`Saved to ${outputPath}`);
    } catch (error) {
      if (outputPath && existsSync(outputPath) && statSync(outputPath).size > 0)
        reporter.info(
          `Partial file kept. Resume with: not3 p2p receive <new-link> ${outputPath} --resume`,
        );
      throw error;
    } finally {
      try {
        await sink?.close();
      } finally {
        rtcCleanup();
      }
    }
  }
}

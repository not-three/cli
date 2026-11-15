import { Args } from '@oclif/core';
import { P2PSender } from '@not3/sdk';
import { existsSync, statSync } from 'fs';
import { basename } from 'path';
import { BaseCommand } from '../../base.command';
import { UsageError } from '../../lib/errors';
import { seedFlag, serverFlags } from '../../lib/flags';
import { readFileChunk } from '../../lib/io';
import { transferMiBProgress } from '../../lib/p2p';
import { rtcCleanup, rtcFactory } from '../../lib/rtc';
import { p2pShare } from '../../lib/share';

export default class P2PSendCommand extends BaseCommand {
  static description =
    'Send a file directly to one receiver and print share alternatives; reuse --seed to restart an interrupted transfer';
  static examples = [
    'not3 p2p send ./video.mp4',
    'not3 p2p send ./video.mp4 --seed <seed-from-previous-attempt>',
  ];
  static args = {
    input: Args.string({ required: true, description: 'File to send' }),
  };
  static flags = { ...BaseCommand.baseFlags, ...serverFlags, seed: seedFlag };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(P2PSendCommand);
    const settings = this.resolveFrom(flags);
    const reporter = this.makeReporter(settings);
    if (!existsSync(args.input))
      throw new UsageError(`File does not exist: ${args.input}`);
    const stat = statSync(args.input);
    if (!stat.isFile()) throw new UsageError('Cannot send a directory');
    const fileName = basename(args.input).replaceAll(/[^a-zA-Z0-9.-]/g, '_');

    const api = await this.makeApi(settings);
    api.updateOptions({ rtc: rtcFactory() });
    try {
      if (!(await api.p2p().isEnabled()))
        this.error('This server does not have P2P transfers enabled.', {
          exit: 1,
        });

      const sender = new P2PSender(api.p2p(), fileName, stat.size, {
        seed: flags.seed,
      });
      const bar = reporter.progress(
        'Sending',
        transferMiBProgress(0, stat.size).total,
      );
      let shared = false;
      let interrupted = false;
      const onInterrupt = () => {
        if (interrupted) return;
        interrupted = true;
        void sender.cancel().catch(() => {});
      };
      process.once('SIGINT', onInterrupt);
      sender.onProgress((p) => {
        if (p.state === 'waiting-peer' && !shared) {
          shared = true;
          const share = p2pShare({
            uiUrl: settings.uiUrl,
            apiServer: settings.server,
            id: sender.getSessionId(),
            seed: sender.getSeed(),
          });
          reporter.share({
            kind: 'p2p',
            id: sender.getSessionId(),
            seed: sender.getSeed(),
            seedGenerated: !flags.seed,
            url: share.url,
            alternatives: share.alternatives,
          });
          reporter.info(
            'Waiting for a receiver to open the link… (Ctrl+C to cancel)',
          );
        }
        if (p.state === 'transfer' || p.state === 'done')
          bar.update(transferMiBProgress(p.bytesTransferred, stat.size).done);
      });
      try {
        await sender.start((start, end) =>
          readFileChunk(args.input, start, end),
        );
        bar.finish();
        reporter.info('Transfer complete.');
      } catch (error) {
        if (interrupted) this.exit(130);
        throw error;
      } finally {
        process.removeListener('SIGINT', onInterrupt);
      }
    } finally {
      rtcCleanup();
    }
  }
}

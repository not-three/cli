import { Args } from '@oclif/core';
import { Crypto } from '@not3/sdk';
import { BaseCommand } from '../../base.command';
import { fileFlag, modeFlag, seedFlag, serverFlags } from '../../lib/flags';
import { resolveTextInput } from '../../lib/input';
import { noteShare } from '../../lib/share';

export default class NoteSave extends BaseCommand {
  static description = 'Encrypt and save a note on the server';
  static aliases = ['s'];
  static strict = false;
  static args = {
    content: Args.string({ description: 'Note text (or use --file / stdin)' }),
  };
  static flags = {
    ...BaseCommand.baseFlags,
    ...serverFlags,
    seed: seedFlag,
    mode: modeFlag,
    file: fileFlag,
  };
  static examples = [
    '<%= config.bin %> note save "hello world"',
    'journalctl -u my-service | <%= config.bin %> s',
  ];

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(NoteSave);
    const s = this.resolveFrom(flags);
    const reporter = this.makeReporter(s);
    const content = await resolveTextInput({
      file: flags.file,
      argv: argv as string[],
    });
    const seedGenerated = !flags.seed;
    const seed = flags.seed ?? Crypto.generateSeed();
    const key = await Crypto.generateKey(seed, s.mode).catch(() => {
      throw new Error('Invalid seed');
    });
    const enc = await Crypto.encrypt(content, key, s.mode);
    const api = await this.makeApi(s);
    const info = await api.system().info();
    const note = await api.notes().create({
      content: enc,
      expiresIn: info.maxStorageTimeDays * 24 * 60 * 60 - 60,
      selfDestruct: false,
      mime: 'text/plain',
    });
    const share = noteShare({
      uiUrl: s.uiUrl,
      apiServer: s.server,
      id: note.id,
      seed,
      mode: s.mode,
    });
    reporter.share({
      kind: 'note',
      id: note.id,
      seed,
      seedGenerated,
      url: share.url,
      curl: share.curl,
    });
  }
}

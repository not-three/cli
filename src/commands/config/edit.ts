import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BaseCommand } from '../../base.command';
import {
  configFile,
  loadConfig,
  Not3Config,
  saveConfig,
} from '../../lib/config';
import { findEditor, openEditor } from '../../lib/editor';
import { editorFlag } from '../../lib/flags';

export default class ConfigEdit extends BaseCommand {
  static description = 'Open the global config file in your editor';
  static flags = { ...BaseCommand.baseFlags, editor: editorFlag };

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigEdit);
    let stored: Not3Config = {};
    try {
      stored = loadConfig(this.config.configDir);
    } catch {
      /* invalid JSON on disk — the raw content is still editable below */
    }
    const editor = findEditor(flags.editor ?? stored.editor);
    const file = configFile(this.config.configDir);
    const original = existsSync(file) ? readFileSync(file, 'utf8') : '{}\n';
    const tempFile = join(
      tmpdir(),
      `not3-config-${process.pid}-${Math.random().toString(36).slice(2)}.json`,
    );
    writeFileSync(tempFile, original, { mode: 0o600 });
    try {
      await openEditor(editor, tempFile);
      const edited = readFileSync(tempFile, 'utf8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(edited);
      } catch {
        throw new Error(
          'Edited config is not valid JSON, aborting (config unchanged)',
        );
      }
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      )
        throw new Error(
          'Edited config must be a JSON object, aborting (config unchanged)',
        );
      saveConfig(this.config.configDir, parsed as Not3Config);
      this.log(`Saved ${file}`);
    } finally {
      try {
        unlinkSync(tempFile);
      } catch {
        /* already gone */
      }
    }
  }
}

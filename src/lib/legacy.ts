import { Command } from '@oclif/core';

export function legacyStub(
  oldName: string,
  newName: string,
  alias?: string,
): typeof Command {
  return class extends Command {
    static hidden = true;
    static description = `(moved) use "not3 ${newName}"`;

    async run(): Promise<void> {
      this.error(
        `\`not3 ${oldName}\` has moved to \`not3 ${newName}\`${alias ? ` (short: \`not3 ${alias}\`)` : ''}`,
        { exit: 1 },
      );
    }
  };
}

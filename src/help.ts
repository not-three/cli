import { Command, Help } from '@oclif/core';

export default class Not3Help extends Help {
  protected get sortedCommands(): Command.Loadable[] {
    const commands = super.sortedCommands;
    return [
      ...commands.filter((c) => c.id !== 'license'),
      ...commands.filter((c) => c.id === 'license'),
    ];
  }
}

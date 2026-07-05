import { Flags } from '@oclif/core';

export const serverFlags = {
  server: Flags.string({
    char: 's',
    description: 'API server URL',
    env: 'NOT3_SERVER',
  }),
  password: Flags.string({
    char: 'p',
    description: 'Server password (private mode)',
    env: 'NOT3_PASSWORD',
  }),
  'no-version-check': Flags.boolean({
    description: 'Skip the server compatibility check',
    env: 'NOT3_NO_VERSION_CHECK',
  }),
};

export const statsPasswordFlag = Flags.string({
  description: 'Stats password (defaults to the server password)',
  env: 'NOT3_STATS_PASSWORD',
});

export const seedFlag = Flags.string({
  description:
    'Encryption seed (prompted for on a TTY when required and omitted)',
  env: 'NOT3_SEED',
});

export const modeFlag = Flags.string({
  char: 'm',
  description: 'Crypto mode',
  options: ['cbc', 'gcm'],
  env: 'NOT3_MODE',
});

export const fileFlag = Flags.string({
  char: 'f',
  description: 'Read the input from a file',
  env: 'NOT3_FILE',
});

export const outputFlag = Flags.string({
  char: 'o',
  description: 'Write the output to a file',
  env: 'NOT3_OUTPUT',
});

export const editorFlag = Flags.string({
  char: 'e',
  description: 'Editor command to use',
  env: 'NOT3_EDITOR',
});

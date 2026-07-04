import { readFileSync } from 'fs';
import { prompt } from 'enquirer';
import { UsageError } from './errors';

function readStream(stdin: NodeJS.ReadStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => (data += chunk));
    stdin.on('end', () => resolve(data));
    stdin.on('error', reject);
  });
}

export async function resolveTextInput(opts: {
  file?: string;
  argv: string[];
  stdin?: NodeJS.ReadStream;
}): Promise<string> {
  const stdin = opts.stdin ?? process.stdin;
  if (opts.file) return readFileSync(opts.file, 'utf8');
  if (!stdin.isTTY) {
    const piped = await readStream(stdin);
    if (piped.trim() !== '') return piped;
  }
  if (opts.argv.length > 0) return opts.argv.join(' ');
  throw new UsageError(
    'No input provided (pass text as arguments, use --file, or pipe via stdin)',
  );
}

export async function resolveSeed(
  seed: string | undefined,
  stdin: NodeJS.ReadStream = process.stdin,
): Promise<string> {
  if (seed) return seed;
  if (!stdin.isTTY) {
    throw new UsageError(
      'No seed given and stdin is not a terminal; pass --seed or set NOT3_SEED',
    );
  }
  const answer = await prompt<{ seed: string }>({
    type: 'password',
    name: 'seed',
    message: 'Encryption seed',
  });
  return answer.seed;
}

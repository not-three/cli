import { spawn, spawnSync } from 'child_process';
import { UsageError } from './errors';

function onPath(cmd: string): boolean {
  return spawnSync('which', [cmd]).status === 0;
}

export function findEditor(preferred?: string): string {
  if (preferred) return preferred;
  if (process.env.EDITOR && onPath(process.env.EDITOR))
    return process.env.EDITOR;
  for (const candidate of ['nano', 'vim', 'vi']) {
    if (onPath(candidate)) return candidate;
  }
  throw new UsageError(
    'No terminal editor found; pass one with -e/--editor or set NOT3_EDITOR',
  );
}

export async function openEditor(editor: string, file: string): Promise<void> {
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(editor, [file], { stdio: 'inherit' });
    child.on('error', (err) =>
      reject(
        new UsageError(`Failed to start editor "${editor}": ${err.message}`),
      ),
    );
    child.on('exit', (c) => resolve(c ?? 1));
  });
  if (code !== 0)
    throw new Error(
      `Editor exited with code ${code}, aborting (file unchanged)`,
    );
}

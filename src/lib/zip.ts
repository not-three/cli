import { createWriteStream, readdirSync } from 'fs';
import { join } from 'path';
import yazl from 'yazl';

function collectFiles(dir: string, prefix = ''): [string, string][] {
  const files: [string, string][] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    const rel = prefix + entry.name;
    if (entry.isDirectory()) files.push(...collectFiles(abs, rel + '/'));
    else if (entry.isFile()) files.push([abs, rel]);
  }
  return files;
}

export function zipDirectory(dir: string, outFile: string): Promise<void> {
  const zip = new yazl.ZipFile();
  for (const [abs, rel] of collectFiles(dir)) zip.addFile(abs, rel);
  zip.end();
  return new Promise((resolve, reject) => {
    zip.outputStream
      .pipe(createWriteStream(outFile))
      .on('close', () => resolve())
      .on('error', reject);
    zip.outputStream.on('error', reject);
  });
}

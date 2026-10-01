import { expect } from 'chai';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import yauzl from 'yauzl';
import { zipDirectory } from '../../src/lib/zip';

function readZipEntries(zipPath: string): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    const entries = new Map<string, string>();
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on('error', reject);
      zip.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) {
          entries.set(entry.fileName, '');
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (streamErr, stream) => {
          if (streamErr) return reject(streamErr);
          const parts: Buffer[] = [];
          stream.on('data', (c: Buffer) => parts.push(c));
          stream.on('end', () => {
            entries.set(entry.fileName, Buffer.concat(parts).toString());
            zip.readEntry();
          });
          stream.on('error', reject);
        });
      });
      zip.on('end', () => resolve(entries));
      zip.readEntry();
    });
  });
}

describe('zipDirectory', () => {
  it('zips nested files with forward-slash relative paths', async () => {
    const base = mkdtempSync(join(tmpdir(), 'not3-'));
    const dir = join(base, 'payload');
    mkdirSync(join(dir, 'sub', 'deep'), { recursive: true });
    writeFileSync(join(dir, 'root.txt'), 'root content');
    writeFileSync(join(dir, 'sub', 'nested.txt'), 'nested content');
    writeFileSync(join(dir, 'sub', 'deep', 'leaf.txt'), 'leaf content');

    const out = join(base, 'payload.zip');
    await zipDirectory(dir, out);

    const entries = await readZipEntries(out);
    expect(entries.get('root.txt')).to.equal('root content');
    expect(entries.get('sub/nested.txt')).to.equal('nested content');
    expect(entries.get('sub/deep/leaf.txt')).to.equal('leaf content');
  });

  it('produces a valid empty archive for an empty directory', async () => {
    const base = mkdtempSync(join(tmpdir(), 'not3-'));
    const dir = join(base, 'empty');
    mkdirSync(dir);

    const out = join(base, 'empty.zip');
    await zipDirectory(dir, out);

    const entries = await readZipEntries(out);
    expect([...entries.keys()].filter((k) => !k.endsWith('/'))).to.have.length(
      0,
    );
  });
});

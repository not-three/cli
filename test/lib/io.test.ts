import { expect } from 'chai';
import {
  mkdtempSync,
  writeFileSync,
  createWriteStream,
  readFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeFileSink, readFileChunk } from '../../src/lib/io';

describe('readFileChunk', () => {
  it('reads [start, end) as an ArrayBuffer', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'not3-')), 'f');
    writeFileSync(file, 'abcdefgh');
    const buf = await readFileChunk(file, 2, 5);
    expect(Buffer.from(buf).toString()).to.equal('cde');
    expect(buf).to.be.instanceOf(ArrayBuffer);
  });

  it('resolves an empty ArrayBuffer for a zero-length range', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'not3-')), 'f');
    writeFileSync(file, 'abcdefgh');
    const buf = await readFileChunk(file, 3, 3);
    expect(buf.byteLength).to.equal(0);
  });
});

describe('makeFileSink (regression for not-three/main#15)', () => {
  it('accepts a real ArrayBuffer and writes its bytes to the stream', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'not3-'));
    const out = join(dir, 'out.bin');
    const stream = createWriteStream(out);
    const sink = makeFileSink(stream);
    const chunk = new TextEncoder().encode('hello').buffer as ArrayBuffer; // plain ArrayBuffer, like the SDK yields
    await sink(chunk, 0); // v2 crashed here: "chunk argument must be ... Received an instance of ArrayBuffer"
    await new Promise<void>((res, rej) =>
      stream.end((e?: Error | null) => (e ? rej(e) : res())),
    );
    expect(readFileSync(out).toString()).to.equal('hello');
  });
});

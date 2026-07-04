import { expect } from 'chai';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PassThrough } from 'stream';
import { resolveSeed, resolveTextInput } from '../../src/lib/input';

function fakeStdin(data: string | null): NodeJS.ReadStream {
  const s = new PassThrough() as unknown as NodeJS.ReadStream & PassThrough;
  (s as { isTTY?: boolean }).isTTY = data === null;
  if (data !== null) {
    s.end(data);
  }
  return s;
}

describe('resolveTextInput', () => {
  it('prefers --file over everything', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'not3-')), 'in.txt');
    writeFileSync(file, 'from file');
    const text = await resolveTextInput({
      file,
      argv: ['args'],
      stdin: fakeStdin('piped'),
    });
    expect(text).to.equal('from file');
  });
  it('reads piped stdin before argv', async () => {
    const text = await resolveTextInput({
      argv: ['args'],
      stdin: fakeStdin('piped'),
    });
    expect(text).to.equal('piped');
  });
  it('joins argv when stdin is a TTY', async () => {
    const text = await resolveTextInput({
      argv: ['hello', 'world'],
      stdin: fakeStdin(null),
    });
    expect(text).to.equal('hello world');
  });
  it('throws UsageError when nothing is provided', async () => {
    try {
      await resolveTextInput({ argv: [], stdin: fakeStdin(null) });
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.match(/No input provided/);
    }
  });
  it('falls back to argv when piped stdin is empty (regression: empty stdin silently wins)', async () => {
    const text = await resolveTextInput({
      argv: ['hi'],
      stdin: fakeStdin(''),
    });
    expect(text).to.equal('hi');
  });
  it('throws UsageError when piped stdin is empty and no argv is given', async () => {
    try {
      await resolveTextInput({ argv: [], stdin: fakeStdin('') });
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.match(/No input provided/);
    }
  });
});

describe('resolveSeed', () => {
  it('returns the given seed', async () => {
    expect(await resolveSeed('abc', fakeStdin(null))).to.equal('abc');
  });
  it('throws UsageError without seed on non-TTY stdin', async () => {
    try {
      await resolveSeed(undefined, fakeStdin('data'));
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.match(/--seed/);
    }
  });
});

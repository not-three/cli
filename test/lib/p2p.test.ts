import { expect } from 'chai';
import { ShareGenerator } from '@not3/sdk';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  makePositionalSink,
  parseP2PLink,
  safeP2PFileName,
} from '../../src/lib/p2p';
import { UsageError } from '../../src/lib/errors';

const generator = new ShareGenerator({
  uiUrl: 'https://ui.x/',
  apiUrl: 'https://api.y/',
  storeServer: true,
});

describe('parseP2PLink', () => {
  it('reads the session, seed and custom server from a P2P share', () => {
    expect(parseP2PLink(generator.p2pUi('abc123', 'k123'))).to.deep.equal({
      sessionId: 'abc123',
      seed: 'k123',
      server: 'https://api.y/',
    });
  });

  it('allows a share without an embedded server', () => {
    const url = new ShareGenerator({ uiUrl: 'https://ui.x/' }).p2pUi(
      'abc',
      'k',
    );
    expect(parseP2PLink(url).server).to.equal(null);
  });

  it('rejects a regular file share', () => {
    expect(() => parseP2PLink(generator.fileUi('abc', 'k'))).to.throw(
      UsageError,
      /Not a P2P share link/,
    );
  });

  it('rejects malformed links and non-file paths', () => {
    expect(() => parseP2PLink('not a url')).to.throw(
      UsageError,
      /Not a valid share link/,
    );
    expect(() => parseP2PLink('https://ui.x/f/abc#garbage')).to.throw(
      UsageError,
      /Not a valid share link/,
    );
    const wrongPath = generator.p2pUi('abc', 'k').replace('/f/', '/q/');
    expect(() => parseP2PLink(wrongPath)).to.throw(
      UsageError,
      /Not a file share link/,
    );
  });
});

describe('makePositionalSink', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'not3-p2p-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('writes out-of-order chunks to their positions', async () => {
    const out = join(dir, 'out.bin');
    const sink = makePositionalSink(out, 4);
    await sink(new Uint8Array([5, 6, 7, 8]).buffer, 1);
    await sink(new Uint8Array([1, 2, 3, 4]).buffer, 0);
    await sink(new Uint8Array([9, 9]).buffer, 2);
    await sink.close();
    expect([...readFileSync(out)]).to.deep.equal([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 9,
    ]);
  });

  it('preserves existing bytes while resuming', async () => {
    const out = join(dir, 'out.bin');
    writeFileSync(out, Buffer.from([1, 2, 3, 4, 0, 0]));
    const sink = makePositionalSink(out, 4);
    await sink(new Uint8Array([7, 8]).buffer, 1);
    await sink.close();
    expect([...readFileSync(out)]).to.deep.equal([1, 2, 3, 4, 7, 8]);
  });
});

describe('safeP2PFileName', () => {
  it('removes path traversal and unsupported characters', () => {
    expect(safeP2PFileName('../../bad name.txt')).to.equal('bad_name.txt');
    expect(safeP2PFileName('..')).to.equal('download.bin');
  });
});

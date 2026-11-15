import { runCommand } from '@oclif/test';
import { expect } from 'chai';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import nock from 'nock';
import {
  P2PPeerDisconnectedError,
  P2PReceiver,
  P2PSender,
  ShareGenerator,
} from '@not3/sdk';

const SERVER = 'http://localhost:9999';
const share = new ShareGenerator({
  uiUrl: 'https://ui.example/',
  apiUrl: SERVER + '/',
  storeServer: false,
});

describe('not3 p2p send', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'not3-p2p-command-'));
  });
  afterEach(() => {
    nock.cleanAll();
    rmSync(dir, { recursive: true, force: true });
  });

  it('prints link, CLI and Docker when the sender reaches waiting-peer', async () => {
    const input = join(dir, 'send.txt');
    writeFileSync(input, 'hello');
    const originalStart = P2PSender.prototype.start;
    const originalOnProgress = P2PSender.prototype.onProgress;
    const originalSession = P2PSender.prototype.getSessionId;
    const originalSeed = P2PSender.prototype.getSeed;
    let progress: Parameters<P2PSender['onProgress']>[0] = () => {};
    P2PSender.prototype.onProgress = function (hook) {
      progress = hook;
    };
    P2PSender.prototype.getSessionId = () => 'session-share';
    P2PSender.prototype.getSeed = () => 'seedX';
    P2PSender.prototype.start = async () => {
      await progress({
        state: 'waiting-peer',
        bytesTransferred: 0,
        totalBytes: 5,
      });
    };
    try {
      nock(SERVER)
        .get('/info')
        .reply(200, { version: 'IN-DEV', p2pEnabled: true });
      const { stdout, error } = await runCommand([
        'p2p',
        'send',
        input,
        '-s',
        SERVER,
        '--seed',
        'seedX',
        '--output-mode',
        'simple',
        '--no-version-check',
      ]);
      expect(error).to.equal(undefined);
      expect(stdout).to.contain('id: session-share\n');
      expect(stdout).to.contain('cli: not3 p2p receive ');
      expect(stdout).to.contain('docker: docker run --rm -it ');
      expect(stdout).to.not.contain('curl:');
      expect(stdout).to.not.contain('powershell:');
    } finally {
      P2PSender.prototype.start = originalStart;
      P2PSender.prototype.onProgress = originalOnProgress;
      P2PSender.prototype.getSessionId = originalSession;
      P2PSender.prototype.getSeed = originalSeed;
    }
  });

  it('reports disabled P2P on the server with exit 1', async () => {
    const input = join(dir, 'in.txt');
    writeFileSync(input, 'hello');
    nock(SERVER)
      .get('/info')
      .reply(200, { version: 'IN-DEV', p2pEnabled: false });
    const { error } = await runCommand([
      'p2p',
      'send',
      input,
      '-s',
      SERVER,
      '--no-version-check',
    ]);
    expect(error?.message).to.contain('does not have P2P transfers enabled');
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(1);
  });

  it('rejects a missing file with exit 2', async () => {
    const { error } = await runCommand(['p2p', 'send', join(dir, 'missing')]);
    expect(error?.message).to.contain('File does not exist');
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(2);
  });

  it('rejects a directory with exit 2', async () => {
    const { error } = await runCommand(['p2p', 'send', dir]);
    expect(error?.message).to.contain('Cannot send a directory');
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(2);
  });
});

describe('not3 p2p receive', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'not3-p2p-receive-'));
  });
  afterEach(() => {
    nock.cleanAll();
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects a malformed link with exit 2', async () => {
    const { error } = await runCommand(['p2p', 'receive', 'garbage']);
    expect(error?.message).to.contain('Not a valid share link');
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(2);
  });

  it('rejects a regular file share with exit 2', async () => {
    const { error } = await runCommand([
      'p2p',
      'receive',
      share.fileUi('abc', 'k'),
    ]);
    expect(error?.message).to.contain('Not a P2P share link');
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(2);
  });

  it('requires an explicit output path for resume', async () => {
    const { error } = await runCommand([
      'p2p',
      'receive',
      share.p2pUi('abc', 'k'),
      '--resume',
    ]);
    expect(error?.message).to.contain(
      '--resume requires an explicit output path',
    );
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(2);
  });

  it('refuses to overwrite an existing output file', async () => {
    const out = join(dir, 'existing');
    writeFileSync(out, 'prior');
    const { error } = await runCommand([
      'p2p',
      'receive',
      share.p2pUi('abc', 'k'),
      out,
    ]);
    expect(error?.message).to.contain('Output file exists');
    expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(2);
  });

  it('reports a sender cancellation without a raw peer disconnect error', async () => {
    const originalStart = P2PReceiver.prototype.start;
    P2PReceiver.prototype.start = (async () => {
      throw new P2PPeerDisconnectedError();
    }) as typeof originalStart;
    try {
      const { error } = await runCommand([
        'p2p',
        'receive',
        share.p2pUi('abc', 'k'),
        join(dir, 'partial.bin'),
        '--server',
        SERVER,
        '--no-version-check',
      ]);
      expect(error?.message).to.contain('Sender disconnected or cancelled');
      expect(error?.message).to.not.contain('Peer disconnected');
      expect((error as { oclif?: { exit?: number } })?.oclif?.exit).to.equal(1);
    } finally {
      P2PReceiver.prototype.start = originalStart;
    }
  });
});
